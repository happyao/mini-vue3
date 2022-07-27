import { ShapeFlags } from "../shared/shapeFlags";

export function initSlots(instance, children) {
  // 检测是否需要slots处理 组件类型 + children是object
  const { vnode } = instance;
  if (vnode.shapeFlag & ShapeFlags.SLOT_CHILDREN) {
    normalizeObjectSlost(children, instance.slots);
  }
}

function normalizeObjectSlost(children, slots) {
  for (let key in children) {
    const value = children[key];
    slots[key] = (props) => normalizeSlotsValue(value(props));
  }
  // instance.slots = slots;
}

function normalizeSlotsValue(value) {
  return Array.isArray(value) ? value : [value];
}
