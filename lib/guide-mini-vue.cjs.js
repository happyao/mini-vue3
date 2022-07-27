'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

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
    $slots: (i) => i.slots,
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

function emit(instance, event, ...args) {
    console.log("emit event", event);
    const { props } = instance;
    const capitalize = (str) => {
        return str.charAt(0).toLocaleUpperCase() + str.slice(1);
    };
    const toHandlerKey = (str) => {
        return str ? `on${capitalize(str)}` : "";
    };
    //支持-连接的emit
    const camelize = (str) => {
        //括号是提供分组功能 _ 匹配的部分 c: 第一个分组
        return str.replace(/-(\w)/g, (_, c) => {
            return c ? c.toLocaleUpperCase() : "";
        });
    };
    const handlerName = toHandlerKey(camelize(event));
    const handler = props[handlerName];
    //解构传参数
    handler && handler(...args);
}

function initSlots(instance, children) {
    // 检测是否需要slots处理 组件类型 + children是object
    const { vnode } = instance;
    if (vnode.shapeFlag & 16 /* ShapeFlags.SLOT_CHILDREN */) {
        normalizeObjectSlost(children, instance.slots);
    }
}
function normalizeObjectSlost(children, slots) {
    for (let key in children) {
        const value = children[key];
        slots[key] = (props) => normalizeSlotsValue(value(props));
    }
    // instance.slots = slots;
}
function normalizeSlotsValue(value) {
    return Array.isArray(value) ? value : [value];
}

function createComponentInstance(vnode, parent) {
    const component = {
        vnode,
        type: vnode.type,
        setupState: {},
        props: {},
        emit: () => { },
        slots: {},
        provides: parent ? parent.provides : {},
        parent,
    };
    console.log("createComponentInstance", parent);
    //emit 函数赋值 将component永远作为第一个入参传入
    component.emit = emit.bind(null, component);
    return component;
}
function setupComponent(instance) {
    initProps(instance, instance.vnode.props);
    initSlots(instance, instance.vnode.children);
    setupStatefulComponent(instance);
}
function setupStatefulComponent(instance) {
    //获取配置
    const Component = instance.type;
    //Important!! 代理模式 把setupState代理到instance上
    instance.proxy = new Proxy({ _: instance }, PublicInstanceProxyHandlers);
    const { setup } = Component;
    if (setup) {
        setCurrentIntance(instance);
        const setupResult = setup(shallowReadonly(instance.props), {
            emit: instance.emit,
        });
        setCurrentIntance(null);
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
let currentInstance = null;
function getCurrentInstance() {
    return currentInstance;
}
//封装成为函数 方便debug
//注意：只在setup作用域下才能取到currentInstance
function setCurrentIntance(instance) {
    currentInstance = instance;
}

function provide(key, value) {
    const currentInstance = getCurrentInstance();
    if (currentInstance) {
        let { provides, parent } = currentInstance;
        const parentProvides = parent.provides;
        // 当组件提供provides的时候 把本组件provides的原型指向父组件的provides,
        // 当inject读取时就可以利用 【原型链】进行查找
        // if 判断 =》初始化 防止currentInstance.provides 被重复覆盖
        if (provides === parentProvides) {
            provides = currentInstance.provides = Object.create(parentProvides);
            //等价于 currentInstance.provides.prototype = parentProvides
        }
        //赋值后不再进行初始化
        provides[key] = value;
    }
}
function inject(key, defaultValue) {
    const currentInstance = getCurrentInstance();
    if (currentInstance) {
        const parentProvides = currentInstance.parent.provides;
        if (parentProvides[key]) {
            return parentProvides[key];
        }
        else {
            if (typeof defaultValue === "function") {
                return defaultValue();
            }
            else {
                return defaultValue;
            }
        }
    }
}

const Fragment = Symbol("Fragment");
const Text = Symbol("Text");
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
    if (vnode.shapeFlag & 2 /* ShapeFlags.STATEFUL_COMPONENT */) {
        if (typeof children === "object") {
            vnode.shapeFlag |= 16 /* ShapeFlags.SLOT_CHILDREN */;
        }
    }
    return vnode;
}
function getShapeFlag(type) {
    return typeof type === "string"
        ? 1 /* ShapeFlags.ELEMENT */
        : 2 /* ShapeFlags.STATEFUL_COMPONENT */;
}
function createTextVNode(text) {
    return createVNode(Text, {}, text);
}

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
            if (shapeFlag & 1 /* ShapeFlags.ELEMENT */) {
                processElement(vnode, container, parentComponent);
            }
            else if (shapeFlag & 2 /* ShapeFlags.STATEFUL_COMPONENT */) {
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
    const el = (vnode.el = document.createElement(type));
    if (shapeFlag & 4 /* ShapeFlags.TEXT_CHILDREN */) {
        el.textContent = children;
    }
    else if (shapeFlag & 8 /* ShapeFlags.ARRAY_CHILDREN */) {
        mountChildren(vnode, el, parentComponent);
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
function mountChildren(vnode, containter, parentComponent) {
    vnode.children.forEach((v) => {
        patch(v, containter, parentComponent);
    });
}
function processComponent(vnode, container, parentComponent) {
    mountComponent(vnode, container, parentComponent);
}
//initialVNode  初始化的节点
function mountComponent(initialVNode, container, parentComponent) {
    //创建组件实例
    const instance = createComponentInstance(initialVNode, parentComponent);
    //信息收集
    setupComponent(instance);
    // 开箱
    setupRenderEffect(instance, initialVNode, container);
}
function setupRenderEffect(instance, initialVNode, container) {
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

function renderSlots(slots, name, props) {
    const slot = slots[name];
    if (slot) {
        if (typeof slot === "function") {
            return createVNode(Fragment, {}, slot(props));
        }
    }
}

exports.createApp = createApp;
exports.createTextVNode = createTextVNode;
exports.getCurrentInstance = getCurrentInstance;
exports.h = h;
exports.inject = inject;
exports.provide = provide;
exports.renderSlots = renderSlots;
