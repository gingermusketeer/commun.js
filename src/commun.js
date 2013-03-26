/*jshint evil: true*/
/*global window, history, console, alert, XMLHttpRequest, navigator, ActiveXObject, document*/
(function () {
    "use strict";

    var self = {};

    //--------------------------------IE LAMENESS------------------------------

    if (!Array.prototype.map) {
        Array.prototype.map = function (func) {
            var newArray = [];
            for (var i = this.length - 1; i >= 0; i--) {
                newArray[i] = func(this[i], i, this);
            }
            return newArray;
        };
    }

    if (!Array.prototype.lastIndexOf) {
        Array.prototype.lastIndexOf = function (needle) {
            for (var i = this.length - 1; i >= 0; i--) {
                if (this[i] === needle) {
                    return i;
                }
            }
            return -1;
        };
    }


    //--------------------------------'SANDBOX'----------------------------------

    self.execWith = function execWith(context, code, sourceUrl, module) {
        /*
            Magic code which uses with to create a sandbox and an anonymous
            function to hide the sandbox otherwise it could be referenced through
            'this'. The only variable from here that breaks through the sandbox is
            _ß_arg and it has been named such that it should not collide with the
            script. However it does not really matter if it is overridden. Require
            is also defined here so that the current path can be captured. This is
            used for resolving relative file paths etc.
        */
        var evalCode = "with(this){\n var require = function (moduleName){\n return _ß_arg.require(moduleName, _ß_arg.requireOrigin, require.cache)\n };\n return (function(){\n try{\neval(_ß_arg.source);\n} catch(e){\nthrow e;\n}\n return exports;\n }.call({}))\n }//@ sourceURL=_communjs/sandBox.js";

        // eval via function so that the current scope is not included.
        var func = new Function("_ß_arg", "exports", "module", evalCode);


        var arg = {
            source: code + '//@ sourceURL=' + sourceUrl,
            require: self.require,
            requireOrigin: sourceUrl
        };

        try {
            // Do the actual eval
            func.call(context, arg, module.exports, module);
        } catch (e) {
            e.sourceFile = sourceUrl;
            if (e.constructor === SyntaxError) {
                if (e.lineNumber) { // Change firefox lineNumber into line like safari
                    e.line = e.lineNumber;
                } else if (!e.line) {
                    // browser is not telling us where the error is so try to find it using a javascript parser
                    var parser = self.require('_communjs/parser');
                    try {
                        parser.parse(arg.source);
                    } catch (parseException) {
                        // put the line information into the original exception
                        e.line = parseException.loc.line;
                        e.column = parseException.loc.column;
                    }
                }
            }
            // tell the dev what went wrong
            // should this 'silently' fail or throw the exception??
            console.log(e);
        }
    };

    //--------------------------------AJAX---------------------------------------

    self.createXHR = function createXHR()
    /*{
        "description": "creates cross browser compliant AJAX object.",
        "returns": "An ajax object."
    }*/
    {
        var xhr;
        if (window.ActiveXObject) {
            try {
                xhr = new ActiveXObject("Microsoft.XMLHTTP");
            } catch (e) {
                alert(e.message);
                xhr = null;
            }
        } else {
            xhr = new XMLHttpRequest();
        }

        return xhr;
    };

    self.getRawCode = function getRawCode(filePath, onSuccess, onFail)
    /*{
        "description": "Get the source file as a string from the server",
        "params": [
          {
            description: "The path to the file to be retrieved.",
            exampleVal: "main.js"
          },
          {
            description: "If the file is successfully retrieved (status 200) then this callback will be called",
            exampleVal: "function(){}"
          },
          {
            description: "If the file cannot be retrieved this function will be called",
            exampleVal: "function(){}"
          }
        ]
      }*/
    {
        var xhr = self.createXHR();
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                if (xhr.status !== 200 && xhr.status !== 0) {
                    onFail(xhr);
                } else {
                    onSuccess(xhr.responseText);
                }

            }
        };
        xhr.open('GET', filePath, true);
        xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
        xhr.send();
    };

    //--------------------------------MODULE LOADER---------------------------------

    var communjsConfig = {
        defaultFileHandler: undefined,
        modules: function (modulePattern) {

            if (!(modulePattern && modulePattern.test && modulePattern.exec && (modulePattern.ignoreCase || modulePattern.ignoreCase === false))) {
                // it is a ReExp so we need to extract the source
                modulePattern = new RegExp(modulePattern);
            }



            // if the config does not exist create one
            if (!self.moduleConfigs[modulePattern]) {
                // assign the RegExp so we don't need to reconstruct it
                self.moduleConfigs[modulePattern] = { modulePattern: modulePattern };
            }



            // return the config object for the modulePattern
            return self.moduleConfigs[modulePattern];
        },
        logger: undefined,
        includeNodeModulesInSearch: false
    };

    self.moduleConfigs = {

    };
    // This is where the user modules will be cached
    self.userModuleCache = {};

    // This is where the modules provided by the browser are stored.
    self.coreModuleCache = {

        // browser modules
        window: {
            exports: window
        },
        document: {
            exports: document
        },
        navigator: {
            exports: navigator
        },
        history: {
            exports: history
        },
        console: {
            exports: console
        },

        // communjs modules
        "_communjs/parser": {
            // acorn.js see https://github.com/marijnh/acorn for license etc. Version: a8a24f538b
            rawText: "\/\/ Acorn is a tiny, fast JavaScript parser written in JavaScript.\r\n\/\/\r\n\/\/ Acorn was written by Marijn Haverbeke and released under an MIT\r\n\/\/ license. The Unicode regexps (for identifiers and whitespace) were\r\n\/\/ taken from [Esprima](http:\/\/esprima.org) by Ariya Hidayat.\r\n\/\/\r\n\/\/ Git repositories for Acorn are available at\r\n\/\/\r\n\/\/     http:\/\/marijnhaverbeke.nl\/git\/acorn\r\n\/\/     https:\/\/github.com\/marijnh\/acorn.git\r\n\/\/\r\n\/\/ Please use the [github bug tracker][ghbt] to report issues.\r\n\/\/\r\n\/\/ [ghbt]: https:\/\/github.com\/marijnh\/acorn\/issues\r\n\/\/\r\n\/\/ This file defines the main parser interface. The library also comes\r\n\/\/ with a [error-tolerant parser][dammit] and an\r\n\/\/ [abstract syntax tree walker][walk], defined in other files.\r\n\/\/\r\n\/\/ [dammit]: acorn_loose.js\r\n\/\/ [walk]: util\/walk.js\r\n\r\n(function(mod) {\r\n  if (typeof exports == \"object\" && typeof module == \"object\") return mod(exports); \/\/ CommonJS\r\n  if (typeof define == \"function\" && define.amd) return define([\"exports\"], mod); \/\/ AMD\r\n  mod(self.acorn || (self.acorn = {})); \/\/ Plain browser env\r\n})(function(exports) {\r\n  \"use strict\";\r\n\r\n  exports.version = \"0.1.01\";\r\n\r\n  \/\/ The main exported interface (under `self.acorn` when in the\r\n  \/\/ browser) is a `parse` function that takes a code string and\r\n  \/\/ returns an abstract syntax tree as specified by [Mozilla parser\r\n  \/\/ API][api], with the caveat that the SpiderMonkey-specific syntax\r\n  \/\/ (`let`, `yield`, inline XML, etc) is not recognized.\r\n  \/\/\r\n  \/\/ [api]: https:\/\/developer.mozilla.org\/en-US\/docs\/SpiderMonkey\/Parser_API\r\n\r\n  var options, input, inputLen, sourceFile;\r\n\r\n  exports.parse = function(inpt, opts) {\r\n    input = String(inpt); inputLen = input.length;\r\n    setOptions(opts);\r\n    initTokenState();\r\n    return parseTopLevel(options.program);\r\n  };\r\n\r\n  \/\/ A second optional argument can be given to further configure\r\n  \/\/ the parser process. These options are recognized:\r\n\r\n  var defaultOptions = exports.defaultOptions = {\r\n    \/\/ `ecmaVersion` indicates the ECMAScript version to parse. Must\r\n    \/\/ be either 3 or 5. This\r\n    \/\/ influences support for strict mode, the set of reserved words, and\r\n    \/\/ support for getters and setter.\r\n    ecmaVersion: 5,\r\n    \/\/ Turn on `strictSemicolons` to prevent the parser from doing\r\n    \/\/ automatic semicolon insertion.\r\n    strictSemicolons: false,\r\n    \/\/ When `allowTrailingCommas` is false, the parser will not allow\r\n    \/\/ trailing commas in array and object literals.\r\n    allowTrailingCommas: true,\r\n    \/\/ By default, reserved words are not enforced. Enable\r\n    \/\/ `forbidReserved` to enforce them.\r\n    forbidReserved: false,\r\n    \/\/ When `locations` is on, `loc` properties holding objects with\r\n    \/\/ `start` and `end` properties in `{line, column}` form (with\r\n    \/\/ line being 1-based and column 0-based) will be attached to the\r\n    \/\/ nodes.\r\n    locations: false,\r\n    \/\/ A function can be passed as `onComment` option, which will\r\n    \/\/ cause Acorn to call that function with `(block, text, start,\r\n    \/\/ end)` parameters whenever a comment is skipped. `block` is a\r\n    \/\/ boolean indicating whether this is a block (`\/* *\/`) comment,\r\n    \/\/ `text` is the content of the comment, and `start` and `end` are\r\n    \/\/ character offsets that denote the start and end of the comment.\r\n    \/\/ When the `locations` option is on, two more parameters are\r\n    \/\/ passed, the full `{line, column}` locations of the start and\r\n    \/\/ end of the comments.\r\n    onComment: null,\r\n    \/\/ Nodes have their start and end characters offsets recorded in\r\n    \/\/ `start` and `end` properties (directly on the node, rather than\r\n    \/\/ the `loc` object, which holds line\/column data. To also add a\r\n    \/\/ [semi-standardized][range] `range` property holding a `[start,\r\n    \/\/ end]` array with the same numbers, set the `ranges` option to\r\n    \/\/ `true`.\r\n    \/\/\r\n    \/\/ [range]: https:\/\/bugzilla.mozilla.org\/show_bug.cgi?id=745678\r\n    ranges: false,\r\n    \/\/ It is possible to parse multiple files into a single AST by\r\n    \/\/ passing the tree produced by parsing the first file as\r\n    \/\/ `program` option in subsequent parses. This will add the\r\n    \/\/ toplevel forms of the parsed file to the `Program` (top) node\r\n    \/\/ of an existing parse tree.\r\n    program: null,\r\n    \/\/ When `location` is on, you can pass this to record the source\r\n    \/\/ file in every node\'s `loc` object.\r\n    sourceFile: null\r\n  };\r\n\r\n  function setOptions(opts) {\r\n    options = opts || {};\r\n    for (var opt in defaultOptions) if (!options.hasOwnProperty(opt))\r\n      options[opt] = defaultOptions[opt];\r\n    sourceFile = options.sourceFile || null;\r\n  }\r\n\r\n  \/\/ The `getLineInfo` function is mostly useful when the\r\n  \/\/ `locations` option is off (for performance reasons) and you\r\n  \/\/ want to find the line\/column position for a given character\r\n  \/\/ offset. `input` should be the code string that the offset refers\r\n  \/\/ into.\r\n\r\n  var getLineInfo = exports.getLineInfo = function(input, offset) {\r\n    for (var line = 1, cur = 0;;) {\r\n      lineBreak.lastIndex = cur;\r\n      var match = lineBreak.exec(input);\r\n      if (match && match.index < offset) {\r\n        ++line;\r\n        cur = match.index + match[0].length;\r\n      } else break;\r\n    }\r\n    return {line: line, column: offset - cur};\r\n  };\r\n\r\n  \/\/ Acorn is organized as a tokenizer and a recursive-descent parser.\r\n  \/\/ The `tokenize` export provides an interface to the tokenizer.\r\n  \/\/ Because the tokenizer is optimized for being efficiently used by\r\n  \/\/ the Acorn parser itself, this interface is somewhat crude and not\r\n  \/\/ very modular. Performing another parse or call to `tokenize` will\r\n  \/\/ reset the internal state, and invalidate existing tokenizers.\r\n\r\n  exports.tokenize = function(inpt, opts) {\r\n    input = String(inpt); inputLen = input.length;\r\n    setOptions(opts);\r\n    initTokenState();\r\n\r\n    var t = {};\r\n    function getToken(forceRegexp) {\r\n      readToken(forceRegexp);\r\n      t.start = tokStart; t.end = tokEnd;\r\n      t.startLoc = tokStartLoc; t.endLoc = tokEndLoc;\r\n      t.type = tokType; t.value = tokVal;\r\n      return t;\r\n    }\r\n    getToken.jumpTo = function(pos, reAllowed) {\r\n      tokPos = pos;\r\n      if (options.locations) {\r\n        tokCurLine = tokLineStart = lineBreak.lastIndex = 0;\r\n        var match;\r\n        while ((match = lineBreak.exec(input)) && match.index < pos) {\r\n          ++tokCurLine;\r\n          tokLineStart = match.index + match[0].length;\r\n        }\r\n      }\r\n      var ch = input.charAt(pos - 1);\r\n      tokRegexpAllowed = reAllowed;\r\n      skipSpace();\r\n    };\r\n    return getToken;\r\n  };\r\n\r\n  \/\/ State is kept in (closure-)global variables. We already saw the\r\n  \/\/ `options`, `input`, and `inputLen` variables above.\r\n\r\n  \/\/ The current position of the tokenizer in the input.\r\n\r\n  var tokPos;\r\n\r\n  \/\/ The start and end offsets of the current token.\r\n\r\n  var tokStart, tokEnd;\r\n\r\n  \/\/ When `options.locations` is true, these hold objects\r\n  \/\/ containing the tokens start and end line\/column pairs.\r\n\r\n  var tokStartLoc, tokEndLoc;\r\n\r\n  \/\/ The type and value of the current token. Token types are objects,\r\n  \/\/ named by variables against which they can be compared, and\r\n  \/\/ holding properties that describe them (indicating, for example,\r\n  \/\/ the precedence of an infix operator, and the original name of a\r\n  \/\/ keyword token). The kind of value that\'s held in `tokVal` depends\r\n  \/\/ on the type of the token. For literals, it is the literal value,\r\n  \/\/ for operators, the operator name, and so on.\r\n\r\n  var tokType, tokVal;\r\n\r\n  \/\/ Interal state for the tokenizer. To distinguish between division\r\n  \/\/ operators and regular expressions, it remembers whether the last\r\n  \/\/ token was one that is allowed to be followed by an expression.\r\n  \/\/ (If it is, a slash is probably a regexp, if it isn\'t it\'s a\r\n  \/\/ division operator. See the `parseStatement` function for a\r\n  \/\/ caveat.)\r\n\r\n  var tokRegexpAllowed;\r\n\r\n  \/\/ When `options.locations` is true, these are used to keep\r\n  \/\/ track of the current line, and know when a new line has been\r\n  \/\/ entered.\r\n\r\n  var tokCurLine, tokLineStart;\r\n\r\n  \/\/ These store the position of the previous token, which is useful\r\n  \/\/ when finishing a node and assigning its `end` position.\r\n\r\n  var lastStart, lastEnd, lastEndLoc;\r\n\r\n  \/\/ This is the parser\'s state. `inFunction` is used to reject\r\n  \/\/ `return` statements outside of functions, `labels` to verify that\r\n  \/\/ `break` and `continue` have somewhere to jump to, and `strict`\r\n  \/\/ indicates whether strict mode is on.\r\n\r\n  var inFunction, labels, strict;\r\n\r\n  \/\/ This function is used to raise exceptions on parse errors. It\r\n  \/\/ takes an offset integer (into the current `input`) to indicate\r\n  \/\/ the location of the error, attaches the position to the end\r\n  \/\/ of the error message, and then raises a `SyntaxError` with that\r\n  \/\/ message.\r\n\r\n  function raise(pos, message) {\r\n    var loc = getLineInfo(input, pos);\r\n    message += \" (\" + loc.line + \":\" + loc.column + \")\";\r\n    var err = new SyntaxError(message);\r\n    err.pos = pos; err.loc = loc; err.raisedAt = tokPos;\r\n    throw err;\r\n  }\r\n\r\n  \/\/ ## Token types\r\n\r\n  \/\/ The assignment of fine-grained, information-carrying type objects\r\n  \/\/ allows the tokenizer to store the information it has about a\r\n  \/\/ token in a way that is very cheap for the parser to look up.\r\n\r\n  \/\/ All token type variables start with an underscore, to make them\r\n  \/\/ easy to recognize.\r\n\r\n  \/\/ These are the general types. The `type` property is only used to\r\n  \/\/ make them recognizeable when debugging.\r\n\r\n  var _num = {type: \"num\"}, _regexp = {type: \"regexp\"}, _string = {type: \"string\"};\r\n  var _name = {type: \"name\"}, _eof = {type: \"eof\"};\r\n\r\n  \/\/ Keyword tokens. The `keyword` property (also used in keyword-like\r\n  \/\/ operators) indicates that the token originated from an\r\n  \/\/ identifier-like word, which is used when parsing property names.\r\n  \/\/\r\n  \/\/ The `beforeExpr` property is used to disambiguate between regular\r\n  \/\/ expressions and divisions. It is set on all token types that can\r\n  \/\/ be followed by an expression (thus, a slash after them would be a\r\n  \/\/ regular expression).\r\n  \/\/\r\n  \/\/ `isLoop` marks a keyword as starting a loop, which is important\r\n  \/\/ to know when parsing a label, in order to allow or disallow\r\n  \/\/ continue jumps to that label.\r\n\r\n  var _break = {keyword: \"break\"}, _case = {keyword: \"case\", beforeExpr: true}, _catch = {keyword: \"catch\"};\r\n  var _continue = {keyword: \"continue\"}, _debugger = {keyword: \"debugger\"}, _default = {keyword: \"default\"};\r\n  var _do = {keyword: \"do\", isLoop: true}, _else = {keyword: \"else\", beforeExpr: true};\r\n  var _finally = {keyword: \"finally\"}, _for = {keyword: \"for\", isLoop: true}, _function = {keyword: \"function\"};\r\n  var _if = {keyword: \"if\"}, _return = {keyword: \"return\", beforeExpr: true}, _switch = {keyword: \"switch\"};\r\n  var _throw = {keyword: \"throw\", beforeExpr: true}, _try = {keyword: \"try\"}, _var = {keyword: \"var\"};\r\n  var _while = {keyword: \"while\", isLoop: true}, _with = {keyword: \"with\"}, _new = {keyword: \"new\", beforeExpr: true};\r\n  var _this = {keyword: \"this\"};\r\n\r\n  \/\/ The keywords that denote values.\r\n\r\n  var _null = {keyword: \"null\", atomValue: null}, _true = {keyword: \"true\", atomValue: true};\r\n  var _false = {keyword: \"false\", atomValue: false};\r\n\r\n  \/\/ Some keywords are treated as regular operators. `in` sometimes\r\n  \/\/ (when parsing `for`) needs to be tested against specifically, so\r\n  \/\/ we assign a variable name to it for quick comparing.\r\n\r\n  var _in = {keyword: \"in\", binop: 7, beforeExpr: true};\r\n\r\n  \/\/ Map keyword names to token types.\r\n\r\n  var keywordTypes = {\"break\": _break, \"case\": _case, \"catch\": _catch,\r\n                      \"continue\": _continue, \"debugger\": _debugger, \"default\": _default,\r\n                      \"do\": _do, \"else\": _else, \"finally\": _finally, \"for\": _for,\r\n                      \"function\": _function, \"if\": _if, \"return\": _return, \"switch\": _switch,\r\n                      \"throw\": _throw, \"try\": _try, \"var\": _var, \"while\": _while, \"with\": _with,\r\n                      \"null\": _null, \"true\": _true, \"false\": _false, \"new\": _new, \"in\": _in,\r\n                      \"instanceof\": {keyword: \"instanceof\", binop: 7, beforeExpr: true}, \"this\": _this,\r\n                      \"typeof\": {keyword: \"typeof\", prefix: true, beforeExpr: true},\r\n                      \"void\": {keyword: \"void\", prefix: true, beforeExpr: true},\r\n                      \"delete\": {keyword: \"delete\", prefix: true, beforeExpr: true}};\r\n\r\n  \/\/ Punctuation token types. Again, the `type` property is purely for debugging.\r\n\r\n  var _bracketL = {type: \"[\", beforeExpr: true}, _bracketR = {type: \"]\"}, _braceL = {type: \"{\", beforeExpr: true};\r\n  var _braceR = {type: \"}\"}, _parenL = {type: \"(\", beforeExpr: true}, _parenR = {type: \")\"};\r\n  var _comma = {type: \",\", beforeExpr: true}, _semi = {type: \";\", beforeExpr: true};\r\n  var _colon = {type: \":\", beforeExpr: true}, _dot = {type: \".\"}, _question = {type: \"?\", beforeExpr: true};\r\n\r\n  \/\/ Operators. These carry several kinds of properties to help the\r\n  \/\/ parser use them properly (the presence of these properties is\r\n  \/\/ what categorizes them as operators).\r\n  \/\/\r\n  \/\/ `binop`, when present, specifies that this operator is a binary\r\n  \/\/ operator, and will refer to its precedence.\r\n  \/\/\r\n  \/\/ `prefix` and `postfix` mark the operator as a prefix or postfix\r\n  \/\/ unary operator. `isUpdate` specifies that the node produced by\r\n  \/\/ the operator should be of type UpdateExpression rather than\r\n  \/\/ simply UnaryExpression (`++` and `--`).\r\n  \/\/\r\n  \/\/ `isAssign` marks all of `=`, `+=`, `-=` etcetera, which act as\r\n  \/\/ binary operators with a very low precedence, that should result\r\n  \/\/ in AssignmentExpression nodes.\r\n\r\n  var _slash = {binop: 10, beforeExpr: true}, _eq = {isAssign: true, beforeExpr: true};\r\n  var _assign = {isAssign: true, beforeExpr: true}, _plusmin = {binop: 9, prefix: true, beforeExpr: true};\r\n  var _incdec = {postfix: true, prefix: true, isUpdate: true}, _prefix = {prefix: true, beforeExpr: true};\r\n  var _bin1 = {binop: 1, beforeExpr: true}, _bin2 = {binop: 2, beforeExpr: true};\r\n  var _bin3 = {binop: 3, beforeExpr: true}, _bin4 = {binop: 4, beforeExpr: true};\r\n  var _bin5 = {binop: 5, beforeExpr: true}, _bin6 = {binop: 6, beforeExpr: true};\r\n  var _bin7 = {binop: 7, beforeExpr: true}, _bin8 = {binop: 8, beforeExpr: true};\r\n  var _bin10 = {binop: 10, beforeExpr: true};\r\n\r\n  \/\/ Provide access to the token types for external users of the\r\n  \/\/ tokenizer.\r\n\r\n  exports.tokTypes = {bracketL: _bracketL, bracketR: _bracketR, braceL: _braceL, braceR: _braceR,\r\n                      parenL: _parenL, parenR: _parenR, comma: _comma, semi: _semi, colon: _colon,\r\n                      dot: _dot, question: _question, slash: _slash, eq: _eq, name: _name, eof: _eof,\r\n                      num: _num, regexp: _regexp, string: _string};\r\n  for (var kw in keywordTypes) exports.tokTypes[kw] = keywordTypes[kw];\r\n\r\n  \/\/ This is a trick taken from Esprima. It turns out that, on\r\n  \/\/ non-Chrome browsers, to check whether a string is in a set, a\r\n  \/\/ predicate containing a big ugly `switch` statement is faster than\r\n  \/\/ a regular expression, and on Chrome the two are about on par.\r\n  \/\/ This function uses `eval` (non-lexical) to produce such a\r\n  \/\/ predicate from a space-separated string of words.\r\n  \/\/\r\n  \/\/ It starts by sorting the words by length.\r\n\r\n  function makePredicate(words) {\r\n    words = words.split(\" \");\r\n    var f = \"\", cats = [];\r\n    out: for (var i = 0; i < words.length; ++i) {\r\n      for (var j = 0; j < cats.length; ++j)\r\n        if (cats[j][0].length == words[i].length) {\r\n          cats[j].push(words[i]);\r\n          continue out;\r\n        }\r\n      cats.push([words[i]]);\r\n    }\r\n    function compareTo(arr) {\r\n      if (arr.length == 1) return f += \"return str === \" + JSON.stringify(arr[0]) + \";\";\r\n      f += \"switch(str){\";\r\n      for (var i = 0; i < arr.length; ++i) f += \"case \" + JSON.stringify(arr[i]) + \":\";\r\n      f += \"return true}return false;\";\r\n    }\r\n\r\n    \/\/ When there are more than three length categories, an outer\r\n    \/\/ switch first dispatches on the lengths, to save on comparisons.\r\n\r\n    if (cats.length > 3) {\r\n      cats.sort(function(a, b) {return b.length - a.length;});\r\n      f += \"switch(str.length){\";\r\n      for (var i = 0; i < cats.length; ++i) {\r\n        var cat = cats[i];\r\n        f += \"case \" + cat[0].length + \":\";\r\n        compareTo(cat);\r\n      }\r\n      f += \"}\";\r\n\r\n    \/\/ Otherwise, simply generate a flat `switch` statement.\r\n\r\n    } else {\r\n      compareTo(words);\r\n    }\r\n    return new Function(\"str\", f);\r\n  }\r\n\r\n  \/\/ The ECMAScript 3 reserved word list.\r\n\r\n  var isReservedWord3 = makePredicate(\"abstract boolean byte char class double enum export extends final float goto implements import int interface long native package private protected public short static super synchronized throws transient volatile\");\r\n\r\n  \/\/ ECMAScript 5 reserved words.\r\n\r\n  var isReservedWord5 = makePredicate(\"class enum extends super const export import\");\r\n\r\n  \/\/ The additional reserved words in strict mode.\r\n\r\n  var isStrictReservedWord = makePredicate(\"implements interface let package private protected public static yield\");\r\n\r\n  \/\/ The forbidden variable names in strict mode.\r\n\r\n  var isStrictBadIdWord = makePredicate(\"eval arguments\");\r\n\r\n  \/\/ And the keywords.\r\n\r\n  var isKeyword = makePredicate(\"break case catch continue debugger default do else finally for function if return switch throw try var while with null true false instanceof typeof void delete new in this\");\r\n\r\n  \/\/ ## Character categories\r\n\r\n  \/\/ Big ugly regular expressions that match characters in the\r\n  \/\/ whitespace, identifier, and identifier-start categories. These\r\n  \/\/ are only applied when a character is found to actually have a\r\n  \/\/ code point above 128.\r\n\r\n  var nonASCIIwhitespace = \/[\\u1680\\u180e\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000\\ufeff]\/;\r\n  var nonASCIIidentifierStartChars = \"\\xaa\\xb5\\xba\\xc0-\\xd6\\xd8-\\xf6\\xf8-\\u02c1\\u02c6-\\u02d1\\u02e0-\\u02e4\\u02ec\\u02ee\\u0370-\\u0374\\u0376\\u0377\\u037a-\\u037d\\u0386\\u0388-\\u038a\\u038c\\u038e-\\u03a1\\u03a3-\\u03f5\\u03f7-\\u0481\\u048a-\\u0527\\u0531-\\u0556\\u0559\\u0561-\\u0587\\u05d0-\\u05ea\\u05f0-\\u05f2\\u0620-\\u064a\\u066e\\u066f\\u0671-\\u06d3\\u06d5\\u06e5\\u06e6\\u06ee\\u06ef\\u06fa-\\u06fc\\u06ff\\u0710\\u0712-\\u072f\\u074d-\\u07a5\\u07b1\\u07ca-\\u07ea\\u07f4\\u07f5\\u07fa\\u0800-\\u0815\\u081a\\u0824\\u0828\\u0840-\\u0858\\u08a0\\u08a2-\\u08ac\\u0904-\\u0939\\u093d\\u0950\\u0958-\\u0961\\u0971-\\u0977\\u0979-\\u097f\\u0985-\\u098c\\u098f\\u0990\\u0993-\\u09a8\\u09aa-\\u09b0\\u09b2\\u09b6-\\u09b9\\u09bd\\u09ce\\u09dc\\u09dd\\u09df-\\u09e1\\u09f0\\u09f1\\u0a05-\\u0a0a\\u0a0f\\u0a10\\u0a13-\\u0a28\\u0a2a-\\u0a30\\u0a32\\u0a33\\u0a35\\u0a36\\u0a38\\u0a39\\u0a59-\\u0a5c\\u0a5e\\u0a72-\\u0a74\\u0a85-\\u0a8d\\u0a8f-\\u0a91\\u0a93-\\u0aa8\\u0aaa-\\u0ab0\\u0ab2\\u0ab3\\u0ab5-\\u0ab9\\u0abd\\u0ad0\\u0ae0\\u0ae1\\u0b05-\\u0b0c\\u0b0f\\u0b10\\u0b13-\\u0b28\\u0b2a-\\u0b30\\u0b32\\u0b33\\u0b35-\\u0b39\\u0b3d\\u0b5c\\u0b5d\\u0b5f-\\u0b61\\u0b71\\u0b83\\u0b85-\\u0b8a\\u0b8e-\\u0b90\\u0b92-\\u0b95\\u0b99\\u0b9a\\u0b9c\\u0b9e\\u0b9f\\u0ba3\\u0ba4\\u0ba8-\\u0baa\\u0bae-\\u0bb9\\u0bd0\\u0c05-\\u0c0c\\u0c0e-\\u0c10\\u0c12-\\u0c28\\u0c2a-\\u0c33\\u0c35-\\u0c39\\u0c3d\\u0c58\\u0c59\\u0c60\\u0c61\\u0c85-\\u0c8c\\u0c8e-\\u0c90\\u0c92-\\u0ca8\\u0caa-\\u0cb3\\u0cb5-\\u0cb9\\u0cbd\\u0cde\\u0ce0\\u0ce1\\u0cf1\\u0cf2\\u0d05-\\u0d0c\\u0d0e-\\u0d10\\u0d12-\\u0d3a\\u0d3d\\u0d4e\\u0d60\\u0d61\\u0d7a-\\u0d7f\\u0d85-\\u0d96\\u0d9a-\\u0db1\\u0db3-\\u0dbb\\u0dbd\\u0dc0-\\u0dc6\\u0e01-\\u0e30\\u0e32\\u0e33\\u0e40-\\u0e46\\u0e81\\u0e82\\u0e84\\u0e87\\u0e88\\u0e8a\\u0e8d\\u0e94-\\u0e97\\u0e99-\\u0e9f\\u0ea1-\\u0ea3\\u0ea5\\u0ea7\\u0eaa\\u0eab\\u0ead-\\u0eb0\\u0eb2\\u0eb3\\u0ebd\\u0ec0-\\u0ec4\\u0ec6\\u0edc-\\u0edf\\u0f00\\u0f40-\\u0f47\\u0f49-\\u0f6c\\u0f88-\\u0f8c\\u1000-\\u102a\\u103f\\u1050-\\u1055\\u105a-\\u105d\\u1061\\u1065\\u1066\\u106e-\\u1070\\u1075-\\u1081\\u108e\\u10a0-\\u10c5\\u10c7\\u10cd\\u10d0-\\u10fa\\u10fc-\\u1248\\u124a-\\u124d\\u1250-\\u1256\\u1258\\u125a-\\u125d\\u1260-\\u1288\\u128a-\\u128d\\u1290-\\u12b0\\u12b2-\\u12b5\\u12b8-\\u12be\\u12c0\\u12c2-\\u12c5\\u12c8-\\u12d6\\u12d8-\\u1310\\u1312-\\u1315\\u1318-\\u135a\\u1380-\\u138f\\u13a0-\\u13f4\\u1401-\\u166c\\u166f-\\u167f\\u1681-\\u169a\\u16a0-\\u16ea\\u16ee-\\u16f0\\u1700-\\u170c\\u170e-\\u1711\\u1720-\\u1731\\u1740-\\u1751\\u1760-\\u176c\\u176e-\\u1770\\u1780-\\u17b3\\u17d7\\u17dc\\u1820-\\u1877\\u1880-\\u18a8\\u18aa\\u18b0-\\u18f5\\u1900-\\u191c\\u1950-\\u196d\\u1970-\\u1974\\u1980-\\u19ab\\u19c1-\\u19c7\\u1a00-\\u1a16\\u1a20-\\u1a54\\u1aa7\\u1b05-\\u1b33\\u1b45-\\u1b4b\\u1b83-\\u1ba0\\u1bae\\u1baf\\u1bba-\\u1be5\\u1c00-\\u1c23\\u1c4d-\\u1c4f\\u1c5a-\\u1c7d\\u1ce9-\\u1cec\\u1cee-\\u1cf1\\u1cf5\\u1cf6\\u1d00-\\u1dbf\\u1e00-\\u1f15\\u1f18-\\u1f1d\\u1f20-\\u1f45\\u1f48-\\u1f4d\\u1f50-\\u1f57\\u1f59\\u1f5b\\u1f5d\\u1f5f-\\u1f7d\\u1f80-\\u1fb4\\u1fb6-\\u1fbc\\u1fbe\\u1fc2-\\u1fc4\\u1fc6-\\u1fcc\\u1fd0-\\u1fd3\\u1fd6-\\u1fdb\\u1fe0-\\u1fec\\u1ff2-\\u1ff4\\u1ff6-\\u1ffc\\u2071\\u207f\\u2090-\\u209c\\u2102\\u2107\\u210a-\\u2113\\u2115\\u2119-\\u211d\\u2124\\u2126\\u2128\\u212a-\\u212d\\u212f-\\u2139\\u213c-\\u213f\\u2145-\\u2149\\u214e\\u2160-\\u2188\\u2c00-\\u2c2e\\u2c30-\\u2c5e\\u2c60-\\u2ce4\\u2ceb-\\u2cee\\u2cf2\\u2cf3\\u2d00-\\u2d25\\u2d27\\u2d2d\\u2d30-\\u2d67\\u2d6f\\u2d80-\\u2d96\\u2da0-\\u2da6\\u2da8-\\u2dae\\u2db0-\\u2db6\\u2db8-\\u2dbe\\u2dc0-\\u2dc6\\u2dc8-\\u2dce\\u2dd0-\\u2dd6\\u2dd8-\\u2dde\\u2e2f\\u3005-\\u3007\\u3021-\\u3029\\u3031-\\u3035\\u3038-\\u303c\\u3041-\\u3096\\u309d-\\u309f\\u30a1-\\u30fa\\u30fc-\\u30ff\\u3105-\\u312d\\u3131-\\u318e\\u31a0-\\u31ba\\u31f0-\\u31ff\\u3400-\\u4db5\\u4e00-\\u9fcc\\ua000-\\ua48c\\ua4d0-\\ua4fd\\ua500-\\ua60c\\ua610-\\ua61f\\ua62a\\ua62b\\ua640-\\ua66e\\ua67f-\\ua697\\ua6a0-\\ua6ef\\ua717-\\ua71f\\ua722-\\ua788\\ua78b-\\ua78e\\ua790-\\ua793\\ua7a0-\\ua7aa\\ua7f8-\\ua801\\ua803-\\ua805\\ua807-\\ua80a\\ua80c-\\ua822\\ua840-\\ua873\\ua882-\\ua8b3\\ua8f2-\\ua8f7\\ua8fb\\ua90a-\\ua925\\ua930-\\ua946\\ua960-\\ua97c\\ua984-\\ua9b2\\ua9cf\\uaa00-\\uaa28\\uaa40-\\uaa42\\uaa44-\\uaa4b\\uaa60-\\uaa76\\uaa7a\\uaa80-\\uaaaf\\uaab1\\uaab5\\uaab6\\uaab9-\\uaabd\\uaac0\\uaac2\\uaadb-\\uaadd\\uaae0-\\uaaea\\uaaf2-\\uaaf4\\uab01-\\uab06\\uab09-\\uab0e\\uab11-\\uab16\\uab20-\\uab26\\uab28-\\uab2e\\uabc0-\\uabe2\\uac00-\\ud7a3\\ud7b0-\\ud7c6\\ud7cb-\\ud7fb\\uf900-\\ufa6d\\ufa70-\\ufad9\\ufb00-\\ufb06\\ufb13-\\ufb17\\ufb1d\\ufb1f-\\ufb28\\ufb2a-\\ufb36\\ufb38-\\ufb3c\\ufb3e\\ufb40\\ufb41\\ufb43\\ufb44\\ufb46-\\ufbb1\\ufbd3-\\ufd3d\\ufd50-\\ufd8f\\ufd92-\\ufdc7\\ufdf0-\\ufdfb\\ufe70-\\ufe74\\ufe76-\\ufefc\\uff21-\\uff3a\\uff41-\\uff5a\\uff66-\\uffbe\\uffc2-\\uffc7\\uffca-\\uffcf\\uffd2-\\uffd7\\uffda-\\uffdc\";\r\n  var nonASCIIidentifierChars = \"\\u0371-\\u0374\\u0483-\\u0487\\u0591-\\u05bd\\u05bf\\u05c1\\u05c2\\u05c4\\u05c5\\u05c7\\u0610-\\u061a\\u0620-\\u0649\\u0672-\\u06d3\\u06e7-\\u06e8\\u06fb-\\u06fc\\u0730-\\u074a\\u0800-\\u0814\\u081b-\\u0823\\u0825-\\u0827\\u0829-\\u082d\\u0840-\\u0857\\u08e4-\\u08fe\\u0900-\\u0903\\u093a-\\u093c\\u093e-\\u094f\\u0951-\\u0957\\u0962-\\u0963\\u0966-\\u096f\\u0981-\\u0983\\u09bc\\u09be-\\u09c4\\u09c7\\u09c8\\u09d7\\u09df-\\u09e0\\u0a01-\\u0a03\\u0a3c\\u0a3e-\\u0a42\\u0a47\\u0a48\\u0a4b-\\u0a4d\\u0a51\\u0a66-\\u0a71\\u0a75\\u0a81-\\u0a83\\u0abc\\u0abe-\\u0ac5\\u0ac7-\\u0ac9\\u0acb-\\u0acd\\u0ae2-\\u0ae3\\u0ae6-\\u0aef\\u0b01-\\u0b03\\u0b3c\\u0b3e-\\u0b44\\u0b47\\u0b48\\u0b4b-\\u0b4d\\u0b56\\u0b57\\u0b5f-\\u0b60\\u0b66-\\u0b6f\\u0b82\\u0bbe-\\u0bc2\\u0bc6-\\u0bc8\\u0bca-\\u0bcd\\u0bd7\\u0be6-\\u0bef\\u0c01-\\u0c03\\u0c46-\\u0c48\\u0c4a-\\u0c4d\\u0c55\\u0c56\\u0c62-\\u0c63\\u0c66-\\u0c6f\\u0c82\\u0c83\\u0cbc\\u0cbe-\\u0cc4\\u0cc6-\\u0cc8\\u0cca-\\u0ccd\\u0cd5\\u0cd6\\u0ce2-\\u0ce3\\u0ce6-\\u0cef\\u0d02\\u0d03\\u0d46-\\u0d48\\u0d57\\u0d62-\\u0d63\\u0d66-\\u0d6f\\u0d82\\u0d83\\u0dca\\u0dcf-\\u0dd4\\u0dd6\\u0dd8-\\u0ddf\\u0df2\\u0df3\\u0e34-\\u0e3a\\u0e40-\\u0e45\\u0e50-\\u0e59\\u0eb4-\\u0eb9\\u0ec8-\\u0ecd\\u0ed0-\\u0ed9\\u0f18\\u0f19\\u0f20-\\u0f29\\u0f35\\u0f37\\u0f39\\u0f41-\\u0f47\\u0f71-\\u0f84\\u0f86-\\u0f87\\u0f8d-\\u0f97\\u0f99-\\u0fbc\\u0fc6\\u1000-\\u1029\\u1040-\\u1049\\u1067-\\u106d\\u1071-\\u1074\\u1082-\\u108d\\u108f-\\u109d\\u135d-\\u135f\\u170e-\\u1710\\u1720-\\u1730\\u1740-\\u1750\\u1772\\u1773\\u1780-\\u17b2\\u17dd\\u17e0-\\u17e9\\u180b-\\u180d\\u1810-\\u1819\\u1920-\\u192b\\u1930-\\u193b\\u1951-\\u196d\\u19b0-\\u19c0\\u19c8-\\u19c9\\u19d0-\\u19d9\\u1a00-\\u1a15\\u1a20-\\u1a53\\u1a60-\\u1a7c\\u1a7f-\\u1a89\\u1a90-\\u1a99\\u1b46-\\u1b4b\\u1b50-\\u1b59\\u1b6b-\\u1b73\\u1bb0-\\u1bb9\\u1be6-\\u1bf3\\u1c00-\\u1c22\\u1c40-\\u1c49\\u1c5b-\\u1c7d\\u1cd0-\\u1cd2\\u1d00-\\u1dbe\\u1e01-\\u1f15\\u200c\\u200d\\u203f\\u2040\\u2054\\u20d0-\\u20dc\\u20e1\\u20e5-\\u20f0\\u2d81-\\u2d96\\u2de0-\\u2dff\\u3021-\\u3028\\u3099\\u309a\\ua640-\\ua66d\\ua674-\\ua67d\\ua69f\\ua6f0-\\ua6f1\\ua7f8-\\ua800\\ua806\\ua80b\\ua823-\\ua827\\ua880-\\ua881\\ua8b4-\\ua8c4\\ua8d0-\\ua8d9\\ua8f3-\\ua8f7\\ua900-\\ua909\\ua926-\\ua92d\\ua930-\\ua945\\ua980-\\ua983\\ua9b3-\\ua9c0\\uaa00-\\uaa27\\uaa40-\\uaa41\\uaa4c-\\uaa4d\\uaa50-\\uaa59\\uaa7b\\uaae0-\\uaae9\\uaaf2-\\uaaf3\\uabc0-\\uabe1\\uabec\\uabed\\uabf0-\\uabf9\\ufb20-\\ufb28\\ufe00-\\ufe0f\\ufe20-\\ufe26\\ufe33\\ufe34\\ufe4d-\\ufe4f\\uff10-\\uff19\\uff3f\";\r\n  var nonASCIIidentifierStart = new RegExp(\"[\" + nonASCIIidentifierStartChars + \"]\");\r\n  var nonASCIIidentifier = new RegExp(\"[\" + nonASCIIidentifierStartChars + nonASCIIidentifierChars + \"]\");\r\n\r\n  \/\/ Whether a single character denotes a newline.\r\n\r\n  var newline = \/[\\n\\r\\u2028\\u2029]\/;\r\n\r\n  \/\/ Matches a whole line break (where CRLF is considered a single\r\n  \/\/ line break). Used to count lines.\r\n\r\n  var lineBreak = \/\\r\\n|[\\n\\r\\u2028\\u2029]\/g;\r\n\r\n  \/\/ Test whether a given character code starts an identifier.\r\n\r\n  function isIdentifierStart(code) {\r\n    if (code < 65) return code === 36;\r\n    if (code < 91) return true;\r\n    if (code < 97) return code === 95;\r\n    if (code < 123)return true;\r\n    return code >= 0xaa && nonASCIIidentifierStart.test(String.fromCharCode(code));\r\n  }\r\n\r\n  \/\/ Test whether a given character is part of an identifier.\r\n\r\n  function isIdentifierChar(code) {\r\n    if (code < 48) return code === 36;\r\n    if (code < 58) return true;\r\n    if (code < 65) return false;\r\n    if (code < 91) return true;\r\n    if (code < 97) return code === 95;\r\n    if (code < 123)return true;\r\n    return code >= 0xaa && nonASCIIidentifier.test(String.fromCharCode(code));\r\n  }\r\n\r\n  \/\/ ## Tokenizer\r\n\r\n  \/\/ These are used when `options.locations` is on, for the\r\n  \/\/ `tokStartLoc` and `tokEndLoc` properties.\r\n\r\n  function line_loc_t() {\r\n    this.line = tokCurLine;\r\n    this.column = tokPos - tokLineStart;\r\n  }\r\n\r\n  \/\/ Reset the token state. Used at the start of a parse.\r\n\r\n  function initTokenState() {\r\n    tokCurLine = 1;\r\n    tokPos = tokLineStart = 0;\r\n    tokRegexpAllowed = true;\r\n    skipSpace();\r\n  }\r\n\r\n  \/\/ Called at the end of every token. Sets `tokEnd`, `tokVal`, and\r\n  \/\/ `tokRegexpAllowed`, and skips the space after the token, so that\r\n  \/\/ the next one\'s `tokStart` will point at the right position.\r\n\r\n  function finishToken(type, val) {\r\n    tokEnd = tokPos;\r\n    if (options.locations) tokEndLoc = new line_loc_t;\r\n    tokType = type;\r\n    skipSpace();\r\n    tokVal = val;\r\n    tokRegexpAllowed = type.beforeExpr;\r\n  }\r\n\r\n  function skipBlockComment() {\r\n    var startLoc = options.onComment && options.locations && new line_loc_t;\r\n    var start = tokPos, end = input.indexOf(\"*\/\", tokPos += 2);\r\n    if (end === -1) raise(tokPos - 2, \"Unterminated comment\");\r\n    tokPos = end + 2;\r\n    if (options.locations) {\r\n      lineBreak.lastIndex = start;\r\n      var match;\r\n      while ((match = lineBreak.exec(input)) && match.index < tokPos) {\r\n        ++tokCurLine;\r\n        tokLineStart = match.index + match[0].length;\r\n      }\r\n    }\r\n    if (options.onComment)\r\n      options.onComment(true, input.slice(start + 2, end), start, tokPos,\r\n                        startLoc, options.locations && new line_loc_t);\r\n  }\r\n\r\n  function skipLineComment() {\r\n    var start = tokPos;\r\n    var startLoc = options.onComment && options.locations && new line_loc_t;\r\n    var ch = input.charCodeAt(tokPos+=2);\r\n    while (tokPos < inputLen && ch !== 10 && ch !== 13 && ch !== 8232 && ch !== 8329) {\r\n      ++tokPos;\r\n      ch = input.charCodeAt(tokPos);\r\n    }\r\n    if (options.onComment)\r\n      options.onComment(false, input.slice(start + 2, tokPos), start, tokPos,\r\n                        startLoc, options.locations && new line_loc_t);\r\n  }\r\n\r\n  \/\/ Called at the start of the parse and after every token. Skips\r\n  \/\/ whitespace and comments, and.\r\n\r\n  function skipSpace() {\r\n    while (tokPos < inputLen) {\r\n      var ch = input.charCodeAt(tokPos);\r\n      if (ch === 32) { \/\/ \' \'\r\n        ++tokPos;\r\n      } else if(ch === 13) {\r\n        ++tokPos;\r\n        var next = input.charCodeAt(tokPos);\r\n        if(next === 10) {\r\n          ++tokPos;\r\n        }\r\n        if(options.locations) {\r\n          ++tokCurLine;\r\n          tokLineStart = tokPos;\r\n        }\r\n      } else if (ch === 10) {\r\n        ++tokPos;\r\n        ++tokCurLine;\r\n        tokLineStart = tokPos;\r\n      } else if(ch < 14 && ch > 8) {\r\n        ++tokPos;\r\n      } else if (ch === 47) { \/\/ \'\/\'\r\n        var next = input.charCodeAt(tokPos+1);\r\n        if (next === 42) { \/\/ \'*\'\r\n          skipBlockComment();\r\n        } else if (next === 47) { \/\/ \'\/\'\r\n          skipLineComment();\r\n        } else break;\r\n      } else if ((ch < 14 && ch > 8) || ch === 32 || ch === 160) { \/\/ \' \', \'\\xa0\'\r\n        ++tokPos;\r\n      } else if (ch >= 5760 && nonASCIIwhitespace.test(String.fromCharCode(ch))) {\r\n        ++tokPos;\r\n      } else {\r\n        break;\r\n      }\r\n    }\r\n  }\r\n\r\n  \/\/ ### Token reading\r\n\r\n  \/\/ This is the function that is called to fetch the next token. It\r\n  \/\/ is somewhat obscure, because it works in character codes rather\r\n  \/\/ than characters, and because operator parsing has been inlined\r\n  \/\/ into it.\r\n  \/\/\r\n  \/\/ All in the name of speed.\r\n  \/\/\r\n  \/\/ The `forceRegexp` parameter is used in the one case where the\r\n  \/\/ `tokRegexpAllowed` trick does not work. See `parseStatement`.\r\n\r\n  function readToken_dot() {\r\n    var next = input.charCodeAt(tokPos+1);\r\n    if (next >= 48 && next <= 57) return readNumber(true);\r\n    ++tokPos;\r\n    return finishToken(_dot);\r\n  }\r\n\r\n  function readToken_slash() { \/\/ \'\/\'\r\n    var next = input.charCodeAt(tokPos+1);\r\n    if (tokRegexpAllowed) {++tokPos; return readRegexp();}\r\n    if (next === 61) return finishOp(_assign, 2);\r\n    return finishOp(_slash, 1);\r\n  }\r\n\r\n  function readToken_mult_modulo() { \/\/ \'%*\'\r\n    var next = input.charCodeAt(tokPos+1);\r\n    if (next === 61) return finishOp(_assign, 2);\r\n    return finishOp(_bin10, 1);\r\n  }\r\n\r\n  function readToken_pipe_amp(code) { \/\/ \'|&\'\r\n    var next = input.charCodeAt(tokPos+1);\r\n    if (next === code) return finishOp(code === 124 ? _bin1 : _bin2, 2);\r\n    if (next === 61) return finishOp(_assign, 2);\r\n    return finishOp(code === 124 ? _bin3 : _bin5, 1);\r\n  }\r\n\r\n  function readToken_caret() { \/\/ \'^\'\r\n    var next = input.charCodeAt(tokPos+1);\r\n    if (next === 61) return finishOp(_assign, 2);\r\n    return finishOp(_bin4, 1);\r\n  }\r\n\r\n  function readToken_plus_min(code) { \/\/ \'+-\'\r\n    var next = input.charCodeAt(tokPos+1);\r\n    if (next === code) return finishOp(_incdec, 2);\r\n    if (next === 61) return finishOp(_assign, 2);\r\n    return finishOp(_plusmin, 1);\r\n  }\r\n\r\n  function readToken_lt_gt(code) { \/\/ \'<>\'\r\n    var next = input.charCodeAt(tokPos+1);\r\n    var size = 1;\r\n    if (next === code) {\r\n      size = code === 62 && input.charCodeAt(tokPos+2) === 62 ? 3 : 2;\r\n      if (input.charCodeAt(tokPos + size) === 61) return finishOp(_assign, size + 1);\r\n      return finishOp(_bin8, size);\r\n    }\r\n    if (next === 61)\r\n      size = input.charCodeAt(tokPos+2) === 61 ? 3 : 2;\r\n    return finishOp(_bin7, size);\r\n  }\r\n\r\n  function readToken_eq_excl(code) { \/\/ \'=!\'\r\n    var next = input.charCodeAt(tokPos+1);\r\n    if (next === 61) return finishOp(_bin6, input.charCodeAt(tokPos+2) === 61 ? 3 : 2);\r\n    return finishOp(code === 61 ? _eq : _prefix, 1);\r\n  }\r\n\r\n  function getTokenFromCode(code) {\r\n    switch(code) {\r\n      \/\/ The interpretation of a dot depends on whether it is followed\r\n      \/\/ by a digit.\r\n    case 46: \/\/ \'.\'\r\n      return readToken_dot();\r\n\r\n      \/\/ Punctuation tokens.\r\n    case 40: ++tokPos; return finishToken(_parenL);\r\n    case 41: ++tokPos; return finishToken(_parenR);\r\n    case 59: ++tokPos; return finishToken(_semi);\r\n    case 44: ++tokPos; return finishToken(_comma);\r\n    case 91: ++tokPos; return finishToken(_bracketL);\r\n    case 93: ++tokPos; return finishToken(_bracketR);\r\n    case 123: ++tokPos; return finishToken(_braceL);\r\n    case 125: ++tokPos; return finishToken(_braceR);\r\n    case 58: ++tokPos; return finishToken(_colon);\r\n    case 63: ++tokPos; return finishToken(_question);\r\n\r\n      \/\/ \'0x\' is a hexadecimal number.\r\n    case 48: \/\/ \'0\'\r\n      var next = input.charCodeAt(tokPos+1);\r\n      if (next === 120 || next === 88) return readHexNumber();\r\n      \/\/ Anything else beginning with a digit is an integer, octal\r\n      \/\/ number, or float.\r\n    case 49: case 50: case 51: case 52: case 53: case 54: case 55: case 56: case 57: \/\/ 1-9\r\n      return readNumber(false);\r\n\r\n      \/\/ Quotes produce strings.\r\n    case 34: case 39: \/\/ \'\"\', \"\'\"\r\n      return readString(code);\r\n\r\n    \/\/ Operators are parsed inline in tiny state machines. \'=\' (61) is\r\n    \/\/ often referred to. `finishOp` simply skips the amount of\r\n    \/\/ characters it is given as second argument, and returns a token\r\n    \/\/ of the type given by its first argument.\r\n\r\n    case 47: \/\/ \'\/\'\r\n      return readToken_slash(code);\r\n\r\n    case 37: case 42: \/\/ \'%*\'\r\n      return readToken_mult_modulo();\r\n\r\n    case 124: case 38: \/\/ \'|&\'\r\n      return readToken_pipe_amp(code);\r\n\r\n    case 94: \/\/ \'^\'\r\n      return readToken_caret();\r\n\r\n    case 43: case 45: \/\/ \'+-\'\r\n      return readToken_plus_min(code);\r\n\r\n    case 60: case 62: \/\/ \'<>\'\r\n      return readToken_lt_gt(code);\r\n\r\n    case 61: case 33: \/\/ \'=!\'\r\n      return readToken_eq_excl(code);\r\n\r\n    case 126: \/\/ \'~\'\r\n      return finishOp(_prefix, 1);\r\n    }\r\n\r\n    return false;\r\n  }\r\n\r\n  function readToken(forceRegexp) {\r\n    if (!forceRegexp) tokStart = tokPos;\r\n    else tokPos = tokStart + 1;\r\n    if (options.locations) tokStartLoc = new line_loc_t;\r\n    if (forceRegexp) return readRegexp();\r\n    if (tokPos >= inputLen) return finishToken(_eof);\r\n\r\n    var code = input.charCodeAt(tokPos);\r\n    \/\/ Identifier or keyword. \'\\uXXXX\' sequences are allowed in\r\n    \/\/ identifiers, so \'\\\' also dispatches to that.\r\n    if (isIdentifierStart(code) || code === 92 \/* \'\\\' *\/) return readWord();\r\n\r\n    var tok = getTokenFromCode(code);\r\n\r\n    if (tok === false) {\r\n      \/\/ If we are here, we either found a non-ASCII identifier\r\n      \/\/ character, or something that\'s entirely disallowed.\r\n      var ch = String.fromCharCode(code);\r\n      if (ch === \"\\\\\" || nonASCIIidentifierStart.test(ch)) return readWord();\r\n      raise(tokPos, \"Unexpected character \'\" + ch + \"\'\");\r\n    }\r\n    return tok;\r\n  }\r\n\r\n  function finishOp(type, size) {\r\n    var str = input.slice(tokPos, tokPos + size);\r\n    tokPos += size;\r\n    finishToken(type, str);\r\n  }\r\n\r\n  \/\/ Parse a regular expression. Some context-awareness is necessary,\r\n  \/\/ since a \'\/\' inside a \'[]\' set does not end the expression.\r\n\r\n  function readRegexp() {\r\n    var content = \"\", escaped, inClass, start = tokPos;\r\n    for (;;) {\r\n      if (tokPos >= inputLen) raise(start, \"Unterminated regular expression\");\r\n      var ch = input.charAt(tokPos);\r\n      if (newline.test(ch)) raise(start, \"Unterminated regular expression\");\r\n      if (!escaped) {\r\n        if (ch === \"[\") inClass = true;\r\n        else if (ch === \"]\" && inClass) inClass = false;\r\n        else if (ch === \"\/\" && !inClass) break;\r\n        escaped = ch === \"\\\\\";\r\n      } else escaped = false;\r\n      ++tokPos;\r\n    }\r\n    var content = input.slice(start, tokPos);\r\n    ++tokPos;\r\n    \/\/ Need to use `readWord1` because \'\\uXXXX\' sequences are allowed\r\n    \/\/ here (don\'t ask).\r\n    var mods = readWord1();\r\n    if (mods && !\/^[gmsiy]*$\/.test(mods)) raise(start, \"Invalid regexp flag\");\r\n    return finishToken(_regexp, new RegExp(content, mods));\r\n  }\r\n\r\n  \/\/ Read an integer in the given radix. Return null if zero digits\r\n  \/\/ were read, the integer value otherwise. When `len` is given, this\r\n  \/\/ will return `null` unless the integer has exactly `len` digits.\r\n\r\n  function readInt(radix, len) {\r\n    var start = tokPos, total = 0;\r\n    for (var i = 0, e = len == null ? Infinity : len; i < e; ++i) {\r\n      var code = input.charCodeAt(tokPos), val;\r\n      if (code >= 97) val = code - 97 + 10; \/\/ a\r\n      else if (code >= 65) val = code - 65 + 10; \/\/ A\r\n      else if (code >= 48 && code <= 57) val = code - 48; \/\/ 0-9\r\n      else val = Infinity;\r\n      if (val >= radix) break;\r\n      ++tokPos;\r\n      total = total * radix + val;\r\n    }\r\n    if (tokPos === start || len != null && tokPos - start !== len) return null;\r\n\r\n    return total;\r\n  }\r\n\r\n  function readHexNumber() {\r\n    tokPos += 2; \/\/ 0x\r\n    var val = readInt(16);\r\n    if (val == null) raise(tokStart + 2, \"Expected hexadecimal number\");\r\n    if (isIdentifierStart(input.charCodeAt(tokPos))) raise(tokPos, \"Identifier directly after number\");\r\n    return finishToken(_num, val);\r\n  }\r\n\r\n  \/\/ Read an integer, octal integer, or floating-point number.\r\n\r\n  function readNumber(startsWithDot) {\r\n    var start = tokPos, isFloat = false, octal = input.charCodeAt(tokPos) === 48;\r\n    if (!startsWithDot && readInt(10) === null) raise(start, \"Invalid number\");\r\n    if (input.charCodeAt(tokPos) === 46) {\r\n      ++tokPos;\r\n      readInt(10);\r\n      isFloat = true;\r\n    }\r\n    var next = input.charCodeAt(tokPos);\r\n    if (next === 69 || next === 101) { \/\/ \'eE\'\r\n      next = input.charCodeAt(++tokPos);\r\n      if (next === 43 || next === 45) ++tokPos; \/\/ \'+-\'\r\n      if (readInt(10) === null) raise(start, \"Invalid number\")\r\n      isFloat = true;\r\n    }\r\n    if (isIdentifierStart(input.charCodeAt(tokPos))) raise(tokPos, \"Identifier directly after number\");\r\n\r\n    var str = input.slice(start, tokPos), val;\r\n    if (isFloat) val = parseFloat(str);\r\n    else if (!octal || str.length === 1) val = parseInt(str, 10);\r\n    else if (\/[89]\/.test(str) || strict) raise(start, \"Invalid number\");\r\n    else val = parseInt(str, 8);\r\n    return finishToken(_num, val);\r\n  }\r\n\r\n  \/\/ Read a string value, interpreting backslash-escapes.\r\n\r\n  function readString(quote) {\r\n    tokPos++;\r\n    var out = \"\";\r\n    for (;;) {\r\n      if (tokPos >= inputLen) raise(tokStart, \"Unterminated string constant\");\r\n      var ch = input.charCodeAt(tokPos);\r\n      if (ch === quote) {\r\n        ++tokPos;\r\n        return finishToken(_string, out);\r\n      }\r\n      if (ch === 92) { \/\/ \'\\\'\r\n        ch = input.charCodeAt(++tokPos);\r\n        var octal = \/^[0-7]+\/.exec(input.slice(tokPos, tokPos + 3));\r\n        if (octal) octal = octal[0];\r\n        while (octal && parseInt(octal, 8) > 255) octal = octal.slice(0, octal.length - 1);\r\n        if (octal === \"0\") octal = null;\r\n        ++tokPos;\r\n        if (octal) {\r\n          if (strict) raise(tokPos - 2, \"Octal literal in strict mode\");\r\n          out += String.fromCharCode(parseInt(octal, 8));\r\n          tokPos += octal.length - 1;\r\n        } else {\r\n          switch (ch) {\r\n          case 110: out += \"\\n\"; break; \/\/ \'n\' -> \'\\n\'\r\n          case 114: out += \"\\r\"; break; \/\/ \'r\' -> \'\\r\'\r\n          case 120: out += String.fromCharCode(readHexChar(2)); break; \/\/ \'x\'\r\n          case 117: out += String.fromCharCode(readHexChar(4)); break; \/\/ \'u\'\r\n          case 85: out += String.fromCharCode(readHexChar(8)); break; \/\/ \'U\'\r\n          case 116: out += \"\\t\"; break; \/\/ \'t\' -> \'\\t\'\r\n          case 98: out += \"\\b\"; break; \/\/ \'b\' -> \'\\b\'\r\n          case 118: out += \"\\v\"; break; \/\/ \'v\' -> \'\\u000b\'\r\n          case 102: out += \"\\f\"; break; \/\/ \'f\' -> \'\\f\'\r\n          case 48: out += \"\\0\"; break; \/\/ 0 -> \'\\0\'\r\n          case 13: if (input.charCodeAt(tokPos) === 10) ++tokPos; \/\/ \'\\r\\n\'\r\n          case 10: \/\/ \' \\n\'\r\n            if (options.locations) { tokLineStart = tokPos; ++tokCurLine; }\r\n            break;\r\n          default: out += String.fromCharCode(ch); break;\r\n          }\r\n        }\r\n      } else {\r\n        if (ch === 13 || ch === 10 || ch === 8232 || ch === 8329) raise(tokStart, \"Unterminated string constant\");\r\n        out += String.fromCharCode(ch); \/\/ \'\\\'\r\n        ++tokPos;\r\n      }\r\n    }\r\n  }\r\n\r\n  \/\/ Used to read character escape sequences (\'\\x\', \'\\u\', \'\\U\').\r\n\r\n  function readHexChar(len) {\r\n    var n = readInt(16, len);\r\n    if (n === null) raise(tokStart, \"Bad character escape sequence\");\r\n    return n;\r\n  }\r\n\r\n  \/\/ Used to signal to callers of `readWord1` whether the word\r\n  \/\/ contained any escape sequences. This is needed because words with\r\n  \/\/ escape sequences must not be interpreted as keywords.\r\n\r\n  var containsEsc;\r\n\r\n  \/\/ Read an identifier, and return it as a string. Sets `containsEsc`\r\n  \/\/ to whether the word contained a \'\\u\' escape.\r\n  \/\/\r\n  \/\/ Only builds up the word character-by-character when it actually\r\n  \/\/ containeds an escape, as a micro-optimization.\r\n\r\n  function readWord1() {\r\n    containsEsc = false;\r\n    var word, first = true, start = tokPos;\r\n    for (;;) {\r\n      var ch = input.charCodeAt(tokPos);\r\n      if (isIdentifierChar(ch)) {\r\n        if (containsEsc) word += input.charAt(tokPos);\r\n        ++tokPos;\r\n      } else if (ch === 92) { \/\/ \"\\\"\r\n        if (!containsEsc) word = input.slice(start, tokPos);\r\n        containsEsc = true;\r\n        if (input.charCodeAt(++tokPos) != 117) \/\/ \"u\"\r\n          raise(tokPos, \"Expecting Unicode escape sequence \\\\uXXXX\");\r\n        ++tokPos;\r\n        var esc = readHexChar(4);\r\n        var escStr = String.fromCharCode(esc);\r\n        if (!escStr) raise(tokPos - 1, \"Invalid Unicode escape\");\r\n        if (!(first ? isIdentifierStart(esc) : isIdentifierChar(esc)))\r\n          raise(tokPos - 4, \"Invalid Unicode escape\");\r\n        word += escStr;\r\n      } else {\r\n        break;\r\n      }\r\n      first = false;\r\n    }\r\n    return containsEsc ? word : input.slice(start, tokPos);\r\n  }\r\n\r\n  \/\/ Read an identifier or keyword token. Will check for reserved\r\n  \/\/ words when necessary.\r\n\r\n  function readWord() {\r\n    var word = readWord1();\r\n    var type = _name;\r\n    if (!containsEsc) {\r\n      if (isKeyword(word)) type = keywordTypes[word];\r\n      else if (options.forbidReserved &&\r\n               (options.ecmaVersion === 3 ? isReservedWord3 : isReservedWord5)(word) ||\r\n               strict && isStrictReservedWord(word))\r\n        raise(tokStart, \"The keyword \'\" + word + \"\' is reserved\");\r\n    }\r\n    return finishToken(type, word);\r\n  }\r\n\r\n  \/\/ ## Parser\r\n\r\n  \/\/ A recursive descent parser operates by defining functions for all\r\n  \/\/ syntactic elements, and recursively calling those, each function\r\n  \/\/ advancing the input stream and returning an AST node. Precedence\r\n  \/\/ of constructs (for example, the fact that `!x[1]` means `!(x[1])`\r\n  \/\/ instead of `(!x)[1]` is handled by the fact that the parser\r\n  \/\/ function that parses unary prefix operators is called first, and\r\n  \/\/ in turn calls the function that parses `[]` subscripts \u2014 that\r\n  \/\/ way, it\'ll receive the node for `x[1]` already parsed, and wraps\r\n  \/\/ *that* in the unary operator node.\r\n  \/\/\r\n  \/\/ Acorn uses an [operator precedence parser][opp] to handle binary\r\n  \/\/ operator precedence, because it is much more compact than using\r\n  \/\/ the technique outlined above, which uses different, nesting\r\n  \/\/ functions to specify precedence, for all of the ten binary\r\n  \/\/ precedence levels that JavaScript defines.\r\n  \/\/\r\n  \/\/ [opp]: http:\/\/en.wikipedia.org\/wiki\/Operator-precedence_parser\r\n\r\n  \/\/ ### Parser utilities\r\n\r\n  \/\/ Continue to the next token.\r\n\r\n  function next() {\r\n    lastStart = tokStart;\r\n    lastEnd = tokEnd;\r\n    lastEndLoc = tokEndLoc;\r\n    readToken();\r\n  }\r\n\r\n  \/\/ Enter strict mode. Re-reads the next token to please pedantic\r\n  \/\/ tests (\"use strict\"; 010; -- should fail).\r\n\r\n  function setStrict(strct) {\r\n    strict = strct;\r\n    tokPos = lastEnd;\r\n    skipSpace();\r\n    readToken();\r\n  }\r\n\r\n  \/\/ Start an AST node, attaching a start offset.\r\n\r\n  function node_t() {\r\n    this.type = null;\r\n    this.start = tokStart;\r\n    this.end = null;\r\n  }\r\n\r\n  function node_loc_t() {\r\n    this.start = tokStartLoc;\r\n    this.end = null;\r\n    if (sourceFile !== null) this.source = sourceFile;\r\n  }\r\n\r\n  function startNode() {\r\n    var node = new node_t();\r\n    if (options.locations)\r\n      node.loc = new node_loc_t();\r\n    if (options.ranges)\r\n      node.range = [tokStart, 0];\r\n    return node;\r\n  }\r\n\r\n  \/\/ Start a node whose start offset information should be based on\r\n  \/\/ the start of another node. For example, a binary operator node is\r\n  \/\/ only started after its left-hand side has already been parsed.\r\n\r\n  function startNodeFrom(other) {\r\n    var node = new node_t();\r\n    node.start = other.start;\r\n    if (options.locations) {\r\n      node.loc = new node_loc_t();\r\n      node.loc.start = other.loc.start;\r\n    }\r\n    if (options.ranges)\r\n      node.range = [other.range[0], 0];\r\n\r\n    return node;\r\n  }\r\n\r\n  \/\/ Finish an AST node, adding `type` and `end` properties.\r\n\r\n  function finishNode(node, type) {\r\n    node.type = type;\r\n    node.end = lastEnd;\r\n    if (options.locations)\r\n      node.loc.end = lastEndLoc;\r\n    if (options.ranges)\r\n      node.range[1] = lastEnd;\r\n    return node;\r\n  }\r\n\r\n  \/\/ Test whether a statement node is the string literal `\"use strict\"`.\r\n\r\n  function isUseStrict(stmt) {\r\n    return options.ecmaVersion >= 5 && stmt.type === \"ExpressionStatement\" &&\r\n      stmt.expression.type === \"Literal\" && stmt.expression.value === \"use strict\";\r\n  }\r\n\r\n  \/\/ Predicate that tests whether the next token is of the given\r\n  \/\/ type, and if yes, consumes it as a side effect.\r\n\r\n  function eat(type) {\r\n    if (tokType === type) {\r\n      next();\r\n      return true;\r\n    }\r\n  }\r\n\r\n  \/\/ Test whether a semicolon can be inserted at the current position.\r\n\r\n  function canInsertSemicolon() {\r\n    return !options.strictSemicolons &&\r\n      (tokType === _eof || tokType === _braceR || newline.test(input.slice(lastEnd, tokStart)));\r\n  }\r\n\r\n  \/\/ Consume a semicolon, or, failing that, see if we are allowed to\r\n  \/\/ pretend that there is a semicolon at this position.\r\n\r\n  function semicolon() {\r\n    if (!eat(_semi) && !canInsertSemicolon()) unexpected();\r\n  }\r\n\r\n  \/\/ Expect a token of a given type. If found, consume it, otherwise,\r\n  \/\/ raise an unexpected token error.\r\n\r\n  function expect(type) {\r\n    if (tokType === type) next();\r\n    else unexpected();\r\n  }\r\n\r\n  \/\/ Raise an unexpected token error.\r\n\r\n  function unexpected() {\r\n    raise(tokStart, \"Unexpected token\");\r\n  }\r\n\r\n  \/\/ Verify that a node is an lval \u2014 something that can be assigned\r\n  \/\/ to.\r\n\r\n  function checkLVal(expr) {\r\n    if (expr.type !== \"Identifier\" && expr.type !== \"MemberExpression\")\r\n      raise(expr.start, \"Assigning to rvalue\");\r\n    if (strict && expr.type === \"Identifier\" && isStrictBadIdWord(expr.name))\r\n      raise(expr.start, \"Assigning to \" + expr.name + \" in strict mode\");\r\n  }\r\n\r\n  \/\/ ### Statement parsing\r\n\r\n  \/\/ Parse a program. Initializes the parser, reads any number of\r\n  \/\/ statements, and wraps them in a Program node.  Optionally takes a\r\n  \/\/ `program` argument.  If present, the statements will be appended\r\n  \/\/ to its body instead of creating a new node.\r\n\r\n  function parseTopLevel(program) {\r\n    lastStart = lastEnd = tokPos;\r\n    if (options.locations) lastEndLoc = new line_loc_t;\r\n    inFunction = strict = null;\r\n    labels = [];\r\n    readToken();\r\n\r\n    var node = program || startNode(), first = true;\r\n    if (!program) node.body = [];\r\n    while (tokType !== _eof) {\r\n      var stmt = parseStatement();\r\n      node.body.push(stmt);\r\n      if (first && isUseStrict(stmt)) setStrict(true);\r\n      first = false;\r\n    }\r\n    return finishNode(node, \"Program\");\r\n  }\r\n\r\n  var loopLabel = {kind: \"loop\"}, switchLabel = {kind: \"switch\"};\r\n\r\n  \/\/ Parse a single statement.\r\n  \/\/\r\n  \/\/ If expecting a statement and finding a slash operator, parse a\r\n  \/\/ regular expression literal. This is to handle cases like\r\n  \/\/ `if (foo) \/blah\/.exec(foo);`, where looking at the previous token\r\n  \/\/ does not help.\r\n\r\n  function parseStatement() {\r\n    if (tokType === _slash)\r\n      readToken(true);\r\n\r\n    var starttype = tokType, node = startNode();\r\n\r\n    \/\/ Most types of statements are recognized by the keyword they\r\n    \/\/ start with. Many are trivial to parse, some require a bit of\r\n    \/\/ complexity.\r\n\r\n    switch (starttype) {\r\n    case _break: case _continue:\r\n      next();\r\n      var isBreak = starttype === _break;\r\n      if (eat(_semi) || canInsertSemicolon()) node.label = null;\r\n      else if (tokType !== _name) unexpected();\r\n      else {\r\n        node.label = parseIdent();\r\n        semicolon();\r\n      }\r\n\r\n      \/\/ Verify that there is an actual destination to break or\r\n      \/\/ continue to.\r\n      for (var i = 0; i < labels.length; ++i) {\r\n        var lab = labels[i];\r\n        if (node.label == null || lab.name === node.label.name) {\r\n          if (lab.kind != null && (isBreak || lab.kind === \"loop\")) break;\r\n          if (node.label && isBreak) break;\r\n        }\r\n      }\r\n      if (i === labels.length) raise(node.start, \"Unsyntactic \" + starttype.keyword);\r\n      return finishNode(node, isBreak ? \"BreakStatement\" : \"ContinueStatement\");\r\n\r\n    case _debugger:\r\n      next();\r\n      semicolon();\r\n      return finishNode(node, \"DebuggerStatement\");\r\n\r\n    case _do:\r\n      next();\r\n      labels.push(loopLabel);\r\n      node.body = parseStatement();\r\n      labels.pop();\r\n      expect(_while);\r\n      node.test = parseParenExpression();\r\n      semicolon();\r\n      return finishNode(node, \"DoWhileStatement\");\r\n\r\n      \/\/ Disambiguating between a `for` and a `for`\/`in` loop is\r\n      \/\/ non-trivial. Basically, we have to parse the init `var`\r\n      \/\/ statement or expression, disallowing the `in` operator (see\r\n      \/\/ the second parameter to `parseExpression`), and then check\r\n      \/\/ whether the next token is `in`. When there is no init part\r\n      \/\/ (semicolon immediately after the opening parenthesis), it is\r\n      \/\/ a regular `for` loop.\r\n\r\n    case _for:\r\n      next();\r\n      labels.push(loopLabel);\r\n      expect(_parenL);\r\n      if (tokType === _semi) return parseFor(node, null);\r\n      if (tokType === _var) {\r\n        var init = startNode();\r\n        next();\r\n        parseVar(init, true);\r\n        if (init.declarations.length === 1 && eat(_in))\r\n          return parseForIn(node, init);\r\n        return parseFor(node, init);\r\n      }\r\n      var init = parseExpression(false, true);\r\n      if (eat(_in)) {checkLVal(init); return parseForIn(node, init);}\r\n      return parseFor(node, init);\r\n\r\n    case _function:\r\n      next();\r\n      return parseFunction(node, true);\r\n\r\n    case _if:\r\n      next();\r\n      node.test = parseParenExpression();\r\n      node.consequent = parseStatement();\r\n      node.alternate = eat(_else) ? parseStatement() : null;\r\n      return finishNode(node, \"IfStatement\");\r\n\r\n    case _return:\r\n      if (!inFunction) raise(tokStart, \"\'return\' outside of function\");\r\n      next();\r\n\r\n      \/\/ In `return` (and `break`\/`continue`), the keywords with\r\n      \/\/ optional arguments, we eagerly look for a semicolon or the\r\n      \/\/ possibility to insert one.\r\n\r\n      if (eat(_semi) || canInsertSemicolon()) node.argument = null;\r\n      else { node.argument = parseExpression(); semicolon(); }\r\n      return finishNode(node, \"ReturnStatement\");\r\n\r\n    case _switch:\r\n      next();\r\n      node.discriminant = parseParenExpression();\r\n      node.cases = [];\r\n      expect(_braceL);\r\n      labels.push(switchLabel);\r\n\r\n      \/\/ Statements under must be grouped (by label) in SwitchCase\r\n      \/\/ nodes. `cur` is used to keep the node that we are currently\r\n      \/\/ adding statements to.\r\n\r\n      for (var cur, sawDefault; tokType != _braceR;) {\r\n        if (tokType === _case || tokType === _default) {\r\n          var isCase = tokType === _case;\r\n          if (cur) finishNode(cur, \"SwitchCase\");\r\n          node.cases.push(cur = startNode());\r\n          cur.consequent = [];\r\n          next();\r\n          if (isCase) cur.test = parseExpression();\r\n          else {\r\n            if (sawDefault) raise(lastStart, \"Multiple default clauses\"); sawDefault = true;\r\n            cur.test = null;\r\n          }\r\n          expect(_colon);\r\n        } else {\r\n          if (!cur) unexpected();\r\n          cur.consequent.push(parseStatement());\r\n        }\r\n      }\r\n      if (cur) finishNode(cur, \"SwitchCase\");\r\n      next(); \/\/ Closing brace\r\n      labels.pop();\r\n      return finishNode(node, \"SwitchStatement\");\r\n\r\n    case _throw:\r\n      next();\r\n      if (newline.test(input.slice(lastEnd, tokStart)))\r\n        raise(lastEnd, \"Illegal newline after throw\");\r\n      node.argument = parseExpression();\r\n      semicolon();\r\n      return finishNode(node, \"ThrowStatement\");\r\n\r\n    case _try:\r\n      next();\r\n      node.block = parseBlock();\r\n      node.handlers = [];\r\n      while (tokType === _catch) {\r\n        var clause = startNode();\r\n        next();\r\n        expect(_parenL);\r\n        clause.param = parseIdent();\r\n        if (strict && isStrictBadIdWord(clause.param.name))\r\n          raise(clause.param.start, \"Binding \" + clause.param.name + \" in strict mode\");\r\n        expect(_parenR);\r\n        clause.guard = null;\r\n        clause.body = parseBlock();\r\n        node.handlers.push(finishNode(clause, \"CatchClause\"));\r\n      }\r\n      node.finalizer = eat(_finally) ? parseBlock() : null;\r\n      if (!node.handlers.length && !node.finalizer)\r\n        raise(node.start, \"Missing catch or finally clause\");\r\n      return finishNode(node, \"TryStatement\");\r\n\r\n    case _var:\r\n      next();\r\n      node = parseVar(node);\r\n      semicolon();\r\n      return node;\r\n\r\n    case _while:\r\n      next();\r\n      node.test = parseParenExpression();\r\n      labels.push(loopLabel);\r\n      node.body = parseStatement();\r\n      labels.pop();\r\n      return finishNode(node, \"WhileStatement\");\r\n\r\n    case _with:\r\n      if (strict) raise(tokStart, \"\'with\' in strict mode\");\r\n      next();\r\n      node.object = parseParenExpression();\r\n      node.body = parseStatement();\r\n      return finishNode(node, \"WithStatement\");\r\n\r\n    case _braceL:\r\n      return parseBlock();\r\n\r\n    case _semi:\r\n      next();\r\n      return finishNode(node, \"EmptyStatement\");\r\n\r\n      \/\/ If the statement does not start with a statement keyword or a\r\n      \/\/ brace, it\'s an ExpressionStatement or LabeledStatement. We\r\n      \/\/ simply start parsing an expression, and afterwards, if the\r\n      \/\/ next token is a colon and the expression was a simple\r\n      \/\/ Identifier node, we switch to interpreting it as a label.\r\n\r\n    default:\r\n      var maybeName = tokVal, expr = parseExpression();\r\n      if (starttype === _name && expr.type === \"Identifier\" && eat(_colon)) {\r\n        for (var i = 0; i < labels.length; ++i)\r\n          if (labels[i].name === maybeName) raise(expr.start, \"Label \'\" + maybeName + \"\' is already declared\");\r\n        var kind = tokType.isLoop ? \"loop\" : tokType === _switch ? \"switch\" : null;\r\n        labels.push({name: maybeName, kind: kind});\r\n        node.body = parseStatement();\r\n        labels.pop();\r\n        node.label = expr;\r\n        return finishNode(node, \"LabeledStatement\");\r\n      } else {\r\n        node.expression = expr;\r\n        semicolon();\r\n        return finishNode(node, \"ExpressionStatement\");\r\n      }\r\n    }\r\n  }\r\n\r\n  \/\/ Used for constructs like `switch` and `if` that insist on\r\n  \/\/ parentheses around their expression.\r\n\r\n  function parseParenExpression() {\r\n    expect(_parenL);\r\n    var val = parseExpression();\r\n    expect(_parenR);\r\n    return val;\r\n  }\r\n\r\n  \/\/ Parse a semicolon-enclosed block of statements, handling `\"use\r\n  \/\/ strict\"` declarations when `allowStrict` is true (used for\r\n  \/\/ function bodies).\r\n\r\n  function parseBlock(allowStrict) {\r\n    var node = startNode(), first = true, strict = false, oldStrict;\r\n    node.body = [];\r\n    expect(_braceL);\r\n    while (!eat(_braceR)) {\r\n      var stmt = parseStatement();\r\n      node.body.push(stmt);\r\n      if (first && isUseStrict(stmt)) {\r\n        oldStrict = strict;\r\n        setStrict(strict = true);\r\n      }\r\n      first = false\r\n    }\r\n    if (strict && !oldStrict) setStrict(false);\r\n    return finishNode(node, \"BlockStatement\");\r\n  }\r\n\r\n  \/\/ Parse a regular `for` loop. The disambiguation code in\r\n  \/\/ `parseStatement` will already have parsed the init statement or\r\n  \/\/ expression.\r\n\r\n  function parseFor(node, init) {\r\n    node.init = init;\r\n    expect(_semi);\r\n    node.test = tokType === _semi ? null : parseExpression();\r\n    expect(_semi);\r\n    node.update = tokType === _parenR ? null : parseExpression();\r\n    expect(_parenR);\r\n    node.body = parseStatement();\r\n    labels.pop();\r\n    return finishNode(node, \"ForStatement\");\r\n  }\r\n\r\n  \/\/ Parse a `for`\/`in` loop.\r\n\r\n  function parseForIn(node, init) {\r\n    node.left = init;\r\n    node.right = parseExpression();\r\n    expect(_parenR);\r\n    node.body = parseStatement();\r\n    labels.pop();\r\n    return finishNode(node, \"ForInStatement\");\r\n  }\r\n\r\n  \/\/ Parse a list of variable declarations.\r\n\r\n  function parseVar(node, noIn) {\r\n    node.declarations = [];\r\n    node.kind = \"var\";\r\n    for (;;) {\r\n      var decl = startNode();\r\n      decl.id = parseIdent();\r\n      if (strict && isStrictBadIdWord(decl.id.name))\r\n        raise(decl.id.start, \"Binding \" + decl.id.name + \" in strict mode\");\r\n      decl.init = eat(_eq) ? parseExpression(true, noIn) : null;\r\n      node.declarations.push(finishNode(decl, \"VariableDeclarator\"));\r\n      if (!eat(_comma)) break;\r\n    }\r\n    return finishNode(node, \"VariableDeclaration\");\r\n  }\r\n\r\n  \/\/ ### Expression parsing\r\n\r\n  \/\/ These nest, from the most general expression type at the top to\r\n  \/\/ \'atomic\', nondivisible expression types at the bottom. Most of\r\n  \/\/ the functions will simply let the function(s) below them parse,\r\n  \/\/ and, *if* the syntactic construct they handle is present, wrap\r\n  \/\/ the AST node that the inner parser gave them in another node.\r\n\r\n  \/\/ Parse a full expression. The arguments are used to forbid comma\r\n  \/\/ sequences (in argument lists, array literals, or object literals)\r\n  \/\/ or the `in` operator (in for loops initalization expressions).\r\n\r\n  function parseExpression(noComma, noIn) {\r\n    var expr = parseMaybeAssign(noIn);\r\n    if (!noComma && tokType === _comma) {\r\n      var node = startNodeFrom(expr);\r\n      node.expressions = [expr];\r\n      while (eat(_comma)) node.expressions.push(parseMaybeAssign(noIn));\r\n      return finishNode(node, \"SequenceExpression\");\r\n    }\r\n    return expr;\r\n  }\r\n\r\n  \/\/ Parse an assignment expression. This includes applications of\r\n  \/\/ operators like `+=`.\r\n\r\n  function parseMaybeAssign(noIn) {\r\n    var left = parseMaybeConditional(noIn);\r\n    if (tokType.isAssign) {\r\n      var node = startNodeFrom(left);\r\n      node.operator = tokVal;\r\n      node.left = left;\r\n      next();\r\n      node.right = parseMaybeAssign(noIn);\r\n      checkLVal(left);\r\n      return finishNode(node, \"AssignmentExpression\");\r\n    }\r\n    return left;\r\n  }\r\n\r\n  \/\/ Parse a ternary conditional (`?:`) operator.\r\n\r\n  function parseMaybeConditional(noIn) {\r\n    var expr = parseExprOps(noIn);\r\n    if (eat(_question)) {\r\n      var node = startNodeFrom(expr);\r\n      node.test = expr;\r\n      node.consequent = parseExpression(true);\r\n      expect(_colon);\r\n      node.alternate = parseExpression(true, noIn);\r\n      return finishNode(node, \"ConditionalExpression\");\r\n    }\r\n    return expr;\r\n  }\r\n\r\n  \/\/ Start the precedence parser.\r\n\r\n  function parseExprOps(noIn) {\r\n    return parseExprOp(parseMaybeUnary(noIn), -1, noIn);\r\n  }\r\n\r\n  \/\/ Parse binary operators with the operator precedence parsing\r\n  \/\/ algorithm. `left` is the left-hand side of the operator.\r\n  \/\/ `minPrec` provides context that allows the function to stop and\r\n  \/\/ defer further parser to one of its callers when it encounters an\r\n  \/\/ operator that has a lower precedence than the set it is parsing.\r\n\r\n  function parseExprOp(left, minPrec, noIn) {\r\n    var prec = tokType.binop;\r\n    if (prec != null && (!noIn || tokType !== _in)) {\r\n      if (prec > minPrec) {\r\n        var node = startNodeFrom(left);\r\n        node.left = left;\r\n        node.operator = tokVal;\r\n        next();\r\n        node.right = parseExprOp(parseMaybeUnary(noIn), prec, noIn);\r\n        var node = finishNode(node, \/&&|\\|\\|\/.test(node.operator) ? \"LogicalExpression\" : \"BinaryExpression\");\r\n        return parseExprOp(node, minPrec, noIn);\r\n      }\r\n    }\r\n    return left;\r\n  }\r\n\r\n  \/\/ Parse unary operators, both prefix and postfix.\r\n\r\n  function parseMaybeUnary(noIn) {\r\n    if (tokType.prefix) {\r\n      var node = startNode(), update = tokType.isUpdate;\r\n      node.operator = tokVal;\r\n      node.prefix = true;\r\n      next();\r\n      node.argument = parseMaybeUnary(noIn);\r\n      if (update) checkLVal(node.argument);\r\n      else if (strict && node.operator === \"delete\" &&\r\n               node.argument.type === \"Identifier\")\r\n        raise(node.start, \"Deleting local variable in strict mode\");\r\n      return finishNode(node, update ? \"UpdateExpression\" : \"UnaryExpression\");\r\n    }\r\n    var expr = parseExprSubscripts();\r\n    while (tokType.postfix && !canInsertSemicolon()) {\r\n      var node = startNodeFrom(expr);\r\n      node.operator = tokVal;\r\n      node.prefix = false;\r\n      node.argument = expr;\r\n      checkLVal(expr);\r\n      next();\r\n      expr = finishNode(node, \"UpdateExpression\");\r\n    }\r\n    return expr;\r\n  }\r\n\r\n  \/\/ Parse call, dot, and `[]`-subscript expressions.\r\n\r\n  function parseExprSubscripts() {\r\n    return parseSubscripts(parseExprAtom());\r\n  }\r\n\r\n  function parseSubscripts(base, noCalls) {\r\n    if (eat(_dot)) {\r\n      var node = startNodeFrom(base);\r\n      node.object = base;\r\n      node.property = parseIdent(true);\r\n      node.computed = false;\r\n      return parseSubscripts(finishNode(node, \"MemberExpression\"), noCalls);\r\n    } else if (eat(_bracketL)) {\r\n      var node = startNodeFrom(base);\r\n      node.object = base;\r\n      node.property = parseExpression();\r\n      node.computed = true;\r\n      expect(_bracketR);\r\n      return parseSubscripts(finishNode(node, \"MemberExpression\"), noCalls);\r\n    } else if (!noCalls && eat(_parenL)) {\r\n      var node = startNodeFrom(base);\r\n      node.callee = base;\r\n      node.arguments = parseExprList(_parenR, false);\r\n      return parseSubscripts(finishNode(node, \"CallExpression\"), noCalls);\r\n    } else return base;\r\n  }\r\n\r\n  \/\/ Parse an atomic expression \u2014 either a single token that is an\r\n  \/\/ expression, an expression started by a keyword like `function` or\r\n  \/\/ `new`, or an expression wrapped in punctuation like `()`, `[]`,\r\n  \/\/ or `{}`.\r\n\r\n  function parseExprAtom() {\r\n    switch (tokType) {\r\n    case _this:\r\n      var node = startNode();\r\n      next();\r\n      return finishNode(node, \"ThisExpression\");\r\n    case _name:\r\n      return parseIdent();\r\n    case _num: case _string: case _regexp:\r\n      var node = startNode();\r\n      node.value = tokVal;\r\n      node.raw = input.slice(tokStart, tokEnd);\r\n      next();\r\n      return finishNode(node, \"Literal\");\r\n\r\n    case _null: case _true: case _false:\r\n      var node = startNode();\r\n      node.value = tokType.atomValue;\r\n      node.raw = tokType.keyword\r\n      next();\r\n      return finishNode(node, \"Literal\");\r\n\r\n    case _parenL:\r\n      var tokStartLoc1 = tokStartLoc, tokStart1 = tokStart;\r\n      next();\r\n      var val = parseExpression();\r\n      val.start = tokStart1;\r\n      val.end = tokEnd;\r\n      if (options.locations) {\r\n        val.loc.start = tokStartLoc1;\r\n        val.loc.end = tokEndLoc;\r\n      }\r\n      if (options.ranges)\r\n        val.range = [tokStart1, tokEnd];\r\n      expect(_parenR);\r\n      return val;\r\n\r\n    case _bracketL:\r\n      var node = startNode();\r\n      next();\r\n      node.elements = parseExprList(_bracketR, true, true);\r\n      return finishNode(node, \"ArrayExpression\");\r\n\r\n    case _braceL:\r\n      return parseObj();\r\n\r\n    case _function:\r\n      var node = startNode();\r\n      next();\r\n      return parseFunction(node, false);\r\n\r\n    case _new:\r\n      return parseNew();\r\n\r\n    default:\r\n      unexpected();\r\n    }\r\n  }\r\n\r\n  \/\/ New\'s precedence is slightly tricky. It must allow its argument\r\n  \/\/ to be a `[]` or dot subscript expression, but not a call \u2014 at\r\n  \/\/ least, not without wrapping it in parentheses. Thus, it uses the\r\n\r\n  function parseNew() {\r\n    var node = startNode();\r\n    next();\r\n    node.callee = parseSubscripts(parseExprAtom(), true);\r\n    if (eat(_parenL)) node.arguments = parseExprList(_parenR, false);\r\n    else node.arguments = [];\r\n    return finishNode(node, \"NewExpression\");\r\n  }\r\n\r\n  \/\/ Parse an object literal.\r\n\r\n  function parseObj() {\r\n    var node = startNode(), first = true, sawGetSet = false;\r\n    node.properties = [];\r\n    next();\r\n    while (!eat(_braceR)) {\r\n      if (!first) {\r\n        expect(_comma);\r\n        if (options.allowTrailingCommas && eat(_braceR)) break;\r\n      } else first = false;\r\n\r\n      var prop = {key: parsePropertyName()}, isGetSet = false, kind;\r\n      if (eat(_colon)) {\r\n        prop.value = parseExpression(true);\r\n        kind = prop.kind = \"init\";\r\n      } else if (options.ecmaVersion >= 5 && prop.key.type === \"Identifier\" &&\r\n                 (prop.key.name === \"get\" || prop.key.name === \"set\")) {\r\n        isGetSet = sawGetSet = true;\r\n        kind = prop.kind = prop.key.name;\r\n        prop.key = parsePropertyName();\r\n        if (tokType !== _parenL) unexpected();\r\n        prop.value = parseFunction(startNode(), false);\r\n      } else unexpected();\r\n\r\n      \/\/ getters and setters are not allowed to clash \u2014 either with\r\n      \/\/ each other or with an init property \u2014 and in strict mode,\r\n      \/\/ init properties are also not allowed to be repeated.\r\n\r\n      if (prop.key.type === \"Identifier\" && (strict || sawGetSet)) {\r\n        for (var i = 0; i < node.properties.length; ++i) {\r\n          var other = node.properties[i];\r\n          if (other.key.name === prop.key.name) {\r\n            var conflict = kind == other.kind || isGetSet && other.kind === \"init\" ||\r\n              kind === \"init\" && (other.kind === \"get\" || other.kind === \"set\");\r\n            if (conflict && !strict && kind === \"init\" && other.kind === \"init\") conflict = false;\r\n            if (conflict) raise(prop.key.start, \"Redefinition of property\");\r\n          }\r\n        }\r\n      }\r\n      node.properties.push(prop);\r\n    }\r\n    return finishNode(node, \"ObjectExpression\");\r\n  }\r\n\r\n  function parsePropertyName() {\r\n    if (tokType === _num || tokType === _string) return parseExprAtom();\r\n    return parseIdent(true);\r\n  }\r\n\r\n  \/\/ Parse a function declaration or literal (depending on the\r\n  \/\/ `isStatement` parameter).\r\n\r\n  function parseFunction(node, isStatement) {\r\n    if (tokType === _name) node.id = parseIdent();\r\n    else if (isStatement) unexpected();\r\n    else node.id = null;\r\n    node.params = [];\r\n    var first = true;\r\n    expect(_parenL);\r\n    while (!eat(_parenR)) {\r\n      if (!first) expect(_comma); else first = false;\r\n      node.params.push(parseIdent());\r\n    }\r\n\r\n    \/\/ Start a new scope with regard to labels and the `inFunction`\r\n    \/\/ flag (restore them to their old value afterwards).\r\n    var oldInFunc = inFunction, oldLabels = labels;\r\n    inFunction = true; labels = [];\r\n    node.body = parseBlock(true);\r\n    inFunction = oldInFunc; labels = oldLabels;\r\n\r\n    \/\/ If this is a strict mode function, verify that argument names\r\n    \/\/ are not repeated, and it does not try to bind the words `eval`\r\n    \/\/ or `arguments`.\r\n    if (strict || node.body.body.length && isUseStrict(node.body.body[0])) {\r\n      for (var i = node.id ? -1 : 0; i < node.params.length; ++i) {\r\n        var id = i < 0 ? node.id : node.params[i];\r\n        if (isStrictReservedWord(id.name) || isStrictBadIdWord(id.name))\r\n          raise(id.start, \"Defining \'\" + id.name + \"\' in strict mode\");\r\n        if (i >= 0) for (var j = 0; j < i; ++j) if (id.name === node.params[j].name)\r\n          raise(id.start, \"Argument name clash in strict mode\");\r\n      }\r\n    }\r\n\r\n    return finishNode(node, isStatement ? \"FunctionDeclaration\" : \"FunctionExpression\");\r\n  }\r\n\r\n  \/\/ Parses a comma-separated list of expressions, and returns them as\r\n  \/\/ an array. `close` is the token type that ends the list, and\r\n  \/\/ `allowEmpty` can be turned on to allow subsequent commas with\r\n  \/\/ nothing in between them to be parsed as `null` (which is needed\r\n  \/\/ for array literals).\r\n\r\n  function parseExprList(close, allowTrailingComma, allowEmpty) {\r\n    var elts = [], first = true;\r\n    while (!eat(close)) {\r\n      if (!first) {\r\n        expect(_comma);\r\n        if (allowTrailingComma && options.allowTrailingCommas && eat(close)) break;\r\n      } else first = false;\r\n\r\n      if (allowEmpty && tokType === _comma) elts.push(null);\r\n      else elts.push(parseExpression(true));\r\n    }\r\n    return elts;\r\n  }\r\n\r\n  \/\/ Parse the next token as an identifier. If `liberal` is true (used\r\n  \/\/ when parsing properties), it will also convert keywords into\r\n  \/\/ identifiers.\r\n\r\n  function parseIdent(liberal) {\r\n    var node = startNode();\r\n    node.name = tokType === _name ? tokVal : (liberal && !options.forbidReserved && tokType.keyword) || unexpected();\r\n    next();\r\n    return finishNode(node, \"Identifier\");\r\n  }\r\n\r\n});\r\n"
        },
        "_communjs/config": {
            exports: communjsConfig
        },
        "_communjs/internal": {
            exports: self
        }
    };

    self.hasFileExtension = function hasFileExtension(str) {
        return (/.[\S]+$/).test(str);
    };

    self.executeModule = function executeModule(moduleName, module, rawText) {
        // if there is a custom default module handler and the file does not
        // have an extension use it to load the module
        if (communjsConfig.defaultModuleHandler && !self.hasFileExtension(moduleName)) {
            module.exports = communjsConfig.defaultModuleHandler(rawText, moduleName);
        } else {
            // assume we don't have custom config for this module
            var moduleConfig = null, moduleConfigs = self.moduleConfigs;

            // find custom config

            for (var key in moduleConfigs) {
                if (moduleConfigs.hasOwnProperty(key)) {
                    if (moduleConfigs[key].modulePattern.test(moduleName)) {
                        moduleConfig = moduleConfigs[key];
                        break;
                    }
                }
            }

            // create a duplicate of the default sandbox context
            var moduleContext = Object.create(self.context);

            // modify the sandbox to handle libs with global exports
            if (moduleConfig && moduleConfig.sandbox && moduleConfig.sandbox.exports) {
                var exports = moduleConfig.sandbox.exports;
                for (var i = 0; i < exports.length; i++) {
                    moduleContext[exports[i]] = undefined;
                }
            }

            // modify the sandbox to handle libs with global dependencies
            if (moduleConfig && moduleConfig.sandbox && moduleConfig.sandbox.globals) {
                var globals = moduleConfig.sandbox.globals;
                for (var property in globals) {
                    if (globals.hasOwnProperty(property)) {
                        moduleContext[property] = globals[property];
                    }
                }
            }

            // Execute it
            if (moduleConfig && moduleConfig.handler) {
                module.exports = moduleConfig.handler(rawText, moduleName);
            } else {
                self.execWith(moduleContext, rawText, moduleName, module);
            }

            // extract global exports from sandbox
            if (moduleConfig && moduleConfig.sandbox && moduleConfig.sandbox.exports) {
                var globalExports = moduleConfig.sandbox.exports;
                for (var j = 0; j < globalExports.length; j++) {
                    module.exports[globalExports[j]] = moduleContext[globalExports[j]];
                }
            }
        }
    };

    self.isPathRelative = function isPathRelative(path)
    /*{
        "description": "Tests if the path passed in is relative (contains ./ or ../)"
    }*/
    {
        return path.indexOf('./') !== -1 || path.indexOf('../') !== -1;
    };

    self.isPathAbsolute = function isPathAbsolute(path)

    {
        return path.length >= 0 && path[0] === "/";
    };

    self.resolve = function resolve(path, basePath)
    /*{
        "description": "Determines the absolute path from the relative path and its base"
    }*/
    {
        basePath = basePath || "";
        path = path.replace(/(?:^\.\/)|\/\.\//g, "/");
        var separator = path.indexOf("../") === 0 ? "/" : "";
        var fullPath = basePath + separator + path;
        var pieces = fullPath.split("/");
        var index = pieces.lastIndexOf("..");

        while (index > 0) {
            if (pieces[index - 1] === '..') {
                index = index - 1;
            } else {
                pieces.splice(index - 1, 2); //remove the two element
                index = pieces.lastIndexOf("..");
            }
        }
        var result = pieces.join('/');

        return result.replace("./", "");

    };

    self.getBasePath = function getBasePath(requireOrigin)
    /*{
        "description": "Strips the module name from the end of a path."
    }*/
    {
        if (requireOrigin) {
            var basePath = requireOrigin.replace(/\/(?!\S*\/)[\S]*$/, "");
            if (basePath === ".") {
                basePath = "";
            }
            return basePath;
        } else {
            return "";
        }

    };

    self.nodeModulePaths = function nodeModulePaths(start) {
        var parts = start.split('/');
        var root = parts.indexOf("node_modules");
        if (root === -1) {
            root = 0;
        }
        var dirs = [];
        for (var i = parts.length; i > root; i--) {
            var part = parts[i];
            if (part === "node_modules") {
                continue;
            }
            dirs.push(parts.slice(0, i).join("/") + "/node_modules/");
        }

        return dirs;
    };

    self.require = function require(moduleName, requireOrigin, cache)
    /*{
        "description": "Common js require function. This function relies on modules being pre-fetched (not necessarily executed) and available when needed. Throws an error when the module cannot be found.",
        "params": [
            {
                "description": "The name of the module that to be returned."
            },
            {
                "description": "The basePath for the module to be required. This is used to resolve the module name to it's absolute form."
            },
            {
                "description": "The module cache to use for user modules.",
                "required": false
            }
        "returns": "The module that was requested."
    }*/
    {
        if (cache) {
            self.userModuleCache = cache;
        }
        // assume it is in the sys cache
        var module = self.coreModuleCache[moduleName];

        // did not find it in core modules
        if (!module) {

            if (self.isPathRelative(moduleName)) {

                // convert it into an absolute path
                var resolvedName = self.resolve(moduleName, self.getBasePath(requireOrigin));

                // handle an odd case. This needs to be refactored out
                if (resolvedName[0] !== '/') {
                    resolvedName = "/" + resolvedName;
                }
                moduleName = resolvedName.replace(/\.js$/, "");
            }

            if (self.isPathAbsolute(moduleName)) {
                module = self.userModuleCache[moduleName];
            } else if (communjsConfig.includeNodeModulesInSearch) {

                // Get all the possible dirs where nod_modules could be located
                var dirs = self.nodeModulePaths(self.getBasePath(requireOrigin));

                // try each one
                for (var i = 0; i < dirs.length && !module; i++) {
                    var dir = dirs[i];
                    var nodeModulePath = dir + moduleName;
                    module = self.userModuleCache[dir + moduleName];
                }
            }
        }

        if (module) {
            //we tried to load it
            if (module.exports) {
                // we have already executed it
                return module.exports;
            } else if ((module.rawText || module.rawText === "") || (module.mainScript && module.mainScript.rawText)) {
                //we have the code just need to execute it
                module.exports = {}; //predefine the exports so that cyclic and reflexive imports are possible
                var rawText = module.rawText;
                if (module.mainScript) {
                    rawText = module.mainScript.rawText;
                    moduleName = module.mainScript.name;
                }
                self.executeModule(moduleName, module, rawText);

                // delete rawText ???

                return module.exports;
            } else {
                //we don't have the code so the module failed to be prefetched or someone has touched the cache
                throw  new Error("module: " + moduleName + " prefetch failed");
            }
        } else {
            // Either module could not be found on the server or someone has touched the cache.
            throw new Error("[communjs] Module: " + moduleName + " could not be found.");
        }
    };

    self.alreadyLoaded = function alreadyLoaded(moduleName)
    /*{
        "description": "Checks if a module has already been loaded."
    }*/
    {
        return self.coreModuleCache.hasOwnProperty(moduleName) || self.userModuleCache.hasOwnProperty(moduleName) || self.userModuleCache.hasOwnProperty("node_modules/" + moduleName);
    };

    // module globals
    self.context = {
        /* hide all the common browser APIs */
        top: undefined,
        location: undefined,
        document: undefined,
        URL: undefined,
        Worker: undefined,
        Option: undefined,
        Image: undefined,
        DocumentType: undefined,
        CDATASection: undefined,
        Comment: undefined,
        Text: undefined,
        Element: undefined,
        Attr: undefined,
        Document: undefined,
        DocumentFragment: undefined,
        DOMImplementation: undefined,
        performance: undefined,
        console: undefined,
        parent: undefined,
        opener: undefined,
        frames: undefined,
        self: undefined,
        defaultStatus: undefined,
        status: undefined,
        name: undefined,
        length: undefined,
        closed: undefined,
        pageYOffset: undefined,
        pageXOffset: undefined,
        scrollY: undefined,
        scrollX: undefined,
        screenY: undefined,
        screenX: undefined,
        innerWidth: undefined,
        innerHeight: undefined,
        outerWidth: undefined,
        outerHeight: undefined,
        frameElement: undefined,
        crypto: undefined,
        navigator: undefined,
        toolbar: undefined,
        statusbar: undefined,
        scrollbars: undefined,
        personalbar: undefined,
        menubar: undefined,
        locationbar: undefined,
        history: undefined,
        screen: undefined,
        window: undefined,
        alert: undefined,
        prompt: undefined,

        /* hide common js libraries */
        $: undefined,
        jQuery: undefined,
        _: undefined
    };

    //----------------------------CODE PREFETCH--------------------------------

    self.getDependencies = function getDependencies(rawText) {
        var depModules = null;
        var rawRequires = rawText.match(/require\((?:\'|\")[\S]*(?:\'|\")\)/gm); //find require calls returns ["require('something')"] does not take into account comments
        if (rawRequires) {
            depModules = rawRequires.map(function (current) {
                //split the inner string out and get the second thing. this is the module name
                return current.split(/\'|\"/)[1];
            });
        }
        return depModules;
    };

    self.loadDependency = function loadDependency(moduleName, basePath, onComplete) {
        if (self.alreadyLoaded(moduleName)) {
            onComplete();
        } else {
            if (self.isPathRelative(moduleName)) {
                moduleName = self.resolve(moduleName, basePath);
            }
            self.loadScript(moduleName, function onSuccess(rawText) {
                self.userModuleCache[moduleName] = {
                    rawText: rawText
                };
                onComplete();
            }, function onFail() {
                // cannot find exact file could be a folder module

                self.loadScript(moduleName + "/package.json", function onSuccess(rawJson) {
                    var packageJson = JSON.parse(rawJson);
                    var mainScript = self.resolve(packageJson.main, moduleName);

                    self.loadScript(mainScript, function onSuccess(rawText) {
                        self.userModuleCache[moduleName] = {
                            packageJson: rawJson,
                            mainScript: {
                                name: mainScript,
                                rawText: rawText
                            }
                        };
                        onComplete();

                    }, onComplete); // cannot find the file referenced by package.json
                }, function onFail() {
                    // no package.json perhaps there is a index.js

                    self.loadScript(moduleName + "/index.js", function onSuccess(rawText) {
                        self.userModuleCache[moduleName] = {
                            mainScript: {
                                name: moduleName + "/index.js",
                                rawText: "index.js for folder module"
                            }
                        };

                        onComplete();

                    }, onComplete); // cannot find the module so loading is done
                });
            });
        }
    };

    self.prefetchDeps = function prefetchDeps(rawCode, basePath, onComplete)
    /*{
        "description": "Given some source code all the dependencies are prefetched but not executed so that they are available to require calls."
    }*/
    {
        var depModules = self.getDependencies(rawCode);
        if (depModules) {

            // iterate through all the deps and load them
            var loadDeps = function loadDeps(deps, index) {
                if (index < deps.length) {
                    var dep = deps[index];
                    if (self.alreadyLoaded(dep)) {
                        loadDeps(deps, index + 1);
                    } else {
                        var depBasePath = basePath;
                        if (self.isPathRelative(dep)) {
                            depBasePath = self.resolve("./" + self.getBasePath(dep), basePath);
                        }

                        // Load the dependency and when finished load the next one. // this could be done in parallel ??
                        self.loadScript(self.resolve(dep, basePath) + '.js', function onLoaded(rawText, moduleName) {
                            self.userModuleCache["/" + moduleName] = {
                                rawText: rawText
                            };

                            // load next dep
                            loadDeps(deps, index + 1);
                        });
                    }
                } else {
                    //all deps are loaded so bail
                    onComplete();
                }
            };

            // Start loading deps
            loadDeps(depModules, 0);
        } else {
            onComplete();
        }
    };

    self.loadScript = function loadScript(fileName, onComplete, onFail) {
        console.log("loading script " + fileName);
        self.getRawCode(fileName, function (rawCode) {
            self.prefetchDeps(rawCode, self.getBasePath(fileName), function () {
                onComplete(rawCode, fileName.replace(/\.js$/, ""));
            });

        },
        function () {

            if (onFail) {
                onFail();
            }
            // if (communjsConfig.includeNodeModulesInSearch) {
            //     fileName = fileName.replace(/\.js$/, "");
            //     self.getRawCode("node_modules/" + fileName + "/package.json", function onSuccess(rawText) {
            //         var pkgJson = JSON.parse(rawText);

            //         // get the main file path
            //         var mainScript = pkgJson.main;
            //         var path = "node_modules/" + fileName + "/" + mainScript;
            //         self.getRawCode(path, function onSuccess(rawText) {
            //             self.prefetchDeps(rawText, self.getBasePath(path), function () {
            //                 onComplete(rawText, "node_modules/" + fileName);
            //             });

            //         }, function onFail() {
            //             console.log("could not get node module at path: " + path);
            //         });
            //     }, function onFailure() {
            //         console.log("could not load: " + fileName);
            //         onComplete();
            //     });
            // }

        });
    };


    //----------------------------STARTUP--------------------------------------

    self.loadAndExec = function loadAndExec(scriptName, onComplete) {
        var basePath = "/";
        self.loadScript(scriptName, function (rawCode) {
            if (rawCode) {
                self.execWith(self.context, rawCode, scriptName, {});
            }

            if (onComplete) {
                onComplete();
            }
        });
    };

    self.start = function start(scriptNode) {
        var mainScriptName = scriptNode.getAttribute('data-main');
        var configScriptName = scriptNode.getAttribute('data-config');

        if (configScriptName) {

            self.loadAndExec(configScriptName, function onComplete() {
                self.loadAndExec(mainScriptName);
            });
        } else {
            self.loadAndExec(mainScriptName);
        }
    };

    self.getCommunjsScriptNode = function getCommunjsScriptNode() {
        // get all the scripts and try to find the one that is communjs
        var scripts = document.getElementsByTagName('script');
        var communjsScript = null;

        for (var i = scripts.length - 1; i >= 0 && !communjsScript; i--) {
            if (scripts[i].getAttribute("data-main")) {
                communjsScript = scripts[i];
            }
        }

        // make sure we found it
        if (!communjsScript) {
            throw new Error("[communjs] data-main attribute must be set on the script tag that includes communjs.");
        } else {
            return communjsScript;
        }
    };

    //----------------------------KICKSTART------------------------------------

    self.start(self.getCommunjsScriptNode());

}());
