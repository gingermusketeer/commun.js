/*{
    "description": "Example configuration file."
}*/

/*global require*/

'use strict';

//--------------------------------DEPENDENCIES-------------------------------------

var communjs = require('_communjs/config');

//--------------------------------CONFIGURATION--------------------------------

// change the default handler for modules without a handler specified
// and those with no extension from javascript to something else e.g. coffeescript

// communjs.defaultModuleHandler = function (rawText, moduleName) {
//     //...
// };

// dont just return json files. Parse them first
communjs.modules(/.json$/).handler = function (rawText, moduleName) {
    return JSON.parse(rawText);
};



// when loading any module with someLib in the name
// configure the execution context so that the objects normally
// exposed in the global space can be captured and returned privately
// also global dependencies can be added.
communjs.modules(/someLib/).sandbox = {
    globals: {
        expectedGlobal: 5
    },
    exports: [
        "somefeature"
    ]
};
