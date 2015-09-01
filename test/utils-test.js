"use strict";

var sumItems = require('./../src/utils').sumItems;
var assert = require("assert");

describe('utils', function() {
    describe('sumItems', function () {
        it('should sum up the numbers in the given Array', function () {
            assert.equal(76, sumItems([1,4,68,3]));
        });
    });
});
