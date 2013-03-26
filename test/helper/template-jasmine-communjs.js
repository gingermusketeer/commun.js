"use strict";

var templatePath = __dirname + '/jasmine-communjs.html',
    mainjsTemplatePath = __dirname + '/jasmine-mainjs.js',
    communjs = __dirname + '/../../src/commun.js';

exports.process = function processTemplate(grunt, task, context) {

    var mainScript = context.options.mainScript || "main.js";
    context.options.mainScript = mainScript;

    context.scripts.specs.forEach(function(script, i, scripts) {
        scripts[i] = scripts[i].replace("./", "")
    });

    var mainjsTemplateSource = grunt.file.read(mainjsTemplatePath);
    var mainjsFile = grunt.util._.template(mainjsTemplateSource, context);

    task.writeTempFile('main.js', mainjsFile);
    task.copyTempFile(communjs, 'commun.js');

    var templateSource = grunt.file.read(templatePath);
    return grunt.util._.template(templateSource, context);
}
