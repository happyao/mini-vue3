export function emit(instance, event, ...args) {
  console.log("emit event", event);
  const { props } = instance;

  const capitalize = (str: string) => {
    return str.charAt(0).toLocaleUpperCase() + str.slice(1);
  };
  const toHandlerKey = (str: string) => {
    return str ? `on${capitalize(str)}` : "";
  };
  //支持-连接的emit
  const camelize = (str: string) => {
    //括号是提供分组功能 _ 匹配的部分 c: 第一个分组
    return str.replace(/-(\w)/g, (_, c: String) => {
      return c ? c.toLocaleUpperCase() : "";
    });
  };
  const handlerName = toHandlerKey(camelize(event));
  const handler = props[handlerName];
  //解构传参数
  handler && handler(...args);
}
