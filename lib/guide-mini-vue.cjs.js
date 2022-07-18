'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function createComponentInstance(vnode) {
    const component = {
        vnode,
        type: vnode.type,
    };
    return component;
}
function setupComponent(instance) {
    // initProps()
    // initSlots()
    setupStatefulComponent(instance);
}
function setupStatefulComponent(instance) {
    //获取配置
    const Component = instance.type;
    const { setup } = Component;
    if (setup) {
        const setupResult = setup();
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
    // TODO
    if (typeof vnode.type === "string") {
        processElement(vnode, container);
    }
    else {
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
    }
    else {
        mountChildren(vnode, el);
    }
    for (let key in props) {
        let value = props[key];
        el.setAttribute(key, value);
    }
    container.append(el);
}
function mountChildren(vnode, containter) {
    vnode.children.forEach((child) => {
        patch(child, containter);
    });
}
function processComponent(vnode, container) {
    mountComponent(vnode, container);
}
function mountComponent(vnode, container) {
    //创建组件实例
    const instance = createComponentInstance(vnode);
    //信息收集
    setupComponent(instance);
    // 开箱
    setupRenderEffect(instance, container);
}
function setupRenderEffect(instance, container) {
    // subTree return h('div', 'hi, ' + this.msg)
    const subTree = instance.render();
    // subTree = vnode
    // vnode => patch
    // vnode => element => mountElement
    // 递归
    patch(subTree, container);
}

function createVNode(type, props, children) {
    const vnode = {
        type,
        props,
        children,
    };
    return vnode;
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

exports.createApp = createApp;
exports.h = h;
