/* */ 
"use strict";
const EventTargetImpl = require('../events/EventTarget-impl').implementation;
const idlUtils = require('../generated/utils');
const domSymbolTree = require('../helpers/internal-constants').domSymbolTree;
const simultaneousIterators = require('../../utils').simultaneousIterators;
const DOMException = require('../../web-idl/DOMException');
const NODE_TYPE = require('../node-type');
const NODE_DOCUMENT_POSITION = require('../node-document-position');
const createLiveNodeList = require('../node-list').createLive;
const updateNodeList = require('../node-list').update;
const updateHTMLCollection = require('../html-collection').update;
const documentBaseURL = require('../helpers/document-base-url').documentBaseURL;
const cloneNode = require('../node').clone;
const attributes = require('../attributes');
function getDocument(el) {
  return el.nodeType === NODE_TYPE.DOCUMENT_NODE ? el : el._ownerDocument;
}
function isObsoleteNodeType(node) {
  return node.nodeType === NODE_TYPE.ENTITY_NODE || node.nodeType === NODE_TYPE.ENTITY_REFERENCE_NODE || node.nodeType === NODE_TYPE.NOTATION_NODE || node.nodeType === NODE_TYPE.CDATA_SECTION_NODE;
}
function nodeEquals(a, b) {
  if (a.nodeType !== b.nodeType) {
    return false;
  }
  switch (a.nodeType) {
    case NODE_TYPE.DOCUMENT_TYPE_NODE:
      if (a.name !== b.name || a.publicId !== b.publicId || a.systemId !== b.systemId) {
        return false;
      }
      break;
    case NODE_TYPE.ELEMENT_NODE:
      if (a._namespaceURI !== b._namespaceURI || a._prefix !== b._prefix || a._localName !== b._localName || a._attributes.length !== b._attributes.length) {
        return false;
      }
      break;
    case NODE_TYPE.PROCESSING_INSTRUCTION_NODE:
      if (a._target !== b._target || a._data !== b._data) {
        return false;
      }
      break;
    case NODE_TYPE.TEXT_NODE:
    case NODE_TYPE.COMMENT_NODE:
      if (a._data !== b._data) {
        return false;
      }
      break;
  }
  if (a.nodeType === NODE_TYPE.ELEMENT_NODE && !attributes.attributeListsEqual(a, b)) {
    return false;
  }
  for (const nodes of simultaneousIterators(domSymbolTree.childrenIterator(a), domSymbolTree.childrenIterator(b))) {
    if (!nodes[0] || !nodes[1]) {
      return false;
    }
    if (!nodeEquals(nodes[0], nodes[1])) {
      return false;
    }
  }
  return true;
}
class NodeImpl extends EventTargetImpl {
  constructor(args, privateData) {
    super();
    domSymbolTree.initialize(this);
    this._core = privateData.core;
    this._ownerDocument = privateData.ownerDocument;
    this._readonly = false;
    this._childNodesList = null;
    this._childrenList = null;
    this._version = 0;
    this._memoizedQueries = {};
  }
  get nodeValue() {
    if (this.nodeType === NODE_TYPE.TEXT_NODE || this.nodeType === NODE_TYPE.COMMENT_NODE || this.nodeType === NODE_TYPE.PROCESSING_INSTRUCTION_NODE) {
      return this._data;
    }
    return null;
  }
  set nodeValue(value) {
    if (this.nodeType === NODE_TYPE.TEXT_NODE || this.nodeType === NODE_TYPE.COMMENT_NODE || this.nodeType === NODE_TYPE.PROCESSING_INSTRUCTION_NODE) {
      this.replaceData(0, this.length, value);
    }
  }
  get parentNode() {
    return domSymbolTree.parent(this);
  }
  get nodeName() {
    switch (this.nodeType) {
      case NODE_TYPE.ELEMENT_NODE:
        return this.tagName;
      case NODE_TYPE.TEXT_NODE:
        return "#text";
      case NODE_TYPE.PROCESSING_INSTRUCTION_NODE:
        return this.target;
      case NODE_TYPE.COMMENT_NODE:
        return "#comment";
      case NODE_TYPE.DOCUMENT_NODE:
        return "#document";
      case NODE_TYPE.DOCUMENT_TYPE_NODE:
        return this.name;
      case NODE_TYPE.DOCUMENT_FRAGMENT_NODE:
        return "#document-fragment";
    }
  }
  get firstChild() {
    return domSymbolTree.firstChild(this);
  }
  get ownerDocument() {
    return this.nodeType === NODE_TYPE.DOCUMENT_NODE ? null : this._ownerDocument;
  }
  get lastChild() {
    return domSymbolTree.lastChild(this);
  }
  get childNodes() {
    if (!this._childNodesList) {
      const self = this;
      this._childNodesList = createLiveNodeList(this, () => domSymbolTree.childrenToArray(self));
    } else {
      updateNodeList(this._childNodesList);
    }
    return this._childNodesList;
  }
  get nextSibling() {
    return domSymbolTree.nextSibling(this);
  }
  get previousSibling() {
    return domSymbolTree.previousSibling(this);
  }
  insertBefore(newChildImpl, refChildImpl) {
    if (!newChildImpl || !(newChildImpl instanceof NodeImpl)) {
      throw new TypeError("First argument to Node.prototype.insertBefore must be a Node");
    }
    if (refChildImpl !== null && !(refChildImpl instanceof NodeImpl)) {
      throw new TypeError("Second argument to Node.prototype.insertBefore must be a Node or null or undefined");
    }
    if (this._readonly === true) {
      throw new DOMException(DOMException.NO_MODIFICATION_ALLOWED_ERR, "Attempting to modify a read-only node");
    }
    if (newChildImpl.nodeType === NODE_TYPE.DOCUMENT_TYPE_NODE) {
      newChildImpl._ownerDocument = this._ownerDocument;
    }
    if (newChildImpl.nodeType && newChildImpl.nodeType === NODE_TYPE.ATTRIBUTE_NODE) {
      throw new DOMException(DOMException.HIERARCHY_REQUEST_ERR);
    }
    if (this._ownerDocument !== newChildImpl._ownerDocument) {
      this._ownerDocument.adoptNode(newChildImpl);
    } else {
      for (const ancestor of domSymbolTree.ancestorsIterator(this)) {
        if (ancestor === newChildImpl) {
          throw new DOMException(DOMException.HIERARCHY_REQUEST_ERR);
        }
      }
    }
    if (newChildImpl.nodeType === NODE_TYPE.DOCUMENT_FRAGMENT_NODE) {
      let grandChildImpl;
      while ((grandChildImpl = domSymbolTree.firstChild(newChildImpl))) {
        newChildImpl.removeChild(grandChildImpl);
        this.insertBefore(grandChildImpl, refChildImpl);
      }
    } else if (newChildImpl === refChildImpl) {
      return newChildImpl;
    } else {
      const oldParentImpl = domSymbolTree.parent(newChildImpl);
      if (oldParentImpl) {
        oldParentImpl.removeChild(newChildImpl);
      }
      if (refChildImpl === null) {
        domSymbolTree.appendChild(this, newChildImpl);
      } else {
        if (domSymbolTree.parent(refChildImpl) !== this) {
          throw new DOMException(DOMException.NOT_FOUND_ERR);
        }
        domSymbolTree.insertBefore(refChildImpl, newChildImpl);
      }
      this._modified();
      if (this._attached && newChildImpl._attach) {
        newChildImpl._attach();
      }
      this._descendantAdded(this, newChildImpl);
    }
    const doc = getDocument(this);
    let ev = doc.createEvent("MutationEvents");
    ev.initMutationEvent("DOMNodeInserted", true, false, this, null, null, null, null);
    newChildImpl.dispatchEvent(ev);
    ev = doc.createEvent("MutationEvents");
    ev.initMutationEvent("DOMSubtreeModified", true, false, this, null, null, null, null);
    this.dispatchEvent(ev);
    if (this.nodeType === NODE_TYPE.DOCUMENT_NODE || this._attachedToDocument) {
      ev = doc.createEvent("MutationEvents");
      ev.initMutationEvent("DOMNodeInsertedIntoDocument", false, false, null, null, null, null, null);
      for (const el of domSymbolTree.treeIterator(newChildImpl)) {
        if (el.nodeType === NODE_TYPE.ELEMENT_NODE) {
          el.dispatchEvent(ev);
          el._attachedToDocument = true;
        }
      }
    }
    return newChildImpl;
  }
  _modified() {
    this._version++;
    if (this._ownerDocument) {
      this._ownerDocument._version++;
    }
    if (this._childrenList) {
      updateHTMLCollection(this._childrenList);
    }
    if (this._childNodesList) {
      updateNodeList(this._childNodesList);
    }
    this._clearMemoizedQueries();
  }
  _clearMemoizedQueries() {
    this._memoizedQueries = {};
    const myParent = domSymbolTree.parent(this);
    if (myParent) {
      myParent._clearMemoizedQueries();
    }
  }
  _descendantRemoved(parent, child) {
    const myParent = domSymbolTree.parent(this);
    if (myParent) {
      myParent._descendantRemoved(parent, child);
    }
  }
  _descendantAdded(parent, child) {
    const myParent = domSymbolTree.parent(this);
    if (myParent) {
      myParent._descendantAdded(parent, child);
    }
  }
  replaceChild(node, child) {
    if (arguments.length < 2) {
      throw new TypeError("Not enough arguments to Node.prototype.replaceChild");
    }
    if (!node || !(node instanceof NodeImpl)) {
      throw new TypeError("First argument to Node.prototype.replaceChild must be a Node");
    }
    if (!child || !(child instanceof NodeImpl)) {
      throw new TypeError("Second argument to Node.prototype.replaceChild must be a Node");
    }
    this.insertBefore(node, child);
    return this.removeChild(child);
  }
  _attach() {
    this._attached = true;
    for (const child of domSymbolTree.childrenIterator(this)) {
      if (child._attach) {
        child._attach();
      }
    }
  }
  _detach() {
    this._attached = false;
    if (this._ownerDocument && this._ownerDocument._lastFocusedElement === this) {
      this._ownerDocument._lastFocusedElement = null;
    }
    for (const child of domSymbolTree.childrenIterator(this)) {
      if (child._detach) {
        child._detach();
      }
    }
  }
  removeChild(oldChildImpl) {
    if (this._readonly === true) {
      throw new DOMException(DOMException.NO_MODIFICATION_ALLOWED_ERR);
    }
    if (!oldChildImpl || domSymbolTree.parent(oldChildImpl) !== this) {
      throw new DOMException(DOMException.NOT_FOUND_ERR);
    }
    const doc = getDocument(this);
    let ev = doc.createEvent("MutationEvents");
    ev.initMutationEvent("DOMNodeRemoved", true, false, this, null, null, null, null);
    oldChildImpl.dispatchEvent(ev);
    ev = doc.createEvent("MutationEvents");
    ev.initMutationEvent("DOMSubtreeModified", true, false, this, null, null, null, null);
    this.dispatchEvent(ev);
    ev = doc.createEvent("MutationEvents");
    ev.initMutationEvent("DOMNodeRemovedFromDocument", false, false, null, null, null, null, null);
    for (const el of domSymbolTree.treeIterator(oldChildImpl)) {
      if (el.nodeType === NODE_TYPE.ELEMENT_NODE) {
        el.dispatchEvent(ev);
        el._attachedToDocument = false;
      }
    }
    const oldPreviousSibling = oldChildImpl.previousSibling;
    domSymbolTree.remove(oldChildImpl);
    this._modified();
    oldChildImpl._detach();
    this._descendantRemoved(this, oldChildImpl);
    if (this._ownerDocument) {
      this._ownerDocument._runRemovingSteps(oldChildImpl, this, oldPreviousSibling);
    }
    return oldChildImpl;
  }
  appendChild(newChild) {
    if (!("nodeType" in newChild)) {
      throw new TypeError("First argument to Node.prototype.appendChild must be a Node");
    }
    return this.insertBefore(newChild, null);
  }
  hasChildNodes() {
    return domSymbolTree.hasChildren(this);
  }
  normalize() {
    for (const child of domSymbolTree.childrenIterator(this)) {
      if (child.normalize) {
        child.normalize();
      }
      if (child.nodeValue === "") {
        this.removeChild(child);
        continue;
      }
      const prevChild = domSymbolTree.previousSibling(child);
      if (prevChild && prevChild.nodeType === NODE_TYPE.TEXT_NODE && child.nodeType === NODE_TYPE.TEXT_NODE) {
        prevChild.appendData(child.nodeValue);
        this.removeChild(child);
      }
    }
  }
  get parentElement() {
    const parentNode = domSymbolTree.parent(this);
    return parentNode !== null && parentNode.nodeType === NODE_TYPE.ELEMENT_NODE ? parentNode : null;
  }
  get baseURI() {
    return documentBaseURL(this._ownerDocument);
  }
  compareDocumentPosition(otherImpl) {
    const reference = this;
    if (!(otherImpl instanceof NodeImpl)) {
      throw new Error("Comparing position against non-Node values is not allowed");
    }
    if (isObsoleteNodeType(reference) || isObsoleteNodeType(otherImpl)) {
      throw new Error("Obsolete node type");
    }
    const result = domSymbolTree.compareTreePosition(reference, otherImpl);
    if (result === NODE_DOCUMENT_POSITION.DOCUMENT_POSITION_DISCONNECTED) {
      return NODE_DOCUMENT_POSITION.DOCUMENT_POSITION_DISCONNECTED | NODE_DOCUMENT_POSITION.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC | NODE_DOCUMENT_POSITION.DOCUMENT_POSITION_FOLLOWING;
    }
    return result;
  }
  contains(other) {
    if (!(other instanceof NodeImpl)) {
      return false;
    } else if (this === other) {
      return true;
    }
    return Boolean(this.compareDocumentPosition(other) & NODE_DOCUMENT_POSITION.DOCUMENT_POSITION_CONTAINED_BY);
  }
  isEqualNode(node) {
    if (node === null) {
      return false;
    }
    if (this === node) {
      return true;
    }
    return nodeEquals(this, node);
  }
  cloneNode(deep) {
    deep = Boolean(deep);
    return cloneNode(this._core, this, undefined, deep);
  }
  get textContent() {
    let text;
    switch (this.nodeType) {
      case NODE_TYPE.COMMENT_NODE:
      case NODE_TYPE.CDATA_SECTION_NODE:
      case NODE_TYPE.PROCESSING_INSTRUCTION_NODE:
      case NODE_TYPE.TEXT_NODE:
        return this.nodeValue;
      case NODE_TYPE.ATTRIBUTE_NODE:
      case NODE_TYPE.DOCUMENT_FRAGMENT_NODE:
      case NODE_TYPE.ELEMENT_NODE:
        text = "";
        for (const child of domSymbolTree.treeIterator(this)) {
          if (child.nodeType === NODE_TYPE.TEXT_NODE) {
            text += child.nodeValue;
          }
        }
        return text;
      default:
        return null;
    }
  }
  set textContent(txt) {
    switch (this.nodeType) {
      case NODE_TYPE.COMMENT_NODE:
      case NODE_TYPE.CDATA_SECTION_NODE:
      case NODE_TYPE.PROCESSING_INSTRUCTION_NODE:
      case NODE_TYPE.TEXT_NODE:
        this.nodeValue = String(txt);
        return;
    }
    let child = domSymbolTree.firstChild(this);
    while (child) {
      this.removeChild(child);
      child = domSymbolTree.firstChild(this);
    }
    if (txt !== "" && txt !== null) {
      this.appendChild(this._ownerDocument.createTextNode(txt));
    }
  }
  toString() {
    const wrapper = idlUtils.wrapperForImpl(this);
    return `[object ${wrapper.constructor.name}]`;
  }
}
module.exports = {implementation: NodeImpl};
