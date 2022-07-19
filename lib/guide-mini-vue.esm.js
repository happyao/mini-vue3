const extend = Object.assign;
const isObject = (val) => {
    return val !== null && typeof val === "object";
};
function hasOwn(target, key) {
    return Object.prototype.hasOwnProperty.call(target, key);
}

//存储副作用的函数桶 WeakMap 便于垃圾回收
let targetMap = new WeakMap();
function trigger(target, key) {
    let depsMap = targetMap.get(target);
    if (!depsMap)
        return;
    let dep = depsMap.get(key);
    triggerEffects(dep);
}
function triggerEffects(dep) {
    dep.forEach((effect) => {
        if (effect.scheduler) {
            effect.scheduler();
        }
        else {
            effect.run();
        }
    });
}

const get = createGetter();
const set = createSetter();
const readonlyGet = createGetter(true);
const shallowReadonlyGet = createGetter(true, true);
function createGetter(isReadonly = false, shallow = false) {
    return function get(target, key) {
        if (key === "__v_isReactive" /* ReactiveFlags.IS_REACTIVE */) {
            return !isReadonly;
        }
        else if (key === "__v_isReadonly" /* ReactiveFlags.IS_READONLY */) {
            return isReadonly;
        }
        const res = Reflect.get(target, key);
        if (shallow) {
            return res;
        }
        if (isObject(res)) {
            return isReadonly ? readonly(res) : reactive(res);
        }
        return res;
    };
}
function createSetter() {
    return function set(target, key, value) {
        const res = Reflect.set(target, key, value);
        //触发依赖
        trigger(target, key);
        return res;
    };
}
const mutableHandlers = {
    get,
    set,
};
const readonlyHandlers = {
    get: readonlyGet,
    set(target, key) {
        console.warn(`key :"${String(key)}" set 失败,因为 target 是 readonly 类型`, target);
        return true;
    },
};
const shallowReadonlyHandlers = extend({}, readonlyHandlers, {
    get: shallowReadonlyGet,
});

function reactive(raw) {
    return createReactiveObject(raw, mutableHandlers);
}
function readonly(raw) {
    return createReactiveObject(raw, readonlyHandlers);
}
function shallowReadonly(raw) {
    return createReactiveObject(raw, shallowReadonlyHandlers);
}
function createReactiveObject(target, baseHandles) {
    if (!isObject(target)) {
        console.warn(`target ${target}必须是一个对象`);
        return target;
    }
    return new Proxy(target, baseHandles);
}

function initProps(instance, rawProps) {
    instance.props = rawProps || {};
}

const pubicProppertiesMap = {
    $el: (i) => i.vnode.el,
};
const PublicInstanceProxyHandlers = {
    // { _: instance}改名
    get({ _: instance }, key) {
        const { setupState, props } = instance;
        if (hasOwn(setupState, key)) {
            return setupState[key];
        }
        else if (hasOwn(props, key)) {
            return props[key];
        }
        //用map模式扩展
        let publicGetter = pubicProppertiesMap[key];
        if (publicGetter) {
            return publicGetter(instance);
        }
    },
};

function createComponentInstance(vnode) {
    const component = {
        vnode,
        type: vnode.type,
        setupState: {},
        props: {},
    };
    return component;
}
function setupComponent(instance) {
    initProps(instance, instance.vnode.props);
    // initSlots()
    setupStatefulComponent(instance);
}
function setupStatefulComponent(instance) {
    //获取配置
    const Component = instance.type;
    //Important!! 代理模式 把setupState代理到instance上
    instance.proxy = new Proxy({ _: instance }, PublicInstanceProxyHandlers);
    const { setup } = Component;
    if (setup) {
        const setupResult = setup(shallowReadonly(instance.props));
        handleSetupResult(instance, setupResult);
    }
}
function handleSetupResult(instance, setupResult) {
    if (typeof setupResult === "object") {
        instance.setupState = setupResult;
    }
    finishComponentSetup(instance);
}
//保证render有值
function finishComponentSetup(instance) {
    const Component = instance.type;
    console.log("finishComponentSetup", Component);
    instance.render = Component.render;
}

function render(vnode, container) {
    //patch 递归处理
    patch(vnode, container);
}
function patch(vnode, container) {
    // 判断vnode是不是element类型
    // 是element应该处理element
    const { shapeFlag } = vnode;
    if (shapeFlag & 1 /* ShapeFlags.ELEMENT */) {
        processElement(vnode, container);
    }
    else if (shapeFlag & 2 /* ShapeFlags.STATEFUL_COMPONENT */) {
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
    if (shapeFlag & 4 /* ShapeFlags.TEXT_CHILDREN */) {
        el.textContent = children;
    }
    else if (shapeFlag & 8 /* ShapeFlags.ARRAY_CHILDREN */) {
        mountChildren(vnode, el);
    }
    for (let key in props) {
        let value = props[key];
        const isOn = (key) => /^on[A-Z]/.test(key);
        if (isOn(key)) {
            const event = key.slice(2).toLowerCase();
            el.addEventListener(event, value);
        }
        else {
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
function processComponent(vnode, container) {
    mountComponent(vnode, container);
}
//initialVNode  初始化的节点
function mountComponent(initialVNode, container) {
    //创建组件实例
    const instance = createComponentInstance(initialVNode);
    //信息收集
    setupComponent(instance);
    // 开箱
    setupRenderEffect(instance, initialVNode, container);
}
function setupRenderEffect(instance, initialVNode, container) {
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

function createVNode(type, props, children) {
    const vnode = {
        type,
        props,
        children,
        el: null,
        shapeFlag: getShapeFlag(type),
    };
    //这里其实将四个基本的类型进行组合了 4种基本类型变成4种组合类型
    if (typeof children === "string") {
        vnode.shapeFlag |= 4 /* ShapeFlags.TEXT_CHILDREN */;
    }
    else if (Array.isArray(children)) {
        vnode.shapeFlag |= 8 /* ShapeFlags.ARRAY_CHILDREN */;
    }
    return vnode;
}
function getShapeFlag(type) {
    return typeof type === "string"
        ? 1 /* ShapeFlags.ELEMENT */
        : 2 /* ShapeFlags.STATEFUL_COMPONENT */;
}

function createApp(rootComponent) {
    return {
        mount(rootContainer) {
            //先转换成虚拟节点
            // component => vnode
            console.log("mount");
            const vnode = createVNode(rootComponent);
            render(vnode, rootContainer);
        },
    };
}

function h(type, props, children) {
    return createVNode(type, props, children);
}

export { createApp, h };
