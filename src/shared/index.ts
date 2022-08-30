export const extend = Object.assign;
export const isObject = (val) => {
  return val !== null && typeof val === "object";
};
export function isString(val) {
   return typeof val === 'string'
}
export function hasChanged(newValue, oldVal) {
  return !Object.is(newValue, oldVal);
}
export function hasOwn(target, key) {
  return Object.prototype.hasOwnProperty.call(target, key);
}

export const EMPTY_OBJ = {};
