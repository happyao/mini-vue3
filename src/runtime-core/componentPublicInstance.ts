import { hasOwn } from "../shared/index";
const pubicProppertiesMap = {
  $el: (i) => i.vnode.el,
  $slots: (i) => i.slots,
};
export const PublicInstanceProxyHandlers = {
  // { _: instance}改名
  get({ _: instance }, key) {
    const { setupState, props } = instance;
    if (hasOwn(setupState, key)) {
      return setupState[key];
    } else if (hasOwn(props, key)) {
      return props[key];
    }

    //用map模式扩展
    let publicGetter = pubicProppertiesMap[key];

    if (publicGetter) {
      return publicGetter(instance);
    }
  },
};
