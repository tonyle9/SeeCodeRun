/* */ 
"use strict";
const conversions = require('webidl-conversions');
const utils = require('./utils');
const HTMLElement = require('./HTMLElement');
const impl = utils.implSymbol;
function HTMLSelectElement() {
  throw new TypeError("Illegal constructor");
}
HTMLSelectElement.prototype = Object.create(HTMLElement.interface.prototype);
HTMLSelectElement.prototype.constructor = HTMLSelectElement;
HTMLSelectElement.prototype.add = function add(element) {
  if (!this || !module.exports.is(this)) {
    throw new TypeError("Illegal invocation");
  }
  if (arguments.length < 1) {
    throw new TypeError("Failed to execute 'add' on 'HTMLSelectElement': 1 argument required, but only " + arguments.length + " present.");
  }
  const args = [];
  for (let i = 0; i < arguments.length && i < 2; ++i) {
    args[i] = utils.tryImplForWrapper(arguments[i]);
  }
  if (args[1] === null || args[1] === undefined) {
    args[1] = null;
  } else {}
  return utils.tryWrapperForImpl(this[impl].add.apply(this[impl], args));
};
HTMLSelectElement.prototype.remove = function remove() {
  if (!this || !module.exports.is(this)) {
    throw new TypeError("Illegal invocation");
  }
  const args = [];
  for (let i = 0; i < arguments.length && i < 1; ++i) {
    args[i] = utils.tryImplForWrapper(arguments[i]);
  }
  return utils.tryWrapperForImpl(this[impl].remove.apply(this[impl], args));
};
HTMLSelectElement.prototype.toString = function() {
  if (this === HTMLSelectElement.prototype) {
    return "[object HTMLSelectElementPrototype]";
  }
  return HTMLElement.interface.prototype.toString.call(this);
};
Object.defineProperty(HTMLSelectElement.prototype, "autofocus", {
  get() {
    return this.hasAttribute("autofocus");
  },
  set(V) {
    V = conversions["boolean"](V);
    if (V) {
      this.setAttribute("autofocus", "");
    } else {
      this.removeAttribute("autofocus");
    }
  },
  enumerable: true,
  configurable: true
});
Object.defineProperty(HTMLSelectElement.prototype, "disabled", {
  get() {
    return this.hasAttribute("disabled");
  },
  set(V) {
    V = conversions["boolean"](V);
    if (V) {
      this.setAttribute("disabled", "");
    } else {
      this.removeAttribute("disabled");
    }
  },
  enumerable: true,
  configurable: true
});
Object.defineProperty(HTMLSelectElement.prototype, "form", {
  get() {
    return utils.tryWrapperForImpl(this[impl].form);
  },
  enumerable: true,
  configurable: true
});
Object.defineProperty(HTMLSelectElement.prototype, "multiple", {
  get() {
    return this.hasAttribute("multiple");
  },
  set(V) {
    V = conversions["boolean"](V);
    if (V) {
      this.setAttribute("multiple", "");
    } else {
      this.removeAttribute("multiple");
    }
  },
  enumerable: true,
  configurable: true
});
Object.defineProperty(HTMLSelectElement.prototype, "name", {
  get() {
    const value = this.getAttribute("name");
    return value === null ? "" : value;
  },
  set(V) {
    V = conversions["DOMString"](V);
    this.setAttribute("name", V);
  },
  enumerable: true,
  configurable: true
});
Object.defineProperty(HTMLSelectElement.prototype, "required", {
  get() {
    return this.hasAttribute("required");
  },
  set(V) {
    V = conversions["boolean"](V);
    if (V) {
      this.setAttribute("required", "");
    } else {
      this.removeAttribute("required");
    }
  },
  enumerable: true,
  configurable: true
});
Object.defineProperty(HTMLSelectElement.prototype, "size", {
  get() {
    return utils.tryWrapperForImpl(this[impl].size);
  },
  set(V) {
    V = conversions["unsigned long"](V);
    this[impl].size = utils.tryImplForWrapper(V);
  },
  enumerable: true,
  configurable: true
});
Object.defineProperty(HTMLSelectElement.prototype, "type", {
  get() {
    return utils.tryWrapperForImpl(this[impl].type);
  },
  enumerable: true,
  configurable: true
});
Object.defineProperty(HTMLSelectElement.prototype, "options", {
  get() {
    return utils.tryWrapperForImpl(this[impl].options);
  },
  enumerable: true,
  configurable: true
});
Object.defineProperty(HTMLSelectElement.prototype, "length", {
  get() {
    return utils.tryWrapperForImpl(this[impl].length);
  },
  set(V) {
    V = conversions["unsigned long"](V);
    this[impl].length = utils.tryImplForWrapper(V);
  },
  enumerable: true,
  configurable: true
});
Object.defineProperty(HTMLSelectElement.prototype, "selectedIndex", {
  get() {
    return utils.tryWrapperForImpl(this[impl].selectedIndex);
  },
  set(V) {
    V = conversions["long"](V);
    this[impl].selectedIndex = utils.tryImplForWrapper(V);
  },
  enumerable: true,
  configurable: true
});
Object.defineProperty(HTMLSelectElement.prototype, "value", {
  get() {
    return utils.tryWrapperForImpl(this[impl].value);
  },
  set(V) {
    V = conversions["DOMString"](V);
    this[impl].value = utils.tryImplForWrapper(V);
  },
  enumerable: true,
  configurable: true
});
module.exports = {
  mixedInto: [],
  is(obj) {
    if (obj) {
      if (obj[impl] instanceof Impl.implementation) {
        return true;
      }
      for (let i = 0; i < module.exports.mixedInto.length; ++i) {
        if (obj instanceof module.exports.mixedInto[i]) {
          return true;
        }
      }
    }
    return false;
  },
  isImpl(obj) {
    if (obj) {
      if (obj instanceof Impl.implementation) {
        return true;
      }
      const wrapper = utils.wrapperForImpl(obj);
      for (let i = 0; i < module.exports.mixedInto.length; ++i) {
        if (wrapper instanceof module.exports.mixedInto[i]) {
          return true;
        }
      }
    }
    return false;
  },
  create(constructorArgs, privateData) {
    let obj = Object.create(HTMLSelectElement.prototype);
    this.setup(obj, constructorArgs, privateData);
    return obj;
  },
  createImpl(constructorArgs, privateData) {
    let obj = Object.create(HTMLSelectElement.prototype);
    this.setup(obj, constructorArgs, privateData);
    return utils.implForWrapper(obj);
  },
  _internalSetup(obj) {
    HTMLElement._internalSetup(obj);
  },
  setup(obj, constructorArgs, privateData) {
    if (!privateData)
      privateData = {};
    privateData.wrapper = obj;
    this._internalSetup(obj);
    obj[impl] = new Impl.implementation(constructorArgs, privateData);
    obj[impl][utils.wrapperSymbol] = obj;
  },
  interface: HTMLSelectElement,
  expose: {Window: {HTMLSelectElement: HTMLSelectElement}}
};
const Impl = require('../nodes/HTMLSelectElement-impl');
