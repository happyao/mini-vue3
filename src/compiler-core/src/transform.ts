import { NodeTypes } from "./ast";
import {TO_DISPLAY_STRING} from './runtimeHelpers'
export function transform(root, options={}){
  const context = createTransformContext(root, options)

  // 1.遍历 -深度优先搜索
  traverseNode(root, context)

  createRootCodegen(root)

  root.helpers = [...context.helpers.keys()]
  
}


function traverseNode(node, context){
  //变动点
  // if(node.type === NodeTypes.TEXT){
  //   node.content += ' mini-vue'
  // }
  
  const { nodeTransforms } = context;
  const exitFns:any = []
  if(nodeTransforms){
    for (let i = 0; i < nodeTransforms.length; i++) {
      const transform = nodeTransforms[i];
      // 2.插件方法 对node进行transform，以方便后续生成函数字符串 codegen
     const onExit =  transform(node,context)
     // Important !!
     if(onExit) exitFns.push(onExit)
    }
  }

  switch(node.type){
    case NodeTypes.INTERPOLATION:
      context.helper(TO_DISPLAY_STRING)
      break;
    case NodeTypes.ROOT:
    case NodeTypes.ELEMENT:
      //执行流程的稳定点
      traversChildren(node, context)
      break;

    default:
      break
  } 
  

  let i = exitFns.length
  //从后往前执行 transform
  while(i--){
    exitFns[i]()
  }
}

function traversChildren(node, context){
  const {children} = node
    for (let i = 0; i< children.length; i++) {
      const node = children[i];
      traverseNode(node, context)
    }
}
//构建全局上下文对象
function createTransformContext(root: any, options: any) {
  const context = {
    root,
    nodeTransforms: options.nodeTransforms,
    helpers: new Map(),
    helper(key){
      context.helpers.set(key, 1)
    }
  }
  return context
}
function createRootCodegen(root: any) {
  const child = root.children[0]
  
  if(child.type === NodeTypes.ELEMENT){
    root.codegenNode = child.codegenNode
  }else{
    root.codegenNode = root.children[0]
  }

}

