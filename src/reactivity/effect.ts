import { extend } from "../shared";
let shouldTrack;
let activeEffect;
type effectOptions = {
  scheduler?: Function;
  [key: string]: any;
};
class ReactiveEffect {
  private _fn;
  deps = [];
  active = true; //flag防止重复清空
  onStop?: () => void;
  //public scheduler: Function | undefined; //public?
  constructor(fn) {
    this._fn = fn;
  }

  run() {
    if (!this.active) {
      return this._fn();
    }
    activeEffect = this;
    //先后顺序很重要
    // 应该收集
    shouldTrack = true;
    const r = this._fn();
    // 不再收集
    shouldTrack = false;
    return r;
  }
  stop() {
    //清空effect
    if (this.active) {
      cleanupEffect(this);
      this.onStop && this.onStop();
      this.active = false;
    }
  }
}

function cleanupEffect(effect) {
  effect.deps.forEach((dep: any) => {
    dep.delete(effect);
  });
  effect.deps.length = 0;
}
//存储副作用的函数桶 WeakMap 便于垃圾回收
let targetMap = new WeakMap();
export function track(target, key) {
  // WeakMap 由target -->  Map构成
  // Map 由key --> Set构成 //去重
  if (!isTracking()) return;
  let depsMap = targetMap.get(target);
  if (!depsMap) {
    depsMap = new Map();
    targetMap.set(target, depsMap);
  }
  let dep = depsMap.get(key);
  if (!dep) {
    dep = new Set();
    depsMap.set(key, dep);
  }
  trackEffects(dep);
}
export function trackEffects(dep) {
  //不必重复收集副作用
  if (dep.has(activeEffect)) return;
  dep.add(activeEffect);
  activeEffect.deps.push(dep);
}
//控制收集行为
export function isTracking() {
  return shouldTrack && activeEffect !== undefined;
}
export function trigger(target, key) {
  let depsMap = targetMap.get(target);
  let dep = depsMap.get(key);
  triggerEffects(dep);
}
export function triggerEffects(dep) {
  dep.forEach((effect) => {
    if (effect.scheduler) {
      effect.scheduler();
    } else {
      effect.run();
    }
  });
}

export function effect(fn, options: effectOptions = {}) {
  let _effect = new ReactiveEffect(fn);
  extend(_effect, options);
  _effect.onStop = options.onStop;
  _effect.run();
  const runner: any = _effect.run.bind(_effect);
  runner.effect = _effect;
  return runner;
}

export function stop(runner) {
  runner.effect.stop();
}
