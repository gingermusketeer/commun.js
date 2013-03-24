/*{
   "description": "Specs for communjs."
}*/
/*globals require, describe, it, expect, beforeEach, spyOn, jasmine*/

'use strict';

//--------------------------------REQUIRES-------------------------------------

var communjs = require("_communjs/config");

//--------------------------------TESTS----------------------------------------

describe("communjs", function baseSuite() {

    it("supports node style module.exports assignment", function () {
        require.cache = {
            "a": {
                rawText: "module.exports = {a: 1}"
            }
        };

        var a = require("a");

        expect(a).toBe({ a: 1 });
    });

    it("exports modules with extensions not matching '.js' as text", function () {
        require.cache = {
            "a.text": {
                rawText: "some text"
            }
        };

        var a_text = require('a.text');
        expect(a_text).toBe("some text");
    });

    describe("configuration", function () {


        it("allows default module exec handler to be configured", function () {
            require.cache = {
                "a": {
                    rawText: "some text"
                },
                "b.json" : {
                    rawText: "{ 'a': 5}"
                }
            };

            communjs.defaultModuleHandler = jasmine.createSpy().andReturn("some other text");
            // communjs.defaultModuleHandler = function (rawText, moduleName) {
            //     expect(moduleName).toBe("a");
            //     expect(rawText).toBe("some text");

            //     return "some other text";
            // };



            var a = require("a");

            expect(a).toBe("some other text");
            expect(communjs.defaultModuleHandler).toHaveBeenCalledWith("some text", "a");

            communjs.defaultModuleHandler.reset();

            var b = require('b.json');

            expect(communjs.defaultModuleHandler).not.toHaveBeenCalled();

            // reset the global changes for other tests
            communjs.defaultModuleHandler = undefined;
        });

        it("using a string to specify modules to be configured is the same as using a regexp", function () {
            require.cache = {
                "a.text": {
                    rawText: "something"
                }
            };

            expect(communjs.modules(/a.text/)).toBe(communjs.modules('a.text'));
        });

        it("allows a specific module exec handler to be configured", function () {
            require.cache = {
                "c.text": {
                    rawText: "specific something"
                },
                "d": {
                    rawText: ""
                }
            };

            var c_textModule = communjs.modules(/c.text/);

            c_textModule.handler = function (rawText, moduleName) {
                expect(moduleName).toBe("c.text");
                expect(rawText).toBe("specific something");

                return "something else";
            };

            var a_text = require("c.text");
            expect(a_text).toBe("something else");

            expect(require('d')).toEqual({});
        });

        it("allows a non modular file to be converted on the fly by specifying the globals to be exported", function () {
            require.cache = {
                "someFile": {
                    rawText: "aGlobal = 5;"
                }
            };

            communjs.modules(/someFile/).sandbox = {
                exports: ["aGlobal"]
            };

            var someFile = require('someFile');

            expect(someFile.aGlobal).toBe(5);
        });

        it("allows the globals available to a module to be specified", function () {
            require.cache = {
                "legacyModule": {
                    rawText: "someGlobal();"
                }
            };

            var globalFunc = jasmine.createSpy();

            communjs.modules("legacyModule").sandbox = {
                globals: {
                    someGlobal: globalFunc
                }
            };

            require('legacyModule');

            expect(globalFunc).toHaveBeenCalled();
        });
    });
});
