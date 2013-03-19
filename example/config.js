//example configuration file
/*global require*/

// This is only available in config file not normal files
var communjs = require('__communjsLib__'),
    console = require('console'),
    EXPORT = true,
    NO_EXPORT = false;


// change the default handler for modules without a handler specified
// and those with no extension from javascript to something else e.g. coffeescript
communjs.defaultFileExtensionHandler = function(rawText, moduleName) {
    //...
};

// dont execute json files but parse them instead
communjs.fileExtension('json').handler = function(rawText){
    return JSON.parse(rawText);
}


// translate coffeescript files and then execute them. Return the exports.
communjs.fileExtension('coffee').handler = function(rawText, javascriptEvaluator){
    var javascript = coffeescript.translate(rawtext);

    return javascriptEvaluator(javascript);
}

//when loading any module with jQuery in the name
// configure the execution context so that the objects normally
// exposed in the global space can be captured and returned privately
communjs.setSandboxConfig(/jQuery/, {
    globalExports: {
        $: NO_EXPORT,
        jQuery: EXPORT
    },
    allowGlobals: [
        "window", "history"
    ]
});

// explicit match to the absolute module identifier for jasmine
// when more then one global is exported they will be available via module.[global]
communjs.setSandboxConfig('vendor/jasmine', {
    globalExports: {
        jasmine: EXPORT,
        describe: EXPORT,
        it: EXPORT,
        expect: EXPORT
    }
});

communjs.logger = console.log;

