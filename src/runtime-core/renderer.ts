import { createComponentInstance, setupComponent } from "./component";

export function render(vnode, container) {
  //patch 递归处理
  patch(vnode, container);
}
function patch(vnode, container) {
  // 判断vnode是不是element类型
  // 是element应该处理element
  // TODO

  // 是component处理component
  processComponent(vnode, container);
}
function processComponent(vnode: any, container: any) {
  mountComponent(vnode, container);
}

function mountComponent(vnode: any, container: any) {
  //创建组件实例
  const instance = createComponentInstance(vnode);
  //信息收集
  setupComponent(instance);
  // 开箱
  setupRenderEffect(instance, container);
}
function setupRenderEffect(instance: any, container) {
  // subTree return h('div', 'hi, ' + this.msg)
  const subTree = instance.render();
  // subTree = vnode
  // vnode => patch
  // vnode => element => mountElement
  // 递归
  patch(subTree, container);
}
