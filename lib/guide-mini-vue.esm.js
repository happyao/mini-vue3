const queue = [];
let isFlushPending = false;
//和scheduler用同一个promise
let p = Promise.resolve();
function nextTick(fn) {
    console.log("instance nexttick");
    return fn ? p.then(fn) : p;
}
function queueJobs(job) {
    if (!queue.includes(job)) {
        queue.push(job);
    }
    queueFlush();
}
function queueFlush() {
    //只创建一次Promise.resolve()就够了 用 isFlushPending 来判断
    if (isFlushPending)
        return;
    isFlushPending = true;
    nextTick(flushJobs);
}
function flushJobs() {
    let job;
    isFlushPending = false;
    while ((job = queue.shift())) {
        job();
    }
}

function toDisplayString(value) {
    return String(value);
}

const extend = Object.assign;
const isObject = (val) => {
    return val !== null && typeof val === "object";
};
function isString(val) {
    return typeof val === 'string';
}
function hasChanged(newValue, oldVal) {
    return !Object.is(newValue, oldVal);
}
function hasOwn(target, key) {
    return Object.prototype.hasOwnProperty.call(target, key);
}
const EMPTY_OBJ = {};

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
    $props: (i) => i.props,
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
        next: null,
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
    if (compiler && !Component.render) {
        if (Component.template) {
            Component.render = compiler(Component.template);
        }
    }
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
let compiler;
function registerRuntimeCompiler(_compiler) {
    return compiler = _compiler;
}

//最长递增子序列
function getSequence(arr) {
    const p = arr.slice();
    const result = [0];
    let i, j, u, v, c;
    const len = arr.length;
    for (i = 0; i < len; i++) {
        const arrI = arr[i];
        if (arrI !== 0) {
            j = result[result.length - 1];
            if (arr[j] < arrI) {
                p[i] = j;
                result.push(i);
                continue;
            }
            u = 0;
            v = result.length - 1;
            while (u < v) {
                c = (u + v) >> 1;
                if (arr[result[c]] < arrI) {
                    u = c + 1;
                }
                else {
                    v = c;
                }
            }
            if (arrI < arr[result[u]]) {
                if (u > 0) {
                    p[i] = result[u - 1];
                }
                result[u] = i;
            }
        }
    }
    u = result.length;
    v = result[u - 1];
    while (u-- > 0) {
        result[u] = v;
        v = p[v];
    }
    return result;
}
const r = getSequence([4, 2, 3, 1, 5]);
console.log(r); //[ 1, 2 ,4]

const Fragment = Symbol("Fragment");
const Text = Symbol("Text");
function createVNode(type, props, children) {
    const vnode = {
        type,
        props,
        children,
        el: null,
        shapeFlag: getShapeFlag(type),
        key: props && props.key,
        component: null,
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

function shouldUpdateComponent(n1, n2) {
    const { props: prevProps } = n1;
    const { props: nextProps } = n2;
    for (let key in nextProps) {
        if (nextProps[key] !== prevProps[key]) {
            return true;
        }
    }
    return false;
}

function createRenderer(options) {
    //把具体的实现函数传过来 runtime-dom层
    //改名字是为了好确认是外部传参
    const { createElement: hostCreateElement, patchProp: hostPatchProp, insert: hostInsert, remove: hostRemove, setTextElemet: hostSetElementText, } = options;
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
                if (shapeFlag & 1 /* ShapeFlags.ELEMENT */) {
                    processElement(n1, n2, container, parentComponent, anchor);
                }
                else if (shapeFlag & 2 /* ShapeFlags.STATEFUL_COMPONENT */) {
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
        }
        else {
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
        if (shapeFlag & 4 /* ShapeFlags.TEXT_CHILDREN */) {
            if (prevShapeFlag & 8 /* ShapeFlags.ARRAY_CHILDREN */) {
                // unmount老array类型节点
                unmountChildren(c1);
            }
            if (c1 !== c2) {
                //mount 新text类型节点
                hostSetElementText(container, c2);
            }
        }
        else {
            //新的是数组
            if (prevShapeFlag & 4 /* ShapeFlags.TEXT_CHILDREN */) {
                // unmount老text类型节点
                hostSetElementText(container, "");
                //mount 新array类型节点
                mountChildren(c2, container, parentComponent, anchor);
            }
            else {
                //Important!! 老array To 新array
                // 双端对比 指针移动
                patchKeyedChildren(c1, c2, container, parentComponent, anchor);
            }
        }
    }
    function patchKeyedChildren(c1, c2, container, parentComponent, parentAnchor) {
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
            }
            else {
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
            }
            else {
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
        }
        else if (i > e2) {
            // 4.老的比新的长 删掉老的
            while (i <= e1) {
                // 左侧
                // 右侧
                hostRemove(c1[i].el);
                i++;
            }
        }
        else {
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
                }
                else {
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
                }
                else {
                    if (newIndex >= maxNewIndexSoFar) {
                        maxNewIndexSoFar = newIndex;
                    }
                    else {
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
            console.log(moved, "increasingNewIndexSequence", increasingNewIndexSequence, //[1,2]
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
                }
                else if (moved) {
                    if (j < 0 || i !== increasingNewIndexSequence[j]) {
                        //移动位置
                        console.log("11", nextChild.el);
                        console.log("22", container);
                        console.log("33", anchor);
                        hostInsert(nextChild.el, container, anchor);
                    }
                    else {
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
        if (shapeFlag & 4 /* ShapeFlags.TEXT_CHILDREN */) {
            el.textContent = children;
        }
        else if (shapeFlag & 8 /* ShapeFlags.ARRAY_CHILDREN */) {
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
    function processComponent(n1, n2, container, parentComponent, anchor) {
        if (!n1) {
            mountComponent(n2, container, parentComponent, anchor);
        }
        else {
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
        }
        else {
            //不更新组件
            n2.el = n1.el;
            //n2.vnode = n2; // ?? why ??
        }
    }
    //initialVNode  初始化的节点
    function mountComponent(initialVNode, container, parentComponent, anchor) {
        //创建组件实例
        const instance = (initialVNode.component = createComponentInstance(initialVNode, parentComponent));
        //信息收集
        setupComponent(instance);
        // 开箱
        setupRenderEffect(instance, initialVNode, container, anchor);
    }
    function setupRenderEffect(instance, initialVNode, container, anchor) {
        //Important!！目的：响应式对象的值改变的时候重新触发render
        //方法：用effect进行包装
        //调用render函数的时候会触发依赖收集 把当前的匿名函数收集起来
        //当响应式的值改变的时候会重新调用依赖函数 也就是render
        // instance.update 组件更新 effect函数返回值runner 当调用runner时会执行fn, 也就是effect(fn)中的fn
        instance.update = effect(() => {
            if (!instance.isMounted) {
                // instance.render 函数其实就是组件中的 return h('div', 'hi, ' + this.msg)
                // h函数调用 =>创建虚拟节点 createVNode => 返回vnode
                // 【state: 开始】
                const subTree = (instance.subTree = instance.render.call(instance.proxy, instance.proxy // render的第一个入参
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
            }
            else {
                // update!!
                // next 新的虚拟节点 用于组件的更新
                const { next, vnode } = instance;
                if (next) {
                    next.el = vnode.el;
                    updateComponentPreRender(instance, next);
                }
                const subTree = instance.render.call(instance.proxy, instance.proxy); // render的第一个入参
                const prevSubTree = instance.subTree;
                console.log("update prevSubTree", prevSubTree, "currentSubTree", subTree);
                // 重新更新subTree
                instance.subTree = subTree;
                // Important!！ 让patch也支持更新  n1=>old n2=>new
                patch(prevSubTree, subTree, container, instance, anchor);
            }
        }, {
            scheduler() {
                queueJobs(instance.update);
            },
        });
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

var runtimeDom = /*#__PURE__*/Object.freeze({
    __proto__: null,
    nextTick: nextTick,
    createRenderer: createRenderer,
    provide: provide,
    inject: inject,
    createTextVNode: createTextVNode,
    createElementVNode: createVNode,
    h: h,
    renderSlots: renderSlots,
    getCurrentInstance: getCurrentInstance,
    registerRuntimeCompiler: registerRuntimeCompiler,
    toDisplayString: toDisplayString,
    ref: ref,
    proxyRefs: proxyRefs
});

function createElement(type) {
    return document.createElement(type);
}
function patchProp(el, key, prevVal, nextVal) {
    const isOn = (key) => /^on[A-Z]/.test(key);
    if (isOn(key)) {
        const event = key.slice(2).toLowerCase();
        el.addEventListener(event, nextVal);
    }
    else {
        if (nextVal === undefined || nextVal === null) {
            el.removeAttribute(key);
        }
        else {
            el.setAttribute(key, nextVal);
        }
    }
}
//从锚点开始插入
function insert(child, parent, anchor) {
    parent.insertBefore(child, anchor || null);
    // parent.append(el);
}
function remove(child) {
    const parent = child.parentNode;
    if (parent) {
        parent.removeChild(child);
    }
}
function setTextElemet(el, text) {
    el.textContent = text;
}
const render = createRenderer({
    createElement,
    patchProp,
    insert,
    remove,
    setTextElemet,
});
function createApp(...args) {
    return render.createApp(...args);
}

const TO_DISPLAY_STRING = Symbol('toDisplayString');
const CREATE_ELEMENT_VNODE = Symbol('createElementVNode');
const helperMapName = {
    [TO_DISPLAY_STRING]: "toDisplayString",
    [CREATE_ELEMENT_VNODE]: "createElementVNode"
};

function generate(ast) {
    const context = createCodegenContext();
    const { push } = context;
    //const helpers = ['toDisplayString']
    genFunctionPreamble(ast, context);
    push('return ');
    const functionName = 'render';
    const args = ["_ctx", "_cache"];
    const signature = args.join(',');
    push(`function ${functionName}(${signature}){`);
    push(`return `);
    genNode(ast.codegenNode, context);
    push("}");
    return {
        code: context.code
    };
}
function genNode(node, context) {
    switch (node.type) {
        case 3 /* NodeTypes.TEXT */:
            genText(node, context);
            break;
        case 0 /* NodeTypes.INTERPOLATION */:
            genInterpolation(node, context);
            break;
        case 1 /* NodeTypes.SIMPLE_EXPRESSION */:
            genExpression(node, context);
            break;
        case 2 /* NodeTypes.ELEMENT */:
            genElement(node, context);
            break;
        case 5 /* NodeTypes.COMPOUND_EXPRESSION */:
            genCompoundExpress(node, context);
    }
}
function genElement(node, context) {
    const { push, helper } = context;
    const { tag, children, props } = node;
    push(`${helper(CREATE_ELEMENT_VNODE)}(`);
    genNodeList(getNullable([tag, props, children]), context);
    //  push(`${helper(CREATE_ELEMENT_VNODE)}("${tag}"), null, "hi, " + _toDisplayString(_ctx.message)`);
    //  for (let i = 0; i < children.length; i++) {
    //    const child = children[i];
    //    genNode(child, context)
    //  }
    // const child = children[0]
    //genNode(children, context)
    push(")");
}
function genNodeList(nodes, context) {
    const { push } = context;
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (isString(node)) {
            push(node);
        }
        else {
            genNode(node, context);
        }
        if (i < nodes.length - 1) {
            push(", ");
        }
    }
}
function getNullable(args) {
    return args.map(arg => arg || "null");
}
function genText(node, context) {
    const { push } = context;
    push(`'${node.content}'`);
}
function genInterpolation(node, context) {
    const { push, helper } = context;
    //push(`_toDisplayString(_ctx.message)`)
    push(`${helper(TO_DISPLAY_STRING)}(`);
    genNode(node.content, context);
    push(`)`);
}
function genExpression(node, context) {
    const { push } = context;
    push(`${node.content}`);
}
function genCompoundExpress(node, context) {
    const children = node.children;
    const { push } = context;
    for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (isString(child)) {
            push(child);
        }
        else {
            genNode(child, context);
        }
    }
}
// 创建上下文对象 对方法进行封装
function createCodegenContext() {
    const context = {
        code: '',
        push(source) {
            context.code += source;
        },
        helper(key) {
            return `_${helperMapName[key]}`;
        }
    };
    return context;
}
function genFunctionPreamble(ast, context) {
    const VueBinging = "Vue";
    const { push } = context;
    const aliasHelper = (s) => `${helperMapName[s]}: _${helperMapName[s]}`;
    if (ast.helpers.length > 0) {
        push(`const { ${ast.helpers.map(aliasHelper).join(', ')} } = ${VueBinging}`);
    }
    push("\n");
}

function baseParse(content) {
    const context = createParseContext(content);
    return createRoot(parseChildren(context, []));
}
function parseChildren(context, ancestors) {
    const nodes = [];
    //Important !! 循环
    while (!isEnd(context, ancestors)) {
        let node;
        const s = context.source;
        if (s.startsWith("{{")) {
            node = parseInterpolation(context);
        }
        else if (s[0] === "<") {
            if (/[a-z]/i.test(s[1])) {
                node = parseElement(context, ancestors);
            }
        }
        else {
            node = parseText(context);
        }
        nodes.push(node);
    }
    return nodes;
}
function isEnd(context, ancestors) {
    const s = context.source;
    // 2.遇到结束标签 </
    // 从栈顶开始循环 优化
    for (let i = ancestors.length - 1; i >= 0; i--) {
        let tag = ancestors[i].tag;
        //解决死循环
        if (startWithEndOpen(s, tag)) {
            return true;
        }
    }
    // 1.source有值
    return !s;
}
function parseText(context) {
    //遇到openDelimiter 应该停止
    // 遇到 </ 也应该停下
    let endIndex = context.source.length;
    let endTokens = ["{{", "<"];
    for (let i = 0; i < endTokens.length; i++) {
        const index = context.source.indexOf(endTokens[i]);
        //离最近的终止位置停下来
        if (index !== -1 && endIndex > index) {
            endIndex = index;
        }
    }
    const content = parseTextData(context, endIndex);
    return {
        type: 3 /* NodeTypes.TEXT */,
        content,
    };
}
function parseTextData(context, length) {
    const content = context.source.slice(0, length);
    //推进
    advanceBy(context, content.length);
    return content;
}
function parseElement(context, ancestors) {
    const element = parseTag(context, 0 /* TagType.Start */);
    //Important!! 栈方法 判断结束while点位
    //收集
    ancestors.push(element);
    element.children = parseChildren(context, ancestors);
    //弹出
    ancestors.pop();
    // 匹配上再消费结束标签
    if (startWithEndOpen(context.source, element.tag)) {
        parseTag(context, 1 /* TagType.End */);
    }
    else {
        throw new Error(`缺少结束标签:${element.tag}`);
    }
    return element;
}
function startWithEndOpen(source, tag) {
    return (source.startsWith("</") &&
        source.slice(2, 2 + tag.length).toLowerCase() === tag.toLowerCase());
}
function parseTag(context, type) {
    // 1,解析div
    const match = /^<\/?([a-z]*)/i.exec(context.source);
    const tag = match[1];
    // 2.推进删除
    advanceBy(context, match[0].length);
    advanceBy(context, 1);
    // ?? 类型是结束标签 return
    if (type === 1 /* TagType.End */)
        return;
    return {
        type: 2 /* NodeTypes.ELEMENT */,
        tag,
    };
}
function parseInterpolation(context) {
    // {{message}}
    const openDelimiter = "{{";
    const closeDelimiter = "}}";
    const closeIndex = context.source.indexOf("}}", openDelimiter.length);
    // 此处用作推进
    advanceBy(context, openDelimiter.length);
    const rawContentLength = closeIndex - openDelimiter.length;
    const rawContent = parseTextData(context, rawContentLength);
    //处理边缘case
    const content = rawContent.trim();
    // 此处用作推进
    advanceBy(context, closeDelimiter.length);
    return {
        type: 0 /* NodeTypes.INTERPOLATION */,
        content: {
            type: 1 /* NodeTypes.SIMPLE_EXPRESSION */,
            content,
        },
    };
}
function advanceBy(context, length) {
    context.source = context.source.slice(length);
}
function createRoot(children) {
    return {
        children,
        type: 4 /* NodeTypes.ROOT */
    };
}
function createParseContext(content) {
    return {
        source: content,
    };
}

function transform(root, options = {}) {
    const context = createTransformContext(root, options);
    // 1.遍历 -深度优先搜索
    traverseNode(root, context);
    createRootCodegen(root);
    root.helpers = [...context.helpers.keys()];
}
function traverseNode(node, context) {
    //变动点
    // if(node.type === NodeTypes.TEXT){
    //   node.content += ' mini-vue'
    // }
    const { nodeTransforms } = context;
    const exitFns = [];
    if (nodeTransforms) {
        for (let i = 0; i < nodeTransforms.length; i++) {
            const transform = nodeTransforms[i];
            // 2.插件方法 对node进行transform，以方便后续生成函数字符串 codegen
            const onExit = transform(node, context);
            // Important !!
            if (onExit)
                exitFns.push(onExit);
        }
    }
    switch (node.type) {
        case 0 /* NodeTypes.INTERPOLATION */:
            context.helper(TO_DISPLAY_STRING);
            break;
        case 4 /* NodeTypes.ROOT */:
        case 2 /* NodeTypes.ELEMENT */:
            //执行流程的稳定点
            traversChildren(node, context);
            break;
    }
    let i = exitFns.length;
    //从后往前执行 transform
    while (i--) {
        exitFns[i]();
    }
}
function traversChildren(node, context) {
    const { children } = node;
    for (let i = 0; i < children.length; i++) {
        const node = children[i];
        traverseNode(node, context);
    }
}
//构建全局上下文对象
function createTransformContext(root, options) {
    const context = {
        root,
        nodeTransforms: options.nodeTransforms,
        helpers: new Map(),
        helper(key) {
            context.helpers.set(key, 1);
        }
    };
    return context;
}
function createRootCodegen(root) {
    const child = root.children[0];
    if (child.type === 2 /* NodeTypes.ELEMENT */) {
        root.codegenNode = child.codegenNode;
    }
    else {
        root.codegenNode = root.children[0];
    }
}

//对vnode做transform
function createVNodeCall(context, tag, props, children) {
    context.helper(CREATE_ELEMENT_VNODE);
    return {
        type: 2 /* NodeTypes.ELEMENT */,
        tag,
        props,
        children
    };
}

function transformElement(node, context) {
    if (node.type === 2 /* NodeTypes.ELEMENT */) {
        return () => {
            // 中间处理层
            // tag
            const vnodeTag = `'${node.tag}'`;
            //props
            let vnodeProps;
            //children
            const children = node.children;
            let vnodeChildren = children[0];
            // const vnodeElement = {
            //   type:NodeTypes.ELEMENT,
            //   tag:vnodeTag,
            //   props:vnodeProps,
            //   children:vnodeChildren
            // }
            node.codegenNode = createVNodeCall(context, vnodeTag, vnodeProps, vnodeChildren);
        };
    }
}

function transformExpression(node) {
    if (node.type === 0 /* NodeTypes.INTERPOLATION */) {
        node.content = processExpression(node.content);
    }
}
function processExpression(node) {
    node.content = `_ctx.${node.content}`;
    return node;
}

function isText(node) {
    return node.type === 0 /* NodeTypes.INTERPOLATION */ || node.type === 3 /* NodeTypes.TEXT */;
}

function transformText(node) {
    if (node.type === 2 /* NodeTypes.ELEMENT */) {
        return () => {
            const { children } = node;
            let currentContainer;
            for (let i = 0; i < children.length; i++) {
                const child = children[i];
                if (isText(child)) {
                    for (let j = i + 1; j < children.length; j++) {
                        const next = children[j];
                        if (isText(next)) {
                            //插入一个compound节点
                            currentContainer = children[i] = {
                                type: 5 /* NodeTypes.COMPOUND_EXPRESSION */,
                                children: [child]
                            };
                            currentContainer.children.push(' + ');
                            currentContainer.children.push(next);
                            children.splice(j, 1);
                            j--;
                        }
                        else {
                            //收集停止
                            currentContainer = undefined;
                            break;
                        }
                    }
                }
            }
        };
    }
}

function baseCompile(template) {
    const ast = baseParse(template);
    console.log('mixed-----', ast);
    transform(ast, {
        nodeTransforms: [transformExpression, transformElement, transformText]
    });
    return generate(ast);
}

// mini-vue 出口
function compileToFunction(template) {
    const { code } = baseCompile(template);
    // Vue runtime-dom
    //const render = renderFunction() // 给到组件的render函数
    // function renderFunction(Vue){
    //  const { 
    //     toDisplayString : _toDisplayString, 
    //     openBlock : _openBlock, 
    //     createElementBlock : _createElementBlock 
    //   } = Vue
    //  return function render(_ctx, _cache, $props, $setup, $data, $options) {
    //     return (_openBlock(), _createElementBlock("div", null, "hi, " + _toDisplayString(_ctx.message), 1 /* TEXT */))
    //   }
    // }
    const render = new Function("Vue", code)(runtimeDom); //?new Function什么意思   => renderFunction(Vue) 中的 Vue 就是 runtimeDom？
    console.log('--------render', code, render, runtimeDom);
    return render;
}
registerRuntimeCompiler(compileToFunction);

export { createApp, createVNode as createElementVNode, createRenderer, createTextVNode, getCurrentInstance, h, inject, nextTick, provide, proxyRefs, ref, registerRuntimeCompiler, renderSlots, toDisplayString };
