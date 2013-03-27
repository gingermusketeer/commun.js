/*global document:true, require, exports*/
"use strict";

var document = require('window').document;
var console = require('console');
var p = document.createElement('p');
require('aNodeModule');

p.innerHTML = "hello from submodule";
document.body.appendChild(p);


exports.test = "testing submodules";

exports.anotherTest = function () {
    return "yea baby";
}.toString();
