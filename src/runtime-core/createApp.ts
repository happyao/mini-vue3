import { createVNode } from "./vnode";
//传入一个render 闭包
export function createAppAPI(render) {
  return function createApp(rootComponent) {
    return {
      mount(rootContainer) {
        //先转换成虚拟节点
        // component => vnode
        console.log("mount");

        const vnode = createVNode(rootComponent);
        render(vnode, rootContainer);
      },
    };
  };
}
