# commun.js

A browser based commonjs module 1.0 compliant module loader.

## why communjs
- commonjs modules 1.0 compliance (same as node)
- cross browser
    - chrome  -> Yes
    - firefox -> Yes
    - safari  -> Yes
    - opera   -> Yes
    - IE 9    -> Yes
    - IE 8    -> Yes
- sandboxing modules from browser environment
    - ```var document = require('document');```
- simple syntax
    - A file is treated as a module and the only things exposed from the file is done explicitly through it exports
    - ```exports.awesomeFunctionality = ...```

## getting started

Download the source file (src/commun.js) and include it in your html as shown below

```<script data-main="main.js" src="commun.js"></script>```

where main.js is something like

    var document = require('document');
    var history = require('history');
    var awesomeModule = require('something/like/this')

    awesomeModule.be()

## trying it out

    npm install

    node serve

    visit localhost:8080

checkout the source code in the example directory


## Contributing
In lieu of a formal style-guide, take care to maintain the existing coding style. Add Jasmine tests for any new or changed functionality. Lint and test your code using [grunt](https://github.com/gruntjs/grunt).

## Acknowledgements

[acorn.js](https://github.com/marijnh/acorn) powers the parser used to detect syntax errors when a script fails to load.

## License
Copyright (c) 2013 Max Brosnahan
Licensed under the MIT license.
