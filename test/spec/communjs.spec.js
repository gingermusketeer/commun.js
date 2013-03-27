/*{
   "description": "Specs for communjs."
}*/
/*globals require, describe, it, expect, beforeEach, afterEach spyOn, jasmine*/

'use strict';

//--------------------------------REQUIRES-------------------------------------

var communjs = require("_communjs/config");

//--------------------------------TESTS----------------------------------------

describe("communjs", function baseSuite() {

    var internals = require('_communjs/internal');

    beforeEach(function () {
        require.cache = undefined;
        internals.userModuleCache = {};
    });

    it("supports node style module.exports assignment", function () {
        require.cache = {
            "/a": {
                rawText: "module.exports = {a: 1}"
            }
        };

        var a = require("/a");

        expect(a).toEqual({ a: 1 });
    });

    describe("configuration", function () {


        it("allows default module exec handler to be configured", function () {
            require.cache = {
                "/a": {
                    rawText: "some text"
                },
                "/b.json" : {
                    rawText: "{ 'a': 5}"
                }
            };

            communjs.defaultModuleHandler = jasmine.createSpy().andReturn("some other text");
            // communjs.defaultModuleHandler = function (rawText, moduleName) {
            //     expect(moduleName).toBe("a");
            //     expect(rawText).toBe("some text");

            //     return "some other text";
            // };



            var a = require("/a");

            expect(a).toBe("some other text");
            expect(communjs.defaultModuleHandler).toHaveBeenCalledWith("some text", "/a");

            communjs.defaultModuleHandler.reset();

            var b = require('/b.json');

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
                "/c.text": {
                    rawText: "specific something"
                },
                "/d": {
                    rawText: ""
                }
            };

            var c_textModule = communjs.modules(/c.text/);

            c_textModule.handler = function (rawText, moduleName) {
                expect(moduleName).toBe("/c.text");
                expect(rawText).toBe("specific something");

                return "something else";
            };

            var a_text = require("/c.text");
            expect(a_text).toBe("something else");

            // make sure that only c.text is affected
            expect(require('/d')).toEqual({});
        });

        it("allows a non modular file to be converted on the fly by specifying the globals to be exported", function () {
            require.cache = {
                "/someFile": {
                    rawText: "aGlobal = 5;"
                }
            };

            communjs.modules(/someFile/).sandbox = {
                exports: ["aGlobal"]
            };

            var someFile = require('/someFile');

            expect(someFile.aGlobal).toBe(5);
        });

        it("allows the globals available to a module to be specified", function () {
            require.cache = {
                "/legacyModule": {
                    rawText: "someGlobal();"
                }
            };

            var globalFunc = jasmine.createSpy();

            communjs.modules("legacyModule").sandbox = {
                globals: {
                    someGlobal: globalFunc
                }
            };

            require('/legacyModule');

            expect(globalFunc).toHaveBeenCalled();
        });
    });

    describe('_communjs/internal', function () {
        it('is require-able', function () {
            var communjsInternals = require('_communjs/internal');

            expect(communjsInternals).toBeTruthy();
        });
    });

    describe('require', function () {

        it('returns core modules over user modules', function () {
            internals.coreModuleCache.someModule = {
                exports: {
                    prop: 5
                }
            };

            internals.userModuleCache.someModule = {
                exports: {
                    prop: 10
                }
            };

            var someModule = require('someModule');

            expect(someModule.prop).toBe(5);
            delete internals.coreModuleCache.someModule;
        });

        it("returns absolute modules from userModuleCache", function () {
            var absModule = {};
            internals.userModuleCache = {
                "/absModule": {
                    exports: absModule
                }
            };

            var mod = require('/absModule');

            expect(mod).toBe(absModule);
        });

        it('returns modules referenced relatively', function () {
            var relModule = {};

            internals.userModuleCache = {
                "/someFolder/relModule": {
                    exports: relModule
                }
            };

            var mod = internals.require('./relModule', '/someFolder/anotherModule.js');

            expect(mod).toBe(relModule);

            mod = internals.require('../relModule', '/someFolder/anotherFolder/anotherMod.js');

            expect(mod).toBe(relModule);

            mod = internals.require('./someFolder/relModule', "/");

            expect(mod).toBe(relModule);
        });

        it("handles folders as modules", function () {
            var module = "a module relative to main";
            internals.userModuleCache = {
                "/someFolder": {
                    packageJson: '{ "main": "./main/someFile.js" }',
                    mainScript: {
                        name: "/someFolder/main/someFile.js",
                        rawText: "exports.a = require('./a')"
                    }
                },
                "/someFolder/main/a": {
                    exports: module
                }
            };

            expect(require("/someFolder").a).toBe(module);
        });

        describe('node_modules', function () {

            communjs.includeNodeModulesInSearch = true;


            it("allows support for node_modules to be configured", function () {
                internals.userModuleCache = {
                    "/node_modules/someLib": {
                        exports: "someLib"
                    }
                };

                communjs.includeNodeModulesInSearch = false;

                expect(function () { require('someLib'); }).toThrow(new Error('[communjs] Module: someLib could not be found.'));

                communjs.includeNodeModulesInSearch = true;

                expect(require('someLib')).toBe("someLib");
            });

            it("doesn't include normal modules in node_module search", function () {
                var module = "module";
                var nodeModule = "nodeModule";

                internals.userModuleCache = {
                    "module": {
                        exports: module
                    },
                    "/module": {
                        exports: module
                    },
                    "/node_modules/module": {
                        exports: nodeModule
                    }
                };

                var mod = require('module');
                expect(mod).toBe(nodeModule);
            });

            it('loads from file in node_modules at the base path', function () {
                var nodeFileModule = {};
                internals.userModuleCache = {
                    "/node_modules/fileModule": {
                        exports: nodeFileModule
                    }
                };

                var mod = require('fileModule');

                expect(mod).toBe(nodeFileModule);
            });


            it('tries to find module in current and parent directory node_modules folder', function () {
                var requireOrigin = "/a/b/c.js";

                internals.userModuleCache = {
                    "/node_modules/nodeModule": {
                        exports: "base node module"
                    },
                    "/a/node_modules/nodeModule": {
                        exports: "/a node module"
                    },
                    "/a/b/node_modules/nodeModule": {
                        exports: "/a/b node module"
                    }
                };

                var mod = internals.require('nodeModule', requireOrigin);

                expect(mod).toBe("/a/b node module");

                delete internals.userModuleCache["/a/b/node_modules/nodeModule"];

                mod = internals.require('nodeModule', requireOrigin);

                expect(mod).toBe("/a node module");

                delete internals.userModuleCache["/a/node_modules/nodeModule"];

                mod = internals.require('nodeModule', requireOrigin);

                expect(mod).toBe("base node module");
            });
        });
    });



    describe("nodeModulePaths", function () {
        var nodeModulePaths = internals.nodeModulePaths;

        it("returns three paths for /a/b", function () {
            expect(nodeModulePaths("/a/b")).toEqual(["/a/b/node_modules/", "/a/node_modules/", "/node_modules/"]);
        });
    });

    describe("getDependencies", function () {
        var getDependencies = internals.getDependencies;

        it("returns null when there are no dependencies", function () {
            var rawText = "var a = 5; exports.b = a * 5;";

            expect(getDependencies(rawText)).toBe(null);
        });

        it("returns an array with the module names used in the requires", function () {
            var rawText = "var a = require('a'), b = require('b');\n\n var c = require('c');";

            expect(getDependencies(rawText)).toEqual(['a', 'b', 'c']);
        });
    });

    describe("loadDependency", function () {
        var loadDependency = internals.loadDependency;

        var originalLoadScript = internals.loadScript;

        beforeEach(function () {
            internals.userModuleCache = {};
        });

        afterEach(function () {
            internals.loadScript = originalLoadScript;
        });

        it("does not call loadScript for core modules", function () {
            spyOn(internals, "loadScript");
            spyOn(internals, "alreadyLoaded").andCallThrough();

            var onComplete = jasmine.createSpy();

            loadDependency('window', "", onComplete);

            expect(internals.loadScript).not.toHaveBeenCalled();

            expect(internals.alreadyLoaded).toHaveBeenCalledWith('window');
            expect(onComplete).toHaveBeenCalled();
        });

        it("does not call loadScript for user modules that have been loaded", function () {
            internals.userModuleCache = {
                "/a": {}
            };

            spyOn(internals, "loadScript");
            spyOn(internals, "alreadyLoaded").andCallThrough();

            var onComplete = jasmine.createSpy();

            loadDependency('/a', "", onComplete);

            expect(internals.loadScript).not.toHaveBeenCalled();

            expect(internals.alreadyLoaded).toHaveBeenCalledWith('/a');
            expect(onComplete).toHaveBeenCalled();

        });

        var console = require('console');

        it("loads absolute modules", function () {
            spyOn(internals, 'loadScript').andCallFake(function (moduleName, onDone) {
                expect(moduleName).toBe('/a.js');
                onDone("absolute module text");
            });

            var onComplete = jasmine.createSpy().andCallFake(function () {
                expect(internals.userModuleCache["/a"].rawText).toBe("absolute module text");
            });

            loadDependency('/a', "", onComplete);

            expect(onComplete).toHaveBeenCalled();
            expect(internals.loadScript).toHaveBeenCalled();

        });

        it("loads relative modules", function () {
            spyOn(internals, 'loadScript').andCallFake(function (moduleName, onDone) {
                expect(moduleName).toBe('/someFolder/a.js');
                onDone("relative module text");
            });

            var onComplete = jasmine.createSpy().andCallFake(function () {

                expect(internals.userModuleCache["/someFolder/a"].rawText).toBe("relative module text");
            });

            loadDependency('./a', "/someFolder/", onComplete);

            expect(onComplete).toHaveBeenCalled();
            expect(internals.loadScript).toHaveBeenCalled();
        });

        it("loads folder modules with package.json", function () {

            spyOn(internals, 'loadScript').andCallFake(function (moduleName, onDone, onFail) {
                if (moduleName === "/someFolder.js") {
                    onFail();
                } else  if (moduleName === "/someFolder/package.json") {
                    onDone('{ "main": "./lib/main.js" }');
                } else if (moduleName === "/someFolder/lib/main.js") {
                    onDone("folder module");
                } else {
                    throw new Error("loadScript called with unexpected module name: " + moduleName);
                }
            });

            var onComplete = jasmine.createSpy("dependencyLoaded").andCallFake(function () {
                expect(internals.userModuleCache["/someFolder"]).toEqual({
                    packageJson: '{ "main": "./lib/main.js" }',
                    mainScript: {
                        name: "/someFolder/lib/main.js",
                        rawText: "folder module"
                    }
                });
            });

            loadDependency('/someFolder', "/", onComplete);

            expect(onComplete).toHaveBeenCalled();
            expect(internals.loadScript).toHaveBeenCalled();
        });

        it('loads folder modules without package.json falling back to using index.js', function () {
            spyOn(internals, 'loadScript').andCallFake(function (moduleName, onDone, onFail) {
                if (moduleName === "/someFolder.js" || moduleName === "/someFolder/package.json") {
                    onFail();
                } else if (moduleName === "/someFolder/index.js") {
                    onDone("index.js for folder module");
                } else {
                    throw new Error("loadScript called with unexpected module name: " + moduleName);
                }
            });

            var onComplete = jasmine.createSpy("dependencyLoaded").andCallFake(function () {

                expect(internals.userModuleCache["/someFolder"]).toEqual({
                    mainScript: {
                        name: "/someFolder/index.js",
                        rawText: "index.js for folder module"
                    }
                });
            });

            loadDependency('/someFolder', "", onComplete);

            expect(onComplete).toHaveBeenCalled();
            expect(internals.loadScript).toHaveBeenCalled();
        });

        it('fails silently when index.js does not exist', function () {
            spyOn(internals, 'loadScript').andCallFake(function (moduleName, onDone, onFail) {
                if (moduleName === "/someFolder.js" || moduleName === "/someFolder/package.json" || moduleName === "/someFolder/index.js") {
                    onFail();
                } else {
                    throw new Error("loadScript called with unexpected module name: " + moduleName);
                }
            });

            var onComplete = jasmine.createSpy("dependencyLoading finished").andCallFake(function () {
                expect(internals.userModuleCache).toEqual({});
            });

            loadDependency("/someFolder", "", onComplete);

            expect(onComplete).toHaveBeenCalled();
            expect(internals.loadScript).toHaveBeenCalled();
        });
    });

    describe("resolve", function () {
        var resolve = internals.resolve;

        it("handles paths relative to the root", function () {
            var base = "/";

            var relPath = "./a";

            var abs = resolve(relPath, base);

            expect(abs).toBe("/a");

            relPath = "./a/b";

            abs = resolve(relPath, base);

            expect(abs).toBe("/a/b");
        });

        it("handles paths relative to a sub node of root", function () {
            var base = "/base/";

            var relPath = "./a";

            var abs = resolve(relPath, base);

            expect(abs).toBe("/base/a");

            relPath = "../a";

            abs = resolve(relPath, base);

            expect(abs).toBe("/a");
        });
    });

    describe("getBasePath", function () {
        var getBasePath = internals.getBasePath;

        it("handles file at root", function () {
            var file = "/a";

            var basePath = getBasePath(file);

            expect(basePath).toBe("/");

            file = "/a.js";

            basePath = getBasePath(file);

            expect(basePath).toBe("/");
        });

        it("handles files at lower levels in the tree", function () {
            var file = "/a/b";

            var basePath = getBasePath(file);

            expect(basePath).toBe("/a/");

            file = "/a/b/c";

            basePath = getBasePath(file);

            expect(basePath).toBe("/a/b/");
        });
    });
});
