"use strict";

import LDDocumentFeatureSpace from './../../src/lda/lddocumentfeaturespace';
var assert = require("assert");

describe('LDA', function() {
    describe('LDDocumentFeatureSpace', function () {
        describe('represent/representAll', function () {
            it('should return the indices representing the given words', function () {
                var space = new LDDocumentFeatureSpace();

                assert.deepEqual([0, 1, 2], space.representAll(['foo', 'bar', 'blub']));
                assert.deepEqual([1, 1, 2, 3], space.representAll(['bar', 'bar', 'blub', 'baz']));

                // show mapping of features to ids
                //space.featureIdMap.forEach((value, key) => console.log(key, '>', value));
                //space.idFeatureMap.forEach((value, key) => console.log(key, '>', value));

                // show entries in document-word matrix
                //space.documentFeatureCounts.forEach((value, key) => console.log(key, value));
            });
        });

        describe('interpret/interpretAll', function () {
            it('should return the indices previously saved', function () {
                var space = new LDDocumentFeatureSpace();

                space.representAll(['foo', 'bar', 'blub']);
                space.representAll(['bar', 'bar', 'blub', 'baz']);

                assert.equal('bar', space.interpret(1));
                assert.deepEqual(['foo', 'baz'], space.interpretAll([0, 3]));
            });
        });

        describe('featureCount', function () {
            it('should return the number of different features contained by the documents', function () {
                var space = new LDDocumentFeatureSpace();

                assert.equal(0, space.featureCount());
                space.representAll(['foo', 'bar', 'blub']);
                assert.equal(3, space.featureCount());
                space.representAll(['bar', 'bar', 'blub', 'baz']);
                assert.equal(4, space.featureCount());
            });
        });
    });
});
