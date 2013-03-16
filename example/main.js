/*jshint evil:true */
/*global document:true, require: false*/
'use strict';

var console = require('console');
var document = require('document');
var subModule = require('example/subModule');

console.log("main is here");

var p = document.createElement('p');
p.innerHTML = "hello from main";
document.body.appendChild(p);

p = document.createElement('p');
p.innerHTML = "subModule\'s exports are:<pre>" + JSON.stringify(subModule) + "</pre>";
document.body.appendChild(p);
