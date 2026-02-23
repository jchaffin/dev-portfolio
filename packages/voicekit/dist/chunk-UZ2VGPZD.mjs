// src/core/EventEmitter.ts
var EventEmitter = class {
  constructor() {
    this.handlers = /* @__PURE__ */ new Map();
  }
  on(event, handler) {
    let set = this.handlers.get(event);
    if (!set) {
      set = /* @__PURE__ */ new Set();
      this.handlers.set(event, set);
    }
    set.add(handler);
  }
  off(event, handler) {
    this.handlers.get(event)?.delete(handler);
  }
  emit(event, ...args) {
    this.handlers.get(event)?.forEach((fn) => {
      try {
        fn(...args);
      } catch (e) {
        console.error(`EventEmitter error in "${String(event)}":`, e);
      }
    });
  }
  removeAllListeners() {
    this.handlers.clear();
  }
};

export {
  EventEmitter
};
