class ReactiveEffect {
    private _fn
    private scheduler:Function |undefined
    constructor(fn,scheduler){
       this._fn = fn 
       this.scheduler = scheduler
    }

    run(){
        activeEffect = this
        return this._fn()
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
        if(effect.scheduler){
            effect.scheduler()
        }else{
            effect.run()
        }
        
    })

    
}
let activeEffect;
type effectOptions = {
    scheduler?:Function
}
export function effect(fn,options:effectOptions = {}){
   let _effect =  new ReactiveEffect(fn,options.scheduler)
   _effect.run()
   return _effect.run.bind(_effect)
}

