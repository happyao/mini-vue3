import { shallowReadonly } from "../reactivity/reactive";
import { initProps } from "./componentProps";
import { PublicInstanceProxyHandlers } from "./componentPublicInstance";
import { emit } from "./componentEmit";
import { initSlots } from "./componentSlots";
import { proxyRefs } from "../index";

export function createComponentInstance(vnode, parent) {
  const component = {
    vnode,
    type: vnode.type,
    setupState: {},
    props: {},
    emit: () => {},
    slots: {},
    provides: parent ? parent.provides : {}, // 初始化把parent.provides挂到provides上面
    parent,
    isMounted: false,
    subTree: {},
    next: null,
  };
  console.log("createComponentInstance", parent);

  //emit 函数赋值 将component永远作为第一个入参传入
  component.emit = emit.bind(null, component) as any;
  return component;
}
export function setupComponent(instance) {
  initProps(instance, instance.vnode.props);
  initSlots(instance, instance.vnode.children);
  setupStatefulComponent(instance);
}
function setupStatefulComponent(instance: any) {
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
function handleSetupResult(instance, setupResult: any) {
  if (typeof setupResult === "object") {
    instance.setupState = proxyRefs(setupResult);
  }
  finishComponentSetup(instance);
}
//保证render有值
function finishComponentSetup(instance: any) {
  const Component = instance.type;
  if(compiler && !Component.render){
    if(Component.template){
      Component.render = compiler(Component.template)
    }
  }
  console.log("finishComponentSetup", Component);
  instance.render = Component.render;
}
let currentInstance = null;
export function getCurrentInstance() {
  return currentInstance;
}
//封装成为函数 方便debug
//注意：只在setup作用域下才能取到currentInstance
export function setCurrentIntance(instance: any) {
  currentInstance = instance;
}

let compiler;
export function registerRuntimeCompiler(_compiler){
  return  compiler = _compiler
}
