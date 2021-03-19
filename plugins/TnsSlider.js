import { tns } from "tiny-slider/src/tiny-slider"
import "tiny-slider/src/tiny-slider.scss"

export default {
  install: function(Vue){
    Object.defineProperty(Vue.prototype, '$carousel', { value: tns });
  }
}