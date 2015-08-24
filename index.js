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

var testAST = esprima.parse(`/*
 * Life, Universe, and Everything
 */
function answer() {
    var answer = 6 * 7;

    // returning the answer
    return answer;
    // this is after the return O_o
}

answer(6, 7);`);

console.log(testAST);

estools.traverse(testAST, {
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
});

console.log('------------ FS ------------');
var fs = require('fs');
fs.readFile('index.js', 'utf8', function(err, data) {
    if (err) {
        return console.log(err);
    }
    //console.log(data);
});

console.log('------------ GULP ------------');
var gulp = require('gulp');
var gulpCodemine = require('./gulp-codemine');

gulp.task('codemine', function () {
    return gulp.src('sample/**/*.js')
        .pipe(gulpCodemine(function(x) { console.log(x); }));
});

gulp.start('codemine');