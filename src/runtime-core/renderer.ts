import { createComponentInstance, setupComponent } from "./component";
import { isObject } from "../shared/index";
import { ShapeFlags } from "../shared/shapeFlags";

export function render(vnode, container) {
  //patch 递归处理
  patch(vnode, container);
}
function patch(vnode, container) {
  // 判断vnode是不是element类型
  // 是element应该处理element
  const { shapeFlag } = vnode;
  if (shapeFlag & ShapeFlags.ELEMENT) {
    processElement(vnode, container);
  } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
    // 是component处理component
    processComponent(vnode, container);
  }
}
function processElement(vnode, container) {
  mountElement(vnode, container);
}

function mountElement(vnode, container) {
  // vnode => element => div
  //将元素插入
  const { type, props, children, shapeFlag } = vnode;
  const el = (vnode.el = document.createElement(type));
  if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    el.textContent = children;
  } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
    mountChildren(vnode, el);
  }
  for (let key in props) {
    let value = props[key];
    const isOn = (key: string) => /^on[A-Z]/.test(key);
    if (isOn(key)) {
      const event = key.slice(2).toLowerCase();
      el.addEventListener(event, value);
    } else {
      el.setAttribute(key, value);
    }
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
//initialVNode  初始化的节点
function mountComponent(initialVNode: any, container: any) {
  //创建组件实例
  const instance = createComponentInstance(initialVNode);
  //信息收集
  setupComponent(instance);
  // 开箱
  setupRenderEffect(instance, initialVNode, container);
}
function setupRenderEffect(instance: any, initialVNode, container) {
  // instance.render 函数其实就是 return h('div', 'hi, ' + this.msg)
  // h函数调用 => createVNode => 返回vnode
  // 【state: 开始】
  const subTree = instance.render.call(instance.proxy);
  // subTree = vnode
  // vnode 调用=> patch
  // vnode => element =>挂载 mountElement
  // 【state: 递归】
  patch(subTree, container);
  // Important!！ 子节点的挂载都初始化完成后
  // 将el赋值给当前[组件的]虚拟节点上  支持this.$el
  // 【state: 递归结束】
  initialVNode.el = subTree.el;
}
