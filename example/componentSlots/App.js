import { h, createTextVNode } from '../../lib/guide-mini-vue.esm.js'
import { Foo } from './Foo.js'

export const App = {
  name: 'App',
  render () {
    const app = h('div', {}, 'App')
    // object key

    const foo = h(
      Foo,
      {},
      // slot 有两种情况  一种是数组 一种是单值
      //   h('p', {}, '45')
      //   [h('p', {}, '11'), h('p', {}, '45')]
      // slot 有两种情况  一种是数组 一种是单值 =》 处理为对象， 对象内为 key=>value 函数
      {
        // header: h('p', {}, 'header'),
        header: ({ age }) => [
          h('p', {}, 'header' + age),
          createTextVNode('111')
        ],
        footer: () => h('p', {}, 'footer')
      }
    )
    // 数组 vnode
    return h('div', {}, [app, foo])
  },

  setup () {
    return {}
  }
}
