class ReactiveEffect {
    private _fn
    constructor(fn){
       this._fn = fn 
    }

    run(){
        activeEffect = this
        this._fn()
    }
}
//存储副作用的函数桶 WeakMap 便于垃圾回收
let targetMap = new WeakMap() 
export function track(target, key){
    // WeakMap 由target -->  Map构成
    // Map 由key --> Set构成 //去重
    let depsMap = targetMap.get(target)
    if(!depsMap){
        depsMap =  new Map()
        targetMap.set(target,depsMap)
    }
    let deps = depsMap.get(key)
    if(!deps){
        deps = new Set()
        depsMap.set(key, deps)
    }
    deps.add(activeEffect)
}
export function trigger(target, key){
    let  depsMap = targetMap.get(target)
    let deps = depsMap.get(key)
    deps.forEach(effect =>{
        effect.run()
    })

    
}
let activeEffect;
export function effect(fn){
   let _effect =  new ReactiveEffect(fn)
   _effect.run()
}

