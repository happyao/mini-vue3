const pubicProppertiesMap = {
  $el: (i) => i.vnode.el,
};
export const PublicInstanceProxyHandlers = {
  // { _: instance}改名
  get({ _: instance }, key) {
    const { setupState } = instance;
    if (key in setupState) {
      return setupState[key];
    }
    //用map模式扩展
    let publicGetter = pubicProppertiesMap[key];
    if (publicGetter) {
      return publicGetter(instance);
    }
  },
};
