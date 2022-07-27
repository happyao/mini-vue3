import { getCurrentInstance } from "./component";
//存
export function provide(key, value) {
  const currentInstance: any = getCurrentInstance();
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
export function inject(key, defaultValue) {
  const currentInstance: any = getCurrentInstance();
  if (currentInstance) {
    const parentProvides = currentInstance.parent.provides;
    if (parentProvides[key]) {
      return parentProvides[key];
    } else {
      if (typeof defaultValue === "function") {
        return defaultValue();
      } else {
        return defaultValue;
      }
    }
  }
}
