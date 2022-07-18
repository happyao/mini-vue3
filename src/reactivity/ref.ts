import { hasChanged, isObject } from "../shared/index";
import { trackEffects, triggerEffects, isTracking } from "./effect";
import { reactive } from "./reactive";

class refImpl {
  private _value;
  public dep;
  private _rawValue;
  public __v_isRef = true;
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

export function isRef(ref) {
  return !!ref.__v_isRef;
}
export function unRef(ref) {
  return isRef(ref) ? ref.value : ref;
}
export function proxyRefs(objectWithRefs) {
  return new Proxy(objectWithRefs, {
    get(target, key) {
      return unRef(Reflect.get(target, key));
    },
    set(target, key, value) {
      if (isRef(target[key]) && !isRef(value)) {
        return (target[key].value = value);
      } else {
        return Reflect.set(target, key, value);
      }
    },
  });
}
