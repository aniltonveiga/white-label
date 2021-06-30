
import Vue from 'vue'
import VueSession from 'vue-session'
import VueHead from 'vue-head'

import GeoIP2 from './plugins/GeoIP2'
import StringsHelpers from './helpers/Strings'
import HeadHelper from './helpers/Head'
import GoogleJobs from './helpers/GoogleJobs'
import VueCryptojs from 'vue-cryptojs'
import Encrypts from './helpers/Encrypts'

Vue.use(VueSession, {
  persist: false
})

Vue.use(VueHead, { separator: '' })

Vue.use(GeoIP2)

Vue.use(StringsHelpers)

Vue.use(GoogleJobs)

Vue.use(VueCryptojs)
Vue.use(Encrypts)

// PROD ou DEV
// Vue.prototype.API_ENDPOINT = process.env.NODE_ENV == "development" ? "http://localhost:3000" : "https://api.99jobs.com"
// Vue.prototype.DELTA_ENDPOINT = process.env.NODE_ENV == "development" ? "http://localhost:3001" : "https://99jobs.com/"
// Vue.prototype.PLATFORM_TEST = process.env.NODE_ENV == "development" ? "http://localhost:3002" : "https://api-platform-test.99jobs.com"
// Vue.prototype.OPPORTUNITIES_ENDPOINT = process.env.NODE_ENV == "development" ? "http://localhost:3003" : "https://api-oportunidades.99jobs.com/"

// STAGING
Vue.prototype.API_ENDPOINT = "https://staging-api.99jobs.com"
Vue.prototype.DELTA_ENDPOINT = "https://staging.99jobs.com"
Vue.prototype.PLATFORM_TEST = "https://staging-api-platform-test.99jobs.com"
Vue.prototype.OPPORTUNITIES_ENDPOINT = "https://staging-api-oportunidades.99jobs.com"

// Only console if DEV
process.env.NODE_ENV == 'development' && console.log("API_ENDPOINT = " + Vue.prototype.API_ENDPOINT)
process.env.NODE_ENV == 'development' && console.log("DELTA_ENDPOINT = " + Vue.prototype.DELTA_ENDPOINT)
process.env.NODE_ENV == 'development' && console.log("OPPORTUNITIES_ENDPOINT = " + Vue.prototype.OPPORTUNITIES_ENDPOINT)

export default Vue