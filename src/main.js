import Vue from 'vue'
import App from './App.vue'

import axios from 'axios'
// ElementUI
import ElementUI from 'element-ui'
import 'element-ui/lib/theme-chalk/index.css'

// ElementUI
Vue.use(ElementUI)

new Vue({
  el: '#app',
  render: h => h(App)
})
