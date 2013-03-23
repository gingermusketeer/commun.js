/*jshint evil: true*/
/*global window, history, console, alert, XMLHttpRequest, navigator, ActiveXObject, document*/
(function () {
    "use strict";

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

    function execWith(context, code, sourceUrl, exports) {
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
        var func = new Function("_ß_arg", "exports", evalCode);


        var arg = {
            source: code + '//@ sourceURL=' + sourceUrl,
            require: require,
            requireOrigin: sourceUrl
        };
        // Do the actual eval
        func.call(context, arg, exports);
    }

    //--------------------------------AJAX---------------------------------------

    function createXHR()
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
    }

    function getRawCode(filePath, onSuccess, onFail)
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
        var xhr = createXHR();
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
    }

    //--------------------------------MODULE LOADER---------------------------------

    // This is where the user modules will be cached
    var moduleCache = {};

    // This is where the modules provided by the browser are stored.
    var sysModuleCache = {
        window: window,
        document: document,
        navigator: navigator,
        history: history,
        console: console
    };

    function isPathRelative(path)
    /*{
        "description": "Tests if the path passed in is relative (contains ./ or ../)"
    }*/
    {
        return path.indexOf('./') !== -1 || path.indexOf('../') !== -1;
    }

    function resolve(path, basePath)
    /*{
        "description": "Determines the absolute path from the relative path and its base"
    }*/
    {
        basePath = basePath || "";
        if (isPathRelative(path)) {
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
            return pieces.join('/');
        } else {
            //it is absolute already so just return it
            return path;
        }
    }

    function getBasePath(requireOrigin)
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

    }

    var require = function require(moduleName, requireOrigin, cache)
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
            moduleCache = cache;
        }

        if (sysModuleCache.hasOwnProperty(moduleName)) {
            return sysModuleCache[moduleName];
        } else {
            var resolvedName = resolve(moduleName, getBasePath(requireOrigin));
            resolvedName = resolvedName.replace(/\.js$/, "");
            // try and find it in the list of prefetched modules retrieved from the server
            if (moduleCache[resolvedName]) {
                var module = moduleCache[resolvedName];
                //we tried to load it
                if (module.exports) {
                    // we have already executed it
                    return module.exports;
                } else if (module.rawText || module.rawText === "") {
                    //we have the code just need to execute it
                    module.exports = {}; //predefine the exports so that cyclic and reflexive imports are possible
                    execWith(context, module.rawText, resolvedName, module.exports);

                    // delete rawText ???

                    return module.exports;
                } else {
                    //we don't have the code so the module failed to be prefetched or someone has touched the cache
                    throw  new Error("module: " + resolvedName + " prefetch failed");
                }
            } else {
                // Either module could not be found on the server or someone has touched the cache.
                throw new Error("module:" + resolvedName + " could not be found.");
            }
        }
    };

    function alreadyLoaded(moduleName)
    /*{
        "description": "Checks if a module has already been loaded."
    }*/
    {
        return sysModuleCache.hasOwnProperty(moduleName) || moduleCache.hasOwnProperty(moduleName);
    }

    // module globals
    var context = {
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

    function prefetchDeps(rawCode, basePath, onComplete)
    /*{
        "description": "Given some source code all the dependencies are prefetched but not executed so that they are available to require calls."
    }*/
    {
        var rawRequires = rawCode.match(/require\((?:\'|\")[\S]*(?:\'|\")\)/gm); //find require calls returns ["require('something')"] does not take into account comments
        if (rawRequires) {
            var depModules = rawRequires.map(function (current) {
                //split the inner string out and get the second thing. this is the module name
                return current.split(/\'|\"/)[1];
            });

            // iterate through all the deps and load them
            var loadDeps = function loadDeps(deps, index) {
                if (index < deps.length) {
                    var dep = deps[index];
                    if (alreadyLoaded(dep)) {
                        loadDeps(deps, index + 1);
                    } else {
                        var depBasePath = basePath;
                        if (isPathRelative(dep)) {
                            depBasePath = resolve("./" + getBasePath(dep), basePath);
                        }

                        // Load the dependency and when finished load the next one. // this could be done in parallel ??
                        loadScript(resolve(dep, basePath) + '.js', depBasePath, function onLoaded(rawText, moduleName) {
                            moduleCache[moduleName] = {
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
    }

    function loadScript(fileName, basePath, onComplete) {
        console.log("loading script " + fileName);
        getRawCode(fileName, function (rawCode) {
            prefetchDeps(rawCode, getBasePath(fileName), function () {
                onComplete(rawCode, fileName.replace(/\.js$/, ""));
            });

        },
        function (xhr) {
            console.log("could not load: " + fileName);
            onComplete();
        });
    }

    //----------------------------KICKSTART------------------------------------

    // find the script tag that references the initial module (normally main.js) and load + exec it
    var scripts = document.getElementsByTagName('script');
    for (var i = scripts.length - 1; i >= 0; i--) {
        var script = scripts[i];
        var mainScriptName = script.getAttribute('data-main');
        if (mainScriptName) {

            /*jshint loopfunc: true*/
            loadScript(mainScriptName, "", function (rawCode) {
                if (rawCode) {
                    execWith(context, rawCode, mainScriptName, {});
                    console.log("data-main script: " + mainScriptName + " loaded and executed");
                } else {
                    console.log("data-main script: " + mainScriptName + " could not be loaded");
                }

            });
        }
    }

}());
