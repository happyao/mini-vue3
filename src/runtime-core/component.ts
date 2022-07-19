import { shallowReadonly } from "../reactivity/reactive";
import { initProps } from "./componentProps";
import { PublicInstanceProxyHandlers } from "./componentPublicInstance";

export function createComponentInstance(vnode) {
  const component = {
    vnode,
    type: vnode.type,
    setupState: {},
    props: {},
  };
  return component;
}
export function setupComponent(instance) {
  initProps(instance, instance.vnode.props);
  // initSlots()
  setupStatefulComponent(instance);
}
function setupStatefulComponent(instance: any) {
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
function handleSetupResult(instance, setupResult: any) {
  if (typeof setupResult === "object") {
    instance.setupState = setupResult;
  }
  finishComponentSetup(instance);
}
//保证render有值
function finishComponentSetup(instance: any) {
  const Component = instance.type;
  console.log("finishComponentSetup", Component);
  instance.render = Component.render;
}
