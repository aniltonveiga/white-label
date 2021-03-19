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

        subscriptionCreate({ state, commit, rootState }, obj) {
            if (obj.length == 0) return;
            let disabilities = obj.disabilityId.length == 0 ? '' : `disabilities: ${obj.disabilityId}, `
            let params = new URLSearchParams();
            params.append('query', `
                    mutation {
                        subscriptionCreate(
                            opportunity_id: ${ obj.opportunity_id },
                            email: "${ obj.email }",
                            document: "${ obj.document }",
                            foreigner: true,
                            origin_company: ${ rootState.companyId },
                            name: "${ obj.name }",
                            birthday: "${ obj.birthday }",
                            gender: ${ obj.gender },
                            phone: "${ obj.phone }",
                            nationality: "${ obj.nationality }",
                            has_disability: ${ Boolean(obj.disability) }
                            ${ disabilities }
                            address: {
                                complement: "${ obj.complement }",
                                neighborhood: "${ obj.neighborhood }",
                                zipcode: "${ obj.zipcode }",
                                city: "${ obj.city }",
                              },
                            questions:[${ obj.questions.map( item =>{
                                return '{ question: "'+ item.title +'", answer: "'+ item.answer+'"}'
                            }) }],
                            send_confirmed_email: true,
                            tests_on_email: true
                            )
                        {
                          id
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

    }

}