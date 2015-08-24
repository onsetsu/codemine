"use strict";

class WordIndexMapper {
    constructor() {
        this.indexByWord = new Map();
        this.wordByIndex = new Map();
    }

    hasWord(word) {
        return this.indexByWord.has(word);
    }
}

var esprima = require('esprima');
var estools = require('estools');

var logVisitor = {
    enter: function(node, parent) {
        switch(node.type) {
            case 'Literal':
                console.log(node.type, node.value);
                break;
            case 'Identifier':
                console.log(node.type, node.name);
                break;
            default:
                console.log(node.type);
                break;
        }
    }
};

console.log('------------ GULP ------------');
var gulp = require('gulp');
var gulpApplyFn = require('./gulp-applyfn');

gulp.task('codemine', function () {
    return gulp.src('sample/**/*.js')
        .pipe(gulpApplyFn(function(sourceCode) {
            var ast = esprima.parse(sourceCode);
            estools.traverse(ast, logVisitor);
        }));
});

gulp.start('codemine');