"use strict";

/*
 * POLYFILL
 * https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/String/endsWith
 */
if (!String.prototype.endsWith) {
    String.prototype.endsWith = function(searchString, position) {
        var subjectString = this.toString();
        if (position === undefined || position > subjectString.length) {
            position = subjectString.length;
        }
        position -= searchString.length;
        var lastIndex = subjectString.indexOf(searchString, position);
        return lastIndex !== -1 && lastIndex === position;
    };
}

var gulp = require('gulp');
var gulpApplyFn = require('./../../src/gulp/gulp-applyfn');
var assert = require("assert");

describe('GulpFN', function() {
    describe('gulp-applyfn', function () {
        it('should parse files asynchronously', function (done) {
            var timesCalled = 0;

            gulp.task('codemine', function() {
                var stream = gulp.src('package.json')
                    .pipe(gulpApplyFn(function(file, sourceCode) {
                        timesCalled++;
                        assert(file.path.endsWith('package.json'));
                    }));

                stream.on('end', function() {
                    assert.equal(1, timesCalled);
                    done();
                });
                stream.on('error', function(error) {
                    console.log('ERROR', error);
                });

                return stream;
            });

            gulp.start('codemine');
        });
    });
});
