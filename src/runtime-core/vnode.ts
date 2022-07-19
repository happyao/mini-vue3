import { ShapeFlags } from "../shared/shapeFlags";
export function createVNode(type, props?, children?) {
  const vnode = {
    type,
    props,
    children,
    el: null,
    shapeFlag: getShapeFlag(type),
  };
  //这里其实将四个基本的类型进行组合了 4种基本类型变成4种组合类型
  if (typeof children === "string") {
    vnode.shapeFlag |= ShapeFlags.TEXT_CHILDREN;
  } else if (Array.isArray(children)) {
    vnode.shapeFlag |= ShapeFlags.ARRAY_CHILDREN;
  }

  return vnode;
}
function getShapeFlag(type: any) {
  return typeof type === "string"
    ? ShapeFlags.ELEMENT
    : ShapeFlags.STATEFUL_COMPONENT;
}
