
export function transform(root, options={}){
  const context = createTransformContext(root, options)

  // 1.遍历 -深度优先搜索
  traverse(root, context)
  

  createRootCodegen(root)
  
}


function traverse(node, context){
  //变动点
  // if(node.type === NodeTypes.TEXT){
  //   node.content += ' mini-vue'
  // }
  const { nodeTransforms } = context;
  if(nodeTransforms){
    for (let i = 0; i < nodeTransforms.length; i++) {
      const transform = nodeTransforms[i];
    // 2.修改text content
      transform(node)
    }
  }
  

  //执行流程的稳定点
  traversChildren(node, context)
}

function traversChildren(node, context){
  const {children} = node
  if(children){
    for (let i = 0; i< children.length; i++) {
      const node = children[i];
      traverse(node, context)
    }
  }
}
//构建全局上下文对象
function createTransformContext(root: any, options: any) {
  const context = {
    root,
    nodeTransforms: options.nodeTransforms
  }
  return context
}
function createRootCodegen(root: any) {
  root.codegenNode = root.children[0]
}

