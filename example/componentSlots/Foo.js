import { h, renderSlots } from '../../lib/guide-mini-vue.esm.js'

export const Foo = {
  setup () {
    return {}
  },
  render () {
    const foo = h('p', {}, 'foo1')

    // Foo .vnode. children
    console.log('$slots', this.$slots)
    // children -> vnode
    //
    // renderSlots
    // 具名插槽
    // 1. 获取到要渲染的元素 1
    // 2. 要获取到渲染的位置
    // 作用域插槽
    const age = 18
    return h(
      'div',
      {},
      //   [foo, ...this.$slots]
      [
        renderSlots(this.$slots, 'header', {
          age
        }),
        foo,
        renderSlots(this.$slots, 'footer')
      ]
    )
  }
}
