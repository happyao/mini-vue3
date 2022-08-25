import { createComponentInstance, setupComponent } from "./component";
import { EMPTY_OBJ, isObject } from "../shared/index";
import { getSequence } from "../shared/getSequence";
import { ShapeFlags } from "../shared/shapeFlags";
import { Fragment, Text, createTextVNode } from "./vnode";
import { createAppAPI } from "./createApp";
import { effect } from "../reactivity/effect";
import { shouldUpdateComponent } from "./ComponentUpdateUtils";
import { queueJobs } from "./scheduler";

export function createRenderer(options) {
  //把具体的实现函数传过来 runtime-dom层
  //改名字是为了好确认是外部传参
  const {
    createElement: hostCreateElement,
    patchProp: hostPatchProp,
    insert: hostInsert,
    remove: hostRemove,
    setTextElemet: hostSetElementText,
  } = options;

  //首次render方法
  function render(vnode, container) {
    //patch 递归处理
    patch(null, vnode, container, null, null);
  }
  // n1 oldTree
  // n2 newTree
  function patch(n1, n2, container, parentComponent, anchor) {
    const { type } = n2;
    switch (type) {
      case Fragment:
        processFragment(n1, n2, container, parentComponent, anchor);
        break;
      case Text:
        processText(n1, n2, container);
        break;
      default:
        // 判断vnode是不是element类型
        // 是element应该处理element
        const { shapeFlag } = n2;
        if (shapeFlag & ShapeFlags.ELEMENT) {
          processElement(n1, n2, container, parentComponent, anchor);
        } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
          // 是component处理component
          processComponent(n1, n2, container, parentComponent, anchor);
        }
    }
  }
  function processFragment(n1, n2, container, parentComponent, anchor) {
    mountChildren(n2.children, container, parentComponent, anchor);
  }
  function processText(n1, n2, container) {
    const { children } = n2;
    const el = (n2.el = document.createTextNode(children));
    container.append(el);
  }
  function processElement(n1, n2, container, parentComponent, anchor) {
    if (!n1) {
      mountElement(n2, container, parentComponent, anchor);
    } else {
      patchElement(n1, n2, container, parentComponent, anchor);
    }
  }
  // 更新element
  function patchElement(n1, n2, container, parentComponent, anchor) {
    console.log("patchElement");
    console.log("n1", n1);
    console.log("n2", n2);
    // 更新对比
    // props
    const oldProps = n1.props || EMPTY_OBJ;
    const newProps = n2.props || EMPTY_OBJ;
    const el = (n2.el = n1.el);
    // children
    patchChildren(n1, n2, el, parentComponent, anchor);
    patchProps(el, oldProps, newProps);
  }
  //更新children
  function patchChildren(n1, n2, container, parentComponent, anchor) {
    const prevShapeFlag = n1.shapeFlag;
    const { shapeFlag } = n2;
    const c1 = n1.children; //老children
    const c2 = n2.children; //新children
    //新的是text
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        // unmount老array类型节点
        unmountChildren(c1);
      }
      if (c1 !== c2) {
        //mount 新text类型节点
        hostSetElementText(container, c2);
      }
    } else {
      //新的是数组
      if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
        // unmount老text类型节点
        hostSetElementText(container, "");
        //mount 新array类型节点
        mountChildren(c2, container, parentComponent, anchor);
      } else {
        //Important!! 老array To 新array
        // 双端对比 指针移动
        patchKeyedChildren(c1, c2, container, parentComponent, anchor);
      }
    }
  }
  function patchKeyedChildren(
    c1,
    c2,
    container,
    parentComponent,
    parentAnchor
  ) {
    let i = 0;
    const l2 = c2.length;

    let e1 = c1.length - 1;
    let e2 = c2.length - 1;
    function isSameVNodeType(n1, n2) {
      console.log("isSameVNodeType");
      console.log("n1.type", n1.type);
      console.log("n2.type", n2.type);
      return n1.type === n2.type && n1.key === n2.key;
    }
    //======找出变化范围 i e1 e2=======
    //1.左侧开始比较
    while (i <= e1 && i <= e2) {
      const n1 = c1[i];
      const n2 = c2[i];
      //是否是一样的节点
      if (isSameVNodeType(n1, n2)) {
        //递归的对比 prop children
        patch(n1, n2, container, parentComponent, parentAnchor);
      } else {
        break;
      }
      i++;
    }
    //2.右侧开始比较
    while (i <= e1 && i <= e2) {
      const n1 = c1[e1];
      const n2 = c2[e2];
      //是否是一样的节点
      if (isSameVNodeType(n1, n2)) {
        //递归的对比 prop children
        patch(n1, n2, container, parentComponent, parentAnchor);
      } else {
        break;
      }
      e1--;
      e2--;
    }
    console.log("patchKeyedChildren 右侧 i", i, e1, e2);
    // 3.新的比老的长
    // 左侧 需要创建到尾部
    // 右侧 左边增多 需要到头部新增节点
    if (i > e1) {
      if (i <= e2) {
        // Important!! 插入的节点 c2[i]
        // Important!! 插入的锚点 anchor
        // e2 + 1 //从头创建 先创建 d 再创建 c  都在a之前
        const nextPos = e2 + 1;
        const anchor = nextPos < c2.length ? c2[nextPos].el : null;
        while (i <= e2) {
          patch(null, c2[i], container, parentComponent, anchor);
          i++;
        }
      }
    } else if (i > e2) {
      // 4.老的比新的长 删掉老的
      while (i <= e1) {
        // 左侧
        // 右侧
        hostRemove(c1[i].el);
        i++;
      }
    } else {
      //中间乱序部分 哈希
      let s1 = i;
      let s2 = i;
      //新节点的总数量 优化删除用 5.1.1

      const toBePatched = e2 - s2 + 1;
      let patched = 0;

      // 对新的部分建设映射表
      const keyToNewIndexMap = new Map();
      // Important!! 新节点到老节点index的映射 用于最长递增子序列
      const newIndexToOldIndexMap = new Array(toBePatched); //定长数组性能最好
      //最长递增子序列优化  判断有没有移动过
      let moved = false;
      let maxNewIndexSoFar = 0;

      for (let i = 0; i < toBePatched; i++) {
        newIndexToOldIndexMap[i] = 0;
      }

      for (let i = s2; i <= e2; i++) {
        const nextChild = c2[i];
        keyToNewIndexMap.set(nextChild.key, i);
      }

      for (let i = s1; i <= e1; i++) {
        let newIndex;
        const prevChild = c1[i];
        if (patched >= toBePatched) {
          hostRemove(prevChild.el);
          continue;
        }
        //c1中的元素(prevChild) 是否还存在于c2中
        if (prevChild.key !== null && prevChild.key !== undefined) {
          newIndex = keyToNewIndexMap.get(prevChild.key);
        } else {
          for (let j = s2; j <= e2; j++) {
            if (isSameVNodeType(prevChild, c2[j])) {
              newIndex = j;
              break;
            }
          }
        }

        if (newIndex === undefined) {
          //当前节点 在新的中已经不存在
          hostRemove(prevChild.el);
        } else {
          if (newIndex >= maxNewIndexSoFar) {
            maxNewIndexSoFar = newIndex;
          } else {
            moved = true;
          }
          //Important!! 新节点到老节点index的映射 用于最长递增子序列
          //newIndex - s2 从0开始技术
          //i+1 i有可能为0 单i为0有特殊含义：在新节点中不存在 为了使i不为零所以i+1
          newIndexToOldIndexMap[newIndex - s2] = i + 1;
          //当前节点 在新的中存在 继续进行深度对比
          patch(prevChild, c2[newIndex], container, parentComponent, null);
          patched++;
        }
      }
      //======中间比对 最长递增子序列 新增 + 位置移动
      const increasingNewIndexSequence = moved
        ? getSequence(newIndexToOldIndexMap)
        : [];
      console.log(
        moved,
        "increasingNewIndexSequence",
        increasingNewIndexSequence, //[1,2]
        newIndexToOldIndexMap //[5,3,4]
      );
      // Important!! 倒序插入稳定
      let j = increasingNewIndexSequence.length - 1;
      for (let i = toBePatched - 1; i >= 0; i--) {
        const nextIndex = i + s2;
        const nextChild = c2[nextIndex];
        // Important !!
        const anchor = nextIndex + 1 < l2 ? c2[nextIndex + 1].el : null;
        if (newIndexToOldIndexMap[i] === 0) {
          //新创建
          patch(null, nextChild, container, parentComponent, anchor);
        } else if (moved) {
          if (j < 0 || i !== increasingNewIndexSequence[j]) {
            //移动位置
            console.log("11", nextChild.el);
            console.log("22", container);
            console.log("33", anchor);

            hostInsert(nextChild.el, container, anchor);
          } else {
            j--;
          }
        }
      }
    }
  }
  function unmountChildren(children) {
    for (let i = 0; i < children.length; i++) {
      const el = children[i].el;
      hostRemove(el);
    }
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

  function mountElement(vnode, container, parentComponent, anchor) {
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
      mountChildren(vnode.children, el, parentComponent, anchor);
    }
    // props
    console.log("mountElement props", props, el);

    for (let key in props) {
      let value = props[key];
      hostPatchProp(el, key, null, value);
    }
    // container.append(el);
    hostInsert(el, container, anchor);
  }
  function mountChildren(children, containter, parentComponent, anchor) {
    children.forEach((v) => {
      patch(null, v, containter, parentComponent, anchor);
    });
  }
  function processComponent(
    n1,
    n2: any,
    container: any,
    parentComponent,
    anchor
  ) {
    if (!n1) {
      mountComponent(n2, container, parentComponent, anchor);
    } else {
      updateComponent(n1, n2);
    }
  }
  //更新组件
  function updateComponent(n1, n2) {
    // instance.update 组件更新 effect函数返回值runner 当调用runner时会执行fn, 也就是effect(fn)中的fn
    const instance = (n2.component = n1.component);
    //更新组件
    if (shouldUpdateComponent(n1, n2)) {
      instance.next = n2;
      console.log("updateComponent instance", n1, n2);
      instance.update();
    } else {
      //不更新组件
      n2.el = n1.el;
      //n2.vnode = n2; // ?? why ??
    }
  }
  //initialVNode  初始化的节点
  function mountComponent(
    initialVNode: any,
    container: any,
    parentComponent,
    anchor
  ) {
    //创建组件实例
    const instance = (initialVNode.component = createComponentInstance(
      initialVNode,
      parentComponent
    ));
    //信息收集
    setupComponent(instance);
    // 开箱
    setupRenderEffect(instance, initialVNode, container, anchor);
  }
  function setupRenderEffect(instance: any, initialVNode, container, anchor) {
    //Important!！目的：响应式对象的值改变的时候重新触发render
    //方法：用effect进行包装
    //调用render函数的时候会触发依赖收集 把当前的匿名函数收集起来
    //当响应式的值改变的时候会重新调用依赖函数 也就是render

    // instance.update 组件更新 effect函数返回值runner 当调用runner时会执行fn, 也就是effect(fn)中的fn
    instance.update = effect(
      () => {
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
          patch(null, subTree, container, instance, anchor);
          // Important!！ 子节点的挂载都初始化完成后
          // 将el赋值给当前[组件的]虚拟节点上  支持this.$el
          // 【state: 递归结束】
          initialVNode.el = subTree.el;
          instance.isMounted = true;
        } else {
          // update!!
          // next 新的虚拟节点 用于组件的更新
          const { next, vnode } = instance;
          if (next) {
            next.el = vnode.el;
            updateComponentPreRender(instance, next);
          }

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
          patch(prevSubTree, subTree, container, instance, anchor);
        }
      },
      {
        scheduler() {
          queueJobs(instance.update);
        },
      }
    );
  }
  // 组件更新
  function updateComponentPreRender(instance, nextVNode) {
    instance.vnode = nextVNode;
    instance.next = null;
    instance.props = nextVNode.props;
  }

  return {
    createApp: createAppAPI(render),
  };
}
