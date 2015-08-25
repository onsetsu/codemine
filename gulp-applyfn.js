var gulp = require('gulp');
var through = require('through2');
var gutil = require('gulp-util');
var PluginError = gutil.PluginError;

// consts
const PLUGIN_NAME = 'gulp-applyfn';

// plugin level function (dealing with files)
function applyFunction(fn) {
    if (!fn) {
        throw new PluginError(PLUGIN_NAME, 'Missing function!');
    }

    // creating a stream through which each file will pass
    var stream = through.obj(function(file, enc, cb) {
        fn(file, file.contents.toString(enc));

        cb(null, file);
        // or:
        // make sure the file goes through the next gulp plugin
        // this.push(file);
        // tell the stream engine that we are done with this file
        // cb();
    });

    // returning the file stream
    return stream;
}

// exporting the plugin main function
module.exports = applyFunction;
