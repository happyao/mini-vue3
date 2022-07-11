import { extent } from "../shared";

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
    activeEffect = this;
    return this._fn();
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
}
//存储副作用的函数桶 WeakMap 便于垃圾回收
let targetMap = new WeakMap();
export function track(target, key) {
  // WeakMap 由target -->  Map构成
  // Map 由key --> Set构成 //去重
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
  dep.add(activeEffect);
  if (!activeEffect) return;
  activeEffect.deps.push(dep);
}
export function trigger(target, key) {
  let depsMap = targetMap.get(target);
  let deps = depsMap.get(key);
  deps.forEach((effect) => {
    if (effect.scheduler) {
      effect.scheduler();
    } else {
      effect.run();
    }
  });
}
let activeEffect;
type effectOptions = {
  scheduler?: Function;
  [key: string]: any;
};

export function effect(fn, options: effectOptions = {}) {
  let _effect = new ReactiveEffect(fn);
  extent(_effect, options);
  _effect.onStop = options.onStop;
  _effect.run();
  const runner: any = _effect.run.bind(_effect);
  runner.effect = _effect;
  return runner;
}

export function stop(runner) {
  runner.effect.stop();
}
