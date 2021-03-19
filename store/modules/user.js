import axios from "axios"
import Vue from "vue"

const ENDPOINT = Vue.prototype.API_ENDPOINT + "/graphql";
let XAUTHORIZATION = null;

axios.interceptors.request.use(function (config) {
  if(config.url.indexOf('graphql') !== -1){
    let params = new URLSearchParams();
    var query = config.data.get('query');
    var variables = config.data.get('variables');

    // Se xauthorization NAO puder ser um número, então ele é um token que vai ser passado no header
    // user_id passa a ser zero pois as queries precisam ser integer
    if( isNaN(XAUTHORIZATION) ){
      config.headers['X-Authorization'] = `Basic ${XAUTHORIZATION}`;
      query = query.replace(/(user[_]?id:\s?)(['"]?)([a-zA-Z0-9=]+)(['"]?)/gi, '$1$20$4');
    }

    query = Vue.prototype.$encrypts.encrypt(query, config.headers.Authorization);
    params.append('query', query);

    if(variables && variables.length > 0){
      variables = Vue.prototype.$encrypts.encrypt(variables, config.headers.Authorization);
      params.append('variables', variables);
    }

    config.data = params;
  }

  return config;
}, function (error) {
  return Promise.reject(error);
});

axios.interceptors.response.use(function (response) {
  if(response.config.url.indexOf('graphql') !== -1){
    if(response.data && !response.data.error){
      response.data.data = Vue.prototype.$encrypts.decrypt(response.data.data, response.config.headers.Authorization);
      response.data.data = JSON.parse(response.data.data);
    }
  }

  return response;
}, function (error) {
  return Promise.reject(error);
});

export default {

  namespaced: true,

  state: {
    isAuth: false,
    nextRoute: JSON.parse(localStorage.getItem('nextRoute')) || '',
    profile: null,
    follower: false,
    profileExternalBase: null
  },

  mutations: {
    SET_AUTH(state, payload){
      state.isAuth = payload;
    },

    SET_NEXT_ROUTE(state, payload){
      state.nextRoute = payload;
      localStorage.setItem('nextRoute', JSON.stringify(payload))
    },

    SET_PROFILE(state, payload){
      let profile = state.profile

      if(profile && payload){
        Object.keys(payload).map(key => {
          profile[key] = payload[key]
        })
      }

      state.profile = profile != null ? Object.assign({}, state.profile, profile) : payload;
    },

    SET_FOLLOWER(state, payload){
      state.follower = payload;
      localStorage.setItem('follower', payload);
    },

    SET_PROFILE_EXTERNAL_BASE(state, payload){
      let profile = payload;
      if(!profile.disabilities) profile.disabilities = [];
      if(!profile.language_proficiencies) profile.language_proficiencies = [];
      if(!profile.educations) profile.educations = [];
      if(!profile.professional_experiences) profile.professional_experiences = [];

      if(!profile.location){
        profile.location = {
          zipcode: payload.location_zipcode,
          street: payload.location_street,
          number: payload.location_number,
          complement: payload.location_complement,
          neighborhood: payload.location_neighborhood,
          stateId: payload.location_state_id,
          city: payload.location_city
        };
      }

      if(!profile.firstname){
        let fullname = profile.name.split(' ');
        let firstname = fullname[0];
        let lastname = fullname.slice(1, fullname.length).join(' ');

        profile.firstname = firstname;
        profile.lastname = lastname;
      }

      state.profileExternalBase = payload;
    }
  },

  getters: {},

  actions: {
    checkAuth({ commit, dispatch, rootState }){
      if( localStorage.getItem('devise') ){
        const devise = JSON.parse(decodeURIComponent(escape(atob(localStorage.getItem('devise')))));
        const now = new Date().getTime()/1000;
        XAUTHORIZATION = devise.profile.id;

        // Se o timestamp atual for menor que o limite estabelecido na variável loggedInUntil, então logamos
        // Senão, forçamos o logout
        if( devise.keepLogged ){
          if( now < devise.loggedInUntil ){
            Vue.prototype.$session.renew(devise.id);
          }else{
            dispatch('signOut');
          }
        }

        if( Vue.prototype.$session.exists() ){
          commit('SET_AUTH', true);
          commit('SET_PROFILE', devise.profile);
          dispatch('companyFollow');
          return { logged: true };
        }else{
          dispatch('signOut');
          return { logged: false };
        }
      }else{
        dispatch('signOut');
        return { logged: false };
      }
    },



    signOut({ commit }){
      commit('SET_AUTH', false);
      commit('SET_PROFILE', null);
      commit('opportunities/SET_SUBSCRIPTIONS', [], { root: true });
      localStorage.removeItem('devise')
      Vue.prototype.$session.destroy()
    },




    linkedinProfile({ rootState }, obj){
      return new Promise( (resolve, reject) => {
        axios.get(`${Vue.prototype.API_ENDPOINT}/linkedin/token?redirect_uri=${obj.return_url}&code=${obj.code}&company=${obj.company}`, { headers: { 'Authorization': rootState.tkn }}).then( resp => {
          const response = resp.data;
          resolve(response);
        }, error => {
          reject(error);
        })
      })
    },



    signIn({ commit, dispatch, rootState }, obj){
      let params = new URLSearchParams();
      let query = '';
      let variables = '';
      const data = `
      {
        ${ obj.returns || 'id, name' }
      }
      `;

      if( obj.provider ){
        if(obj.provider == '99jobs' && obj.forceUser){
          XAUTHORIZATION = obj.forceUser;

          query = `
            query {
              user(
                id: "${ obj.forceUser }"
              )
              ${data}
            }
          `;
        }else if(obj.provider == 'itau'){
          query =  `
            mutation {
              itauLogin(
                code: "${obj.code}",
                development: ${obj.development},
                ${ obj.source ? ' login_source: "' + obj.source + '" ' : rootState.source ? ' login_source: "' + rootState.source + '" ' : '' }
              )
              ${data}
            }
          `;
        }else{
          query = `
            mutation {
              socialMediaLogin(
                provider: "${obj.provider}",
                provider_id: "${obj.provider_id}",
                origin_company: ${rootState.companyId}
              )
              ${data}
            }
          `;
        }
      }else{
        query = `
          mutation {
            userLogin(
              email: "${obj.username || obj.email.toLowerCase()}",
              password: "${window.btoa(obj.password)}",
              origin_company: ${rootState.companyId}
            )
            ${data}
          }
        `;
      }

      variables = JSON.stringify({ "encrypt_user_id": true });
      params.append('query', query);
      params.append('variables', variables);

      return new Promise( (resolve, reject) => {
        axios.post(ENDPOINT, params, { headers: { 'Authorization': rootState.tkn }}).then( resp => {
          const response = resp.data;

          if( !response.error ){
            const user = response.data.userLogin || response.data.socialMediaLogin || response.data.itauLogin || response.data.user;
            if(obj.provider == '99jobs' && obj.forceUser) user['99jobs'] = true;
            dispatch('auth', { user: user, keepLogged: obj.keepLogged, hoursLogged: obj.hoursLogged });
          }

          resolve(response);
        }, error => {
          reject(error);
        })
      })
    },



    signUp({ dispatch, rootState }, obj){
      let params = new URLSearchParams();
      const data = `
      {
        id,
        name,
        profile{ id }
      }
      `;

      var variables = JSON.stringify({ "encrypt_user_id": true });
      params.append('variables', variables);

      params.append('query', `
        mutation {
          userCreate(
            name: "${obj.first_name} ${obj.last_name}",
            email: "${obj.email.toLowerCase()}",
            foreigner: ${obj.foreigner},
            document: "${obj.document}",
            ${ obj.password ? ' password: "' + window.btoa(obj.password) + '" ,' : '' }
            origin_company: ${rootState.companyId},
            ${ obj.provider ? ' provider: "' + obj.provider + '" ,' : '' }
            ${ obj.provider ? ' provider_id: "' + obj.provider_id + '" ,': '' }
            ${ obj.accept_terms_of_use ? ' accept_terms_of_use: ' + obj.accept_terms_of_use + ' ,' : '' }
            ${ obj.accept_terms_of_use ? ' source: ' + (obj.source ? '"'+obj.source+'"' : '"'+rootState.source+'"') + ' ,' : '' }
          )
          ${data}
        }
      `)

      return new Promise( (resolve, reject) => {
        axios.post(ENDPOINT, params, { headers: { 'Authorization': rootState.tkn } }).then( resp => {
          const signUpResponse = resp.data;

          if( !signUpResponse.error ){
            const user = signUpResponse.data.userCreate;
            dispatch('auth', { user: user, keepLogged: false });
          }

          resolve(signUpResponse);
        }, error => {
          reject(error);
        })
      })
    },

    auth({ commit, dispatch }, obj){
      let keepLogged = obj.keepLogged || false;
      let hoursLogged = obj.hoursLogged || 24;
      let profile = obj.user;

      Vue.prototype.$session.start();

      localStorage.setItem('devise', btoa(
        unescape(
          encodeURIComponent(
            JSON.stringify(
              {
                id: Vue.prototype.$session.id(),
                loggedInUntil: keepLogged ? Math.floor( (new Date(new Date().getTime() + 60 * 60 * hoursLogged * 1000)) / 1000 ) : null,
                keepLogged: keepLogged,
                profile: profile
              }
            )
          )
        )
      ))

      commit('SET_AUTH', true);
      commit('SET_PROFILE', profile);
      XAUTHORIZATION = profile.id;
    },

    passwordRecovery({ rootState }, obj){
      let params = new URLSearchParams();
      params.append('query', `
        mutation {
          passwordRecovery(
            email: "${obj.email.toLowerCase()}",
            domain: "${obj.domain}",
            ${ obj.companyId ? ' origin_company: ' + obj.companyId : '' }
          )
          {
            email
          }
        }
      `)

      return new Promise( (resolve, reject) => {
        axios.post(ENDPOINT, params, { headers: { 'Authorization': rootState.tkn } }).then( resp => {
          const passwordRecoveryResponse = resp.data;

          resolve(passwordRecoveryResponse)
        }, error => {
          reject(error);
        })
      })
    },


    changePassword({ rootState }, obj){
      let params = new URLSearchParams();
      params.append('query', `
        mutation {
          changePassword(
            password: "${window.btoa(obj.password)}",
            ${ obj.token ? ' token: "' + obj.token + '" ,' : '' }
            ${ obj.user_id ? ' user_id: ' + obj.user_id + ' ,' : '' }
          )
          {
            email
          }
        }
      `)

      return new Promise( (resolve, reject) => {
        axios.post(ENDPOINT, params, { headers: { 'Authorization': rootState.tkn } }).then( resp => {
          const changePasswordResponse = resp.data;

          resolve(changePasswordResponse)
        }, error => {
          reject(error);
        })
      })
    },

    decryptTokenHunting({ rootState }, obj) {
      let params = new URLSearchParams();
      params.append('query', `
        query {
          decryptTokenHunting(
            token: "${obj.token}"
          )
          {
            valid, user { id, forceChangePassword, email }, opportunity { id }
          }
        }
      `)

      var variables = JSON.stringify({ "encrypt_user_id": true });
      params.append('variables', variables);

      return new Promise((resolve, reject) => {
        axios.post(ENDPOINT, params, { headers: { 'Authorization': rootState.tkn } }).then(resp => {
          const decryptTokenHunting = resp.data;
          resolve(decryptTokenHunting)
        }, error => {
          reject(error);
        })
      })
    },

    acceptHunting({ rootState }, obj) {
      let params = new URLSearchParams();
      params.append('query', `
        mutation {
          acceptHunting(
            token: "${obj.token}"
          )
          {
            id
          }
        }
      `)

      var variables = JSON.stringify({ "encrypt_user_id": true });
      params.append('variables', variables);

      return new Promise((resolve, reject) => {
        axios.post(ENDPOINT, params, { headers: { 'Authorization': rootState.tkn } }).then(resp => {
          const acceptHunting = resp.data;
          resolve(acceptHunting)
        }, error => {
          reject(error);
        })
      })
    },

    refuseHunting({ rootState }, obj) {
      let params = new URLSearchParams();
      params.append('query', `
        mutation {
          refuseHunting(
            token: "${obj.token}"
          )
          {
            id
            forceChangePassword
            email
            name
          }
        }
      `)

      var variables = JSON.stringify({ "encrypt_user_id": true });
      params.append('variables', variables);

      return new Promise((resolve, reject) => {
        axios.post(ENDPOINT, params, { headers: { 'Authorization': rootState.tkn } }).then(resp => {
          const refuseHunting = resp.data;
          resolve(refuseHunting)
        }, error => {
          reject(error);
        })
      })
    },

    updateHunting({ rootState }, obj) {
      let params = new URLSearchParams();
      params.append('query', `
        mutation {
          updateHunting(
            token:"${ obj.token }",
            document: "${ obj.document }",
            foreigner: ${ obj.foreigner }
          )
          {
            id
            hasUser
            hasMoreRegister
          }
        }
      `)

      var variables = JSON.stringify({ "encrypt_user_id": true });
      params.append('variables', variables);

      return new Promise((resolve, reject) => {
        axios.post(ENDPOINT, params, { headers: { 'Authorization': rootState.tkn } }).then(resp => {
          const updateHunting = resp.data;
          resolve(updateHunting)
        }, error => {
          reject(error);
        })
      })
    },

    personalDataUpdate({ rootState }, obj){
      obj = Vue.prototype.$helpers.removeSomeCaracters(obj);
      let params = new URLSearchParams();

      params.append('query', `
        mutation {
          personalDataUpdate(
            user_id: ${ rootState.user.profile.id },
            ${ obj.source ? ' source: "' + obj.source + '" ' : rootState.source ? ' source: "' + rootState.source + '" ' : '' }
            ${ obj.firstname && obj.lastname ? ' name: "' + obj.firstname + ' ' + obj.lastname + '" ,' : '' }
            ${ obj.email ? ' email: "' + obj.email + '" ,' : '' }
            ${ obj.firstname ? ' firstname: "' + obj.firstname + '" ,' : '' }
            ${ obj.lastname ? ' lastname: "' + obj.lastname + '" ,' : '' }
            ${ obj.cpf ? ' cpf: "' + obj.cpf + '" ,' : '' }
            ${ obj.passport ? ' passport: "' + obj.passport + '" ,' : '' }
            ${ obj.birthday ? ' birthday: "' + obj.birthday + '" ,' : '' }
            ${ obj.phone ? ' phone: "' + obj.phone + '" ,' : '' }
            ${ obj.nationality ? ' nationality: "' + obj.nationality + '" ,' : '' }
            ${ obj.gender ? ' gender: ' + obj.gender + ' ,' : '' }
            ${ obj.marital_status ? ' marital_status: ' + obj.marital_status : obj.maritalStatus ? ' marital_status: ' + obj.maritalStatus : '' }
            ${ obj.whatDoYouLove ? ' what_do_you_love: "' + obj.whatDoYouLove + '" ,' : '' }
            address: {
              ${ obj.street ? ' street: "' + obj.street + '" ,' : '' }
              ${ obj.number ? ' number: "' + obj.number + '" ,' : '' }
              ${ obj.complement ? ' complement: "' + obj.complement + '" ,' : '' }
              ${ obj.neighborhood ? ' neighborhood: "' + obj.neighborhood + '" ,' : '' }
              ${ obj.zipcode ? ' zipcode: "' + obj.zipcode + '" ,' : '' }
              ${ obj.city ? ' city: "' + obj.city + '" ,' : '' }
              ${ obj.state ? ' state: "' + obj.state + '" ,' : '' }
            }
            ${ obj.hasOwnProperty("has_disability") ? ' has_disability: ' + obj.has_disability + ' ,' : '' }
            ${ obj.disabilities ? ' disabilities: [' + obj.disabilities + '] ,' : '' }
          )
          {
            email
          }
        }
      `)

      return new Promise( (resolve, reject) => {
        axios.post(ENDPOINT, params, { headers: { 'Authorization': rootState.tkn } }).then( resp => {
          resolve(resp.data)
        }, error => {
          reject(error);
        })
      })
    },


    uploadUserAvatar({ commit, rootState }, obj){
      let params = new URLSearchParams();
      params.append('query', `
        mutation {
          uploadUserAvatar(
            user_id: ${ rootState.user.profile.id },
            image_base64: "${ obj.image }"
          )
          {
            ${ obj.return || 'avatar' }
          }
        }
      `)

      return new Promise( (resolve, reject) => {
        axios.post(ENDPOINT, params, { headers: { 'Authorization': rootState.tkn } }).then( resp => {
          const response = resp.data;
          if(response.data && response.data['uploadUserAvatar'].avatar){
            commit('SET_PROFILE', { avatar: response.data['uploadUserAvatar'].avatar })
          }

          resolve(resp.data)
        }, error => {
          reject(error);
        })
      })
    },


    educationCreateUpdate({ rootState }, obj){
      obj = Vue.prototype.$helpers.removeSomeCaracters(obj);
      let params = new URLSearchParams();
      params.append('query', `
        mutation {
          educationCreateUpdate(
            user_id: ${ rootState.user.profile.id },
            ${ obj.source ? ' source: "' + obj.source + '" ' : rootState.source ? ' source: "' + rootState.source + '" ' : '' }
            ${ obj.education_id ? ' education_id: "' + obj.education_id + '" ' : '' }
            level: "${ obj.level }"
            country: "${ obj.country }"
            state: "${ obj.state }"
            institution: "${ obj.institution }"
            ${ obj.course ? ' course: "' + obj.course + '" ' : '' }
            ${ obj.campus ? ' campus: "' + obj.campus + '" ' : '' }
            start_date: "${ obj.start_date }"
            end_date: "${ obj.end_date }"
            ${ obj.period ? ' period: "' + obj.period + '" ' : '' }
            status: "${ obj.status }"
          )
          {
            ${ obj.return || 'id' }
          }
        }
      `)

      return new Promise( (resolve, reject) => {
        axios.post(ENDPOINT, params, { headers: { 'Authorization': rootState.tkn } }).then( resp => {

          resolve(resp.data)
        }, error => {
          reject(error);
        })
      })
    },

    educationDelete({ commit, rootState }, obj){
      let params = new URLSearchParams();
      params.append('query', `
        mutation {
          educationDelete(
            user_id: ${ rootState.user.profile.id },
            ${ obj.source ? ' source: "' + obj.source + '" ' : rootState.source ? ' source: "' + rootState.source + '" ' : '' }
            education_id: "${ obj.id }"
          ){
            success
          }
        }
      `)

      return new Promise( (resolve, reject) => {
        axios.post(ENDPOINT, params, { headers: { 'Authorization': rootState.tkn } }).then( resp => {
          const response = resp.data;

          if(response.data['educationDelete'].success){
            let currentDatas = rootState.user.profile.educations;
            let datasWithoutDeleted = currentDatas.filter(function(data) {
              return data.id !== obj.id;
            });

            commit('SET_PROFILE', { educations: datasWithoutDeleted })
          }

          resolve(response)
        }, error => {
          reject(error);
        })
      })
    },




    professionalExpCreateUpdate({ rootState }, obj){
      obj = Vue.prototype.$helpers.removeSomeCaracters(obj);
      let params = new URLSearchParams();
      params.append('query', `
        mutation {
          professionalExpCreateUpdate(
            user_id: ${ rootState.user.profile.id },
            ${ obj.source ? ' source: "' + obj.source + '" ' : rootState.source ? ' source: "' + rootState.source + '" ' : '' }
            ${ obj.professional_experience_id ? ' professional_experience_id: "' + obj.professional_experience_id + '" ' : '' }
            company: "${ obj.company }"
            responsabilities: "${ obj.responsabilities }"
            occupations: [{
              role: "${ obj.role }"
              startYear: "${ obj.startYear }"
              endYear: "${ obj.endYear }"
              area: "${ obj.area }"
              level: "${ obj.level }"
              currentOccupation: "${ obj.currentOccupation }"
            }]
          )
          {
            ${ obj.return || 'company' }
          }
        }
      `)

      return new Promise( (resolve, reject) => {
        axios.post(ENDPOINT, params, { headers: { 'Authorization': rootState.tkn } }).then( resp => {

          resolve(resp.data)
        }, error => {
          reject(error);
        })
      })
    },

    professionalExpDelete({ commit, rootState }, obj){
      let params = new URLSearchParams();
      params.append('query', `
        mutation {
          professionalExpDelete(
            user_id: ${ rootState.user.profile.id },
            ${ obj.source ? ' source: "' + obj.source + '" ' : rootState.source ? ' source: "' + rootState.source + '" ' : '' }
            professional_experience_id: "${ obj.id }"
          ){
            success
          }
        }
      `)

      return new Promise( (resolve, reject) => {
        axios.post(ENDPOINT, params, { headers: { 'Authorization': rootState.tkn } }).then( resp => {
          const response = resp.data;

          if(response.data['professionalExpDelete'].success){
            let currentDatas = rootState.user.profile.professionalExperiences;
            let datasWithoutDeleted = currentDatas.filter(function(data) {
              return data.id !== obj.id;
            });

            commit('SET_PROFILE', { professionalExperiences: datasWithoutDeleted })
          }

          resolve(response)
        }, error => {
          reject(error);
        })
      })
    },




    causeExpCreateUpdate({ rootState }, obj){
      obj = Vue.prototype.$helpers.removeSomeCaracters(obj);
      let params = new URLSearchParams();
      params.append('query', `
        mutation {
          causeExpCreateUpdate(
            user_id: ${ rootState.user.profile.id },
            ${ obj.source ? ' source: "' + obj.source + '" ' : rootState.source ? ' source: "' + rootState.source + '" ' : '' }
            ${ obj.cause_experience_id ? ' cause_experience_id: "' + obj.cause_experience_id + '" ' : '' }
            organization: "${ obj.organization }"
            area: "${ obj.area }"
            start_date: "${ obj.start_date }"
            end_date: "${ obj.end_date }"
            country: "${ obj.country }",
            responsabilities: "${ obj.responsabilities }",
          )
          {
            ${ obj.return || 'organization' }
          }
        }
      `)

      return new Promise( (resolve, reject) => {
        axios.post(ENDPOINT, params, { headers: { 'Authorization': rootState.tkn } }).then( resp => {

          resolve(resp.data)
        }, error => {
          reject(error);
        })
      })
    },

    causeExpDelete({ commit, rootState }, obj){
      let params = new URLSearchParams();
      params.append('query', `
        mutation {
          causeExpDelete(
            user_id: ${ rootState.user.profile.id },
            ${ obj.source ? ' source: "' + obj.source + '" ' : rootState.source ? ' source: "' + rootState.source + '" ' : '' }
            cause_experience_id: "${ obj.id }"
          ){
            success
          }
        }
      `)

      return new Promise( (resolve, reject) => {
        axios.post(ENDPOINT, params, { headers: { 'Authorization': rootState.tkn } }).then( resp => {
          const response = resp.data;

          if(response.data['causeExpDelete'].success){
            let currentDatas = rootState.user.profile.causeExperiences;
            let datasWithoutDeleted = currentDatas.filter(function(data) {
              return data.id !== obj.id;
            });

            commit('SET_PROFILE', { causeExperiences: datasWithoutDeleted })
          }

          resolve(response)
        }, error => {
          reject(error);
        })
      })
    },



    languageCreateUpdate({ rootState }, obj){
      obj = Vue.prototype.$helpers.removeSomeCaracters(obj);
      let params = new URLSearchParams();
      params.append('query', `
        mutation {
          languageCreateUpdate(
            user_id: ${ rootState.user.profile.id },
            ${ obj.source ? ' source: "' + obj.source + '" ' : rootState.source ? ' source: "' + rootState.source + '" ' : '' }
            ${ obj.language_proficiency_id ? ' language_proficiency_id: "' + obj.language_proficiency_id + '" ' : '' }
            language: "${ obj.language }"
            proficiency: "${ obj.proficiency }"
          )
          {
            ${ obj.return || 'language' }
          }
        }
      `)

      return new Promise( (resolve, reject) => {
        axios.post(ENDPOINT, params, { headers: { 'Authorization': rootState.tkn } }).then( resp => {

          resolve(resp.data)
        }, error => {
          reject(error);
        })
      })
    },

    languageDelete({ commit, rootState }, obj){
      let params = new URLSearchParams();
      params.append('query', `
        mutation {
          languageDelete(
            user_id: ${ rootState.user.profile.id },
            ${ obj.source ? ' source: "' + obj.source + '" ' : rootState.source ? ' source: "' + rootState.source + '" ' : '' }
            language_proficiency_id: "${ obj.id }"
          ){
            success
          }
        }
      `)

      return new Promise( (resolve, reject) => {
        axios.post(ENDPOINT, params, { headers: { 'Authorization': rootState.tkn } }).then( resp => {
          const response = resp.data;

          if(response.data['languageDelete'].success){
            let currentDatas = rootState.user.profile.languageProficiencies;
            let datasWithoutDeleted = currentDatas.filter(function(data) {
              return data.id !== obj.id;
            });

            commit('SET_PROFILE', { languageProficiencies: datasWithoutDeleted })
          }

          resolve(response)
        }, error => {
          reject(error);
        })
      })
    },


    acknowledgementCreateUpdate({ rootState }, obj){
      obj = Vue.prototype.$helpers.removeSomeCaracters(obj);
      let params = new URLSearchParams();
      params.append('query', `
        mutation {
          acknowledgementCreateUpdate(
            user_id: ${ rootState.user.profile.id },
            ${ obj.source ? ' source: "' + obj.source + '" ' : rootState.source ? ' source: "' + rootState.source + '" ' : '' }
            ${ obj.acknowledgement_id ? ' acknowledgement_id: "' + obj.acknowledgement_id + '" ' : '' }
            description: "${ obj.description }"
            title: "${ obj.title }"
            date: "${ obj.date }"
          )
          {
            ${ obj.return || 'title' }
          }
        }
      `)

      return new Promise( (resolve, reject) => {
        axios.post(ENDPOINT, params, { headers: { 'Authorization': rootState.tkn } }).then( resp => {

          resolve(resp.data)
        }, error => {
          reject(error);
        })
      })
    },

    acknowledgementDelete({ commit, rootState }, obj){
      let params = new URLSearchParams();
      params.append('query', `
        mutation {
          acknowledgementDelete(
            user_id: ${ rootState.user.profile.id },
            ${ obj.source ? ' source: "' + obj.source + '" ' : rootState.source ? ' source: "' + rootState.source + '" ' : '' }
            acknowledgement_id: "${ obj.id }"
          ){
            success
          }
        }
      `)

      return new Promise( (resolve, reject) => {
        axios.post(ENDPOINT, params, { headers: { 'Authorization': rootState.tkn } }).then( resp => {
          const response = resp.data;

          if(response.data['acknowledgementDelete'].success){
            let currentDatas = rootState.user.profile.acknowledgements;
            let datasWithoutDeleted = currentDatas.filter(function(data) {
              return data.id !== obj.id;
            });

            commit('SET_PROFILE', { acknowledgements: datasWithoutDeleted })
          }

          resolve(response)
        }, error => {
          reject(error);
        })
      })
    },

    certificationCreateUpdate({ commit, rootState }, obj){
      obj = Vue.prototype.$helpers.removeSomeCaracters(obj);
      let params = new URLSearchParams();
      params.append('query', `
        mutation {
          certificationCreateUpdate(
            user_id: ${ rootState.user.profile.id },
            ${ obj.source ? ' source: "' + obj.source + '" ' : rootState.source ? ' source: "' + rootState.source + '" ' : '' }
            ${ obj.id ? ' id: "' + obj.id + '" ' : '' }
            code: "${ obj.code }"
            description: "${ obj.description }"
            expires_at: "${ obj.expires_at }"
          )
          {
            ${ obj.return || 'description' }
          }
        }
      `)

      return new Promise( (resolve, reject) => {
        axios.post(ENDPOINT, params, { headers: { 'Authorization': rootState.tkn } }).then( resp => {

          resolve(resp.data)
        }, error => {
          reject(error);
        })
      })
    },

    certificationDelete({ commit, rootState }, obj){
      let params = new URLSearchParams();
      params.append('query', `
        mutation {
          certificationDelete(
            user_id: ${ rootState.user.profile.id },
            ${ obj.source ? ' source: "' + obj.source + '" ' : rootState.source ? ' source: "' + rootState.source + '" ' : '' }
            id: "${ obj.id }"
          ){
            success
          }
        }
      `)

      return new Promise( (resolve, reject) => {
        axios.post(ENDPOINT, params, { headers: { 'Authorization': rootState.tkn } }).then( resp => {
          const response = resp.data;

          if(response.data['certificationDelete'].success){
            let currentDatas = rootState.user.profile.certifications;
            let datasWithoutDeleted = currentDatas.filter(function(data) {
              return data.id !== obj.id;
            });

            commit('SET_PROFILE', { certifications: datasWithoutDeleted })
          }

          resolve(response)
        }, error => {
          reject(error);
        })
      })
    },


    skillsCreateUpdate({ commit, rootState }, obj){
      let params = new URLSearchParams();
      params.append('query', `
        mutation {
          skillsCreateUpdate(
            user_id: ${ rootState.user.profile.id },
            ${ obj.source ? ' source: "' + obj.source + '" ' : rootState.source ? ' source: "' + rootState.source + '" ' : '' }
            skills: [${ obj.skills.map(i => '"' + i + '"') }]
          )
          {
            ${ obj.return || 'success' }
          }
        }
      `)

      return new Promise( (resolve, reject) => {
        axios.post(ENDPOINT, params, { headers: { 'Authorization': rootState.tkn } }).then( resp => {

          resolve(resp.data)
        }, error => {
          reject(error);
        })
      })
    },




    // Segue a empresa
    followCompany({ commit, rootState }, obj){
      let params = new URLSearchParams();
      params.append('query', `
        mutation {
          followCompany(
            user_id: ${ rootState.user.profile.id },
            company_id: ${ rootState.companyId }
          )
          { success }
        }
      `)

      return new Promise( (resolve, reject) => {
        axios.post(ENDPOINT, params, { headers: { 'Authorization': rootState.tkn } }).then( resp => {
          const response = resp.data;

          commit('SET_FOLLOWER', response.data.followCompany.success)

          resolve(response)
        }, error => {
          reject(error);
        })
      })
    },


    // Valida se o usuário já é seguidor da empresa
    companyFollow({ commit, rootState }, obj){
      let params = new URLSearchParams();
      let isFollower = localStorage.getItem('follower');
      if(isFollower){
        commit('SET_FOLLOWER', isFollower);
        return;
      };

      params.append('query', `
        query {
          companyFollow(userId: ${ rootState.user.profile.id }, companyId: ${ rootState.companyId }) {
            id,
            userId,
            companyId
          }
        }
      `)

      var variables = JSON.stringify({ "encrypt_user_id": true });
      params.append('variables', variables);

      return new Promise( (resolve, reject) => {
        axios.post(ENDPOINT, params, { headers: { 'Authorization': rootState.tkn } }).then( resp => {
          const response = resp.data;

          commit('SET_FOLLOWER', response.data.companyFollow.length > 0)

          resolve(response)
        }, error => {
          reject(error);
        })
      })
    },




    acceptTermsOfUse({ commit, rootState }, obj){
      let params = new URLSearchParams();
      params.append('query', `
        mutation {
          acceptTermsOfUse(
            user_id: ${ rootState.user.profile.id },
            company_id: ${ rootState.companyId },
            ${ obj.source ? ' source: "' + obj.source + '" ' : rootState.source ? ' source: "' + rootState.source + '" ' : '' }
          )
          { success }
        }
      `)

      return new Promise( (resolve, reject) => {
        axios.post(ENDPOINT, params, { headers: { 'Authorization': rootState.tkn } }).then( resp => {
          const response = resp.data;

          resolve(response)
        }, error => {
          reject(error);
        })
      })
    },




    forgotUser({ rootState }, obj){
      let params = new URLSearchParams();
      params.append('query', `
        query {
          users(cpf: "${ obj.cpf }") {
            email
          }
        }
      `)

      return new Promise( (resolve, reject) => {
        axios.post(ENDPOINT, params, { headers: { 'Authorization': rootState.tkn } }).then( resp => {
          const response = resp.data;
          resolve(response)
        }, error => {
          reject(error);
        })
      })
    },


    removeUser({ commit, rootState }, obj){
      let params = new URLSearchParams();
      params.append('query', `
        mutation {
          removeUser(
            user_id: ${ rootState.user.profile.id },
          )
          { success }
        }
      `)

      return new Promise( (resolve, reject) => {
        axios.post(ENDPOINT, params, { headers: { 'Authorization': rootState.tkn } }).then( resp => {
          const response = resp.data;

          resolve(response)
        }, error => {
          reject(error);
        })
      })
    },

    generateTokenChangeEmail({ rootState }, obj){
      let params = new URLSearchParams();
      params.append('query', `
        mutation {
          generateTokenChangeEmail(
            user_id: ${ obj.id },
          )
          {
            generateToken
          }
        }
      `);

      return new Promise( (resolve, reject) => {
        axios.post(ENDPOINT, params, { headers: { 'Authorization': rootState.tkn } }).then( resp => {
          const response = resp.data;

          resolve(response);
        }, error => {
          reject(error);
        })
      })
    },



    profileExternalBase({ rootState, commit }, obj) {
      let params = new URLSearchParams();
      params.append('query', `
        mutation {
          profileExternalBase(
            token: "${obj.token}"
          )
        }
      `)

      return new Promise((resolve, reject) => {
        axios.post(ENDPOINT, params, { headers: { 'Authorization': rootState.tkn } }).then(resp => {
          const profileExternalBase = resp.data.data.profileExternalBase;

          if(!profileExternalBase.error){
            commit('SET_PROFILE_EXTERNAL_BASE', profileExternalBase);
          }

          resolve(profileExternalBase)
        }, error => {
          reject(error);
        })
      })
    },

    validTokenEmail({ rootState }, obj){
      let params = new URLSearchParams();
      params.append('query', `
        {
          validTokenEmail(
            userId: "${ obj.id }",
            token:  "${ obj.token }"
          )
          {
            valid
          }
        }
      `);

      return new Promise( (resolve, reject) => {
        axios.post(ENDPOINT, params, { headers: { 'Authorization': rootState.tkn } }).then( resp => {
          const response = resp.data;

          resolve(response);
        }, error => {
          reject(error);
        })
      })
    },


    integrateProfileExternalBase({ rootState, commit }, obj) {
      let params = new URLSearchParams();
      params.append('query', `
        mutation {
          integrateProfileExternalBase(
            user_id: ${ rootState.user.profile.id },
            email: "${obj.email}",
            ${ obj.cpf ? ' cpf: "' + obj.cpf + '" ' : '' }
            ${ obj.passport ? ' passport: "' + obj.passport + '" ' : '' }
          )
        }
      `)

      return new Promise((resolve, reject) => {
        axios.post(ENDPOINT, params, { headers: { 'Authorization': rootState.tkn } }).then(resp => {
          const integrateProfileExternalBase = resp.data.data.integrateProfileExternalBase;

          resolve(integrateProfileExternalBase)
        }, error => {
          reject(error);
        })
      })
    },

    conversionRDStation({ dispatch, rootState }, obj){
      return new Promise( async (resolve, reject) => {
        if(!rootState.user.profile){
          resolve();
          return;
        };

        await dispatch('graphql_queries/query', `user( id: "${ rootState.user.profile.id }" ){
          profile{
            email,
            location { stateId, city }
          }
        }`, { root: true });

        let payload = {
          conversion_identifier: obj.conversion_identifier,
          email: rootState.user.profile.email
        };

        if(rootState.user.profile.name){
          payload.name = rootState.user.profile.name;
        }

        if(rootState.user.profile.location && rootState.user.profile.location.stateId && rootState.domains.states.find(st => st.id == rootState.user.profile.location.stateId) ){
          payload.state = rootState.domains.states.find(st => st.id == rootState.user.profile.location.stateId)['abbr'];
        }

        if(rootState.user.profile.location && rootState.user.profile.location.city){
          payload.city = rootState.user.profile.location.city;
        }

        axios.post('https://api.rd.services/platform/conversions?api_key=d9c26098af26e3f62983bb7227d0fb34', {
          event_type: 'CONVERSION',
          event_family: 'CDP',
          payload: payload
        }).then(resp => {
          resolve(resp);
        });
      });
    },


    changeEmail({ rootState }, obj){
      let params = new URLSearchParams();
      params.append('query', `
        mutation {
          changeEmail(
            user_id: ${ obj.id },
            token:  ${ obj.token },
            email:  "${ obj.email }",
          )
          {
            email
          }
        }
      `);

      return new Promise( (resolve, reject) => {
        axios.post(ENDPOINT, params, { headers: { 'Authorization': rootState.tkn } }).then( resp => {
          const response = resp.data;
          resolve(response);
        }, error => {
          reject(error);
        })
      })
    },



    validateMagazineLuizaEmployees({ rootState }, obj){
      let checkMlContributor = localStorage.getItem('mlContributor');
      let checkMlContributorDate = localStorage.getItem('mlContributorDate');

      const isToday = (someDate) => {
        const today = new Date()
        return someDate.getDate() == today.getDate() &&
          someDate.getMonth() == today.getMonth() &&
          someDate.getFullYear() == today.getFullYear()
      }

      if(checkMlContributor && checkMlContributorDate && isToday(new Date(checkMlContributorDate))){
        return checkMlContributor;
      }

      let params = new URLSearchParams();
      params.append('query', `
        mutation {
          validateMagazineLuizaEmployees(
            cpf:  "${ obj.cpf }",
          )
          {
            contributor
          }
        }
      `);

      return new Promise( (resolve, reject) => {
        axios.post(ENDPOINT, params, { headers: { 'Authorization': rootState.tkn } }).then( resp => {
          const response = resp.data;
          let isContributor = false;

          if(!response.error){
            isContributor = response.data.validateMagazineLuizaEmployees.contributor;
            localStorage.setItem('mlContributor', isContributor);
            localStorage.setItem('mlContributorDate', new Date().toString());
          }

          resolve(isContributor);
        }, error => {
          reject(error);
        })
      })
    },

    uploadMedicalReport({ rootState }, obj){
      let params = new URLSearchParams();
      params.append('query', `
        mutation {
          uploadUserDocument(
            user_id: ${ rootState.user.profile.id },
            document_base64: "${obj.document_base64}",
            original_filename: "${obj.original_filename}"
          )
          {
            id
            file
            name
          }
          }
      `);

      return new Promise( (resolve, reject) => {
        axios.post(ENDPOINT, params, { headers: { 'Authorization': rootState.tkn } }).then( resp => {
          const response = resp.data;
          resolve(response);
        }, error => {
          reject(error);
        })
      })
    },

    removeMedicalReports({ rootState }, obj){
      let params = new URLSearchParams();
      params.append('query', `
        mutation {
          removeUserLaudo(
            user_id: ${ rootState.user.profile.id },
            medical_report_id: ${obj.id}
          ){
            success
          }
        }
      `);

      return new Promise( (resolve, reject) => {
        axios.post(ENDPOINT, params, { headers: { 'Authorization': rootState.tkn } }).then( resp => {
          const response = resp.data;
          resolve(response);
        }, error => {
          reject(error);
        })
      })
    },

    confirmEvent({ rootState }, obj){
      let params = new URLSearchParams();
      params.append('query', `
        mutation {
          confirmEvent(
            ${ obj.opportunity_id ? ' opportunity_id: ' + obj.opportunity_id + ' ,' : '' }
            user_id: ${ rootState.user.profile.id },
            ${ obj.event_id ? ' event_id: ' + obj.event_id + ' ,' : '' }
            ${ obj.address_id ? ' address_id: ' + obj.address_id + ' ,' : '' }
            ${ obj.room_id ? ' room_id: ' + obj.room_id + ' ,' : '' }
            ${ obj.schedule_id ? ' schedule_id: ' + obj.schedule_id + ' ,' : '' }
            ${ obj.chosen_date ? ' chosen_date: "' + obj.chosen_date + '" ,' : '' }
          ){
            success
          }
        }
      `);

      return new Promise( (resolve, reject) => {
        axios.post(ENDPOINT, params, { headers: { 'Authorization': rootState.tkn } }).then( resp => {
          const response = resp.data;
          resolve(response);
        }, error => {
          reject(error);
        })
      })
    },

    refuseEvent({ rootState }, obj){
      let params = new URLSearchParams();
      params.append('query', `
        mutation {
          refuseEvent(
            opportunity_id: ${obj.opportunity_id},
            user_id: ${ rootState.user.profile.id },
            ${ obj.event_id ? ' event_id: ' + obj.event_id + ' ,' : '' }
          ){
            success
          }
        }
      `);

      return new Promise( (resolve, reject) => {
        axios.post(ENDPOINT, params, { headers: { 'Authorization': rootState.tkn } }).then( resp => {
          const response = resp.data;
          resolve(response);
        }, error => {
          reject(error);
        })
      })
    },

    cancelEventDecision({ rootState }, obj){
      let params = new URLSearchParams();
      params.append('query', `
        mutation {
          cancelEventDecision(
            opportunity_id: ${obj.opportunity_id},
            user_id: ${ rootState.user.profile.id },
            ${ obj.event_id ? ' event_id: ' + obj.event_id + ' ,' : '' }
            ${ obj.address_id ? ' address_id: ' + obj.address_id + ' ,' : '' }
            ${ obj.room_id ? ' room_id: ' + obj.room_id + ' ,' : '' }
            ${ obj.schedule_id ? ' schedule_id: ' + obj.schedule_id + ' ,' : '' }
          ){
            success
          }
        }
      `);

      return new Promise( (resolve, reject) => {
        axios.post(ENDPOINT, params, { headers: { 'Authorization': rootState.tkn } }).then( resp => {
          const response = resp.data;
          resolve(response);
        }, error => {
          reject(error);
        })
      })
    },

  }
}