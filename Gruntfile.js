

/*global module, require */
module.exports = function (grunt) {
    "use strict";
    // Project configuration
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        jshint: {
            all: [ 'Gruntfile.js', 'src/**/*.js', 'example/**/*.js', "test/spec/**/*.js"],
            options: {
                curly: true,
                eqeqeq: true,
                immed: true,
                latedef: true,
                newcap: true,
                noarg: true,
                sub: true,
                undef: true,
                boss: true,
                eqnull: true,
                globalstrict: true,
                indent: 4
            }
        },
        jasmine: {
            src: 'src/**/*.js',
            options: {
                specs: 'test/spec/*.spec.js',
                template: require('test/helper/template-jasmine-communjs'),
                templateOptions: {

                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-jasmine');

    grunt.registerTask('test', 'jasmine');

    // Default task
    grunt.registerTask('default', ['jshint', 'test']);
};
