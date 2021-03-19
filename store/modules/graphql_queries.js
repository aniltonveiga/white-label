import axios from "axios"
import Vue from "vue"

const ENDPOINT = Vue.prototype.API_ENDPOINT + "/graphql";

export default {
  namespaced: true,

  state: {
  },

  mutations: {
  },

  getters: {},

  actions: {

    query({ state, commit, rootState }, query){
      if(query.length == 0) return;

      if(query.indexOf('domains()') !== -1 || query.indexOf('domainsItau()') !== -1){
        query = query.replace('domains()', 'domains ');
        query = query.replace('domainsItau()', 'domainsItau ');
      }
      
      let params = new URLSearchParams();
      params.append('query', `
      query {
        ${query}
      }
      `)

      return new Promise( (resolve, reject) => {
        axios.post(ENDPOINT, params, { headers: { 'Authorization': rootState.tkn } }).then( resp => {
          let response = resp.data.data;
          let modulesNames = Object.keys(response);

          modulesNames.map( moduleName => {
            const listOfData = response[moduleName];
            const keys = Object.keys(listOfData);
            keys.map(key => {

              if(key == 'avatar'){
                listOfData['profile']['avatar'] = listOfData[key]
              }

              if(key == 'profile'){
                listOfData[key]['id'] = rootState.user.profile.id
              }

              if(moduleName == 'domainsItau'){
                moduleName = 'domains';
              }

              const setter = `SET_${key.toUpperCase()}`;
              if( Object.keys(this._mutations).indexOf(`${moduleName}/${setter}`) !== -1 ){
                commit(`${moduleName}/${setter}`, listOfData[key], {root: true})
              }

            })
          })
          
          resolve(response)
        }, error => {
          reject(error);
        })
      })
    }

  }

}