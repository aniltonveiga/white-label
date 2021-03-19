
import GLightbox from 'glightbox'
import "glightbox/dist/css/glightbox.css"

export default {
  install: function(Vue){
    Object.defineProperty(Vue.prototype, '$GLightbox', { value: GLightbox });
  }
}