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

import * as esprima from 'esprima'
import * as estools from 'estools'
import * as gulp from 'gulp'

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
