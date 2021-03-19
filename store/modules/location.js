
import axios from "axios"
import Vue from "vue"

const ENDPOINT = Vue.prototype.API_ENDPOINT + "/graphql";

export default {

  namespaced: true,

  state: {
    userLocation: null,
    states: [],
    cities: [],
  },
  
  mutations: {
    ADD_STATES(state, payload){
      // Salva os estados
      state.states = payload;
    },
    
    ADD_CITIES(state, payload){
      // Salva as cidades
      state.cities = payload;
    },
    
    ADD_USER_LOCATION(state, payload){
      // Salva a localizacao atual do usuario
      state.userLocation = payload;
    }
  },
  
  getters: {},
  
  actions: {
    setStates({ state, commit, rootState }, obj){
      return new Promise( (resolve, reject) => {
    
        if( localStorage.getItem('states') ){      
          const _states = localStorage.getItem('states');
          // commit('ADD_STATES', JSON.parse(_states));
          commit('domains/SET_STATES', JSON.parse(_states), { root: true });
          resolve(JSON.parse(_states));
    
        }else{
          let params = new URLSearchParams();
          params.append('query', `
            query {
              domains{
                states{ id, name, abbr }
              }
            }
          `)
    
          return new Promise( (resolve, reject) => {
            axios.post(ENDPOINT, params, { headers: { 'Authorization': rootState.tkn } }).then( resp => {
              const states = resp.data.data.domains.states;
              states.map(state => {
                state.estado = state.name;
              });
              localStorage.setItem('states', JSON.stringify(states));
              // commit('ADD_STATES', states);
              commit('domains/SET_STATES', states, { root: true });
              resolve(states);
            }, error => {
              reject(error);
            })
          })
        }
    
      })
    },
    
    setCities({ state, commit, rootState }, obj){
      return new Promise( (resolve, reject) => {        
        let params = new URLSearchParams();
        params.append('query', `
          query {
            domains(state: "${obj.states}"){
              cities{
                name
              }
            }
          }
        `)
  
        return new Promise( (resolve, reject) => {
          axios.post(ENDPOINT, params, { headers: { 'Authorization': rootState.tkn } }).then( resp => {
            const cities = resp.data.data.domains.cities;
            cities.map(city => {
              city.cidade = Vue.prototype.$helpers.toTitle(city.name);
            });
            // commit('ADD_CITIES', cities);
            commit(`domains/SET_CITIES`, cities, {root: true});
            resolve(cities);
          }, error => {
            reject(error);
          })
        })

      })
    },
    
    setUserLocation({ commit }, obj){
      // O parametro obj é o plugin GeoIP2
      return new Promise( (resolve, reject) => {
    
        if( localStorage.getItem('userLocation') ){      
          const _userLoc = localStorage.getItem('userLocation');
          commit('ADD_USER_LOCATION', JSON.parse(_userLoc));
          resolve(JSON.parse(_userLoc));
    
        }else{
          obj.city(
            location => {
              localStorage.setItem('userLocation', JSON.stringify(location));
              commit('ADD_USER_LOCATION', location);
              resolve(location);
            },
            error => {
              reject(error);
            }
          );
        }
    
      })
    },


    addressByZipCode({}, zipcode){
      const regexZip = zipcode.replace(/\D/g,'');

      return new Promise( (resolve, reject) => {
        axios.get(`https://viacep.com.br/ws/${regexZip}/json/`).then( resp => {
          const address = resp.data;

          resolve(address);
        }, error => {
          reject(error);
        })
    
      })
    }

  },

}