import axios from "axios"
import Vue from "vue"

const ENDPOINT = Vue.prototype.API_ENDPOINT + "/graphql";

export default {
  namespaced: true,

  state: {
    countries: [],
    states: [],
    cities: [],
    institutions: [],
    courses: [],
    companies: [],
    languages: [],
    skills: [],
    genders: [],
    maritalStatus: [],
    disabilities: [],
    education_levels: [],
    education_periods: [],
    education_status: [],
    professional_experience_areas: [],
    professional_experience_levels: [],
    cause_experience_areas: [],
    language_proficiencies: []
  },

  mutations: {
    SET_COUNTRIES(state, payload){
      state.countries = payload;
      localStorage.setItem('countries', JSON.stringify(payload));
    },

    SET_STATES(state, payload){
      state.states = payload;
      localStorage.setItem('states', JSON.stringify(payload));
    },

    SET_CITIES(state, payload){
      state.cities = payload;
      localStorage.setItem('cities', JSON.stringify(payload));
    },

    SET_INSTITUTIONS(state, payload){
      state.institutions = payload;
      localStorage.setItem('institutions', JSON.stringify(payload));
    },

    SET_COURSES(state, payload){
      state.courses = payload;
      localStorage.setItem('courses', JSON.stringify(payload));
    },

    SET_COMPANIES(state, payload){
      state.companies = payload;
      localStorage.setItem('companies', JSON.stringify(payload));
    },

    SET_LANGUAGES(state, payload){
      state.languages = payload;
      localStorage.setItem('languages', JSON.stringify(payload));
    },

    SET_SKILLS(state, payload){
      state.skills = payload;
      localStorage.setItem('skills', JSON.stringify(payload));
    },

    SET_GENDERS(state, payload){
      state.genders = payload;
      localStorage.setItem('genders', JSON.stringify(payload));
    },

    SET_MARITALSTATUS(state, payload){
      state.maritalStatus = payload;
      localStorage.setItem('maritalstatus', JSON.stringify(payload));
    },

    SET_DISABILITIES(state, payload){
      state.disabilities = payload;
      localStorage.setItem('disabilities', JSON.stringify(payload));
    },

    SET_EDUCATIONLEVELS(state, payload){
      state.education_levels = payload;
      localStorage.setItem('educationlevels', JSON.stringify(payload));
    },

    SET_EDUCATIONPERIODS(state, payload){
      state.education_periods = payload;
      localStorage.setItem('educationperiods', JSON.stringify(payload));
    },

    SET_EDUCATIONSTATUS(state, payload){
      state.education_status = payload;
      localStorage.setItem('educationstatus', JSON.stringify(payload));
    },

    SET_PROFESSIONALEXPERIENCEAREAS(state, payload){
      state.professional_experience_areas = payload;
      localStorage.setItem('professionalexperienceareas', JSON.stringify(payload));
    },

    SET_PROFESSIONALEXPERIENCELEVELS(state, payload){
      state.professional_experience_levels = payload;
      localStorage.setItem('professionalexperiencelevels', JSON.stringify(payload));
    },

    SET_CAUSEEXPERIENCEAREAS(state, payload){
      state.cause_experience_areas = payload;
      localStorage.setItem('causeexperienceareas', JSON.stringify(payload));
    },
    
    SET_LANGUAGEPROFICIENCIES(state, payload){
      state.language_proficiencies = payload;
      localStorage.setItem('languageproficiencies', JSON.stringify(payload));
    },
  },

  getters: {},

  actions: {
    getLocalDomains({ state, commit }){
      Object.keys(state).map(key => {
        let domain = localStorage.getItem(key.toLowerCase().replace(/_/g, ''));
        if(domain){
          const setter = `SET_${key.toUpperCase().replace(/_/g, '')}`;
          commit(`${setter}`, JSON.parse(domain));
        }
      });
    }
  }

}