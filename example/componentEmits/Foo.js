import { h } from '../../lib/guide-mini-vue.esm.js'

export const Foo = {
  setup (props, { emit }) {
    // props.count
    console.log(props)
    // 3.
    // shallow readonly
    props.count++
    console.log(props)
    const emitAdd = () => {
      console.log('Foo emit add')
      emit('add', 1, 2)
      emit('add-foo')
    }

    return {
      emitAdd
    }
  },
  render () {
    const btn = h(
      'button',
      {
        onClick: this.emitAdd
      },
      'emitAdd'
    )
    const foo = h('p', {}, 'foo')
    return h('div', {}, [foo, btn])
  }
}
