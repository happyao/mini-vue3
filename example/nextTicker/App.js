import {
  h,
  ref,
  getCurrentInstance,
  nextTick
} from '../../lib/guide-mini-vue.esm.js'

export default {
  name: 'App',
  setup () {
    const count = ref(1)
    const instance = getCurrentInstance()
    // 同步任务完成之后 再执行微任务 进行视图更新
    async function onClick () {
      for (let i = 0; i < 100; i++) {
        count.value = i
      }
      //异步执行 拿不到视图上的数据
      const el = instance.vnode.el
      console.log('instance', instance, el.innerText) //1
      //   nextTick(() => {
      //     console.log('instance', instance, el.innerText) //99
      //   })

      await nextTick()
      console.log('instance', instance, el.innerText)
    }
    async function onClick2 () {
      for (let i = 0; i < 1000; i++) {
        count.value = i
      }
      //异步执行 拿不到视图上的数据
      const el = instance.vnode.el
      console.log('instance', instance, el.innerText) //1
      nextTick(() => {
        console.log('instance', instance, el.innerText) //99
      })

      //   await nextTick()
      //   console.log('instance', instance, el.innerText)
    }

    return {
      onClick,
      count,
      onClick2
    }
  },
  render () {
    const button = h('button', { onClick: this.onClick }, 'update')
    const button2 = h('button', { onClick: this.onClick2 }, 'update2')
    const p = h('p', {}, 'count:' + this.count)

    return h('div', {}, [button, button2, p])
  }
}
