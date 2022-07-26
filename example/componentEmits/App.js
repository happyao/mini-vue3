import { h } from '../../lib/guide-mini-vue.esm.js'
import { Foo } from './Foo.js'
window.self = null
export const App = {
  name: 'App',
  render () {
    window.self = this
    // ui
    // return h('div', {}, 'hi, ' + this.msg)
    return h(
      'div',
      {
        id: 'root',
        class: ['red', 'hard'],
        onClick () {
          console.log('click')
        },
        onMousedown () {
          console.log('mousedown')
        }
      },
      [
        h('div', {}, 'hi,' + this.msg),
        h(Foo, {
          count: 1,
          // on+Event
          onAdd (a, b) {
            console.log('onAdd', a, b)
          },
          onAddFoo () {
            console.log('onAddFoo')
          }
        })
      ]
    )
  },

  setup () {
    return {
      msg: 'mini-vuehhh'
    }
  }
}
