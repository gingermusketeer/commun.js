/*jshint evil: true*/
/*global window, history, console, alert, XMLHttpRequest, navigator, ActiveXObject, document*/
(function () {
    "use strict";
    //--------------------------------'SANDBOX'----------------------------------

    function execWith(context, code, sourceUrl) {
        /*
        magic code which uses with to create a sandbox and an anonymous
        function to hide the sandbox otherwise it could be referenced through
        'this'. The only variable from here that breaks through the sandbox is
        _ß_toEval and it has been named such that it should not collide with the
        script. However it does not really matter if it is overridden.
      */
        var evalCode = "with(this){return (function(){var exports = {}; eval(_ß_toEval); return exports; }.call({})) }";

        // eval via function so that the current scope is not included.
        var func = new Function("_ß_toEval", evalCode);

        // Do the actual eval
        return func.call(context, code + '//@ sourceURL=' + sourceUrl);
    }

    //--------------------------------AJAX---------------------------------------

    function createXHR()
    /*{
    description: "creates cross browser compliant AJAX object.",
    returns: "An ajax object."
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
    description: "Get the source file as a string from the server",
    params: [
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
                if (xhr.status !== 200) {
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

    var require = function (moduleName)
    /*{
    description: "Common js require function. This function relies on modules being pre-fetched and available when needed.",
    params: "The name of the module that to be returned.",
    returns: "The module that was requested."

  }*/
    {
        if (sysModuleCache.hasOwnProperty(moduleName)) {
            return sysModuleCache[moduleName];
        } else {
            // try and find it in the list of prefetched modules retrieved from the server
            return moduleCache[moduleName].exports;
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
        _: undefined,

        /* add commonjs module loader API */
        require: require,
        environment: "do something with this common js? global"
    };



    function prefetchDeps(rawCode, onComplete)
    /*{
    "description": "Given some source code all the dependencies are required so that they are available during execution."
  }*/
    {
        var rawRequires = rawCode.match(/require\((?:\'|\")[\S]*(?:\'|\")\)/gm); //find require calls returns ["require('something')"] does not take into account comments
        if (rawRequires) {
            var depModules = rawRequires.map(function (current) {
                //split the inner string out and get the second thing. this is the module name
                return current.split(/\'|\"/)[1];
            });

            // iterate through all the deps and load them

            var execDeps = function execDeps(deps, index) {
                if (index < deps.length) {
                    if (alreadyLoaded(deps[index])) {
                        execDeps(deps, index + 1);
                    } else {
                        // Load the dependency and when finished load the next one. // this could be done in parallel ??
                        execScript(deps[index] + '.js', function (exports) {
                            moduleCache[deps[index]] = {
                                exports: exports
                            };

                            // load next dep
                            execDeps(deps, index + 1);
                        });
                    }
                } else {
                    //all deps are loaded so bail
                    onComplete();
                }

            };

            // Start loading deps
            execDeps(depModules, 0);
        } else {
            onComplete();
        }
    }

    function execScript(fileName, onComplete)
    /*{
    "description": "Executes a remote script. Before execution all the dependencies are loaded.",
    "params": [
      {
        "description": "name of the remote script to execute",
        "exampleVal": "main.js"
      },
      {
        "description": "function to call when the script has been loaded.",
        "exampleVal": "function(exports){}",
        params: "the exports from the module that was loaded."
      }
    ]
  }*/
    {
        getRawCode(fileName, function (rawCode) {
            prefetchDeps(rawCode, function () {
                var exports = execWith(context, rawCode, fileName);
                onComplete(exports);
            });
        },

        function () {
            console.log("could not load: " + fileName);
            onComplete();
        });
    }


    // find the script tag that references the initial module (normally main.js) and load it
    var scripts = document.getElementsByTagName('script');
    for (var i = scripts.length - 1; i >= 0; i--) {
        var script = scripts[i];
        var dataMain = script.getAttribute('data-main');
        if (dataMain) {
            /*jshint loopfunc: true*/
            execScript(dataMain, function (exports) {
                console.log("data-main loaded");
            });
        }
    }

}());
