import { isString } from "../../shared"
import { NodeTypes } from "./ast"
import { CREATE_ELEMENT_VNODE, helperMapName, TO_DISPLAY_STRING } from "./runtimeHelpers"

export function generate(ast){
  const context = createCodegenContext()
  
  const { push } = context
  //const helpers = ['toDisplayString']
  genFunctionPreamble( ast, context)
 
  push('return ')
  const functionName = 'render'
  const args = ["_ctx","_cache"]
  const signature = args.join(',')
  
  push(`function ${functionName}(${signature}){`)
  push(`return `)
  genNode(ast.codegenNode, context)
  push("}")
  return {
    code:context.code
  }
}

function genNode(node:any, context){
  const {push} = context;

  switch(node.type){
    case NodeTypes.TEXT:
      genText(node,context)
      break
    case NodeTypes.INTERPOLATION:
      genInterpolation(node,context)
      break
    case NodeTypes.SIMPLE_EXPRESSION:
      genExpression(node,context)
      break
    case NodeTypes.ELEMENT:
      genElement(node,context)
      break;
    case NodeTypes.COMPOUND_EXPRESSION:
      genCompoundExpress(node, context)
    default:
      break;
  }

}
function genElement(node, context){
  const {push, helper} = context
  const {tag, children, props} = node
  
 push(`${helper(CREATE_ELEMENT_VNODE)}(`)
 genNodeList(getNullable([tag, props, children]), context)
//  push(`${helper(CREATE_ELEMENT_VNODE)}("${tag}"), null, "hi, " + _toDisplayString(_ctx.message)`);
//  for (let i = 0; i < children.length; i++) {
//    const child = children[i];
//    genNode(child, context)
//  }

// const child = children[0]
 //genNode(children, context)

 push(")")
}
function genNodeList(nodes,context){
  const {push} = context
  
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if(isString(node)){
      push(node)
    }else{
      genNode(node, context)

    } 
    if(i< nodes.length -1)  {
      push(", ")
    }
  }
}
function getNullable(args:any){
 return args.map( arg => arg || "null")
}
function genText(node, context){
  const {push} = context
  push(`'${node.content}'`)
}

function genInterpolation(node, context){
  const {push, helper} = context
  //push(`_toDisplayString(_ctx.message)`)
  push(`${helper(TO_DISPLAY_STRING)}(`)
  genNode(node.content, context)
  push(`)`)
}

function genExpression(node: any, context: any) {
  const {push} = context;
  push(`${node.content}`)
}

function genCompoundExpress(node: any, context: any) {
  const children = node.children
  const {push} = context
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if(isString(child)){
      push(child)
    }else{
      genNode(child, context) 
    }
  }
} 

// 创建上下文对象 对方法进行封装
function createCodegenContext() {
  const context = {
    code:'',
    push(source){
      context.code +=source
    },
    helper(key){
      return `_${helperMapName[key]}`
    }
  }
  return context
}
function genFunctionPreamble(ast, context) {
  const VueBinging = "Vue"
  const {push} = context
  const aliasHelper= (s)=> `${helperMapName[s]}: _${helperMapName[s]}`
  if(ast.helpers.length >0){
    push(`const { ${ast.helpers.map(aliasHelper).join(', ')} } = ${VueBinging}`)
  }
  push("\n")
}


