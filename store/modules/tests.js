import axios from "axios"
import Vue from "vue"

const ENDPOINT = Vue.prototype.API_ENDPOINT + "/graphql";

export default {
  namespaced: true,

  state: {
    testNavigationControl: null
  },

  mutations: {
    SET_TEST_NAVIGATION_CONTROL(state, payload){
      let testNavigation = localStorage.getItem('testNavigation');
      if(testNavigation) testNavigation = atob(testNavigation)
      testNavigation = JSON.parse(testNavigation) || {};

      if(testNavigation && payload){
        Object.keys(payload).map(key => {
          testNavigation[key] = payload[key]
        })
      }

      state.testNavigationControl = testNavigation != null ? Object.assign({}, state.testNavigationControl, testNavigation) : payload;
      localStorage.setItem('testNavigation', btoa(JSON.stringify(state.testNavigationControl)));
    },
  },

  getters: {},

  actions: {

    subscriptionTests({ rootState }, obj) {
      let user_id = rootState.user.profile == null ? '' : `userId: ${rootState.user.profile.id}, `
      if (obj.length == 0) return;
      let params = new URLSearchParams();
      params.append('query', `

      query {
        subscriptionTests(
          ${ user_id },
          opportunityId: ${ obj.opportunityId },
          originCompany: ${ rootState.companyId },
          ${ obj.token ? ' token: "' + obj.token + '", ' : '' }
          ${ obj.useExistingScore ? ' useExistingScore: ' + obj.useExistingScore + ', ' : '' }
          ${ obj.redoTests ? ' redoTests: ' + obj.redoTests + ', ' : '' }
          ${ obj.finishedTests ? ' finishedTests: ' + obj.finishedTests + ', ' : '' }
          ${ obj.requiredIn ? ' requiredIn: "' + obj.requiredIn + '", ' : '' }
        ){
          json,
          showMindsightQuestion
        }
      }
      `)

      return new Promise((resolve, reject) => {
        axios.post(ENDPOINT, params, { headers: { 'Authorization': rootState.tkn } }).then(resp => {
          const response = resp.data.data;
          resolve(response)
        }, error => {
          reject(error);
        })
      })
    },

    testCover({ state, commit, rootState }, obj) {
      let user_id = rootState.user.profile == null ? `userId: ${obj.user_id},` : `userId: ${rootState.user.profile.id}, `
      if (obj.length == 0) return;

      let params = new URLSearchParams();
      params.append('query', `
      query {
        testCover(
          ${ user_id }, 
          opportunityId: ${ obj.opportunityId }, 
          testId: ${ obj.testId }
        ){
          json
        }
      }
      `)

      return new Promise((resolve, reject) => {
        axios.post(ENDPOINT, params, { headers: { 'Authorization': rootState.tkn } }).then(resp => {
          const response = resp.data.data;
          resolve(response)
        }, error => {
          reject(error);
        })
      })
    },

    testQuestion({ state, commit, rootState }, obj) {
      if (obj.length == 0) return;

      let params = new URLSearchParams();
      params.append('query', `
      query {
        testQuestion(url: "${Vue.prototype.PLATFORM_TEST}/v1/header/${obj.headerTestId}/questions/${obj.questionId}") {
          json
        }
      }
      `)

      return new Promise((resolve, reject) => {
        axios.post(ENDPOINT, params, { headers: { 'Authorization': rootState.tkn } }).then(resp => {
          const response = resp.data.data;
          resolve(response)
        }, error => {
          reject(error);
        })
      })
    },

    saveTestQuestion({ commit, rootState }, obj) {
      let params = new URLSearchParams();
      params.append('query', `
        mutation {
          saveTestQuestion(
            url: "${ obj.url}",
            answers: [${obj.answers}],
            ${ obj.url_movie ? ' url_movie: "' + obj.url_movie + '", ' : '' }
            time_to_finish: ${ obj.time_to_finish}
          )
          {
            json
          }
        }
      `)

      return new Promise((resolve, reject) => {
        axios.post(ENDPOINT, params, { headers: { 'Authorization': rootState.tkn } }).then(resp => {
          resolve(resp.data)
        }, error => {
          reject(error);
        })
      })
    },

    returnPrimeiraEscolha({ state, commit, rootState }, obj){
      if(obj.length == 0) return;
      
      let params = new URLSearchParams();
      params.append('query', `
      mutation {
        returnPrimeiraEscolha(
          opportunity_id: ${ obj.opportunity_id },
          user_id: ${ obj.user_id },
          source_test_id: ${ obj.source_test_id }
        )
        {
          success
        }
      }
    `)

      return new Promise( (resolve, reject) => {
        axios.post(ENDPOINT, params, { headers: { 'Authorization': rootState.tkn } }).then( resp => {
          const response = resp.data.data;
          resolve(response)
        }, error => {
          reject(error);
        })
      })
    },



  }

}