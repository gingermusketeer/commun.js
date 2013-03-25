/*{
    "description": "Tests communjs for commonjs module 1.0 compliance. Tests have been inspired by https://github.com/ashb/interoperablejs"
}*/

/*global describe, it, beforeEach, expect, require*/
"use strict";

//--------------------------------TESTS----------------------------------------

describe('commun.js\' compliance with commonjs modules 1.0', function () {

    beforeEach(function () {
        this.addMatchers({
            toThrowException: function () {
                var result = false;
                try {
                    this.actual();
                } catch (e) {
                    result = true;
                }
                return result;
            }
        });
    });

    it("supports absolute identifiers", function () {
        var requireCache = {
            "/submodule/a": {
                rawText: "exports.foo = function () { return require('/b'); };"
            },
            "/b": {
                rawText: "exports.foo = function() {};"
            }
        };

        require.cache = requireCache;

        var a = require('/submodule/a');
        var b = require('/b');
        expect(a.foo().foo).toBe(b.foo);
    });

    it("supports cyclic requires", function () {
        require.cache = {
            "/a": {
                rawText: "exports.a = function () {return b; }; var b = require('/b');"
            },
            "/b": {
                rawText: "var a = require('/a'); exports.b = function () {return a; };"
            }
        };

        var a = require('/a');
        var b = require('/b');

        expect(a.a).toBeDefined();
        expect(b.b).toBeDefined();
        expect(a.a().b).toEqual(b.b);
        expect(b.b().a).toEqual(a.a);
    });

    it("does not fall back to relative requires when absolutes are not available", function () {

        require.cache = {
            "/submodule/a": {
                rawText: "var result = false; try{ require('/b'); } catch(e){ result=true;} exports.result = result;"
            },
            "/submodule/b": {
                rawText: ""
            }
        };
        var a = require('/submodule/a');
        expect(a.result).toEqual(true);
    });

    it("returns the actual exports object", function () {
        require.cache = {
            "/a": {
                rawText: "exports.b = function () {return require('/b'); };"
            },
            "/b": {
                rawText: ""
            }
        };

        var a = require('/a');
        var b = require('/b');

        expect(a.b()).toEqual(b);
    });

    it("has proper scope for methods", function () {
        require.cache = {
            "/a": {
                rawText: "exports.foo = function () {return this; }; exports.set = function (x) {this.x = x; }; exports.get = function () {return this.x; }; exports.getClosed = function () {return exports.x; }; "
            }
        };

        var a = require('/a');
        var foo = a.foo;
        expect(a.foo()).toEqual(a); // Calling a module member
        expect(foo()).not.toEqual(a); // Members not implicitly bound
        a.set(10);
        expect(a.get()).toEqual(10); // get and set
    });

    it("throws an error when the module is missing", function () {
        expect(function () { require('bogus'); }).toThrowException();
    });

    it("allows modules to be monkeyed", function () {
        require.cache = {
            "/a": {
                rawText: ""
            },
            "/b": {
                rawText: "require('/a').monkey = 10;"
            }
        };
        var a = require('/a');
        var b = require('/b');

        expect(a.monkey).toEqual(10);
    });

    it("handles nested modules", function () {
        require.cache = {
            "/a/b/c/d": {
                rawText: "exports.foo = function () {return 1; }; "
            }
        };

        expect(require('/a/b/c/d').foo()).toEqual(1);
    });

    it("handles reflexive requires", function () {
        require.cache = {
            "/a": {
                rawText: "if( require('/a') !== exports) {throw new Error('reflexive imports are not supported');}"
            }
        };

        expect(function () { require('/a'); }).not.toThrowException();
    });

    it("supports relative requires", function () {
        require.cache = {
            "/submodule/a": {
                rawText: "exports.foo = require('./b').foo;"
            },
            "/submodule/b": {
                rawText: "exports.foo = function () {}; "
            }
        };

        var a = require('/submodule/a');
        var b = require('/submodule/b');

        expect(a.foo).toEqual(b.foo);
    });

    it("supports transitive requires", function () {
        require.cache = {
            "/a": {
                rawText: "exports.foo = require('/b').foo;"
            },
            "/b": {
                rawText: "exports.foo = require('/c').foo;"
            },
            "/c": {
                rawText: "exports.foo = function () { return 1; };"
            }
        };

        var a = require('/a');

        expect(a.foo()).toEqual(1);
    });
});
