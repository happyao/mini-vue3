import { h } from '../../lib/guide-mini-vue.esm.js'
window.self = null
export const App = {
  render () {
    window.self = this
    // ui
    // return h('div', {}, 'hi, ' + this.msg)
    debugger
    return h(
      'div',
      {
        id: 'root',
        class: ['red', 'hard']
      },
      'hi, ' + this.msg
      // string
      // "hi, mini-vue"
      // Array
      // [h('p', { class: 'red' }, 'hi'), h('p', { class: 'blue' }, 'mini-vue')]
    )
  },

  setup () {
    return {
      msg: 'mini-vuehh'
    }
  }
}