import { hasChanged, isObject } from "../shared";
import { trackEffects, triggerEffects, isTracking } from "./effect";
import { reactive } from "./reactive";

class refImpl {
  private _value;
  public dep;
  private _rawValue;
  constructor(value) {
    this._rawValue = value;
    this._value = convert(value);
    this.dep = new Set();
  }
  get value() {
    trackRefValue(this);
    return this._value;
  }
  set value(newValue) {
    //触发依赖 未改变值不触发依赖
    if (hasChanged(newValue, this._rawValue)) {
      this._rawValue = newValue;
      this._value = convert(newValue);
      triggerEffects(this.dep);
    }
  }
}
function trackRefValue(ref) {
  if (isTracking()) {
    //收集依赖
    trackEffects(ref.dep);
  }
}
function convert(value) {
  return isObject(value) ? reactive(value) : value;
}
export function ref(raw) {
  return new refImpl(raw);
}
