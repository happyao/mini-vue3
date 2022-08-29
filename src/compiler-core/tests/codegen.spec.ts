import { generate } from "../src/codegen"
import { baseParse } from "../src/parse"
import { transform } from "../src/transform"

describe('codegen',()=>{
  it('string',()=>{
    const ast  = baseParse('hi')
    console.log('codegen',ast );
    transform(ast)
    const {code} = generate(ast)
    //快照测试
    expect(code).toMatchSnapshot()
  })
})