import { generate } from "../src/codegen"
import { baseParse } from "../src/parse"
import { transform } from "../src/transform"
import { transformElement } from "../src/transforms/transformElement"
import { transformExpression } from "../src/transforms/transformExpression"
import { transformText } from "../src/transforms/transformText"

describe('codegen',()=>{
  it('string',()=>{
    const ast  = baseParse('hi')
    transform(ast)
    const {code} = generate(ast)
    //快照测试
    expect(code).toMatchSnapshot()
  }) 
  it('interpolation',()=>{
    const ast  = baseParse('{{message}}')
    transform(ast,{
      nodeTransforms:[transformExpression]
    })
    const {code} = generate(ast)
    //快照测试
    expect(code).toMatchSnapshot()
  })
  it('element',()=>{
    const ast  = baseParse('<div></div>')
    transform(ast,{
      nodeTransforms:[transformElement]
    })
    const {code} = generate(ast)
    //快照测试
    expect(code).toMatchSnapshot()
  })
  it('mixed',()=>{
    const ast:any  = baseParse('<div>hi,{{message}}</div>')
    console.log('mixed-----',ast,);

    transform(ast,{
      nodeTransforms:[transformExpression,transformElement, transformText]
    })
    console.log('mixed transform ast-----',ast, '-----codegenNode-----',ast.codegenNode.children.children , '---');
    console.log('mixed -----ast children children--------',ast.children[0].children , '---');
    console.log('mixed -----ast children codegenNode--------',ast.children[0].codegenNode , '---');


    
    const {code} = generate(ast)
    //快照测试
    expect(code).toMatchSnapshot()
  })
})