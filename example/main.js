/*global document:true, require: false, console*/
'use strict';
var document = require('document');

var p = document.createElement('p');
p.innerHTML = "hello from main";
document.body.appendChild(p);

console.log("main is here");


var subModule = require('./subModule');

var div = document.createElement('div');
div.innerHTML = "subModule\'s exports are:<pre>" + JSON.stringify(subModule) + "</pre>";
document.body.appendChild(div);
