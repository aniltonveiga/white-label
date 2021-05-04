
import axios from "axios"
import Vue from "vue"

export default {

  namespaced: true,

  state: {
    all: [],
    uniqueTitles: [],
    searchTerm: '',
    currentOpportunity: {},

    subscriptions: []
  },

  mutations: {
    ADD_OPPORTUNITY(state, payload){
      // Adiciona as oportunidades do state, mas antes verifica se ela ainda não existe
      // Adiciona titles que ainda nao existem no uniqueTitles para ter um array só com titles
      payload.map( opportunity => {
        if( !state.all.find( o => o.links.subscription === opportunity.links.subscription ) ){
          let subscriptionLink = opportunity.links.subscription.split('/');
          opportunity.slug = subscriptionLink[subscriptionLink.length-1];
          state.all.push(opportunity);
          state.uniqueTitles.indexOf(opportunity.title) === -1 && state.uniqueTitles.push( opportunity.title );
        }
      })
    },

    CLEAR_OPPORTUNITIES(state, payload){
      // Limpa state de oportunidades
      state.all = [];
    },

    ADD_SEARCH_JOB_TERM(state, payload){
      // Adiciona o termo buscado pelo usuario
      state.searchTerm = payload;
    },

    CLEAR_SEARCH_JOB_TERM(state, payload){
      // Remove o termo buscado pelo usuario
      state.searchTerm = "";
    },

    SET_SUBSCRIPTIONS(state, payload){
      // Adiciona as inscricoes do state, mas antes verifica se ela ainda não existe
      payload.map( subscription => {
        const exists = state.subscriptions.findIndex( s => s.id === subscription.id );

        if( exists === -1 ){
          state.subscriptions.push(subscription);
        }else{
          state.subscriptions[exists] = subscription;
        }
      })
    },

    SET_SPECIFIC_SUBSCRIPTION(state, payload){
      if(!payload.opportunityId) return;
      const old_subscriptions = state.subscriptions;
      const indexToReplace = old_subscriptions.findIndex(s => s.opportunityId == payload.opportunityId);
      if(indexToReplace >= 0){
        // old_subscriptions[indexToReplace] = payload;
        state.subscriptions[indexToReplace] = payload;
      }
    },

    CLEAR_SUBSCRIPTIONS(state){
      // Limpa state de inscricoes
      state.subscriptions = [];
    },

    SET_CURRENT_OPPORTUNITY(state, payload){
      state.currentOpportunity = payload;
    }
  },

  getters: {},

  actions: {
    setRIOpportunities({ commit, dispatch, rootState }, obj){
      return dispatch('setOpportunities', {
        ...obj,
        internal_recruitment: true
      });
    },

    setOpportunities({ commit, dispatch, rootState }, obj){
      let params = '';
      let header = { headers: { 'Authorization': rootState.tkn } }; // Pega o token contido no store da aplicacao root

      // Criamos alguns parametros de acordo com o objeto vindo
      if( obj && obj.internal_recruitment ){ params += '&internal_recruitment=' + obj.internal_recruitment };
      if( obj && obj.page ){ params += '&page=' + obj.page };
      if( obj && obj.collection ){ params += '&collection=' + obj.collection };
      if( obj && obj.jobName ){ params += '&q=' + obj.jobName };
      if( obj && obj.cities && obj.cities.length > 0 ){ params += '&city=' + Vue.prototype.$helpers.cleanStringToCompare(obj.cities.join('&city=')) };
      if( obj && obj.pcd ){ params += '&pcd=' + obj.pcd };
      if( obj && obj.temporary ){ params += '&temporary=' + obj.temporary };
      if( obj && obj.level && obj.level.length > 0 ){ params += obj.level.constructor === Array ? '&level[]=' + obj.level.join('&level[]=') : '&level=' + obj.level }
      if( obj && obj.filial ){ params += '&filial=' + obj.filial };
      if( obj && obj.city ){ params += '&city=' + Vue.prototype.$helpers.cleanStringToCompare(obj.city) };
      if( obj && obj.states ){ params += '&states=' + obj.states };
      if( obj && obj.neighborhoods ){ params += '&bairro=' + obj.neighborhoods };
      if( obj && obj.company_field_area && obj.company_field_area.length > 0 ){ params += '&company_field_area=' + obj.company_field_area.join(',') };
      if( obj && obj.company_field_nivel && obj.company_field_nivel.length > 0 ){ params += '&company_field_nivel=' + obj.company_field_nivel.join(',') };

      return new Promise( (resolve, reject) => {
        axios.get(`${Vue.prototype.OPPORTUNITIES_ENDPOINT}/v1/opportunities?${params}`, header).then( resp => {
          const list = resp.data.opportunities;
          commit('ADD_OPPORTUNITY', list);
          // dispatch('getSubscriptions')
          dispatch('subscriptionsWithPagination', {
            page: obj && obj.page ? obj.page : 1
          });
          resolve(list);
        }, error => {
          reject(error);
        })
      })
    },

    getOpportunity({ dispatch, commit, rootState }, id){
      let header = { headers: { 'Authorization': rootState.tkn } }; // Pega o token contido no store da aplicacao root

      return new Promise( (resolve, reject) => {
        axios.get(`${Vue.prototype.OPPORTUNITIES_ENDPOINT}/v1/opportunities/${id}`, header).then( resp => {
          let opportunity = resp.data.opportunity[0];

          if(opportunity){
            let opportunity_slug = opportunity.links.subscription.split('/');
            opportunity.slug = opportunity_slug[opportunity_slug.length-1];
            dispatch('isEnrolled', { opportunityId: opportunity.id }).then((isEnrolled) => {
              commit('SET_SUBSCRIPTIONS', isEnrolled);
            });
            commit('SET_CURRENT_OPPORTUNITY', opportunity);
          }

          resolve(opportunity);
        }, error => {
          reject(error);
        })
      })
    },

    isEnrolled({ rootState }, obj){
      if(!rootState.user.profile) return [];

      let params = new URLSearchParams();
      params.append('query', `
        query {
          subscriptions(
            opportunityId: ${ obj.opportunityId }
            userId: "${rootState.user.profile.id}",
          )
          {
            id,
            opportunityId
          }
        }
      `);

      return new Promise( (resolve, reject) => {
        axios.post(Vue.prototype.API_ENDPOINT + "/graphql", params, { headers: { 'Authorization': rootState.tkn } }).then( resp => {
          const isEnrolled = resp.data.data.subscriptions;

          resolve(isEnrolled);
        }, error => {
          reject(error);
        })
      })
    },

    getSubscriptions({ commit, rootState }){
      if( !rootState.user.profile ) return false

      let params = new URLSearchParams();
      params.append('query', `
        query {
          subscriptions(
            limit: 20,
            userId: "${rootState.user.profile.id}",
            companyId: ${rootState.companyId},
            ${ 'onlyRI' in rootState ? ' internalRecruitment: "' + rootState.onlyRI + '" ,' : '' }
          )
          {
            id,
            opportunityId,
            slug,
            deletedAt,
            isDeleted,
            createdAt,
            opportunity {
              title,
              address {
                street,
                number,
                neighborhood,
                city,
                stateAbbr
              },
            }
            company {
              id
            }
            events {
              id
              opportunityId
              title
              date
              addressId
              address
              roomId
              room
              scheduleId
              schedule
              status
              confirmedAt
            }
          }
        }
      `)

      return new Promise( (resolve, reject) => {
        axios.post(Vue.prototype.API_ENDPOINT + "/graphql", params, { headers: { 'Authorization': rootState.tkn } }).then( resp => {
          const subscriptionsReturn = resp.data.data.subscriptions;

          commit('SET_SUBSCRIPTIONS', subscriptionsReturn)
          resolve()
        }, error => {
          reject(error);
        })
      })
    },


    subscriptionsWithPagination({ commit, rootState }, obj = {}){
      if( !rootState.user.profile ) return false;
      let params = new URLSearchParams();
      let getOnlineTests = '';

      if(obj.getOnlineTests){
        getOnlineTests = `
          onlineTests {
            records,
            showMindsightQuestion,
            error
          }
        `;
      }

      params.append('query', `
        query {
          subscriptionsWithPagination(
            companyId: ${obj.companyId || rootState.companyId},
            userId: "${rootState.user.profile.id}",
            limit: 20,
            page: ${ obj.page || 1 }
          ){
            records {
              id,
              opportunityId,
              slug,
              deletedAt,
              isDeleted,
              createdAt,
              opportunity {
                title,
                address {
                  street,
                  number,
                  neighborhood,
                  city,
                  stateAbbr
                },
              }
              company {
                id
              }
              ${ getOnlineTests }
            },

            meta
          }
        }
      `);

      return new Promise( (resolve, reject) => {
        axios.post(Vue.prototype.API_ENDPOINT + "/graphql", params, { headers: { 'Authorization': rootState.tkn } }).then( resp => {
          const subscriptionsWithPagination = resp.data.data.subscriptionsWithPagination.records;
          commit('SET_SUBSCRIPTIONS', subscriptionsWithPagination);
          resolve(resp.data.data.subscriptionsWithPagination);
        }, error => {
          reject(error);
        })
      })
    },


    subscriptionQuestions({ rootState }, id){
      let params = new URLSearchParams();
      params.append('query', `
        query {
          subscriptionQuestions(
            opportunityId: "${id}"
          )
          {
            id,
            opportunityId,
            htmlType,
            title,
            hint,
            options,
            required,
            slug,
            candidate
          }
        }
      `)

      return new Promise( (resolve, reject) => {
        axios.post(Vue.prototype.API_ENDPOINT + "/graphql", params, { headers: { 'Authorization': rootState.tkn } }).then( resp => {
          const subscriptionQuestions = resp.data.data.subscriptionQuestions;

          resolve(subscriptionQuestions)
        }, error => {
          reject(error);
        })
      })
    },

    listQuestionFiles({ rootState }, obj){
      let params = new URLSearchParams();
      params.append('query', `
          query {
            listQuestionFiles(questionId: ${obj.questionId}) {
              id,
              name,
              file
            }
          }
      `)

      return new Promise( (resolve, reject) => {
        axios.post(Vue.prototype.API_ENDPOINT + "/graphql", params, { headers: { 'Authorization': rootState.tkn } }).then( resp => {
          const listQuestionFiles = resp.data.data.listQuestionFiles;
          resolve(listQuestionFiles)
        }, error => {
          reject(error);
        })
      })
    },

    uploadFilesQuestion({ rootState }, obj){
      let params = new URLSearchParams();
      params.append('query', `
        mutation {
          uploadFilesQuestion(
            user_id: ${ rootState.user.profile.id },
            question_id: ${obj.question_id},
            document_base64: "${obj.document_base64}",
            original_filename: "${obj.original_filename}"
          ){
            id
            file
            name
          }
        }
      `)

      return new Promise( (resolve, reject) => {
        axios.post(Vue.prototype.API_ENDPOINT + "/graphql", params, { headers: { 'Authorization': rootState.tkn } }).then( resp => {
          const uploadFilesQuestion = resp.data.data.uploadFilesQuestion;
          resolve(uploadFilesQuestion)
        }, error => {
          reject(error);
        })
      })
    },

    removeAttachedFile({ rootState }, obj){
      let params = new URLSearchParams();
      params.append('query', `
        mutation {
          removeAttachedFile(
            document_id:  ${obj.id},
          ){
            id
          }
        }
      `)

      return new Promise( (resolve, reject) => {
        axios.post(Vue.prototype.API_ENDPOINT + "/graphql", params, { headers: { 'Authorization': rootState.tkn } }).then( resp => {
          const removeAttachedFile = resp.data;
          resolve(removeAttachedFile)
        }, error => {
          reject(error);
        })
      })
    },

    validateCandidateEliminatoryQuestions({ rootState }, obj){
      let params = new URLSearchParams();
      params.append('query', `
        mutation {
          validateCandidateEliminatoryQuestions(
            opportunity_id: ${obj.opportunity_id},
            questions: [${ obj.questions.map( item => {
              return '{ question: "'+ item.title +'", answer: "'+ item.answer +'", slug: "'+ item.slug +'", candidate: "'+ item.candidate +'" }'
            }) }],
          )
          {
            subscribe,
            template
          }
        }
      `)

      return new Promise( (resolve, reject) => {
        axios.post(Vue.prototype.API_ENDPOINT + "/graphql", params, { headers: { 'Authorization': rootState.tkn } }).then( resp => {
          const validateCandidateEliminatoryQuestions = resp.data.data.validateCandidateEliminatoryQuestions;

          resolve(validateCandidateEliminatoryQuestions)
        }, error => {
          reject(error);
        })
      })
    },



    subscriptionNew({ rootState }, obj){
      obj = Vue.prototype.$helpers.removeSomeCaracters(obj);
      let params = new URLSearchParams();

      params.append('query', `
        mutation {
          subscriptionNew(
            opportunity_id: ${obj.opportunity_id},
            user_id: ${rootState.user.profile.id},
            source: "${ obj.source || 'companypage' }",
            ${ obj.indication_form ? 'indication: { name: "'+ obj.indication_form.name +'", email: "'+ obj.indication_form.email +'" }' : '' }
            origin_company: ${rootState.companyId},
            questions: [${ obj.questions.map( item => {
              return '{ question: "'+ item.title +'", answer: "'+ item.answer +'", slug: "'+ item.slug +'", candidate: "'+ item.candidate +'" }'
            }) }],
            ${ obj.send_confirmed_email ? ' send_confirmed_email: ' + obj.send_confirmed_email + ' ,' : '' }
            ${ obj.ignore_online_tests ? ' ignore_online_tests: ' + obj.ignore_online_tests + ' ,' : '' }
          )
          {
            id
          }
        }
      `)

      return new Promise( (resolve, reject) => {
        axios.post(Vue.prototype.API_ENDPOINT + "/graphql", params, { headers: { 'Authorization': rootState.tkn } }).then( resp => {
          const subscriptionCreate = resp.data;

          resolve(subscriptionCreate)
        }, error => {
          reject(error);
        })
      })
    },



    subscriptionLogicalDelete({ rootState, commit }, obj){
      let params = new URLSearchParams();

      params.append('query', `
        mutation {
          subscriptionLogicalDelete(
            subscription_id: "${obj.subscription_id}",
            user_id: ${rootState.user.profile.id},
            user_name: "${rootState.user.profile.name}"
          )
          {
            deletedAt,
            isDeleted
          }
        }
      `)

      return new Promise( (resolve, reject) => {
        axios.post(Vue.prototype.API_ENDPOINT + "/graphql", params, { headers: { 'Authorization': rootState.tkn } }).then( resp => {
          const response = resp.data;

          if( !response.error ){
            const subscriptionLogicalDelete = response.data['subscriptionLogicalDelete'];
            const currentSubscriptions = rootState.opportunities.subscriptions;
            const foundIndex = currentSubscriptions.findIndex(x => x.id == obj.subscription_id);

            currentSubscriptions[foundIndex]['deletedAt'] = subscriptionLogicalDelete.deletedAt;
            currentSubscriptions[foundIndex]['isDeleted'] = subscriptionLogicalDelete.isDeleted;
            commit('SET_SUBSCRIPTIONS', currentSubscriptions);
          }

          resolve(response)
        }, error => {
          reject(error);
        })
      })
    },



    eligibilityItau({ rootState }, obj){
      let params = new URLSearchParams();
      let eligibilities = Vue.prototype.eligibilities || {};

      // Se a elegibilidade já foi feita nessa sessão, ela está armazenada. é só devolver
      if(eligibilities && eligibilities[obj.opportunity_id]){
        return eligibilities[obj.opportunity_id];
      }

      // NENHUMA elegibilidade buscada por enquanto, setamos um objeto vazio
      if(Object.keys(eligibilities).length == 0){
        Vue.prototype.eligibilities = {};
      }

      params.append('query', `
        mutation {
          eligibilityItau(
            opportunity_id: "${obj.opportunity_id}",
            user_id: "${rootState.user.profile.id}",
            development: ${obj.development}
          )
          {
            eligible,
            messages
          }
        }
      `)

      return new Promise( (resolve, reject) => {
        axios.post(Vue.prototype.API_ENDPOINT + "/graphql", params, { headers: { 'Authorization': rootState.tkn } }).then( resp => {
          const eligibilityItau = resp.data;
          if(!eligibilityItau.error){ Vue.prototype.eligibilities[obj.opportunity_id] = eligibilityItau }

          resolve(eligibilityItau)
        }, error => {
          reject(error);
        })
        .catch(error => {
          reject(error);
        })
      })
    },



  }

}