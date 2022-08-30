// mini-vue 出口
export * from "./runtime-dom/index";
import { baseCompile } from "./compiler-core/src";
import * as runtimeDom from './runtime-core'
import  {registerRuntimeCompiler} from './runtime-dom'
function compileToFunction(template){
  const {code} = baseCompile(template)
  // Vue runtime-dom
  //const render = renderFunction() // 给到组件的render函数
  // function renderFunction(Vue){
  //  const { 
  //     toDisplayString : _toDisplayString, 
  //     openBlock : _openBlock, 
  //     createElementBlock : _createElementBlock 
  //   } = Vue

  //  return function render(_ctx, _cache, $props, $setup, $data, $options) {
  //     return (_openBlock(), _createElementBlock("div", null, "hi, " + _toDisplayString(_ctx.message), 1 /* TEXT */))
  //   }
    
  // }
  //Passing parameters explicitly is a much better method architecturally and causes no problems with minifiers.
  const render = new Function("Vue", code)(runtimeDom) //?new Function什么意思  "Vue"是args , code是 functionBody 字符串=> renderFunction(Vue) 中的 Vue 就是 runtimeDom
  console.log('--------render', code,render,runtimeDom);
  
  return render;
}
registerRuntimeCompiler(compileToFunction)