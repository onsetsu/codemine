"use strict";

import LDDocumentFeatureSpace from './../../src/lda/lddocumentfeaturespace';
import assert from 'assert';

describe('LDA', function() {
    describe('LDDocumentFeatureSpace', function () {
        var firstDocument = ['foo', 'bar', 'blub'],
            secondDocument = ['bar', 'bar', 'blub', 'baz'],
            featureSpace;

        beforeEach(() => {
            featureSpace = new LDDocumentFeatureSpace();
        });

        describe('represent/representAll', function () {
            it('should return the indices representing the given words', function () {
                assert.deepEqual([0, 1, 2], featureSpace.representAll(firstDocument));
                assert.deepEqual([1, 1, 2, 3], featureSpace.representAll(secondDocument));

                // show mapping of features to ids
                //featureSpace.featureIdMap.forEach((value, key) => console.log(key, '>', value));
                //featureSpace.idFeatureMap.forEach((value, key) => console.log(key, '>', value));

                // show entries in document-word matrix
                //featureSpace.documentFeatureCounts.forEach((value, key) => console.log(key, value));
            });
        });

        describe('interpret/interpretAll', function () {
            it('should return the indices previously saved', function () {
                featureSpace.representAll(firstDocument);
                featureSpace.representAll(secondDocument);

                assert.equal('bar', featureSpace.interpret(1));
                assert.deepEqual(['foo', 'baz'], featureSpace.interpretAll([0, 3]));
            });
        });

        describe('featureCount', function () {
            it('should return the number of different features contained by the documents', function () {
                assert.equal(0, featureSpace.featureCount());
                featureSpace.representAll(firstDocument);
                assert.equal(3, featureSpace.featureCount());
                featureSpace.representAll(secondDocument);
                assert.equal(4, featureSpace.featureCount());
            });
        });
    });
});
