/* */ 
"format cjs";
(function(process) {
  (function(f) {
    if (typeof exports === "object" && typeof module !== "undefined") {
      module.exports = f();
    } else if (typeof define === "function" && define.amd) {
      define([], f);
    } else {
      var g;
      if (typeof window !== "undefined") {
        g = window;
      } else if (typeof global !== "undefined") {
        g = global;
      } else if (typeof self !== "undefined") {
        g = self;
      } else {
        g = this;
      }
      g.acorn = f();
    }
  })(function() {
    var define,
        module,
        exports;
    return (function e(t, n, r) {
      function s(o, u) {
        if (!n[o]) {
          if (!t[o]) {
            var a = typeof require == "function" && require;
            if (!u && a)
              return a(o, !0);
            if (i)
              return i(o, !0);
            var f = new Error("Cannot find module '" + o + "'");
            throw f.code = "MODULE_NOT_FOUND", f;
          }
          var l = n[o] = {exports: {}};
          t[o][0].call(l.exports, function(e) {
            var n = t[o][1][e];
            return s(n ? n : e);
          }, l, l.exports, e, t, n, r);
        }
        return n[o].exports;
      }
      var i = typeof require == "function" && require;
      for (var o = 0; o < r.length; o++)
        s(r[o]);
      return s;
    })({
      1: [function(_dereq_, module, exports) {
        "use strict";
        var _tokentype = _dereq_("./tokentype");
        var _state = _dereq_("./state");
        var pp = _state.Parser.prototype;
        pp.checkPropClash = function(prop, propHash) {
          if (this.options.ecmaVersion >= 6 && (prop.computed || prop.method || prop.shorthand))
            return;
          var key = prop.key;
          var name = undefined;
          switch (key.type) {
            case "Identifier":
              name = key.name;
              break;
            case "Literal":
              name = String(key.value);
              break;
            default:
              return;
          }
          var kind = prop.kind;
          if (this.options.ecmaVersion >= 6) {
            if (name === "__proto__" && kind === "init") {
              if (propHash.proto)
                this.raise(key.start, "Redefinition of __proto__ property");
              propHash.proto = true;
            }
            return;
          }
          name = "$" + name;
          var other = propHash[name];
          if (other) {
            var isGetSet = kind !== "init";
            if ((this.strict || isGetSet) && other[kind] || !(isGetSet ^ other.init))
              this.raise(key.start, "Redefinition of property");
          } else {
            other = propHash[name] = {
              init: false,
              get: false,
              set: false
            };
          }
          other[kind] = true;
        };
        pp.parseExpression = function(noIn, refDestructuringErrors) {
          var startPos = this.start,
              startLoc = this.startLoc;
          var expr = this.parseMaybeAssign(noIn, refDestructuringErrors);
          if (this.type === _tokentype.types.comma) {
            var node = this.startNodeAt(startPos, startLoc);
            node.expressions = [expr];
            while (this.eat(_tokentype.types.comma))
              node.expressions.push(this.parseMaybeAssign(noIn, refDestructuringErrors));
            return this.finishNode(node, "SequenceExpression");
          }
          return expr;
        };
        pp.parseMaybeAssign = function(noIn, refDestructuringErrors, afterLeftParse) {
          if (this.type == _tokentype.types._yield && this.inGenerator)
            return this.parseYield();
          var validateDestructuring = false;
          if (!refDestructuringErrors) {
            refDestructuringErrors = {
              shorthandAssign: 0,
              trailingComma: 0
            };
            validateDestructuring = true;
          }
          var startPos = this.start,
              startLoc = this.startLoc;
          if (this.type == _tokentype.types.parenL || this.type == _tokentype.types.name)
            this.potentialArrowAt = this.start;
          var left = this.parseMaybeConditional(noIn, refDestructuringErrors);
          if (afterLeftParse)
            left = afterLeftParse.call(this, left, startPos, startLoc);
          if (this.type.isAssign) {
            if (validateDestructuring)
              this.checkPatternErrors(refDestructuringErrors, true);
            var node = this.startNodeAt(startPos, startLoc);
            node.operator = this.value;
            node.left = this.type === _tokentype.types.eq ? this.toAssignable(left) : left;
            refDestructuringErrors.shorthandAssign = 0;
            this.checkLVal(left);
            this.next();
            node.right = this.parseMaybeAssign(noIn);
            return this.finishNode(node, "AssignmentExpression");
          } else {
            if (validateDestructuring)
              this.checkExpressionErrors(refDestructuringErrors, true);
          }
          return left;
        };
        pp.parseMaybeConditional = function(noIn, refDestructuringErrors) {
          var startPos = this.start,
              startLoc = this.startLoc;
          var expr = this.parseExprOps(noIn, refDestructuringErrors);
          if (this.checkExpressionErrors(refDestructuringErrors))
            return expr;
          if (this.eat(_tokentype.types.question)) {
            var node = this.startNodeAt(startPos, startLoc);
            node.test = expr;
            node.consequent = this.parseMaybeAssign();
            this.expect(_tokentype.types.colon);
            node.alternate = this.parseMaybeAssign(noIn);
            return this.finishNode(node, "ConditionalExpression");
          }
          return expr;
        };
        pp.parseExprOps = function(noIn, refDestructuringErrors) {
          var startPos = this.start,
              startLoc = this.startLoc;
          var expr = this.parseMaybeUnary(refDestructuringErrors);
          if (this.checkExpressionErrors(refDestructuringErrors))
            return expr;
          return this.parseExprOp(expr, startPos, startLoc, -1, noIn);
        };
        pp.parseExprOp = function(left, leftStartPos, leftStartLoc, minPrec, noIn) {
          var prec = this.type.binop;
          if (prec != null && (!noIn || this.type !== _tokentype.types._in)) {
            if (prec > minPrec) {
              var node = this.startNodeAt(leftStartPos, leftStartLoc);
              node.left = left;
              node.operator = this.value;
              var op = this.type;
              this.next();
              var startPos = this.start,
                  startLoc = this.startLoc;
              node.right = this.parseExprOp(this.parseMaybeUnary(), startPos, startLoc, prec, noIn);
              this.finishNode(node, op === _tokentype.types.logicalOR || op === _tokentype.types.logicalAND ? "LogicalExpression" : "BinaryExpression");
              return this.parseExprOp(node, leftStartPos, leftStartLoc, minPrec, noIn);
            }
          }
          return left;
        };
        pp.parseMaybeUnary = function(refDestructuringErrors) {
          if (this.type.prefix) {
            var node = this.startNode(),
                update = this.type === _tokentype.types.incDec;
            node.operator = this.value;
            node.prefix = true;
            this.next();
            node.argument = this.parseMaybeUnary();
            this.checkExpressionErrors(refDestructuringErrors, true);
            if (update)
              this.checkLVal(node.argument);
            else if (this.strict && node.operator === "delete" && node.argument.type === "Identifier")
              this.raise(node.start, "Deleting local variable in strict mode");
            return this.finishNode(node, update ? "UpdateExpression" : "UnaryExpression");
          }
          var startPos = this.start,
              startLoc = this.startLoc;
          var expr = this.parseExprSubscripts(refDestructuringErrors);
          if (this.checkExpressionErrors(refDestructuringErrors))
            return expr;
          while (this.type.postfix && !this.canInsertSemicolon()) {
            var node = this.startNodeAt(startPos, startLoc);
            node.operator = this.value;
            node.prefix = false;
            node.argument = expr;
            this.checkLVal(expr);
            this.next();
            expr = this.finishNode(node, "UpdateExpression");
          }
          return expr;
        };
        pp.parseExprSubscripts = function(refDestructuringErrors) {
          var startPos = this.start,
              startLoc = this.startLoc;
          var expr = this.parseExprAtom(refDestructuringErrors);
          var skipArrowSubscripts = expr.type === "ArrowFunctionExpression" && this.input.slice(this.lastTokStart, this.lastTokEnd) !== ")";
          if (this.checkExpressionErrors(refDestructuringErrors) || skipArrowSubscripts)
            return expr;
          return this.parseSubscripts(expr, startPos, startLoc);
        };
        pp.parseSubscripts = function(base, startPos, startLoc, noCalls) {
          for (; ; ) {
            if (this.eat(_tokentype.types.dot)) {
              var node = this.startNodeAt(startPos, startLoc);
              node.object = base;
              node.property = this.parseIdent(true);
              node.computed = false;
              base = this.finishNode(node, "MemberExpression");
            } else if (this.eat(_tokentype.types.bracketL)) {
              var node = this.startNodeAt(startPos, startLoc);
              node.object = base;
              node.property = this.parseExpression();
              node.computed = true;
              this.expect(_tokentype.types.bracketR);
              base = this.finishNode(node, "MemberExpression");
            } else if (!noCalls && this.eat(_tokentype.types.parenL)) {
              var node = this.startNodeAt(startPos, startLoc);
              node.callee = base;
              node.arguments = this.parseExprList(_tokentype.types.parenR, false);
              base = this.finishNode(node, "CallExpression");
            } else if (this.type === _tokentype.types.backQuote) {
              var node = this.startNodeAt(startPos, startLoc);
              node.tag = base;
              node.quasi = this.parseTemplate();
              base = this.finishNode(node, "TaggedTemplateExpression");
            } else {
              return base;
            }
          }
        };
        pp.parseExprAtom = function(refDestructuringErrors) {
          var node = undefined,
              canBeArrow = this.potentialArrowAt == this.start;
          switch (this.type) {
            case _tokentype.types._super:
              if (!this.inFunction)
                this.raise(this.start, "'super' outside of function or class");
            case _tokentype.types._this:
              var type = this.type === _tokentype.types._this ? "ThisExpression" : "Super";
              node = this.startNode();
              this.next();
              return this.finishNode(node, type);
            case _tokentype.types._yield:
              if (this.inGenerator)
                this.unexpected();
            case _tokentype.types.name:
              var startPos = this.start,
                  startLoc = this.startLoc;
              var id = this.parseIdent(this.type !== _tokentype.types.name);
              if (canBeArrow && !this.canInsertSemicolon() && this.eat(_tokentype.types.arrow))
                return this.parseArrowExpression(this.startNodeAt(startPos, startLoc), [id]);
              return id;
            case _tokentype.types.regexp:
              var value = this.value;
              node = this.parseLiteral(value.value);
              node.regex = {
                pattern: value.pattern,
                flags: value.flags
              };
              return node;
            case _tokentype.types.num:
            case _tokentype.types.string:
              return this.parseLiteral(this.value);
            case _tokentype.types._null:
            case _tokentype.types._true:
            case _tokentype.types._false:
              node = this.startNode();
              node.value = this.type === _tokentype.types._null ? null : this.type === _tokentype.types._true;
              node.raw = this.type.keyword;
              this.next();
              return this.finishNode(node, "Literal");
            case _tokentype.types.parenL:
              return this.parseParenAndDistinguishExpression(canBeArrow);
            case _tokentype.types.bracketL:
              node = this.startNode();
              this.next();
              if (this.options.ecmaVersion >= 7 && this.type === _tokentype.types._for) {
                return this.parseComprehension(node, false);
              }
              node.elements = this.parseExprList(_tokentype.types.bracketR, true, true, refDestructuringErrors);
              return this.finishNode(node, "ArrayExpression");
            case _tokentype.types.braceL:
              return this.parseObj(false, refDestructuringErrors);
            case _tokentype.types._function:
              node = this.startNode();
              this.next();
              return this.parseFunction(node, false);
            case _tokentype.types._class:
              return this.parseClass(this.startNode(), false);
            case _tokentype.types._new:
              return this.parseNew();
            case _tokentype.types.backQuote:
              return this.parseTemplate();
            default:
              this.unexpected();
          }
        };
        pp.parseLiteral = function(value) {
          var node = this.startNode();
          node.value = value;
          node.raw = this.input.slice(this.start, this.end);
          this.next();
          return this.finishNode(node, "Literal");
        };
        pp.parseParenExpression = function() {
          this.expect(_tokentype.types.parenL);
          var val = this.parseExpression();
          this.expect(_tokentype.types.parenR);
          return val;
        };
        pp.parseParenAndDistinguishExpression = function(canBeArrow) {
          var startPos = this.start,
              startLoc = this.startLoc,
              val = undefined;
          if (this.options.ecmaVersion >= 6) {
            this.next();
            if (this.options.ecmaVersion >= 7 && this.type === _tokentype.types._for) {
              return this.parseComprehension(this.startNodeAt(startPos, startLoc), true);
            }
            var innerStartPos = this.start,
                innerStartLoc = this.startLoc;
            var exprList = [],
                first = true;
            var refDestructuringErrors = {
              shorthandAssign: 0,
              trailingComma: 0
            },
                spreadStart = undefined,
                innerParenStart = undefined;
            while (this.type !== _tokentype.types.parenR) {
              first ? first = false : this.expect(_tokentype.types.comma);
              if (this.type === _tokentype.types.ellipsis) {
                spreadStart = this.start;
                exprList.push(this.parseParenItem(this.parseRest()));
                break;
              } else {
                if (this.type === _tokentype.types.parenL && !innerParenStart) {
                  innerParenStart = this.start;
                }
                exprList.push(this.parseMaybeAssign(false, refDestructuringErrors, this.parseParenItem));
              }
            }
            var innerEndPos = this.start,
                innerEndLoc = this.startLoc;
            this.expect(_tokentype.types.parenR);
            if (canBeArrow && !this.canInsertSemicolon() && this.eat(_tokentype.types.arrow)) {
              this.checkPatternErrors(refDestructuringErrors, true);
              if (innerParenStart)
                this.unexpected(innerParenStart);
              return this.parseParenArrowList(startPos, startLoc, exprList);
            }
            if (!exprList.length)
              this.unexpected(this.lastTokStart);
            if (spreadStart)
              this.unexpected(spreadStart);
            this.checkExpressionErrors(refDestructuringErrors, true);
            if (exprList.length > 1) {
              val = this.startNodeAt(innerStartPos, innerStartLoc);
              val.expressions = exprList;
              this.finishNodeAt(val, "SequenceExpression", innerEndPos, innerEndLoc);
            } else {
              val = exprList[0];
            }
          } else {
            val = this.parseParenExpression();
          }
          if (this.options.preserveParens) {
            var par = this.startNodeAt(startPos, startLoc);
            par.expression = val;
            return this.finishNode(par, "ParenthesizedExpression");
          } else {
            return val;
          }
        };
        pp.parseParenItem = function(item) {
          return item;
        };
        pp.parseParenArrowList = function(startPos, startLoc, exprList) {
          return this.parseArrowExpression(this.startNodeAt(startPos, startLoc), exprList);
        };
        var empty = [];
        pp.parseNew = function() {
          var node = this.startNode();
          var meta = this.parseIdent(true);
          if (this.options.ecmaVersion >= 6 && this.eat(_tokentype.types.dot)) {
            node.meta = meta;
            node.property = this.parseIdent(true);
            if (node.property.name !== "target")
              this.raise(node.property.start, "The only valid meta property for new is new.target");
            if (!this.inFunction)
              this.raise(node.start, "new.target can only be used in functions");
            return this.finishNode(node, "MetaProperty");
          }
          var startPos = this.start,
              startLoc = this.startLoc;
          node.callee = this.parseSubscripts(this.parseExprAtom(), startPos, startLoc, true);
          if (this.eat(_tokentype.types.parenL))
            node.arguments = this.parseExprList(_tokentype.types.parenR, false);
          else
            node.arguments = empty;
          return this.finishNode(node, "NewExpression");
        };
        pp.parseTemplateElement = function() {
          var elem = this.startNode();
          elem.value = {
            raw: this.input.slice(this.start, this.end).replace(/\r\n?/g, '\n'),
            cooked: this.value
          };
          this.next();
          elem.tail = this.type === _tokentype.types.backQuote;
          return this.finishNode(elem, "TemplateElement");
        };
        pp.parseTemplate = function() {
          var node = this.startNode();
          this.next();
          node.expressions = [];
          var curElt = this.parseTemplateElement();
          node.quasis = [curElt];
          while (!curElt.tail) {
            this.expect(_tokentype.types.dollarBraceL);
            node.expressions.push(this.parseExpression());
            this.expect(_tokentype.types.braceR);
            node.quasis.push(curElt = this.parseTemplateElement());
          }
          this.next();
          return this.finishNode(node, "TemplateLiteral");
        };
        pp.parseObj = function(isPattern, refDestructuringErrors) {
          var node = this.startNode(),
              first = true,
              propHash = {};
          node.properties = [];
          this.next();
          while (!this.eat(_tokentype.types.braceR)) {
            if (!first) {
              this.expect(_tokentype.types.comma);
              if (this.afterTrailingComma(_tokentype.types.braceR))
                break;
            } else
              first = false;
            var prop = this.startNode(),
                isGenerator = undefined,
                startPos = undefined,
                startLoc = undefined;
            if (this.options.ecmaVersion >= 6) {
              prop.method = false;
              prop.shorthand = false;
              if (isPattern || refDestructuringErrors) {
                startPos = this.start;
                startLoc = this.startLoc;
              }
              if (!isPattern)
                isGenerator = this.eat(_tokentype.types.star);
            }
            this.parsePropertyName(prop);
            this.parsePropertyValue(prop, isPattern, isGenerator, startPos, startLoc, refDestructuringErrors);
            this.checkPropClash(prop, propHash);
            node.properties.push(this.finishNode(prop, "Property"));
          }
          return this.finishNode(node, isPattern ? "ObjectPattern" : "ObjectExpression");
        };
        pp.parsePropertyValue = function(prop, isPattern, isGenerator, startPos, startLoc, refDestructuringErrors) {
          if (this.eat(_tokentype.types.colon)) {
            prop.value = isPattern ? this.parseMaybeDefault(this.start, this.startLoc) : this.parseMaybeAssign(false, refDestructuringErrors);
            prop.kind = "init";
          } else if (this.options.ecmaVersion >= 6 && this.type === _tokentype.types.parenL) {
            if (isPattern)
              this.unexpected();
            prop.kind = "init";
            prop.method = true;
            prop.value = this.parseMethod(isGenerator);
          } else if (this.options.ecmaVersion >= 5 && !prop.computed && prop.key.type === "Identifier" && (prop.key.name === "get" || prop.key.name === "set") && (this.type != _tokentype.types.comma && this.type != _tokentype.types.braceR)) {
            if (isGenerator || isPattern)
              this.unexpected();
            prop.kind = prop.key.name;
            this.parsePropertyName(prop);
            prop.value = this.parseMethod(false);
            var paramCount = prop.kind === "get" ? 0 : 1;
            if (prop.value.params.length !== paramCount) {
              var start = prop.value.start;
              if (prop.kind === "get")
                this.raise(start, "getter should have no params");
              else
                this.raise(start, "setter should have exactly one param");
            }
            if (prop.kind === "set" && prop.value.params[0].type === "RestElement")
              this.raise(prop.value.params[0].start, "Setter cannot use rest params");
          } else if (this.options.ecmaVersion >= 6 && !prop.computed && prop.key.type === "Identifier") {
            prop.kind = "init";
            if (isPattern) {
              if (this.keywords.test(prop.key.name) || (this.strict ? this.reservedWordsStrictBind : this.reservedWords).test(prop.key.name))
                this.raise(prop.key.start, "Binding " + prop.key.name);
              prop.value = this.parseMaybeDefault(startPos, startLoc, prop.key);
            } else if (this.type === _tokentype.types.eq && refDestructuringErrors) {
              if (!refDestructuringErrors.shorthandAssign)
                refDestructuringErrors.shorthandAssign = this.start;
              prop.value = this.parseMaybeDefault(startPos, startLoc, prop.key);
            } else {
              prop.value = prop.key;
            }
            prop.shorthand = true;
          } else
            this.unexpected();
        };
        pp.parsePropertyName = function(prop) {
          if (this.options.ecmaVersion >= 6) {
            if (this.eat(_tokentype.types.bracketL)) {
              prop.computed = true;
              prop.key = this.parseMaybeAssign();
              this.expect(_tokentype.types.bracketR);
              return prop.key;
            } else {
              prop.computed = false;
            }
          }
          return prop.key = this.type === _tokentype.types.num || this.type === _tokentype.types.string ? this.parseExprAtom() : this.parseIdent(true);
        };
        pp.initFunction = function(node) {
          node.id = null;
          if (this.options.ecmaVersion >= 6) {
            node.generator = false;
            node.expression = false;
          }
        };
        pp.parseMethod = function(isGenerator) {
          var node = this.startNode();
          this.initFunction(node);
          this.expect(_tokentype.types.parenL);
          node.params = this.parseBindingList(_tokentype.types.parenR, false, false);
          if (this.options.ecmaVersion >= 6)
            node.generator = isGenerator;
          this.parseFunctionBody(node, false);
          return this.finishNode(node, "FunctionExpression");
        };
        pp.parseArrowExpression = function(node, params) {
          this.initFunction(node);
          node.params = this.toAssignableList(params, true);
          this.parseFunctionBody(node, true);
          return this.finishNode(node, "ArrowFunctionExpression");
        };
        pp.parseFunctionBody = function(node, isArrowFunction) {
          var isExpression = isArrowFunction && this.type !== _tokentype.types.braceL;
          if (isExpression) {
            node.body = this.parseMaybeAssign();
            node.expression = true;
          } else {
            var oldInFunc = this.inFunction,
                oldInGen = this.inGenerator,
                oldLabels = this.labels;
            this.inFunction = true;
            this.inGenerator = node.generator;
            this.labels = [];
            node.body = this.parseBlock(true);
            node.expression = false;
            this.inFunction = oldInFunc;
            this.inGenerator = oldInGen;
            this.labels = oldLabels;
          }
          if (this.strict || !isExpression && node.body.body.length && this.isUseStrict(node.body.body[0])) {
            var oldStrict = this.strict;
            this.strict = true;
            if (node.id)
              this.checkLVal(node.id, true);
            this.checkParams(node);
            this.strict = oldStrict;
          } else if (isArrowFunction) {
            this.checkParams(node);
          }
        };
        pp.checkParams = function(node) {
          var nameHash = {};
          for (var i = 0; i < node.params.length; i++) {
            this.checkLVal(node.params[i], true, nameHash);
          }
        };
        pp.parseExprList = function(close, allowTrailingComma, allowEmpty, refDestructuringErrors) {
          var elts = [],
              first = true;
          while (!this.eat(close)) {
            if (!first) {
              this.expect(_tokentype.types.comma);
              if (this.type === close && refDestructuringErrors && !refDestructuringErrors.trailingComma) {
                refDestructuringErrors.trailingComma = this.lastTokStart;
              }
              if (allowTrailingComma && this.afterTrailingComma(close))
                break;
            } else
              first = false;
            var elt = undefined;
            if (allowEmpty && this.type === _tokentype.types.comma)
              elt = null;
            else if (this.type === _tokentype.types.ellipsis)
              elt = this.parseSpread(refDestructuringErrors);
            else
              elt = this.parseMaybeAssign(false, refDestructuringErrors);
            elts.push(elt);
          }
          return elts;
        };
        pp.parseIdent = function(liberal) {
          var node = this.startNode();
          if (liberal && this.options.allowReserved == "never")
            liberal = false;
          if (this.type === _tokentype.types.name) {
            if (!liberal && (this.strict ? this.reservedWordsStrict : this.reservedWords).test(this.value) && (this.options.ecmaVersion >= 6 || this.input.slice(this.start, this.end).indexOf("\\") == -1))
              this.raise(this.start, "The keyword '" + this.value + "' is reserved");
            node.name = this.value;
          } else if (liberal && this.type.keyword) {
            node.name = this.type.keyword;
          } else {
            this.unexpected();
          }
          this.next();
          return this.finishNode(node, "Identifier");
        };
        pp.parseYield = function() {
          var node = this.startNode();
          this.next();
          if (this.type == _tokentype.types.semi || this.canInsertSemicolon() || this.type != _tokentype.types.star && !this.type.startsExpr) {
            node.delegate = false;
            node.argument = null;
          } else {
            node.delegate = this.eat(_tokentype.types.star);
            node.argument = this.parseMaybeAssign();
          }
          return this.finishNode(node, "YieldExpression");
        };
        pp.parseComprehension = function(node, isGenerator) {
          node.blocks = [];
          while (this.type === _tokentype.types._for) {
            var block = this.startNode();
            this.next();
            this.expect(_tokentype.types.parenL);
            block.left = this.parseBindingAtom();
            this.checkLVal(block.left, true);
            this.expectContextual("of");
            block.right = this.parseExpression();
            this.expect(_tokentype.types.parenR);
            node.blocks.push(this.finishNode(block, "ComprehensionBlock"));
          }
          node.filter = this.eat(_tokentype.types._if) ? this.parseParenExpression() : null;
          node.body = this.parseExpression();
          this.expect(isGenerator ? _tokentype.types.parenR : _tokentype.types.bracketR);
          node.generator = isGenerator;
          return this.finishNode(node, "ComprehensionExpression");
        };
      }, {
        "./state": 10,
        "./tokentype": 14
      }],
      2: [function(_dereq_, module, exports) {
        "use strict";
        exports.__esModule = true;
        exports.isIdentifierStart = isIdentifierStart;
        exports.isIdentifierChar = isIdentifierChar;
        var reservedWords = {
          3: "abstract boolean byte char class double enum export extends final float goto implements import int interface long native package private protected public short static super synchronized throws transient volatile",
          5: "class enum extends super const export import",
          6: "enum",
          strict: "implements interface let package private protected public static yield",
          strictBind: "eval arguments"
        };
        exports.reservedWords = reservedWords;
        var ecma5AndLessKeywords = "break case catch continue debugger default do else finally for function if return switch throw try var while with null true false instanceof typeof void delete new in this";
        var keywords = {
          5: ecma5AndLessKeywords,
          6: ecma5AndLessKeywords + " let const class extends export import yield super"
        };
        exports.keywords = keywords;
        var nonASCIIidentifierStartChars = "ªµºÀ-ÖØ-öø-ˁˆ-ˑˠ-ˤˬˮͰ-ʹͶͷͺ-ͽͿΆΈ-ΊΌΎ-ΡΣ-ϵϷ-ҁҊ-ԯԱ-Ֆՙա-ևא-תװ-ײؠ-يٮٯٱ-ۓەۥۦۮۯۺ-ۼۿܐܒ-ܯݍ-ޥޱߊ-ߪߴߵߺࠀ-ࠕࠚࠤࠨࡀ-ࡘࢠ-ࢲऄ-हऽॐक़-ॡॱ-ঀঅ-ঌএঐও-নপ-রলশ-হঽৎড়ঢ়য়-ৡৰৱਅ-ਊਏਐਓ-ਨਪ-ਰਲਲ਼ਵਸ਼ਸਹਖ਼-ੜਫ਼ੲ-ੴઅ-ઍએ-ઑઓ-નપ-રલળવ-હઽૐૠૡଅ-ଌଏଐଓ-ନପ-ରଲଳଵ-ହଽଡ଼ଢ଼ୟ-ୡୱஃஅ-ஊஎ-ஐஒ-கஙசஜஞடணதந-பம-ஹௐఅ-ఌఎ-ఐఒ-నప-హఽౘౙౠౡಅ-ಌಎ-ಐಒ-ನಪ-ಳವ-ಹಽೞೠೡೱೲഅ-ഌഎ-ഐഒ-ഺഽൎൠൡൺ-ൿඅ-ඖක-නඳ-රලව-ෆก-ะาำเ-ๆກຂຄງຈຊຍດ-ທນ-ຟມ-ຣລວສຫອ-ະາຳຽເ-ໄໆໜ-ໟༀཀ-ཇཉ-ཬྈ-ྌက-ဪဿၐ-ၕၚ-ၝၡၥၦၮ-ၰၵ-ႁႎႠ-ჅჇჍა-ჺჼ-ቈቊ-ቍቐ-ቖቘቚ-ቝበ-ኈኊ-ኍነ-ኰኲ-ኵኸ-ኾዀዂ-ዅወ-ዖዘ-ጐጒ-ጕጘ-ፚᎀ-ᎏᎠ-Ᏼᐁ-ᙬᙯ-ᙿᚁ-ᚚᚠ-ᛪᛮ-ᛸᜀ-ᜌᜎ-ᜑᜠ-ᜱᝀ-ᝑᝠ-ᝬᝮ-ᝰក-ឳៗៜᠠ-ᡷᢀ-ᢨᢪᢰ-ᣵᤀ-ᤞᥐ-ᥭᥰ-ᥴᦀ-ᦫᧁ-ᧇᨀ-ᨖᨠ-ᩔᪧᬅ-ᬳᭅ-ᭋᮃ-ᮠᮮᮯᮺ-ᯥᰀ-ᰣᱍ-ᱏᱚ-ᱽᳩ-ᳬᳮ-ᳱᳵᳶᴀ-ᶿḀ-ἕἘ-Ἕἠ-ὅὈ-Ὅὐ-ὗὙὛὝὟ-ώᾀ-ᾴᾶ-ᾼιῂ-ῄῆ-ῌῐ-ΐῖ-Ίῠ-Ῥῲ-ῴῶ-ῼⁱⁿₐ-ₜℂℇℊ-ℓℕ℘-ℝℤΩℨK-ℹℼ-ℿⅅ-ⅉⅎⅠ-ↈⰀ-Ⱞⰰ-ⱞⱠ-ⳤⳫ-ⳮⳲⳳⴀ-ⴥⴧⴭⴰ-ⵧⵯⶀ-ⶖⶠ-ⶦⶨ-ⶮⶰ-ⶶⶸ-ⶾⷀ-ⷆⷈ-ⷎⷐ-ⷖⷘ-ⷞ々-〇〡-〩〱-〵〸-〼ぁ-ゖ゛-ゟァ-ヺー-ヿㄅ-ㄭㄱ-ㆎㆠ-ㆺㇰ-ㇿ㐀-䶵一-鿌ꀀ-ꒌꓐ-ꓽꔀ-ꘌꘐ-ꘟꘪꘫꙀ-ꙮꙿ-ꚝꚠ-ꛯꜗ-ꜟꜢ-ꞈꞋ-ꞎꞐ-ꞭꞰꞱꟷ-ꠁꠃ-ꠅꠇ-ꠊꠌ-ꠢꡀ-ꡳꢂ-ꢳꣲ-ꣷꣻꤊ-ꤥꤰ-ꥆꥠ-ꥼꦄ-ꦲꧏꧠ-ꧤꧦ-ꧯꧺ-ꧾꨀ-ꨨꩀ-ꩂꩄ-ꩋꩠ-ꩶꩺꩾ-ꪯꪱꪵꪶꪹ-ꪽꫀꫂꫛ-ꫝꫠ-ꫪꫲ-ꫴꬁ-ꬆꬉ-ꬎꬑ-ꬖꬠ-ꬦꬨ-ꬮꬰ-ꭚꭜ-ꭟꭤꭥꯀ-ꯢ가-힣ힰ-ퟆퟋ-ퟻ豈-舘並-龎ﬀ-ﬆﬓ-ﬗיִײַ-ﬨשׁ-זּטּ-לּמּנּסּףּפּצּ-ﮱﯓ-ﴽﵐ-ﶏﶒ-ﷇﷰ-ﷻﹰ-ﹴﹶ-ﻼＡ-Ｚａ-ｚｦ-ﾾￂ-ￇￊ-ￏￒ-ￗￚ-ￜ";
        var nonASCIIidentifierChars = "‌‍·̀-ͯ·҃-֑҇-ׇֽֿׁׂׅׄؐ-ًؚ-٩ٰۖ-ۜ۟-۪ۤۧۨ-ۭ۰-۹ܑܰ-݊ަ-ް߀-߉߫-߳ࠖ-࠙ࠛ-ࠣࠥ-ࠧࠩ-࡙࠭-࡛ࣤ-ःऺ-़ा-ॏ॑-ॗॢॣ०-९ঁ-ঃ়া-ৄেৈো-্ৗৢৣ০-৯ਁ-ਃ਼ਾ-ੂੇੈੋ-੍ੑ੦-ੱੵઁ-ઃ઼ા-ૅે-ૉો-્ૢૣ૦-૯ଁ-ଃ଼ା-ୄେୈୋ-୍ୖୗୢୣ୦-୯ஂா-ூெ-ைொ-்ௗ௦-௯ఀ-ఃా-ౄె-ైొ-్ౕౖౢౣ౦-౯ಁ-ಃ಼ಾ-ೄೆ-ೈೊ-್ೕೖೢೣ೦-೯ഁ-ഃാ-ൄെ-ൈൊ-്ൗൢൣ൦-൯ංඃ්ා-ුූෘ-ෟ෦-෯ෲෳัิ-ฺ็-๎๐-๙ັິ-ູົຼ່-ໍ໐-໙༘༙༠-༩༹༵༷༾༿ཱ-྄྆྇ྍ-ྗྙ-ྼ࿆ါ-ှ၀-၉ၖ-ၙၞ-ၠၢ-ၤၧ-ၭၱ-ၴႂ-ႍႏ-ႝ፝-፟፩-፱ᜒ-᜔ᜲ-᜴ᝒᝓᝲᝳ឴-៓៝០-៩᠋-᠍᠐-᠙ᢩᤠ-ᤫᤰ-᤻᥆-᥏ᦰ-ᧀᧈᧉ᧐-᧚ᨗ-ᨛᩕ-ᩞ᩠-᩿᩼-᪉᪐-᪙᪰-᪽ᬀ-ᬄ᬴-᭄᭐-᭙᭫-᭳ᮀ-ᮂᮡ-ᮭ᮰-᮹᯦-᯳ᰤ-᰷᱀-᱉᱐-᱙᳐-᳔᳒-᳨᳭ᳲ-᳴᳸᳹᷀-᷵᷼-᷿‿⁀⁔⃐-⃥⃜⃡-⃰⳯-⵿⳱ⷠ-〪ⷿ-゙゚〯꘠-꘩꙯ꙴ-꙽ꚟ꛰꛱ꠂ꠆ꠋꠣ-ꠧꢀꢁꢴ-꣄꣐-꣙꣠-꣱꤀-꤉ꤦ-꤭ꥇ-꥓ꦀ-ꦃ꦳-꧀꧐-꧙ꧥ꧰-꧹ꨩ-ꨶꩃꩌꩍ꩐-꩙ꩻ-ꩽꪰꪲ-ꪴꪷꪸꪾ꪿꫁ꫫ-ꫯꫵ꫶ꯣ-ꯪ꯬꯭꯰-꯹ﬞ︀-️︠-︭︳︴﹍-﹏０-９＿";
        var nonASCIIidentifierStart = new RegExp("[" + nonASCIIidentifierStartChars + "]");
        var nonASCIIidentifier = new RegExp("[" + nonASCIIidentifierStartChars + nonASCIIidentifierChars + "]");
        nonASCIIidentifierStartChars = nonASCIIidentifierChars = null;
        var astralIdentifierStartCodes = [0, 11, 2, 25, 2, 18, 2, 1, 2, 14, 3, 13, 35, 122, 70, 52, 268, 28, 4, 48, 48, 31, 17, 26, 6, 37, 11, 29, 3, 35, 5, 7, 2, 4, 43, 157, 99, 39, 9, 51, 157, 310, 10, 21, 11, 7, 153, 5, 3, 0, 2, 43, 2, 1, 4, 0, 3, 22, 11, 22, 10, 30, 98, 21, 11, 25, 71, 55, 7, 1, 65, 0, 16, 3, 2, 2, 2, 26, 45, 28, 4, 28, 36, 7, 2, 27, 28, 53, 11, 21, 11, 18, 14, 17, 111, 72, 955, 52, 76, 44, 33, 24, 27, 35, 42, 34, 4, 0, 13, 47, 15, 3, 22, 0, 38, 17, 2, 24, 133, 46, 39, 7, 3, 1, 3, 21, 2, 6, 2, 1, 2, 4, 4, 0, 32, 4, 287, 47, 21, 1, 2, 0, 185, 46, 82, 47, 21, 0, 60, 42, 502, 63, 32, 0, 449, 56, 1288, 920, 104, 110, 2962, 1070, 13266, 568, 8, 30, 114, 29, 19, 47, 17, 3, 32, 20, 6, 18, 881, 68, 12, 0, 67, 12, 16481, 1, 3071, 106, 6, 12, 4, 8, 8, 9, 5991, 84, 2, 70, 2, 1, 3, 0, 3, 1, 3, 3, 2, 11, 2, 0, 2, 6, 2, 64, 2, 3, 3, 7, 2, 6, 2, 27, 2, 3, 2, 4, 2, 0, 4, 6, 2, 339, 3, 24, 2, 24, 2, 30, 2, 24, 2, 30, 2, 24, 2, 30, 2, 24, 2, 30, 2, 24, 2, 7, 4149, 196, 1340, 3, 2, 26, 2, 1, 2, 0, 3, 0, 2, 9, 2, 3, 2, 0, 2, 0, 7, 0, 5, 0, 2, 0, 2, 0, 2, 2, 2, 1, 2, 0, 3, 0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 1, 2, 0, 3, 3, 2, 6, 2, 3, 2, 3, 2, 0, 2, 9, 2, 16, 6, 2, 2, 4, 2, 16, 4421, 42710, 42, 4148, 12, 221, 16355, 541];
        var astralIdentifierCodes = [509, 0, 227, 0, 150, 4, 294, 9, 1368, 2, 2, 1, 6, 3, 41, 2, 5, 0, 166, 1, 1306, 2, 54, 14, 32, 9, 16, 3, 46, 10, 54, 9, 7, 2, 37, 13, 2, 9, 52, 0, 13, 2, 49, 13, 16, 9, 83, 11, 168, 11, 6, 9, 8, 2, 57, 0, 2, 6, 3, 1, 3, 2, 10, 0, 11, 1, 3, 6, 4, 4, 316, 19, 13, 9, 214, 6, 3, 8, 112, 16, 16, 9, 82, 12, 9, 9, 535, 9, 20855, 9, 135, 4, 60, 6, 26, 9, 1016, 45, 17, 3, 19723, 1, 5319, 4, 4, 5, 9, 7, 3, 6, 31, 3, 149, 2, 1418, 49, 4305, 6, 792618, 239];
        function isInAstralSet(code, set) {
          var pos = 0x10000;
          for (var i = 0; i < set.length; i += 2) {
            pos += set[i];
            if (pos > code)
              return false;
            pos += set[i + 1];
            if (pos >= code)
              return true;
          }
        }
        function isIdentifierStart(code, astral) {
          if (code < 65)
            return code === 36;
          if (code < 91)
            return true;
          if (code < 97)
            return code === 95;
          if (code < 123)
            return true;
          if (code <= 0xffff)
            return code >= 0xaa && nonASCIIidentifierStart.test(String.fromCharCode(code));
          if (astral === false)
            return false;
          return isInAstralSet(code, astralIdentifierStartCodes);
        }
        function isIdentifierChar(code, astral) {
          if (code < 48)
            return code === 36;
          if (code < 58)
            return true;
          if (code < 65)
            return false;
          if (code < 91)
            return true;
          if (code < 97)
            return code === 95;
          if (code < 123)
            return true;
          if (code <= 0xffff)
            return code >= 0xaa && nonASCIIidentifier.test(String.fromCharCode(code));
          if (astral === false)
            return false;
          return isInAstralSet(code, astralIdentifierStartCodes) || isInAstralSet(code, astralIdentifierCodes);
        }
      }, {}],
      3: [function(_dereq_, module, exports) {
        "use strict";
        exports.__esModule = true;
        exports.parse = parse;
        exports.parseExpressionAt = parseExpressionAt;
        exports.tokenizer = tokenizer;
        var _state = _dereq_("./state");
        _dereq_("./parseutil");
        _dereq_("./statement");
        _dereq_("./lval");
        _dereq_("./expression");
        _dereq_("./location");
        exports.Parser = _state.Parser;
        exports.plugins = _state.plugins;
        var _options = _dereq_("./options");
        exports.defaultOptions = _options.defaultOptions;
        var _locutil = _dereq_("./locutil");
        exports.Position = _locutil.Position;
        exports.SourceLocation = _locutil.SourceLocation;
        exports.getLineInfo = _locutil.getLineInfo;
        var _node = _dereq_("./node");
        exports.Node = _node.Node;
        var _tokentype = _dereq_("./tokentype");
        exports.TokenType = _tokentype.TokenType;
        exports.tokTypes = _tokentype.types;
        var _tokencontext = _dereq_("./tokencontext");
        exports.TokContext = _tokencontext.TokContext;
        exports.tokContexts = _tokencontext.types;
        var _identifier = _dereq_("./identifier");
        exports.isIdentifierChar = _identifier.isIdentifierChar;
        exports.isIdentifierStart = _identifier.isIdentifierStart;
        var _tokenize = _dereq_("./tokenize");
        exports.Token = _tokenize.Token;
        var _whitespace = _dereq_("./whitespace");
        exports.isNewLine = _whitespace.isNewLine;
        exports.lineBreak = _whitespace.lineBreak;
        exports.lineBreakG = _whitespace.lineBreakG;
        var version = "2.7.0";
        exports.version = version;
        function parse(input, options) {
          return new _state.Parser(options, input).parse();
        }
        function parseExpressionAt(input, pos, options) {
          var p = new _state.Parser(options, input, pos);
          p.nextToken();
          return p.parseExpression();
        }
        function tokenizer(input, options) {
          return new _state.Parser(options, input);
        }
      }, {
        "./expression": 1,
        "./identifier": 2,
        "./location": 4,
        "./locutil": 5,
        "./lval": 6,
        "./node": 7,
        "./options": 8,
        "./parseutil": 9,
        "./state": 10,
        "./statement": 11,
        "./tokencontext": 12,
        "./tokenize": 13,
        "./tokentype": 14,
        "./whitespace": 16
      }],
      4: [function(_dereq_, module, exports) {
        "use strict";
        var _state = _dereq_("./state");
        var _locutil = _dereq_("./locutil");
        var pp = _state.Parser.prototype;
        pp.raise = function(pos, message) {
          var loc = _locutil.getLineInfo(this.input, pos);
          message += " (" + loc.line + ":" + loc.column + ")";
          var err = new SyntaxError(message);
          err.pos = pos;
          err.loc = loc;
          err.raisedAt = this.pos;
          throw err;
        };
        pp.curPosition = function() {
          if (this.options.locations) {
            return new _locutil.Position(this.curLine, this.pos - this.lineStart);
          }
        };
      }, {
        "./locutil": 5,
        "./state": 10
      }],
      5: [function(_dereq_, module, exports) {
        "use strict";
        exports.__esModule = true;
        exports.getLineInfo = getLineInfo;
        function _classCallCheck(instance, Constructor) {
          if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
          }
        }
        var _whitespace = _dereq_("./whitespace");
        var Position = (function() {
          function Position(line, col) {
            _classCallCheck(this, Position);
            this.line = line;
            this.column = col;
          }
          Position.prototype.offset = function offset(n) {
            return new Position(this.line, this.column + n);
          };
          return Position;
        })();
        exports.Position = Position;
        var SourceLocation = function SourceLocation(p, start, end) {
          _classCallCheck(this, SourceLocation);
          this.start = start;
          this.end = end;
          if (p.sourceFile !== null)
            this.source = p.sourceFile;
        };
        ;
        exports.SourceLocation = SourceLocation;
        function getLineInfo(input, offset) {
          for (var line = 1,
              cur = 0; ; ) {
            _whitespace.lineBreakG.lastIndex = cur;
            var match = _whitespace.lineBreakG.exec(input);
            if (match && match.index < offset) {
              ++line;
              cur = match.index + match[0].length;
            } else {
              return new Position(line, offset - cur);
            }
          }
        }
      }, {"./whitespace": 16}],
      6: [function(_dereq_, module, exports) {
        "use strict";
        var _tokentype = _dereq_("./tokentype");
        var _state = _dereq_("./state");
        var _util = _dereq_("./util");
        var pp = _state.Parser.prototype;
        pp.toAssignable = function(node, isBinding) {
          if (this.options.ecmaVersion >= 6 && node) {
            switch (node.type) {
              case "Identifier":
              case "ObjectPattern":
              case "ArrayPattern":
                break;
              case "ObjectExpression":
                node.type = "ObjectPattern";
                for (var i = 0; i < node.properties.length; i++) {
                  var prop = node.properties[i];
                  if (prop.kind !== "init")
                    this.raise(prop.key.start, "Object pattern can't contain getter or setter");
                  this.toAssignable(prop.value, isBinding);
                }
                break;
              case "ArrayExpression":
                node.type = "ArrayPattern";
                this.toAssignableList(node.elements, isBinding);
                break;
              case "AssignmentExpression":
                if (node.operator === "=") {
                  node.type = "AssignmentPattern";
                  delete node.operator;
                } else {
                  this.raise(node.left.end, "Only '=' operator can be used for specifying default value.");
                  break;
                }
              case "AssignmentPattern":
                if (node.right.type === "YieldExpression")
                  this.raise(node.right.start, "Yield expression cannot be a default value");
                break;
              case "ParenthesizedExpression":
                node.expression = this.toAssignable(node.expression, isBinding);
                break;
              case "MemberExpression":
                if (!isBinding)
                  break;
              default:
                this.raise(node.start, "Assigning to rvalue");
            }
          }
          return node;
        };
        pp.toAssignableList = function(exprList, isBinding) {
          var end = exprList.length;
          if (end) {
            var last = exprList[end - 1];
            if (last && last.type == "RestElement") {
              --end;
            } else if (last && last.type == "SpreadElement") {
              last.type = "RestElement";
              var arg = last.argument;
              this.toAssignable(arg, isBinding);
              if (arg.type !== "Identifier" && arg.type !== "MemberExpression" && arg.type !== "ArrayPattern")
                this.unexpected(arg.start);
              --end;
            }
            if (isBinding && last.type === "RestElement" && last.argument.type !== "Identifier")
              this.unexpected(last.argument.start);
          }
          for (var i = 0; i < end; i++) {
            var elt = exprList[i];
            if (elt)
              this.toAssignable(elt, isBinding);
          }
          return exprList;
        };
        pp.parseSpread = function(refDestructuringErrors) {
          var node = this.startNode();
          this.next();
          node.argument = this.parseMaybeAssign(refDestructuringErrors);
          return this.finishNode(node, "SpreadElement");
        };
        pp.parseRest = function(allowNonIdent) {
          var node = this.startNode();
          this.next();
          if (allowNonIdent)
            node.argument = this.type === _tokentype.types.name ? this.parseIdent() : this.unexpected();
          else
            node.argument = this.type === _tokentype.types.name || this.type === _tokentype.types.bracketL ? this.parseBindingAtom() : this.unexpected();
          return this.finishNode(node, "RestElement");
        };
        pp.parseBindingAtom = function() {
          if (this.options.ecmaVersion < 6)
            return this.parseIdent();
          switch (this.type) {
            case _tokentype.types.name:
              return this.parseIdent();
            case _tokentype.types.bracketL:
              var node = this.startNode();
              this.next();
              node.elements = this.parseBindingList(_tokentype.types.bracketR, true, true);
              return this.finishNode(node, "ArrayPattern");
            case _tokentype.types.braceL:
              return this.parseObj(true);
            default:
              this.unexpected();
          }
        };
        pp.parseBindingList = function(close, allowEmpty, allowTrailingComma, allowNonIdent) {
          var elts = [],
              first = true;
          while (!this.eat(close)) {
            if (first)
              first = false;
            else
              this.expect(_tokentype.types.comma);
            if (allowEmpty && this.type === _tokentype.types.comma) {
              elts.push(null);
            } else if (allowTrailingComma && this.afterTrailingComma(close)) {
              break;
            } else if (this.type === _tokentype.types.ellipsis) {
              var rest = this.parseRest(allowNonIdent);
              this.parseBindingListItem(rest);
              elts.push(rest);
              this.expect(close);
              break;
            } else {
              var elem = this.parseMaybeDefault(this.start, this.startLoc);
              this.parseBindingListItem(elem);
              elts.push(elem);
            }
          }
          return elts;
        };
        pp.parseBindingListItem = function(param) {
          return param;
        };
        pp.parseMaybeDefault = function(startPos, startLoc, left) {
          left = left || this.parseBindingAtom();
          if (this.options.ecmaVersion < 6 || !this.eat(_tokentype.types.eq))
            return left;
          var node = this.startNodeAt(startPos, startLoc);
          node.left = left;
          node.right = this.parseMaybeAssign();
          return this.finishNode(node, "AssignmentPattern");
        };
        pp.checkLVal = function(expr, isBinding, checkClashes) {
          switch (expr.type) {
            case "Identifier":
              if (this.strict && this.reservedWordsStrictBind.test(expr.name))
                this.raise(expr.start, (isBinding ? "Binding " : "Assigning to ") + expr.name + " in strict mode");
              if (checkClashes) {
                if (_util.has(checkClashes, expr.name))
                  this.raise(expr.start, "Argument name clash");
                checkClashes[expr.name] = true;
              }
              break;
            case "MemberExpression":
              if (isBinding)
                this.raise(expr.start, (isBinding ? "Binding" : "Assigning to") + " member expression");
              break;
            case "ObjectPattern":
              for (var i = 0; i < expr.properties.length; i++) {
                this.checkLVal(expr.properties[i].value, isBinding, checkClashes);
              }
              break;
            case "ArrayPattern":
              for (var i = 0; i < expr.elements.length; i++) {
                var elem = expr.elements[i];
                if (elem)
                  this.checkLVal(elem, isBinding, checkClashes);
              }
              break;
            case "AssignmentPattern":
              this.checkLVal(expr.left, isBinding, checkClashes);
              break;
            case "RestElement":
              this.checkLVal(expr.argument, isBinding, checkClashes);
              break;
            case "ParenthesizedExpression":
              this.checkLVal(expr.expression, isBinding, checkClashes);
              break;
            default:
              this.raise(expr.start, (isBinding ? "Binding" : "Assigning to") + " rvalue");
          }
        };
      }, {
        "./state": 10,
        "./tokentype": 14,
        "./util": 15
      }],
      7: [function(_dereq_, module, exports) {
        "use strict";
        exports.__esModule = true;
        function _classCallCheck(instance, Constructor) {
          if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
          }
        }
        var _state = _dereq_("./state");
        var _locutil = _dereq_("./locutil");
        var Node = function Node(parser, pos, loc) {
          _classCallCheck(this, Node);
          this.type = "";
          this.start = pos;
          this.end = 0;
          if (parser.options.locations)
            this.loc = new _locutil.SourceLocation(parser, loc);
          if (parser.options.directSourceFile)
            this.sourceFile = parser.options.directSourceFile;
          if (parser.options.ranges)
            this.range = [pos, 0];
        };
        ;
        exports.Node = Node;
        var pp = _state.Parser.prototype;
        pp.startNode = function() {
          return new Node(this, this.start, this.startLoc);
        };
        pp.startNodeAt = function(pos, loc) {
          return new Node(this, pos, loc);
        };
        function finishNodeAt(node, type, pos, loc) {
          node.type = type;
          node.end = pos;
          if (this.options.locations)
            node.loc.end = loc;
          if (this.options.ranges)
            node.range[1] = pos;
          return node;
        }
        pp.finishNode = function(node, type) {
          return finishNodeAt.call(this, node, type, this.lastTokEnd, this.lastTokEndLoc);
        };
        pp.finishNodeAt = function(node, type, pos, loc) {
          return finishNodeAt.call(this, node, type, pos, loc);
        };
      }, {
        "./locutil": 5,
        "./state": 10
      }],
      8: [function(_dereq_, module, exports) {
        "use strict";
        exports.__esModule = true;
        exports.getOptions = getOptions;
        var _util = _dereq_("./util");
        var _locutil = _dereq_("./locutil");
        var defaultOptions = {
          ecmaVersion: 5,
          sourceType: "script",
          onInsertedSemicolon: null,
          onTrailingComma: null,
          allowReserved: null,
          allowReturnOutsideFunction: false,
          allowImportExportEverywhere: false,
          allowHashBang: false,
          locations: false,
          onToken: null,
          onComment: null,
          ranges: false,
          program: null,
          sourceFile: null,
          directSourceFile: null,
          preserveParens: false,
          plugins: {}
        };
        exports.defaultOptions = defaultOptions;
        function getOptions(opts) {
          var options = {};
          for (var opt in defaultOptions) {
            options[opt] = opts && _util.has(opts, opt) ? opts[opt] : defaultOptions[opt];
          }
          if (options.allowReserved == null)
            options.allowReserved = options.ecmaVersion < 5;
          if (_util.isArray(options.onToken)) {
            (function() {
              var tokens = options.onToken;
              options.onToken = function(token) {
                return tokens.push(token);
              };
            })();
          }
          if (_util.isArray(options.onComment))
            options.onComment = pushComment(options, options.onComment);
          return options;
        }
        function pushComment(options, array) {
          return function(block, text, start, end, startLoc, endLoc) {
            var comment = {
              type: block ? 'Block' : 'Line',
              value: text,
              start: start,
              end: end
            };
            if (options.locations)
              comment.loc = new _locutil.SourceLocation(this, startLoc, endLoc);
            if (options.ranges)
              comment.range = [start, end];
            array.push(comment);
          };
        }
      }, {
        "./locutil": 5,
        "./util": 15
      }],
      9: [function(_dereq_, module, exports) {
        "use strict";
        var _tokentype = _dereq_("./tokentype");
        var _state = _dereq_("./state");
        var _whitespace = _dereq_("./whitespace");
        var pp = _state.Parser.prototype;
        pp.isUseStrict = function(stmt) {
          return this.options.ecmaVersion >= 5 && stmt.type === "ExpressionStatement" && stmt.expression.type === "Literal" && stmt.expression.raw.slice(1, -1) === "use strict";
        };
        pp.eat = function(type) {
          if (this.type === type) {
            this.next();
            return true;
          } else {
            return false;
          }
        };
        pp.isContextual = function(name) {
          return this.type === _tokentype.types.name && this.value === name;
        };
        pp.eatContextual = function(name) {
          return this.value === name && this.eat(_tokentype.types.name);
        };
        pp.expectContextual = function(name) {
          if (!this.eatContextual(name))
            this.unexpected();
        };
        pp.canInsertSemicolon = function() {
          return this.type === _tokentype.types.eof || this.type === _tokentype.types.braceR || _whitespace.lineBreak.test(this.input.slice(this.lastTokEnd, this.start));
        };
        pp.insertSemicolon = function() {
          if (this.canInsertSemicolon()) {
            if (this.options.onInsertedSemicolon)
              this.options.onInsertedSemicolon(this.lastTokEnd, this.lastTokEndLoc);
            return true;
          }
        };
        pp.semicolon = function() {
          if (!this.eat(_tokentype.types.semi) && !this.insertSemicolon())
            this.unexpected();
        };
        pp.afterTrailingComma = function(tokType) {
          if (this.type == tokType) {
            if (this.options.onTrailingComma)
              this.options.onTrailingComma(this.lastTokStart, this.lastTokStartLoc);
            this.next();
            return true;
          }
        };
        pp.expect = function(type) {
          this.eat(type) || this.unexpected();
        };
        pp.unexpected = function(pos) {
          this.raise(pos != null ? pos : this.start, "Unexpected token");
        };
        pp.checkPatternErrors = function(refDestructuringErrors, andThrow) {
          var pos = refDestructuringErrors && refDestructuringErrors.trailingComma;
          if (!andThrow)
            return !!pos;
          if (pos)
            this.raise(pos, "Trailing comma is not permitted in destructuring patterns");
        };
        pp.checkExpressionErrors = function(refDestructuringErrors, andThrow) {
          var pos = refDestructuringErrors && refDestructuringErrors.shorthandAssign;
          if (!andThrow)
            return !!pos;
          if (pos)
            this.raise(pos, "Shorthand property assignments are valid only in destructuring patterns");
        };
      }, {
        "./state": 10,
        "./tokentype": 14,
        "./whitespace": 16
      }],
      10: [function(_dereq_, module, exports) {
        "use strict";
        exports.__esModule = true;
        function _classCallCheck(instance, Constructor) {
          if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
          }
        }
        var _identifier = _dereq_("./identifier");
        var _tokentype = _dereq_("./tokentype");
        var _whitespace = _dereq_("./whitespace");
        var _options = _dereq_("./options");
        var plugins = {};
        exports.plugins = plugins;
        function keywordRegexp(words) {
          return new RegExp("^(" + words.replace(/ /g, "|") + ")$");
        }
        var Parser = (function() {
          function Parser(options, input, startPos) {
            _classCallCheck(this, Parser);
            this.options = options = _options.getOptions(options);
            this.sourceFile = options.sourceFile;
            this.keywords = keywordRegexp(_identifier.keywords[options.ecmaVersion >= 6 ? 6 : 5]);
            var reserved = options.allowReserved ? "" : _identifier.reservedWords[options.ecmaVersion] + (options.sourceType == "module" ? " await" : "");
            this.reservedWords = keywordRegexp(reserved);
            var reservedStrict = (reserved ? reserved + " " : "") + _identifier.reservedWords.strict;
            this.reservedWordsStrict = keywordRegexp(reservedStrict);
            this.reservedWordsStrictBind = keywordRegexp(reservedStrict + " " + _identifier.reservedWords.strictBind);
            this.input = String(input);
            this.containsEsc = false;
            this.loadPlugins(options.plugins);
            if (startPos) {
              this.pos = startPos;
              this.lineStart = Math.max(0, this.input.lastIndexOf("\n", startPos));
              this.curLine = this.input.slice(0, this.lineStart).split(_whitespace.lineBreak).length;
            } else {
              this.pos = this.lineStart = 0;
              this.curLine = 1;
            }
            this.type = _tokentype.types.eof;
            this.value = null;
            this.start = this.end = this.pos;
            this.startLoc = this.endLoc = this.curPosition();
            this.lastTokEndLoc = this.lastTokStartLoc = null;
            this.lastTokStart = this.lastTokEnd = this.pos;
            this.context = this.initialContext();
            this.exprAllowed = true;
            this.strict = this.inModule = options.sourceType === "module";
            this.potentialArrowAt = -1;
            this.inFunction = this.inGenerator = false;
            this.labels = [];
            if (this.pos === 0 && options.allowHashBang && this.input.slice(0, 2) === '#!')
              this.skipLineComment(2);
          }
          Parser.prototype.isKeyword = function isKeyword(word) {
            return this.keywords.test(word);
          };
          Parser.prototype.isReservedWord = function isReservedWord(word) {
            return this.reservedWords.test(word);
          };
          Parser.prototype.extend = function extend(name, f) {
            this[name] = f(this[name]);
          };
          Parser.prototype.loadPlugins = function loadPlugins(pluginConfigs) {
            for (var _name in pluginConfigs) {
              var plugin = plugins[_name];
              if (!plugin)
                throw new Error("Plugin '" + _name + "' not found");
              plugin(this, pluginConfigs[_name]);
            }
          };
          Parser.prototype.parse = function parse() {
            var node = this.options.program || this.startNode();
            this.nextToken();
            return this.parseTopLevel(node);
          };
          return Parser;
        })();
        exports.Parser = Parser;
      }, {
        "./identifier": 2,
        "./options": 8,
        "./tokentype": 14,
        "./whitespace": 16
      }],
      11: [function(_dereq_, module, exports) {
        "use strict";
        var _tokentype = _dereq_("./tokentype");
        var _state = _dereq_("./state");
        var _whitespace = _dereq_("./whitespace");
        var pp = _state.Parser.prototype;
        pp.parseTopLevel = function(node) {
          var first = true;
          if (!node.body)
            node.body = [];
          while (this.type !== _tokentype.types.eof) {
            var stmt = this.parseStatement(true, true);
            node.body.push(stmt);
            if (first) {
              if (this.isUseStrict(stmt))
                this.setStrict(true);
              first = false;
            }
          }
          this.next();
          if (this.options.ecmaVersion >= 6) {
            node.sourceType = this.options.sourceType;
          }
          return this.finishNode(node, "Program");
        };
        var loopLabel = {kind: "loop"},
            switchLabel = {kind: "switch"};
        pp.parseStatement = function(declaration, topLevel) {
          var starttype = this.type,
              node = this.startNode();
          switch (starttype) {
            case _tokentype.types._break:
            case _tokentype.types._continue:
              return this.parseBreakContinueStatement(node, starttype.keyword);
            case _tokentype.types._debugger:
              return this.parseDebuggerStatement(node);
            case _tokentype.types._do:
              return this.parseDoStatement(node);
            case _tokentype.types._for:
              return this.parseForStatement(node);
            case _tokentype.types._function:
              if (!declaration && this.options.ecmaVersion >= 6)
                this.unexpected();
              return this.parseFunctionStatement(node);
            case _tokentype.types._class:
              if (!declaration)
                this.unexpected();
              return this.parseClass(node, true);
            case _tokentype.types._if:
              return this.parseIfStatement(node);
            case _tokentype.types._return:
              return this.parseReturnStatement(node);
            case _tokentype.types._switch:
              return this.parseSwitchStatement(node);
            case _tokentype.types._throw:
              return this.parseThrowStatement(node);
            case _tokentype.types._try:
              return this.parseTryStatement(node);
            case _tokentype.types._let:
            case _tokentype.types._const:
              if (!declaration)
                this.unexpected();
            case _tokentype.types._var:
              return this.parseVarStatement(node, starttype);
            case _tokentype.types._while:
              return this.parseWhileStatement(node);
            case _tokentype.types._with:
              return this.parseWithStatement(node);
            case _tokentype.types.braceL:
              return this.parseBlock();
            case _tokentype.types.semi:
              return this.parseEmptyStatement(node);
            case _tokentype.types._export:
            case _tokentype.types._import:
              if (!this.options.allowImportExportEverywhere) {
                if (!topLevel)
                  this.raise(this.start, "'import' and 'export' may only appear at the top level");
                if (!this.inModule)
                  this.raise(this.start, "'import' and 'export' may appear only with 'sourceType: module'");
              }
              return starttype === _tokentype.types._import ? this.parseImport(node) : this.parseExport(node);
            default:
              var maybeName = this.value,
                  expr = this.parseExpression();
              if (starttype === _tokentype.types.name && expr.type === "Identifier" && this.eat(_tokentype.types.colon))
                return this.parseLabeledStatement(node, maybeName, expr);
              else
                return this.parseExpressionStatement(node, expr);
          }
        };
        pp.parseBreakContinueStatement = function(node, keyword) {
          var isBreak = keyword == "break";
          this.next();
          if (this.eat(_tokentype.types.semi) || this.insertSemicolon())
            node.label = null;
          else if (this.type !== _tokentype.types.name)
            this.unexpected();
          else {
            node.label = this.parseIdent();
            this.semicolon();
          }
          for (var i = 0; i < this.labels.length; ++i) {
            var lab = this.labels[i];
            if (node.label == null || lab.name === node.label.name) {
              if (lab.kind != null && (isBreak || lab.kind === "loop"))
                break;
              if (node.label && isBreak)
                break;
            }
          }
          if (i === this.labels.length)
            this.raise(node.start, "Unsyntactic " + keyword);
          return this.finishNode(node, isBreak ? "BreakStatement" : "ContinueStatement");
        };
        pp.parseDebuggerStatement = function(node) {
          this.next();
          this.semicolon();
          return this.finishNode(node, "DebuggerStatement");
        };
        pp.parseDoStatement = function(node) {
          this.next();
          this.labels.push(loopLabel);
          node.body = this.parseStatement(false);
          this.labels.pop();
          this.expect(_tokentype.types._while);
          node.test = this.parseParenExpression();
          if (this.options.ecmaVersion >= 6)
            this.eat(_tokentype.types.semi);
          else
            this.semicolon();
          return this.finishNode(node, "DoWhileStatement");
        };
        pp.parseForStatement = function(node) {
          this.next();
          this.labels.push(loopLabel);
          this.expect(_tokentype.types.parenL);
          if (this.type === _tokentype.types.semi)
            return this.parseFor(node, null);
          if (this.type === _tokentype.types._var || this.type === _tokentype.types._let || this.type === _tokentype.types._const) {
            var _init = this.startNode(),
                varKind = this.type;
            this.next();
            this.parseVar(_init, true, varKind);
            this.finishNode(_init, "VariableDeclaration");
            if ((this.type === _tokentype.types._in || this.options.ecmaVersion >= 6 && this.isContextual("of")) && _init.declarations.length === 1 && !(varKind !== _tokentype.types._var && _init.declarations[0].init))
              return this.parseForIn(node, _init);
            return this.parseFor(node, _init);
          }
          var refDestructuringErrors = {
            shorthandAssign: 0,
            trailingComma: 0
          };
          var init = this.parseExpression(true, refDestructuringErrors);
          if (this.type === _tokentype.types._in || this.options.ecmaVersion >= 6 && this.isContextual("of")) {
            this.checkPatternErrors(refDestructuringErrors, true);
            this.toAssignable(init);
            this.checkLVal(init);
            return this.parseForIn(node, init);
          } else {
            this.checkExpressionErrors(refDestructuringErrors, true);
          }
          return this.parseFor(node, init);
        };
        pp.parseFunctionStatement = function(node) {
          this.next();
          return this.parseFunction(node, true);
        };
        pp.parseIfStatement = function(node) {
          this.next();
          node.test = this.parseParenExpression();
          node.consequent = this.parseStatement(false);
          node.alternate = this.eat(_tokentype.types._else) ? this.parseStatement(false) : null;
          return this.finishNode(node, "IfStatement");
        };
        pp.parseReturnStatement = function(node) {
          if (!this.inFunction && !this.options.allowReturnOutsideFunction)
            this.raise(this.start, "'return' outside of function");
          this.next();
          if (this.eat(_tokentype.types.semi) || this.insertSemicolon())
            node.argument = null;
          else {
            node.argument = this.parseExpression();
            this.semicolon();
          }
          return this.finishNode(node, "ReturnStatement");
        };
        pp.parseSwitchStatement = function(node) {
          this.next();
          node.discriminant = this.parseParenExpression();
          node.cases = [];
          this.expect(_tokentype.types.braceL);
          this.labels.push(switchLabel);
          for (var cur,
              sawDefault = false; this.type != _tokentype.types.braceR; ) {
            if (this.type === _tokentype.types._case || this.type === _tokentype.types._default) {
              var isCase = this.type === _tokentype.types._case;
              if (cur)
                this.finishNode(cur, "SwitchCase");
              node.cases.push(cur = this.startNode());
              cur.consequent = [];
              this.next();
              if (isCase) {
                cur.test = this.parseExpression();
              } else {
                if (sawDefault)
                  this.raise(this.lastTokStart, "Multiple default clauses");
                sawDefault = true;
                cur.test = null;
              }
              this.expect(_tokentype.types.colon);
            } else {
              if (!cur)
                this.unexpected();
              cur.consequent.push(this.parseStatement(true));
            }
          }
          if (cur)
            this.finishNode(cur, "SwitchCase");
          this.next();
          this.labels.pop();
          return this.finishNode(node, "SwitchStatement");
        };
        pp.parseThrowStatement = function(node) {
          this.next();
          if (_whitespace.lineBreak.test(this.input.slice(this.lastTokEnd, this.start)))
            this.raise(this.lastTokEnd, "Illegal newline after throw");
          node.argument = this.parseExpression();
          this.semicolon();
          return this.finishNode(node, "ThrowStatement");
        };
        var empty = [];
        pp.parseTryStatement = function(node) {
          this.next();
          node.block = this.parseBlock();
          node.handler = null;
          if (this.type === _tokentype.types._catch) {
            var clause = this.startNode();
            this.next();
            this.expect(_tokentype.types.parenL);
            clause.param = this.parseBindingAtom();
            this.checkLVal(clause.param, true);
            this.expect(_tokentype.types.parenR);
            clause.body = this.parseBlock();
            node.handler = this.finishNode(clause, "CatchClause");
          }
          node.finalizer = this.eat(_tokentype.types._finally) ? this.parseBlock() : null;
          if (!node.handler && !node.finalizer)
            this.raise(node.start, "Missing catch or finally clause");
          return this.finishNode(node, "TryStatement");
        };
        pp.parseVarStatement = function(node, kind) {
          this.next();
          this.parseVar(node, false, kind);
          this.semicolon();
          return this.finishNode(node, "VariableDeclaration");
        };
        pp.parseWhileStatement = function(node) {
          this.next();
          node.test = this.parseParenExpression();
          this.labels.push(loopLabel);
          node.body = this.parseStatement(false);
          this.labels.pop();
          return this.finishNode(node, "WhileStatement");
        };
        pp.parseWithStatement = function(node) {
          if (this.strict)
            this.raise(this.start, "'with' in strict mode");
          this.next();
          node.object = this.parseParenExpression();
          node.body = this.parseStatement(false);
          return this.finishNode(node, "WithStatement");
        };
        pp.parseEmptyStatement = function(node) {
          this.next();
          return this.finishNode(node, "EmptyStatement");
        };
        pp.parseLabeledStatement = function(node, maybeName, expr) {
          for (var i = 0; i < this.labels.length; ++i) {
            if (this.labels[i].name === maybeName)
              this.raise(expr.start, "Label '" + maybeName + "' is already declared");
          }
          var kind = this.type.isLoop ? "loop" : this.type === _tokentype.types._switch ? "switch" : null;
          for (var i = this.labels.length - 1; i >= 0; i--) {
            var label = this.labels[i];
            if (label.statementStart == node.start) {
              label.statementStart = this.start;
              label.kind = kind;
            } else
              break;
          }
          this.labels.push({
            name: maybeName,
            kind: kind,
            statementStart: this.start
          });
          node.body = this.parseStatement(true);
          this.labels.pop();
          node.label = expr;
          return this.finishNode(node, "LabeledStatement");
        };
        pp.parseExpressionStatement = function(node, expr) {
          node.expression = expr;
          this.semicolon();
          return this.finishNode(node, "ExpressionStatement");
        };
        pp.parseBlock = function(allowStrict) {
          var node = this.startNode(),
              first = true,
              oldStrict = undefined;
          node.body = [];
          this.expect(_tokentype.types.braceL);
          while (!this.eat(_tokentype.types.braceR)) {
            var stmt = this.parseStatement(true);
            node.body.push(stmt);
            if (first && allowStrict && this.isUseStrict(stmt)) {
              oldStrict = this.strict;
              this.setStrict(this.strict = true);
            }
            first = false;
          }
          if (oldStrict === false)
            this.setStrict(false);
          return this.finishNode(node, "BlockStatement");
        };
        pp.parseFor = function(node, init) {
          node.init = init;
          this.expect(_tokentype.types.semi);
          node.test = this.type === _tokentype.types.semi ? null : this.parseExpression();
          this.expect(_tokentype.types.semi);
          node.update = this.type === _tokentype.types.parenR ? null : this.parseExpression();
          this.expect(_tokentype.types.parenR);
          node.body = this.parseStatement(false);
          this.labels.pop();
          return this.finishNode(node, "ForStatement");
        };
        pp.parseForIn = function(node, init) {
          var type = this.type === _tokentype.types._in ? "ForInStatement" : "ForOfStatement";
          this.next();
          node.left = init;
          node.right = this.parseExpression();
          this.expect(_tokentype.types.parenR);
          node.body = this.parseStatement(false);
          this.labels.pop();
          return this.finishNode(node, type);
        };
        pp.parseVar = function(node, isFor, kind) {
          node.declarations = [];
          node.kind = kind.keyword;
          for (; ; ) {
            var decl = this.startNode();
            this.parseVarId(decl);
            if (this.eat(_tokentype.types.eq)) {
              decl.init = this.parseMaybeAssign(isFor);
            } else if (kind === _tokentype.types._const && !(this.type === _tokentype.types._in || this.options.ecmaVersion >= 6 && this.isContextual("of"))) {
              this.unexpected();
            } else if (decl.id.type != "Identifier" && !(isFor && (this.type === _tokentype.types._in || this.isContextual("of")))) {
              this.raise(this.lastTokEnd, "Complex binding patterns require an initialization value");
            } else {
              decl.init = null;
            }
            node.declarations.push(this.finishNode(decl, "VariableDeclarator"));
            if (!this.eat(_tokentype.types.comma))
              break;
          }
          return node;
        };
        pp.parseVarId = function(decl) {
          decl.id = this.parseBindingAtom();
          this.checkLVal(decl.id, true);
        };
        pp.parseFunction = function(node, isStatement, allowExpressionBody) {
          this.initFunction(node);
          if (this.options.ecmaVersion >= 6)
            node.generator = this.eat(_tokentype.types.star);
          if (isStatement || this.type === _tokentype.types.name)
            node.id = this.parseIdent();
          this.parseFunctionParams(node);
          this.parseFunctionBody(node, allowExpressionBody);
          return this.finishNode(node, isStatement ? "FunctionDeclaration" : "FunctionExpression");
        };
        pp.parseFunctionParams = function(node) {
          this.expect(_tokentype.types.parenL);
          node.params = this.parseBindingList(_tokentype.types.parenR, false, false, true);
        };
        pp.parseClass = function(node, isStatement) {
          this.next();
          this.parseClassId(node, isStatement);
          this.parseClassSuper(node);
          var classBody = this.startNode();
          var hadConstructor = false;
          classBody.body = [];
          this.expect(_tokentype.types.braceL);
          while (!this.eat(_tokentype.types.braceR)) {
            if (this.eat(_tokentype.types.semi))
              continue;
            var method = this.startNode();
            var isGenerator = this.eat(_tokentype.types.star);
            var isMaybeStatic = this.type === _tokentype.types.name && this.value === "static";
            this.parsePropertyName(method);
            method["static"] = isMaybeStatic && this.type !== _tokentype.types.parenL;
            if (method["static"]) {
              if (isGenerator)
                this.unexpected();
              isGenerator = this.eat(_tokentype.types.star);
              this.parsePropertyName(method);
            }
            method.kind = "method";
            var isGetSet = false;
            if (!method.computed) {
              var key = method.key;
              if (!isGenerator && key.type === "Identifier" && this.type !== _tokentype.types.parenL && (key.name === "get" || key.name === "set")) {
                isGetSet = true;
                method.kind = key.name;
                key = this.parsePropertyName(method);
              }
              if (!method["static"] && (key.type === "Identifier" && key.name === "constructor" || key.type === "Literal" && key.value === "constructor")) {
                if (hadConstructor)
                  this.raise(key.start, "Duplicate constructor in the same class");
                if (isGetSet)
                  this.raise(key.start, "Constructor can't have get/set modifier");
                if (isGenerator)
                  this.raise(key.start, "Constructor can't be a generator");
                method.kind = "constructor";
                hadConstructor = true;
              }
            }
            this.parseClassMethod(classBody, method, isGenerator);
            if (isGetSet) {
              var paramCount = method.kind === "get" ? 0 : 1;
              if (method.value.params.length !== paramCount) {
                var start = method.value.start;
                if (method.kind === "get")
                  this.raise(start, "getter should have no params");
                else
                  this.raise(start, "setter should have exactly one param");
              }
              if (method.kind === "set" && method.value.params[0].type === "RestElement")
                this.raise(method.value.params[0].start, "Setter cannot use rest params");
            }
          }
          node.body = this.finishNode(classBody, "ClassBody");
          return this.finishNode(node, isStatement ? "ClassDeclaration" : "ClassExpression");
        };
        pp.parseClassMethod = function(classBody, method, isGenerator) {
          method.value = this.parseMethod(isGenerator);
          classBody.body.push(this.finishNode(method, "MethodDefinition"));
        };
        pp.parseClassId = function(node, isStatement) {
          node.id = this.type === _tokentype.types.name ? this.parseIdent() : isStatement ? this.unexpected() : null;
        };
        pp.parseClassSuper = function(node) {
          node.superClass = this.eat(_tokentype.types._extends) ? this.parseExprSubscripts() : null;
        };
        pp.parseExport = function(node) {
          this.next();
          if (this.eat(_tokentype.types.star)) {
            this.expectContextual("from");
            node.source = this.type === _tokentype.types.string ? this.parseExprAtom() : this.unexpected();
            this.semicolon();
            return this.finishNode(node, "ExportAllDeclaration");
          }
          if (this.eat(_tokentype.types._default)) {
            var expr = this.parseMaybeAssign();
            var needsSemi = true;
            if (expr.type == "FunctionExpression" || expr.type == "ClassExpression") {
              needsSemi = false;
              if (expr.id) {
                expr.type = expr.type == "FunctionExpression" ? "FunctionDeclaration" : "ClassDeclaration";
              }
            }
            node.declaration = expr;
            if (needsSemi)
              this.semicolon();
            return this.finishNode(node, "ExportDefaultDeclaration");
          }
          if (this.shouldParseExportStatement()) {
            node.declaration = this.parseStatement(true);
            node.specifiers = [];
            node.source = null;
          } else {
            node.declaration = null;
            node.specifiers = this.parseExportSpecifiers();
            if (this.eatContextual("from")) {
              node.source = this.type === _tokentype.types.string ? this.parseExprAtom() : this.unexpected();
            } else {
              for (var i = 0; i < node.specifiers.length; i++) {
                if (this.keywords.test(node.specifiers[i].local.name) || this.reservedWords.test(node.specifiers[i].local.name)) {
                  this.unexpected(node.specifiers[i].local.start);
                }
              }
              node.source = null;
            }
            this.semicolon();
          }
          return this.finishNode(node, "ExportNamedDeclaration");
        };
        pp.shouldParseExportStatement = function() {
          return this.type.keyword;
        };
        pp.parseExportSpecifiers = function() {
          var nodes = [],
              first = true;
          this.expect(_tokentype.types.braceL);
          while (!this.eat(_tokentype.types.braceR)) {
            if (!first) {
              this.expect(_tokentype.types.comma);
              if (this.afterTrailingComma(_tokentype.types.braceR))
                break;
            } else
              first = false;
            var node = this.startNode();
            node.local = this.parseIdent(this.type === _tokentype.types._default);
            node.exported = this.eatContextual("as") ? this.parseIdent(true) : node.local;
            nodes.push(this.finishNode(node, "ExportSpecifier"));
          }
          return nodes;
        };
        pp.parseImport = function(node) {
          this.next();
          if (this.type === _tokentype.types.string) {
            node.specifiers = empty;
            node.source = this.parseExprAtom();
          } else {
            node.specifiers = this.parseImportSpecifiers();
            this.expectContextual("from");
            node.source = this.type === _tokentype.types.string ? this.parseExprAtom() : this.unexpected();
          }
          this.semicolon();
          return this.finishNode(node, "ImportDeclaration");
        };
        pp.parseImportSpecifiers = function() {
          var nodes = [],
              first = true;
          if (this.type === _tokentype.types.name) {
            var node = this.startNode();
            node.local = this.parseIdent();
            this.checkLVal(node.local, true);
            nodes.push(this.finishNode(node, "ImportDefaultSpecifier"));
            if (!this.eat(_tokentype.types.comma))
              return nodes;
          }
          if (this.type === _tokentype.types.star) {
            var node = this.startNode();
            this.next();
            this.expectContextual("as");
            node.local = this.parseIdent();
            this.checkLVal(node.local, true);
            nodes.push(this.finishNode(node, "ImportNamespaceSpecifier"));
            return nodes;
          }
          this.expect(_tokentype.types.braceL);
          while (!this.eat(_tokentype.types.braceR)) {
            if (!first) {
              this.expect(_tokentype.types.comma);
              if (this.afterTrailingComma(_tokentype.types.braceR))
                break;
            } else
              first = false;
            var node = this.startNode();
            node.imported = this.parseIdent(true);
            if (this.eatContextual("as")) {
              node.local = this.parseIdent();
            } else {
              node.local = node.imported;
              if (this.isKeyword(node.local.name))
                this.unexpected(node.local.start);
              if (this.reservedWordsStrict.test(node.local.name))
                this.raise(node.local.start, "The keyword '" + node.local.name + "' is reserved");
            }
            this.checkLVal(node.local, true);
            nodes.push(this.finishNode(node, "ImportSpecifier"));
          }
          return nodes;
        };
      }, {
        "./state": 10,
        "./tokentype": 14,
        "./whitespace": 16
      }],
      12: [function(_dereq_, module, exports) {
        "use strict";
        exports.__esModule = true;
        function _classCallCheck(instance, Constructor) {
          if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
          }
        }
        var _state = _dereq_("./state");
        var _tokentype = _dereq_("./tokentype");
        var _whitespace = _dereq_("./whitespace");
        var TokContext = function TokContext(token, isExpr, preserveSpace, override) {
          _classCallCheck(this, TokContext);
          this.token = token;
          this.isExpr = !!isExpr;
          this.preserveSpace = !!preserveSpace;
          this.override = override;
        };
        exports.TokContext = TokContext;
        var types = {
          b_stat: new TokContext("{", false),
          b_expr: new TokContext("{", true),
          b_tmpl: new TokContext("${", true),
          p_stat: new TokContext("(", false),
          p_expr: new TokContext("(", true),
          q_tmpl: new TokContext("`", true, true, function(p) {
            return p.readTmplToken();
          }),
          f_expr: new TokContext("function", true)
        };
        exports.types = types;
        var pp = _state.Parser.prototype;
        pp.initialContext = function() {
          return [types.b_stat];
        };
        pp.braceIsBlock = function(prevType) {
          if (prevType === _tokentype.types.colon) {
            var _parent = this.curContext();
            if (_parent === types.b_stat || _parent === types.b_expr)
              return !_parent.isExpr;
          }
          if (prevType === _tokentype.types._return)
            return _whitespace.lineBreak.test(this.input.slice(this.lastTokEnd, this.start));
          if (prevType === _tokentype.types._else || prevType === _tokentype.types.semi || prevType === _tokentype.types.eof || prevType === _tokentype.types.parenR)
            return true;
          if (prevType == _tokentype.types.braceL)
            return this.curContext() === types.b_stat;
          return !this.exprAllowed;
        };
        pp.updateContext = function(prevType) {
          var update = undefined,
              type = this.type;
          if (type.keyword && prevType == _tokentype.types.dot)
            this.exprAllowed = false;
          else if (update = type.updateContext)
            update.call(this, prevType);
          else
            this.exprAllowed = type.beforeExpr;
        };
        _tokentype.types.parenR.updateContext = _tokentype.types.braceR.updateContext = function() {
          if (this.context.length == 1) {
            this.exprAllowed = true;
            return;
          }
          var out = this.context.pop();
          if (out === types.b_stat && this.curContext() === types.f_expr) {
            this.context.pop();
            this.exprAllowed = false;
          } else if (out === types.b_tmpl) {
            this.exprAllowed = true;
          } else {
            this.exprAllowed = !out.isExpr;
          }
        };
        _tokentype.types.braceL.updateContext = function(prevType) {
          this.context.push(this.braceIsBlock(prevType) ? types.b_stat : types.b_expr);
          this.exprAllowed = true;
        };
        _tokentype.types.dollarBraceL.updateContext = function() {
          this.context.push(types.b_tmpl);
          this.exprAllowed = true;
        };
        _tokentype.types.parenL.updateContext = function(prevType) {
          var statementParens = prevType === _tokentype.types._if || prevType === _tokentype.types._for || prevType === _tokentype.types._with || prevType === _tokentype.types._while;
          this.context.push(statementParens ? types.p_stat : types.p_expr);
          this.exprAllowed = true;
        };
        _tokentype.types.incDec.updateContext = function() {};
        _tokentype.types._function.updateContext = function() {
          if (this.curContext() !== types.b_stat)
            this.context.push(types.f_expr);
          this.exprAllowed = false;
        };
        _tokentype.types.backQuote.updateContext = function() {
          if (this.curContext() === types.q_tmpl)
            this.context.pop();
          else
            this.context.push(types.q_tmpl);
          this.exprAllowed = false;
        };
      }, {
        "./state": 10,
        "./tokentype": 14,
        "./whitespace": 16
      }],
      13: [function(_dereq_, module, exports) {
        "use strict";
        exports.__esModule = true;
        function _classCallCheck(instance, Constructor) {
          if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
          }
        }
        var _identifier = _dereq_("./identifier");
        var _tokentype = _dereq_("./tokentype");
        var _state = _dereq_("./state");
        var _locutil = _dereq_("./locutil");
        var _whitespace = _dereq_("./whitespace");
        var Token = function Token(p) {
          _classCallCheck(this, Token);
          this.type = p.type;
          this.value = p.value;
          this.start = p.start;
          this.end = p.end;
          if (p.options.locations)
            this.loc = new _locutil.SourceLocation(p, p.startLoc, p.endLoc);
          if (p.options.ranges)
            this.range = [p.start, p.end];
        };
        ;
        exports.Token = Token;
        var pp = _state.Parser.prototype;
        var isRhino = typeof Packages == "object" && Object.prototype.toString.call(Packages) == "[object JavaPackage]";
        pp.next = function() {
          if (this.options.onToken)
            this.options.onToken(new Token(this));
          this.lastTokEnd = this.end;
          this.lastTokStart = this.start;
          this.lastTokEndLoc = this.endLoc;
          this.lastTokStartLoc = this.startLoc;
          this.nextToken();
        };
        pp.getToken = function() {
          this.next();
          return new Token(this);
        };
        if (typeof Symbol !== "undefined")
          pp[Symbol.iterator] = function() {
            var self = this;
            return {next: function next() {
                var token = self.getToken();
                return {
                  done: token.type === _tokentype.types.eof,
                  value: token
                };
              }};
          };
        pp.setStrict = function(strict) {
          this.strict = strict;
          if (this.type !== _tokentype.types.num && this.type !== _tokentype.types.string)
            return;
          this.pos = this.start;
          if (this.options.locations) {
            while (this.pos < this.lineStart) {
              this.lineStart = this.input.lastIndexOf("\n", this.lineStart - 2) + 1;
              --this.curLine;
            }
          }
          this.nextToken();
        };
        pp.curContext = function() {
          return this.context[this.context.length - 1];
        };
        pp.nextToken = function() {
          var curContext = this.curContext();
          if (!curContext || !curContext.preserveSpace)
            this.skipSpace();
          this.start = this.pos;
          if (this.options.locations)
            this.startLoc = this.curPosition();
          if (this.pos >= this.input.length)
            return this.finishToken(_tokentype.types.eof);
          if (curContext.override)
            return curContext.override(this);
          else
            this.readToken(this.fullCharCodeAtPos());
        };
        pp.readToken = function(code) {
          if (_identifier.isIdentifierStart(code, this.options.ecmaVersion >= 6) || code === 92)
            return this.readWord();
          return this.getTokenFromCode(code);
        };
        pp.fullCharCodeAtPos = function() {
          var code = this.input.charCodeAt(this.pos);
          if (code <= 0xd7ff || code >= 0xe000)
            return code;
          var next = this.input.charCodeAt(this.pos + 1);
          return (code << 10) + next - 0x35fdc00;
        };
        pp.skipBlockComment = function() {
          var startLoc = this.options.onComment && this.curPosition();
          var start = this.pos,
              end = this.input.indexOf("*/", this.pos += 2);
          if (end === -1)
            this.raise(this.pos - 2, "Unterminated comment");
          this.pos = end + 2;
          if (this.options.locations) {
            _whitespace.lineBreakG.lastIndex = start;
            var match = undefined;
            while ((match = _whitespace.lineBreakG.exec(this.input)) && match.index < this.pos) {
              ++this.curLine;
              this.lineStart = match.index + match[0].length;
            }
          }
          if (this.options.onComment)
            this.options.onComment(true, this.input.slice(start + 2, end), start, this.pos, startLoc, this.curPosition());
        };
        pp.skipLineComment = function(startSkip) {
          var start = this.pos;
          var startLoc = this.options.onComment && this.curPosition();
          var ch = this.input.charCodeAt(this.pos += startSkip);
          while (this.pos < this.input.length && ch !== 10 && ch !== 13 && ch !== 8232 && ch !== 8233) {
            ++this.pos;
            ch = this.input.charCodeAt(this.pos);
          }
          if (this.options.onComment)
            this.options.onComment(false, this.input.slice(start + startSkip, this.pos), start, this.pos, startLoc, this.curPosition());
        };
        pp.skipSpace = function() {
          loop: while (this.pos < this.input.length) {
            var ch = this.input.charCodeAt(this.pos);
            switch (ch) {
              case 32:
              case 160:
                ++this.pos;
                break;
              case 13:
                if (this.input.charCodeAt(this.pos + 1) === 10) {
                  ++this.pos;
                }
              case 10:
              case 8232:
              case 8233:
                ++this.pos;
                if (this.options.locations) {
                  ++this.curLine;
                  this.lineStart = this.pos;
                }
                break;
              case 47:
                switch (this.input.charCodeAt(this.pos + 1)) {
                  case 42:
                    this.skipBlockComment();
                    break;
                  case 47:
                    this.skipLineComment(2);
                    break;
                  default:
                    break loop;
                }
                break;
              default:
                if (ch > 8 && ch < 14 || ch >= 5760 && _whitespace.nonASCIIwhitespace.test(String.fromCharCode(ch))) {
                  ++this.pos;
                } else {
                  break loop;
                }
            }
          }
        };
        pp.finishToken = function(type, val) {
          this.end = this.pos;
          if (this.options.locations)
            this.endLoc = this.curPosition();
          var prevType = this.type;
          this.type = type;
          this.value = val;
          this.updateContext(prevType);
        };
        pp.readToken_dot = function() {
          var next = this.input.charCodeAt(this.pos + 1);
          if (next >= 48 && next <= 57)
            return this.readNumber(true);
          var next2 = this.input.charCodeAt(this.pos + 2);
          if (this.options.ecmaVersion >= 6 && next === 46 && next2 === 46) {
            this.pos += 3;
            return this.finishToken(_tokentype.types.ellipsis);
          } else {
            ++this.pos;
            return this.finishToken(_tokentype.types.dot);
          }
        };
        pp.readToken_slash = function() {
          var next = this.input.charCodeAt(this.pos + 1);
          if (this.exprAllowed) {
            ++this.pos;
            return this.readRegexp();
          }
          if (next === 61)
            return this.finishOp(_tokentype.types.assign, 2);
          return this.finishOp(_tokentype.types.slash, 1);
        };
        pp.readToken_mult_modulo = function(code) {
          var next = this.input.charCodeAt(this.pos + 1);
          if (next === 61)
            return this.finishOp(_tokentype.types.assign, 2);
          return this.finishOp(code === 42 ? _tokentype.types.star : _tokentype.types.modulo, 1);
        };
        pp.readToken_pipe_amp = function(code) {
          var next = this.input.charCodeAt(this.pos + 1);
          if (next === code)
            return this.finishOp(code === 124 ? _tokentype.types.logicalOR : _tokentype.types.logicalAND, 2);
          if (next === 61)
            return this.finishOp(_tokentype.types.assign, 2);
          return this.finishOp(code === 124 ? _tokentype.types.bitwiseOR : _tokentype.types.bitwiseAND, 1);
        };
        pp.readToken_caret = function() {
          var next = this.input.charCodeAt(this.pos + 1);
          if (next === 61)
            return this.finishOp(_tokentype.types.assign, 2);
          return this.finishOp(_tokentype.types.bitwiseXOR, 1);
        };
        pp.readToken_plus_min = function(code) {
          var next = this.input.charCodeAt(this.pos + 1);
          if (next === code) {
            if (next == 45 && this.input.charCodeAt(this.pos + 2) == 62 && _whitespace.lineBreak.test(this.input.slice(this.lastTokEnd, this.pos))) {
              this.skipLineComment(3);
              this.skipSpace();
              return this.nextToken();
            }
            return this.finishOp(_tokentype.types.incDec, 2);
          }
          if (next === 61)
            return this.finishOp(_tokentype.types.assign, 2);
          return this.finishOp(_tokentype.types.plusMin, 1);
        };
        pp.readToken_lt_gt = function(code) {
          var next = this.input.charCodeAt(this.pos + 1);
          var size = 1;
          if (next === code) {
            size = code === 62 && this.input.charCodeAt(this.pos + 2) === 62 ? 3 : 2;
            if (this.input.charCodeAt(this.pos + size) === 61)
              return this.finishOp(_tokentype.types.assign, size + 1);
            return this.finishOp(_tokentype.types.bitShift, size);
          }
          if (next == 33 && code == 60 && this.input.charCodeAt(this.pos + 2) == 45 && this.input.charCodeAt(this.pos + 3) == 45) {
            if (this.inModule)
              this.unexpected();
            this.skipLineComment(4);
            this.skipSpace();
            return this.nextToken();
          }
          if (next === 61)
            size = this.input.charCodeAt(this.pos + 2) === 61 ? 3 : 2;
          return this.finishOp(_tokentype.types.relational, size);
        };
        pp.readToken_eq_excl = function(code) {
          var next = this.input.charCodeAt(this.pos + 1);
          if (next === 61)
            return this.finishOp(_tokentype.types.equality, this.input.charCodeAt(this.pos + 2) === 61 ? 3 : 2);
          if (code === 61 && next === 62 && this.options.ecmaVersion >= 6) {
            this.pos += 2;
            return this.finishToken(_tokentype.types.arrow);
          }
          return this.finishOp(code === 61 ? _tokentype.types.eq : _tokentype.types.prefix, 1);
        };
        pp.getTokenFromCode = function(code) {
          switch (code) {
            case 46:
              return this.readToken_dot();
            case 40:
              ++this.pos;
              return this.finishToken(_tokentype.types.parenL);
            case 41:
              ++this.pos;
              return this.finishToken(_tokentype.types.parenR);
            case 59:
              ++this.pos;
              return this.finishToken(_tokentype.types.semi);
            case 44:
              ++this.pos;
              return this.finishToken(_tokentype.types.comma);
            case 91:
              ++this.pos;
              return this.finishToken(_tokentype.types.bracketL);
            case 93:
              ++this.pos;
              return this.finishToken(_tokentype.types.bracketR);
            case 123:
              ++this.pos;
              return this.finishToken(_tokentype.types.braceL);
            case 125:
              ++this.pos;
              return this.finishToken(_tokentype.types.braceR);
            case 58:
              ++this.pos;
              return this.finishToken(_tokentype.types.colon);
            case 63:
              ++this.pos;
              return this.finishToken(_tokentype.types.question);
            case 96:
              if (this.options.ecmaVersion < 6)
                break;
              ++this.pos;
              return this.finishToken(_tokentype.types.backQuote);
            case 48:
              var next = this.input.charCodeAt(this.pos + 1);
              if (next === 120 || next === 88)
                return this.readRadixNumber(16);
              if (this.options.ecmaVersion >= 6) {
                if (next === 111 || next === 79)
                  return this.readRadixNumber(8);
                if (next === 98 || next === 66)
                  return this.readRadixNumber(2);
              }
            case 49:
            case 50:
            case 51:
            case 52:
            case 53:
            case 54:
            case 55:
            case 56:
            case 57:
              return this.readNumber(false);
            case 34:
            case 39:
              return this.readString(code);
            case 47:
              return this.readToken_slash();
            case 37:
            case 42:
              return this.readToken_mult_modulo(code);
            case 124:
            case 38:
              return this.readToken_pipe_amp(code);
            case 94:
              return this.readToken_caret();
            case 43:
            case 45:
              return this.readToken_plus_min(code);
            case 60:
            case 62:
              return this.readToken_lt_gt(code);
            case 61:
            case 33:
              return this.readToken_eq_excl(code);
            case 126:
              return this.finishOp(_tokentype.types.prefix, 1);
          }
          this.raise(this.pos, "Unexpected character '" + codePointToString(code) + "'");
        };
        pp.finishOp = function(type, size) {
          var str = this.input.slice(this.pos, this.pos + size);
          this.pos += size;
          return this.finishToken(type, str);
        };
        function tryCreateRegexp(src, flags, throwErrorAt, parser) {
          try {
            return new RegExp(src, flags);
          } catch (e) {
            if (throwErrorAt !== undefined) {
              if (e instanceof SyntaxError)
                parser.raise(throwErrorAt, "Error parsing regular expression: " + e.message);
              throw e;
            }
          }
        }
        var regexpUnicodeSupport = !!tryCreateRegexp("￿", "u");
        pp.readRegexp = function() {
          var _this = this;
          var escaped = undefined,
              inClass = undefined,
              start = this.pos;
          for (; ; ) {
            if (this.pos >= this.input.length)
              this.raise(start, "Unterminated regular expression");
            var ch = this.input.charAt(this.pos);
            if (_whitespace.lineBreak.test(ch))
              this.raise(start, "Unterminated regular expression");
            if (!escaped) {
              if (ch === "[")
                inClass = true;
              else if (ch === "]" && inClass)
                inClass = false;
              else if (ch === "/" && !inClass)
                break;
              escaped = ch === "\\";
            } else
              escaped = false;
            ++this.pos;
          }
          var content = this.input.slice(start, this.pos);
          ++this.pos;
          var mods = this.readWord1();
          var tmp = content;
          if (mods) {
            var validFlags = /^[gim]*$/;
            if (this.options.ecmaVersion >= 6)
              validFlags = /^[gimuy]*$/;
            if (!validFlags.test(mods))
              this.raise(start, "Invalid regular expression flag");
            if (mods.indexOf('u') >= 0 && !regexpUnicodeSupport) {
              tmp = tmp.replace(/\\u\{([0-9a-fA-F]+)\}/g, function(_match, code, offset) {
                code = Number("0x" + code);
                if (code > 0x10FFFF)
                  _this.raise(start + offset + 3, "Code point out of bounds");
                return "x";
              });
              tmp = tmp.replace(/\\u([a-fA-F0-9]{4})|[\uD800-\uDBFF][\uDC00-\uDFFF]/g, "x");
            }
          }
          var value = null;
          if (!isRhino) {
            tryCreateRegexp(tmp, undefined, start, this);
            value = tryCreateRegexp(content, mods);
          }
          return this.finishToken(_tokentype.types.regexp, {
            pattern: content,
            flags: mods,
            value: value
          });
        };
        pp.readInt = function(radix, len) {
          var start = this.pos,
              total = 0;
          for (var i = 0,
              e = len == null ? Infinity : len; i < e; ++i) {
            var code = this.input.charCodeAt(this.pos),
                val = undefined;
            if (code >= 97)
              val = code - 97 + 10;
            else if (code >= 65)
              val = code - 65 + 10;
            else if (code >= 48 && code <= 57)
              val = code - 48;
            else
              val = Infinity;
            if (val >= radix)
              break;
            ++this.pos;
            total = total * radix + val;
          }
          if (this.pos === start || len != null && this.pos - start !== len)
            return null;
          return total;
        };
        pp.readRadixNumber = function(radix) {
          this.pos += 2;
          var val = this.readInt(radix);
          if (val == null)
            this.raise(this.start + 2, "Expected number in radix " + radix);
          if (_identifier.isIdentifierStart(this.fullCharCodeAtPos()))
            this.raise(this.pos, "Identifier directly after number");
          return this.finishToken(_tokentype.types.num, val);
        };
        pp.readNumber = function(startsWithDot) {
          var start = this.pos,
              isFloat = false,
              octal = this.input.charCodeAt(this.pos) === 48;
          if (!startsWithDot && this.readInt(10) === null)
            this.raise(start, "Invalid number");
          var next = this.input.charCodeAt(this.pos);
          if (next === 46) {
            ++this.pos;
            this.readInt(10);
            isFloat = true;
            next = this.input.charCodeAt(this.pos);
          }
          if (next === 69 || next === 101) {
            next = this.input.charCodeAt(++this.pos);
            if (next === 43 || next === 45)
              ++this.pos;
            if (this.readInt(10) === null)
              this.raise(start, "Invalid number");
            isFloat = true;
          }
          if (_identifier.isIdentifierStart(this.fullCharCodeAtPos()))
            this.raise(this.pos, "Identifier directly after number");
          var str = this.input.slice(start, this.pos),
              val = undefined;
          if (isFloat)
            val = parseFloat(str);
          else if (!octal || str.length === 1)
            val = parseInt(str, 10);
          else if (/[89]/.test(str) || this.strict)
            this.raise(start, "Invalid number");
          else
            val = parseInt(str, 8);
          return this.finishToken(_tokentype.types.num, val);
        };
        pp.readCodePoint = function() {
          var ch = this.input.charCodeAt(this.pos),
              code = undefined;
          if (ch === 123) {
            if (this.options.ecmaVersion < 6)
              this.unexpected();
            var codePos = ++this.pos;
            code = this.readHexChar(this.input.indexOf('}', this.pos) - this.pos);
            ++this.pos;
            if (code > 0x10FFFF)
              this.raise(codePos, "Code point out of bounds");
          } else {
            code = this.readHexChar(4);
          }
          return code;
        };
        function codePointToString(code) {
          if (code <= 0xFFFF)
            return String.fromCharCode(code);
          code -= 0x10000;
          return String.fromCharCode((code >> 10) + 0xD800, (code & 1023) + 0xDC00);
        }
        pp.readString = function(quote) {
          var out = "",
              chunkStart = ++this.pos;
          for (; ; ) {
            if (this.pos >= this.input.length)
              this.raise(this.start, "Unterminated string constant");
            var ch = this.input.charCodeAt(this.pos);
            if (ch === quote)
              break;
            if (ch === 92) {
              out += this.input.slice(chunkStart, this.pos);
              out += this.readEscapedChar(false);
              chunkStart = this.pos;
            } else {
              if (_whitespace.isNewLine(ch))
                this.raise(this.start, "Unterminated string constant");
              ++this.pos;
            }
          }
          out += this.input.slice(chunkStart, this.pos++);
          return this.finishToken(_tokentype.types.string, out);
        };
        pp.readTmplToken = function() {
          var out = "",
              chunkStart = this.pos;
          for (; ; ) {
            if (this.pos >= this.input.length)
              this.raise(this.start, "Unterminated template");
            var ch = this.input.charCodeAt(this.pos);
            if (ch === 96 || ch === 36 && this.input.charCodeAt(this.pos + 1) === 123) {
              if (this.pos === this.start && this.type === _tokentype.types.template) {
                if (ch === 36) {
                  this.pos += 2;
                  return this.finishToken(_tokentype.types.dollarBraceL);
                } else {
                  ++this.pos;
                  return this.finishToken(_tokentype.types.backQuote);
                }
              }
              out += this.input.slice(chunkStart, this.pos);
              return this.finishToken(_tokentype.types.template, out);
            }
            if (ch === 92) {
              out += this.input.slice(chunkStart, this.pos);
              out += this.readEscapedChar(true);
              chunkStart = this.pos;
            } else if (_whitespace.isNewLine(ch)) {
              out += this.input.slice(chunkStart, this.pos);
              ++this.pos;
              switch (ch) {
                case 13:
                  if (this.input.charCodeAt(this.pos) === 10)
                    ++this.pos;
                case 10:
                  out += "\n";
                  break;
                default:
                  out += String.fromCharCode(ch);
                  break;
              }
              if (this.options.locations) {
                ++this.curLine;
                this.lineStart = this.pos;
              }
              chunkStart = this.pos;
            } else {
              ++this.pos;
            }
          }
        };
        pp.readEscapedChar = function(inTemplate) {
          var ch = this.input.charCodeAt(++this.pos);
          ++this.pos;
          switch (ch) {
            case 110:
              return "\n";
            case 114:
              return "\r";
            case 120:
              return String.fromCharCode(this.readHexChar(2));
            case 117:
              return codePointToString(this.readCodePoint());
            case 116:
              return "\t";
            case 98:
              return "\b";
            case 118:
              return "\u000b";
            case 102:
              return "\f";
            case 13:
              if (this.input.charCodeAt(this.pos) === 10)
                ++this.pos;
            case 10:
              if (this.options.locations) {
                this.lineStart = this.pos;
                ++this.curLine;
              }
              return "";
            default:
              if (ch >= 48 && ch <= 55) {
                var octalStr = this.input.substr(this.pos - 1, 3).match(/^[0-7]+/)[0];
                var octal = parseInt(octalStr, 8);
                if (octal > 255) {
                  octalStr = octalStr.slice(0, -1);
                  octal = parseInt(octalStr, 8);
                }
                if (octalStr !== "0" && (this.strict || inTemplate)) {
                  this.raise(this.pos - 2, "Octal literal in strict mode");
                }
                this.pos += octalStr.length - 1;
                return String.fromCharCode(octal);
              }
              return String.fromCharCode(ch);
          }
        };
        pp.readHexChar = function(len) {
          var codePos = this.pos;
          var n = this.readInt(16, len);
          if (n === null)
            this.raise(codePos, "Bad character escape sequence");
          return n;
        };
        pp.readWord1 = function() {
          this.containsEsc = false;
          var word = "",
              first = true,
              chunkStart = this.pos;
          var astral = this.options.ecmaVersion >= 6;
          while (this.pos < this.input.length) {
            var ch = this.fullCharCodeAtPos();
            if (_identifier.isIdentifierChar(ch, astral)) {
              this.pos += ch <= 0xffff ? 1 : 2;
            } else if (ch === 92) {
              this.containsEsc = true;
              word += this.input.slice(chunkStart, this.pos);
              var escStart = this.pos;
              if (this.input.charCodeAt(++this.pos) != 117)
                this.raise(this.pos, "Expecting Unicode escape sequence \\uXXXX");
              ++this.pos;
              var esc = this.readCodePoint();
              if (!(first ? _identifier.isIdentifierStart : _identifier.isIdentifierChar)(esc, astral))
                this.raise(escStart, "Invalid Unicode escape");
              word += codePointToString(esc);
              chunkStart = this.pos;
            } else {
              break;
            }
            first = false;
          }
          return word + this.input.slice(chunkStart, this.pos);
        };
        pp.readWord = function() {
          var word = this.readWord1();
          var type = _tokentype.types.name;
          if ((this.options.ecmaVersion >= 6 || !this.containsEsc) && this.keywords.test(word))
            type = _tokentype.keywords[word];
          return this.finishToken(type, word);
        };
      }, {
        "./identifier": 2,
        "./locutil": 5,
        "./state": 10,
        "./tokentype": 14,
        "./whitespace": 16
      }],
      14: [function(_dereq_, module, exports) {
        "use strict";
        exports.__esModule = true;
        function _classCallCheck(instance, Constructor) {
          if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
          }
        }
        var TokenType = function TokenType(label) {
          var conf = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];
          _classCallCheck(this, TokenType);
          this.label = label;
          this.keyword = conf.keyword;
          this.beforeExpr = !!conf.beforeExpr;
          this.startsExpr = !!conf.startsExpr;
          this.isLoop = !!conf.isLoop;
          this.isAssign = !!conf.isAssign;
          this.prefix = !!conf.prefix;
          this.postfix = !!conf.postfix;
          this.binop = conf.binop || null;
          this.updateContext = null;
        };
        exports.TokenType = TokenType;
        function binop(name, prec) {
          return new TokenType(name, {
            beforeExpr: true,
            binop: prec
          });
        }
        var beforeExpr = {beforeExpr: true},
            startsExpr = {startsExpr: true};
        var types = {
          num: new TokenType("num", startsExpr),
          regexp: new TokenType("regexp", startsExpr),
          string: new TokenType("string", startsExpr),
          name: new TokenType("name", startsExpr),
          eof: new TokenType("eof"),
          bracketL: new TokenType("[", {
            beforeExpr: true,
            startsExpr: true
          }),
          bracketR: new TokenType("]"),
          braceL: new TokenType("{", {
            beforeExpr: true,
            startsExpr: true
          }),
          braceR: new TokenType("}"),
          parenL: new TokenType("(", {
            beforeExpr: true,
            startsExpr: true
          }),
          parenR: new TokenType(")"),
          comma: new TokenType(",", beforeExpr),
          semi: new TokenType(";", beforeExpr),
          colon: new TokenType(":", beforeExpr),
          dot: new TokenType("."),
          question: new TokenType("?", beforeExpr),
          arrow: new TokenType("=>", beforeExpr),
          template: new TokenType("template"),
          ellipsis: new TokenType("...", beforeExpr),
          backQuote: new TokenType("`", startsExpr),
          dollarBraceL: new TokenType("${", {
            beforeExpr: true,
            startsExpr: true
          }),
          eq: new TokenType("=", {
            beforeExpr: true,
            isAssign: true
          }),
          assign: new TokenType("_=", {
            beforeExpr: true,
            isAssign: true
          }),
          incDec: new TokenType("++/--", {
            prefix: true,
            postfix: true,
            startsExpr: true
          }),
          prefix: new TokenType("prefix", {
            beforeExpr: true,
            prefix: true,
            startsExpr: true
          }),
          logicalOR: binop("||", 1),
          logicalAND: binop("&&", 2),
          bitwiseOR: binop("|", 3),
          bitwiseXOR: binop("^", 4),
          bitwiseAND: binop("&", 5),
          equality: binop("==/!=", 6),
          relational: binop("</>", 7),
          bitShift: binop("<</>>", 8),
          plusMin: new TokenType("+/-", {
            beforeExpr: true,
            binop: 9,
            prefix: true,
            startsExpr: true
          }),
          modulo: binop("%", 10),
          star: binop("*", 10),
          slash: binop("/", 10)
        };
        exports.types = types;
        var keywords = {};
        exports.keywords = keywords;
        function kw(name) {
          var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];
          options.keyword = name;
          keywords[name] = types["_" + name] = new TokenType(name, options);
        }
        kw("break");
        kw("case", beforeExpr);
        kw("catch");
        kw("continue");
        kw("debugger");
        kw("default", beforeExpr);
        kw("do", {
          isLoop: true,
          beforeExpr: true
        });
        kw("else", beforeExpr);
        kw("finally");
        kw("for", {isLoop: true});
        kw("function", startsExpr);
        kw("if");
        kw("return", beforeExpr);
        kw("switch");
        kw("throw", beforeExpr);
        kw("try");
        kw("var");
        kw("let");
        kw("const");
        kw("while", {isLoop: true});
        kw("with");
        kw("new", {
          beforeExpr: true,
          startsExpr: true
        });
        kw("this", startsExpr);
        kw("super", startsExpr);
        kw("class");
        kw("extends", beforeExpr);
        kw("export");
        kw("import");
        kw("yield", {
          beforeExpr: true,
          startsExpr: true
        });
        kw("null", startsExpr);
        kw("true", startsExpr);
        kw("false", startsExpr);
        kw("in", {
          beforeExpr: true,
          binop: 7
        });
        kw("instanceof", {
          beforeExpr: true,
          binop: 7
        });
        kw("typeof", {
          beforeExpr: true,
          prefix: true,
          startsExpr: true
        });
        kw("void", {
          beforeExpr: true,
          prefix: true,
          startsExpr: true
        });
        kw("delete", {
          beforeExpr: true,
          prefix: true,
          startsExpr: true
        });
      }, {}],
      15: [function(_dereq_, module, exports) {
        "use strict";
        exports.__esModule = true;
        exports.isArray = isArray;
        exports.has = has;
        function isArray(obj) {
          return Object.prototype.toString.call(obj) === "[object Array]";
        }
        function has(obj, propName) {
          return Object.prototype.hasOwnProperty.call(obj, propName);
        }
      }, {}],
      16: [function(_dereq_, module, exports) {
        "use strict";
        exports.__esModule = true;
        exports.isNewLine = isNewLine;
        var lineBreak = /\r\n?|\n|\u2028|\u2029/;
        exports.lineBreak = lineBreak;
        var lineBreakG = new RegExp(lineBreak.source, "g");
        exports.lineBreakG = lineBreakG;
        function isNewLine(code) {
          return code === 10 || code === 13 || code === 0x2028 || code == 0x2029;
        }
        var nonASCIIwhitespace = /[\u1680\u180e\u2000-\u200a\u202f\u205f\u3000\ufeff]/;
        exports.nonASCIIwhitespace = nonASCIIwhitespace;
      }, {}]
    }, {}, [3])(3);
  });
})(require('process'));
