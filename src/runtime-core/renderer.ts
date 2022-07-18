import { createComponentInstance, setupComponent } from "./component";

export function render(vnode, container) {
  //patch 递归处理
  patch(vnode, container);
}
function patch(vnode, container) {
  // 判断vnode是不是element类型
  // 是element应该处理element
  // TODO
  if (typeof vnode.type === "string") {
    processElement(vnode, container);
  } else {
    // 是component处理component
    processComponent(vnode, container);
  }
}
function processElement(vnode, container) {
  mountElement(vnode, container);
}

function mountElement(vnode, container) {
  //将元素插入
  const { type, props, children } = vnode;
  const el = document.createElement(type);
  if (typeof children === "string") {
    el.textContent = children;
  } else {
    mountChildren(vnode, el);
  }
  for (let key in props) {
    let value = props[key];
    el.setAttribute(key, value);
  }
  container.append(el);
}
function mountChildren(vnode, containter) {
  vnode.children.forEach((v) => {
    patch(v, containter);
  });
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
