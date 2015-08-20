import * as esprima from 'esprima'

console.log(esprima);
console.log(esprima.parse(`/*
 * Life, Universe, and Everything
 */
function answer() {
    var answer = 6 * 7;

    // returning the answer
    return answer;
    // this is after the return O_o
}

answer(6, 7);`));
