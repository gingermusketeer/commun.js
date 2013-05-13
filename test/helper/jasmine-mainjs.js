<% scripts.specs.forEach(function(script){ %>
require('../../<%= script %>');
<% }); %>

var window = require('window');
var document = require('document');
var jasmineEnv = jasmine.getEnv();

jasmineEnv.updateInterval = 1000;
var htmlReporter = new jasmine.HtmlReporter();
jasmineEnv.addReporter(htmlReporter);

jasmineEnv.specFilter = function(spec) {
    return htmlReporter.specFilter(spec);
};

var currentWindowOnload = window.onload;

if (document.readyState !== 'complete') {
    window.onload = function() {
        if (currentWindowOnload) {
            currentWindowOnload();
        }
        jasmineEnv.execute();
    };
} else {
    console.log("exec");
    jasmineEnv.execute();
}
