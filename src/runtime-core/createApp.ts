import { render } from "./renderer";
import { createVNode } from "./vnode";

export function createApp(rootComponent) {
  return {
    mount(rootContainer) {
      //先转换成虚拟节点
      // component => vnode
      console.log("mount");

      const vnode = createVNode(rootComponent);
      render(vnode, rootContainer);
    },
  };
}
