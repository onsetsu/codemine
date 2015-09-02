"use strict";

var utils = require('./../src/utils'),
    sumItems = utils.sumItems,
    zipMap = utils.zipMap;
var assert = require("assert");

describe('utils', function() {
    describe('sumItems', function () {
        it('should sum up the numbers in the given Array', function () {
            assert.equal(76, sumItems([1,4,68,3]));
        });
    });
    
    describe('zipMap', function () {
        it('should invoke the given map function with a pair of same-indexed elements', function () {
            assert.deepEqual([7, 9, 11], zipMap([1,2,3,4,5], [6,7,8], (a, b) => a + b));
        });
    });
});
