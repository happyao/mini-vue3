import { generate } from "../src/codegen"
import { baseParse } from "../src/parse"
import { transform } from "../src/transform"
import { transformExpression } from "../src/transforms/transformExpression"

describe('codegen',()=>{
  it('string',()=>{
    const ast  = baseParse('hi')
    console.log('codegen',ast );
    transform(ast)
    const {code} = generate(ast)
    //快照测试
    expect(code).toMatchSnapshot()
  }) 
  it('interpolation',()=>{
    const ast  = baseParse('{{message}}')
    console.log('codegen',ast );
    transform(ast,{
      nodeTransforms:[transformExpression]
    })
    const {code} = generate(ast)
    //快照测试
    expect(code).toMatchSnapshot()
  })
})