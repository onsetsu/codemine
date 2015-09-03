"use strict";

import codemine from './../../src/codemine/codemine';
var assert = require("assert");

describe('Codemine', function() {
    describe('Codemine', function () {
        describe('local workflow', function () {
            it('should return without an error', function (done) {
                codemine.start(
                    //codemine.githuRepo({user: 'onsetsu', repo: 'bloob', ref: 'master'})
                    //codemine.localFolder('sample/bloob/')
                    codemine.localFolder('out/src/lda')
                )
                    .then(codemine.traverseDir('**/*.js'))
                    .then(codemine.readFiles)
                    .then(codemine.attachAsts)
                    .then(codemine.extractTextToTopicModel)
                    // compute 10 topics using 20 iterations
                    .then(codemine.computeTopicsForIterations(10, 20))
                    .then(codemine.showAllTopics)
                    .then(done);
            });
        });
    });
});
