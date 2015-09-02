"use strict";

import LDAllocator from './../../src/lda/allocator';
var utils = require('./../../src/utils'),
    sumItems = utils.sumItems,
    zipMap = utils.zipMap;
var assert = require("assert");

describe('LDA', function() {
    describe('LDAllocator', function () {
        describe('allocateIteratingFeaturesTopics', function () {
            it('should return the learned topic model', function () {
                var sixDocs = [
                    [0, 1, 2],
                    [0, 1, 1, 1],
                    [0, 0, 2],
                    [2, 3, 4],
                    [3, 4],
                    [2, 4, 3, 2]
                ];

                var lda = new LDAllocator();
                var model = lda.allocateIteratingFeaturesTopics(sixDocs, 100, 5, 2);

                //console.log(model.featuresForTopicAt(0));
                //console.log(model.featuresForTopicAt(1));
                var actualWordOccurences = zipMap(
                    model.featuresForTopicAt(0),
                    model.featuresForTopicAt(1),
                    // sum up the occurences of each word in both topics
                    (numWordIOfTopicAt0, numWordIOfTopicAt1) => numWordIOfTopicAt0 + numWordIOfTopicAt1
                );
                assert.deepEqual([4, 4, 5, 3, 3], actualWordOccurences);

                //console.log(model.topicsForDocumentAt(5));
                // expect the topic counts to sum up to 4 as document 5 consists of 4 words
                assert.equal(4, sumItems(model.topicsForDocumentAt(5)));

                //console.log(model.documentSimilarityOfAnd(0, 1));
                //console.log(model.documentSimilarityOfAnd(4, 5));
                //console.log(model.documentSimilarityOfAnd(1, 5));
            });
        });
    });
});
