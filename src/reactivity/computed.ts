import { ReactiveEffect } from "./effect";
class ComputedImpl {
  private _value;
  private _dirty: boolean = true;
  private _effect;
  constructor(getter) {
    this._effect = new ReactiveEffect(getter, () => {
      //当被依赖的值改变的时候 触发trigger 调用scheduler 将_dirty设置为true 在下次get的时候 再次调用run函数（此处逻辑对应注释A处）
      if (!this._dirty) {
        this._dirty = true;
      }
    });
  }
  get value() {
    // A
    if (this._dirty) {
      this._dirty = false;
      return this._effect.run();
    }
    return this._value;
  }
}
export function computed(getter) {
  return new ComputedImpl(getter);
}
