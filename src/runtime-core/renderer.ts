import { createComponentInstance, setupComponent } from "./component";
import { isObject } from "../shared/index";
import { ShapeFlags } from "../shared/shapeFlags";
import { Fragment, Text, createTextVNode } from "./vnode";
import { createAppAPI } from "./createApp";

export function createRenderer(options) {
  //把具体的实现函数传过来 runtime-dom层
  const { createElement, patchProp, insert } = options;

  //首次render方法
  function render(vnode, container) {
    //patch 递归处理
    patch(vnode, container, null);
  }
  function patch(vnode, container, parentComponent) {
    const { type } = vnode;
    switch (type) {
      case Fragment:
        processFragment(vnode, container, parentComponent);
        break;
      case Text:
        processText(vnode, container);
        break;
      default:
        // 判断vnode是不是element类型
        // 是element应该处理element
        const { shapeFlag } = vnode;
        if (shapeFlag & ShapeFlags.ELEMENT) {
          processElement(vnode, container, parentComponent);
        } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
          // 是component处理component
          processComponent(vnode, container, parentComponent);
        }
    }
  }
  function processFragment(vnode, container, parentComponent) {
    mountChildren(vnode, container, parentComponent);
  }
  function processText(vnode, container) {
    const { children } = vnode;
    const el = (vnode.el = document.createTextNode(children));
    container.append(el);
  }
  function processElement(vnode, container, parentComponent) {
    mountElement(vnode, container, parentComponent);
  }

  function mountElement(vnode, container, parentComponent) {
    // vnode => element => div
    //将元素插入
    const { type, props, children, shapeFlag } = vnode;
    // new Element
    //const el = (vnode.el = document.createElement(type));
    const el = (vnode.el = createElement(type));
    // children
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      el.textContent = children;
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(vnode, el, parentComponent);
    }
    // props
    for (let key in props) {
      let value = props[key];
      patchProp(el, key, value);
    }
    // container.append(el);
    insert(el, container);
  }
  function mountChildren(vnode, containter, parentComponent) {
    vnode.children.forEach((v) => {
      patch(v, containter, parentComponent);
    });
  }
  function processComponent(vnode: any, container: any, parentComponent) {
    mountComponent(vnode, container, parentComponent);
  }
  //initialVNode  初始化的节点
  function mountComponent(initialVNode: any, container: any, parentComponent) {
    //创建组件实例
    const instance = createComponentInstance(initialVNode, parentComponent);
    //信息收集
    setupComponent(instance);
    // 开箱
    setupRenderEffect(instance, initialVNode, container);
  }
  function setupRenderEffect(instance: any, initialVNode, container) {
    // instance.render 函数其实就是组件中的 return h('div', 'hi, ' + this.msg)
    // h函数调用 =>创建虚拟节点 createVNode => 返回vnode
    // 【state: 开始】
    const subTree = instance.render.call(instance.proxy);

    // subTree = vnode
    // vnode 调用=> patch
    // vnode => element =>挂载 mountElement
    // 【state: 递归】
    patch(subTree, container, instance);
    // Important!！ 子节点的挂载都初始化完成后
    // 将el赋值给当前[组件的]虚拟节点上  支持this.$el
    // 【state: 递归结束】
    initialVNode.el = subTree.el;
  }

  return {
    createApp: createAppAPI(render),
  };
}
