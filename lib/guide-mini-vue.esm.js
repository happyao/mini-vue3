const extend = Object.assign;
const isObject = (val) => {
    return val !== null && typeof val === "object";
};
function hasChanged(newValue, oldVal) {
    return !Object.is(newValue, oldVal);
}
function hasOwn(target, key) {
    return Object.prototype.hasOwnProperty.call(target, key);
}

let shouldTrack = false;
let activeEffect;
class ReactiveEffect {
    constructor(fn, scheduler) {
        this.deps = [];
        this.active = true; //flag防止重复清空
        this._fn = fn;
        this.scheduler = scheduler;
    }
    run() {
        if (!this.active) {
            return this._fn();
        }
        activeEffect = this;
        //先后顺序很重要
        // 应该收集
        shouldTrack = true;
        const r = this._fn();
        // 不再收集
        shouldTrack = false;
        return r;
    }
    stop() {
        //清空effect
        if (this.active) {
            cleanupEffect(this);
            this.onStop && this.onStop();
            this.active = false;
        }
    }
}
function cleanupEffect(effect) {
    effect.deps.forEach((dep) => {
        dep.delete(effect);
    });
    effect.deps.length = 0;
}
//存储副作用的函数桶 WeakMap 便于垃圾回收
let targetMap = new WeakMap();
function track(target, key) {
    // WeakMap 由target -->  Map构成
    // Map 由key --> Set构成 //去重
    if (!isTracking())
        return;
    let depsMap = targetMap.get(target);
    if (!depsMap) {
        depsMap = new Map();
        targetMap.set(target, depsMap);
    }
    let dep = depsMap.get(key);
    if (!dep) {
        dep = new Set();
        depsMap.set(key, dep);
    }
    trackEffects(dep);
}
function trackEffects(dep) {
    //不必重复收集副作用
    if (dep.has(activeEffect))
        return;
    dep.add(activeEffect);
    activeEffect.deps.push(dep);
}
//控制收集行为
function isTracking() {
    return shouldTrack && activeEffect !== undefined;
}
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
function effect(fn, options = {}) {
    let _effect = new ReactiveEffect(fn, options.scheduler);
    extend(_effect, options);
    _effect.onStop = options.onStop;
    _effect.run();
    const runner = _effect.run.bind(_effect);
    runner.effect = _effect;
    return runner;
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
        if (!isReadonly) {
            //收集依赖
            track(target, key);
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
        isMounted: false,
        subTree: {},
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
        instance.setupState = proxyRefs(setupResult);
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

//传入一个render 闭包
function createAppAPI(render) {
    return function createApp(rootComponent) {
        return {
            mount(rootContainer) {
                //先转换成虚拟节点
                // component => vnode
                console.log("mount");
                const vnode = createVNode(rootComponent);
                render(vnode, rootContainer);
            },
        };
    };
}

function createRenderer(options) {
    //把具体的实现函数传过来 runtime-dom层
    //改名字是为了好确认是外部传参
    const { createElement: hostCreateElement, patchProp: hostPatchProp, insert: hostInsert, } = options;
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
                if (shapeFlag & 1 /* ShapeFlags.ELEMENT */) {
                    processElement(n1, n2, container, parentComponent);
                }
                else if (shapeFlag & 2 /* ShapeFlags.STATEFUL_COMPONENT */) {
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
        }
        else {
            patchElement(n1, n2);
        }
    }
    // 更新element
    function patchElement(n1, n2, container) {
        console.log("patchElement");
        console.log("n1", n1);
        console.log("n2", n2);
        // 更新对比
        // props
        // children
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
        if (shapeFlag & 4 /* ShapeFlags.TEXT_CHILDREN */) {
            el.textContent = children;
        }
        else if (shapeFlag & 8 /* ShapeFlags.ARRAY_CHILDREN */) {
            mountChildren(vnode, el, parentComponent);
        }
        // props
        console.log("mountElement props", props, el);
        for (let key in props) {
            let value = props[key];
            hostPatchProp(el, key, value);
        }
        // container.append(el);
        hostInsert(el, container);
    }
    function mountChildren(vnode, containter, parentComponent) {
        vnode.children.forEach((v) => {
            patch(null, v, containter, parentComponent);
        });
    }
    function processComponent(n1, n2, container, parentComponent) {
        mountComponent(n2, container, parentComponent);
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
        //Important!！目的：响应式对象的值改变的时候重新触发render
        //方法：用effect进行包装
        //调用render函数的时候会触发依赖收集 把当前的匿名函数收集起来
        //当响应式的值改变的时候会重新调用依赖函数 也就是render
        effect(() => {
            if (!instance.isMounted) {
                // instance.render 函数其实就是组件中的 return h('div', 'hi, ' + this.msg)
                // h函数调用 =>创建虚拟节点 createVNode => 返回vnode
                // 【state: 开始】
                const subTree = (instance.subTree = instance.render.call(instance.proxy));
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
            }
            else {
                // update!!
                const subTree = instance.render.call(instance.proxy);
                const prevSubTree = instance.subTree;
                console.log("update prevSubTree", prevSubTree, "currentSubTree", subTree);
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

//存
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
//取
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

function createElement(type) {
    return document.createElement(type);
}
function patchProp(el, key, value) {
    const isOn = (key) => /^on[A-Z]/.test(key);
    if (isOn(key)) {
        const event = key.slice(2).toLowerCase();
        el.addEventListener(event, value);
    }
    else {
        el.setAttribute(key, value);
    }
}
function insert(el, parent) {
    parent.append(el);
}
const render = createRenderer({
    createElement,
    patchProp,
    insert,
});
function createApp(...args) {
    return render.createApp(...args);
}

class refImpl {
    constructor(value) {
        this.__v_isRef = true;
        this._rawValue = value;
        this._value = convert(value);
        this.dep = new Set();
    }
    get value() {
        trackRefValue(this);
        return this._value;
    }
    set value(newValue) {
        //触发依赖 未改变值不触发依赖
        if (hasChanged(newValue, this._rawValue)) {
            this._rawValue = newValue;
            this._value = convert(newValue);
            triggerEffects(this.dep);
        }
    }
}
function trackRefValue(ref) {
    if (isTracking()) {
        //收集依赖
        trackEffects(ref.dep);
    }
}
function convert(value) {
    return isObject(value) ? reactive(value) : value;
}
function ref(raw) {
    return new refImpl(raw);
}
function isRef(ref) {
    return !!ref.__v_isRef;
}
function unRef(ref) {
    return isRef(ref) ? ref.value : ref;
}
function proxyRefs(objectWithRefs) {
    return new Proxy(objectWithRefs, {
        get(target, key) {
            return unRef(Reflect.get(target, key));
        },
        set(target, key, value) {
            if (isRef(target[key]) && !isRef(value)) {
                return (target[key].value = value);
            }
            else {
                return Reflect.set(target, key, value);
            }
        },
    });
}

export { createApp, createRenderer, createTextVNode, getCurrentInstance, h, inject, provide, proxyRefs, ref, renderSlots };
