

/*global module */
module.exports = function (grunt) {
    "use strict";
    // Project configuration
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        jshint: {
            all: [ 'Gruntfile.js', 'src/**/*.js', 'example/**/*.js' ],
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
        }
    });

    grunt.loadNpmTasks('grunt-contrib-jshint');

    // Default task
    grunt.registerTask('default', ['jshint']);
};
