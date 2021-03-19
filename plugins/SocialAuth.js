const HelloJs = require('hellojs/dist/hello.all.min.js')

export default {
  install: function(Vue, opts){
    HelloJs.init(opts);
    Object.defineProperty(Vue.prototype, '$socialAuth', { value: HelloJs });
  }
}