import { CREATE_ELEMENT_VNODE } from "./runtimeHelpers"

export const enum NodeTypes {
  INTERPOLATION, //0
  SIMPLE_EXPRESSION, //1
  ELEMENT, //2
  TEXT, //3
  ROOT, //4
  COMPOUND_EXPRESSION //5
}
//对vnode做transform
export function createVNodeCall(context,tag, props, children){
  context.helper(CREATE_ELEMENT_VNODE)

  return{
    type:NodeTypes.ELEMENT,
    tag,
    props,
    children
  }
}
