import { NodeTypes } from "../ast";
import { isText } from '../utils'

export function transformText(node){
 
  if(node.type === NodeTypes.ELEMENT){
    return ()=>{
      const {children} = node;
      let currentContainer;
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if(isText(child)){
          for (let j = i+1; j < children.length; j++) {
            const next = children[j];
            if(isText(next)){
              //插入一个compound节点
              currentContainer = children[i] ={
                type:NodeTypes.COMPOUND_EXPRESSION,
                children:[child]
              }
              currentContainer.children.push(' + ')
              currentContainer.children.push(next)
              children.splice(j,1)
              j--
  
            }else{
              //收集停止
              currentContainer = undefined
              break;
            }
            
          }
        }
       
      }
    }
  
  }
}