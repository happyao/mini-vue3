import { createRenderer } from "../runtime-core/index";
function createElement(type) {
  return document.createElement(type);
}
function patchProp(el, key, prevVal, nextVal) {
  const isOn = (key: string) => /^on[A-Z]/.test(key);
  if (isOn(key)) {
    const event = key.slice(2).toLowerCase();
    el.addEventListener(event, nextVal);
  } else {
    if (nextVal === undefined || nextVal === null) {
      el.removeAttribute(key);
    } else {
      el.setAttribute(key, nextVal);
    }
  }
}

function insert(el, parent) {
  parent.append(el);
}

function remove(child) {
  const parent = child.parentNode;
  if (parent) {
    parent.removeChild(child);
  }
}
function setTextElemet(el, text) {
  el.textContent = text;
}
const render: any = createRenderer({
  createElement,
  patchProp,
  insert,
  remove,
  setTextElemet,
});

export function createApp(...args) {
  return render.createApp(...args);
}
export * from "../runtime-core/index";
