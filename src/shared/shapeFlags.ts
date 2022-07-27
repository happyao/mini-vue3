//【key value】不够高效 使用位运算解决问题
// | 两位都为0 才为0 做修改
// & 两位都为1 才为1 做查找
export const enum ShapeFlags {
  ELEMENT = 1, // 0001
  STATEFUL_COMPONENT = 1 << 1, // 0010
  TEXT_CHILDREN = 1 << 2, // 0100
  ARRAY_CHILDREN = 1 << 3, // 1000
  SLOT_CHILDREN = 1 << 4,
}

//  0101
//  0001
// &----
//  0001

//  0001
//  0100
// |----
//  0101
