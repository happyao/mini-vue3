import { createComponentInstance, setupComponent } from "./component";
import { EMPTY_OBJ, isObject } from "../shared/index";
import { ShapeFlags } from "../shared/shapeFlags";
import { Fragment, Text, createTextVNode } from "./vnode";
import { createAppAPI } from "./createApp";
import { effect } from "../reactivity/effect";

export function createRenderer(options) {
  //把具体的实现函数传过来 runtime-dom层
  //改名字是为了好确认是外部传参
  const {
    createElement: hostCreateElement,
    patchProp: hostPatchProp,
    insert: hostInsert,
  } = options;

  //首次render方法
  function render(vnode, container) {
    //patch 递归处理
    patch(null, vnode, container, null);
  }
  // n1 oldTree
  // n2 newTree
  function patch(n1, n2, container, parentComponent) {
    const { type } = n2;
    switch (type) {
      case Fragment:
        processFragment(n1, n2, container, parentComponent);
        break;
      case Text:
        processText(n1, n2, container);
        break;
      default:
        // 判断vnode是不是element类型
        // 是element应该处理element
        const { shapeFlag } = n2;
        if (shapeFlag & ShapeFlags.ELEMENT) {
          processElement(n1, n2, container, parentComponent);
        } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
          // 是component处理component
          processComponent(n1, n2, container, parentComponent);
        }
    }
  }
  function processFragment(n1, n2, container, parentComponent) {
    mountChildren(n2, container, parentComponent);
  }
  function processText(n1, n2, container) {
    const { children } = n2;
    const el = (n2.el = document.createTextNode(children));
    container.append(el);
  }
  function processElement(n1, n2, container, parentComponent) {
    if (!n1) {
      mountElement(n2, container, parentComponent);
    } else {
      patchElement(n1, n2, container);
    }
  }
  // 更新element
  function patchElement(n1, n2, container) {
    console.log("patchElement");
    console.log("n1", n1);
    console.log("n2", n2);
    // 更新对比
    // props
    const oldProps = n1.props || EMPTY_OBJ;
    const newProps = n2.props || EMPTY_OBJ;
    const el = (n2.el = n1.el);
    patchProps(el, oldProps, newProps);
    // children
  }

  //遍历新prop 重新赋值
  function patchProps(el, oldProps, newProps) {
    if (oldProps !== newProps) {
      for (let key in newProps) {
        const prevProp = oldProps[key];
        const nextProp = newProps[key];
        if (prevProp !== nextProp) {
          hostPatchProp(el, key, prevProp, nextProp);
        }
      }
      if (oldProps !== EMPTY_OBJ) {
        for (let key in oldProps) {
          if (!(key in newProps)) {
            hostPatchProp(el, key, oldProps[key], null);
          }
        }
      }
    }
  }

  function mountElement(vnode, container, parentComponent) {
    // vnode => element => div
    //将元素插入
    const { type, props, children, shapeFlag } = vnode;
    // new Element
    //const el = (vnode.el = document.createElement(type));
    const el = (vnode.el = hostCreateElement(type));
    console.log("mountElement", el);

    // children
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      el.textContent = children;
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(vnode, el, parentComponent);
    }
    // props
    console.log("mountElement props", props, el);

    for (let key in props) {
      let value = props[key];
      hostPatchProp(el, key, null, value);
    }
    // container.append(el);
    hostInsert(el, container);
  }
  function mountChildren(vnode, containter, parentComponent) {
    vnode.children.forEach((v) => {
      patch(null, v, containter, parentComponent);
    });
  }
  function processComponent(n1, n2: any, container: any, parentComponent) {
    mountComponent(n2, container, parentComponent);
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
    //Important!！目的：响应式对象的值改变的时候重新触发render
    //方法：用effect进行包装
    //调用render函数的时候会触发依赖收集 把当前的匿名函数收集起来
    //当响应式的值改变的时候会重新调用依赖函数 也就是render

    effect(() => {
      if (!instance.isMounted) {
        // instance.render 函数其实就是组件中的 return h('div', 'hi, ' + this.msg)
        // h函数调用 =>创建虚拟节点 createVNode => 返回vnode
        // 【state: 开始】
        const subTree = (instance.subTree = instance.render.call(
          instance.proxy
        ));
        console.log("isMounted setupRenderEffect", subTree, instance.proxy);

        // subTree = vnode 虚拟节点树
        // vnode 调用=> patch
        // vnode => element =>挂载 mountElement
        // 【state: 递归】
        patch(null, subTree, container, instance);
        // Important!！ 子节点的挂载都初始化完成后
        // 将el赋值给当前[组件的]虚拟节点上  支持this.$el
        // 【state: 递归结束】
        initialVNode.el = subTree.el;
        instance.isMounted = true;
      } else {
        // update!!
        const subTree = instance.render.call(instance.proxy);
        const prevSubTree = instance.subTree;

        console.log(
          "update prevSubTree",
          prevSubTree,
          "currentSubTree",
          subTree
        );
        // 重新更新subTree
        instance.subTree = subTree;
        // Important!！ 让patch也支持更新  n1=>old n2=>new
        patch(prevSubTree, subTree, container, instance);
      }
    });
  }

  return {
    createApp: createAppAPI(render),
  };
}
