"use strict";

import LDDocumentFeatureSpace from './lddocumentfeaturespace';
import LDMultinomial from './ldmultinomial';
var utils = require('./../utils'),
    packKeys = utils.packKeys,
    sumItems = utils.sumItems,
    zipMap = utils.zipMap,
    timesDo = utils.timesDo,
    fillArray = utils.fillArray,
    range = utils.range,
    Random = utils.Random;

var esprima = require('esprima');
var estools = require('estools');

var Matrix = require('./../math/matrix').Matrix;
import LDModel from './model';

class LDAllocator {
    allocateIteratingFeaturesTopics(docs, numIterations, numFeatures, numTopics) {
        // Train model with given documents for given number of iterations.
        //console.log('LDA THERE');
        this.setupForDocumentsFeatureCountTopicCount(docs, numFeatures, numTopics);
        this.randomize();
        for(var i = 0; i < numIterations; i++) {
            this.update();
        }
        return this.model();
    }

    associateFeatureWithDocAndTopic(feature, doc, topic) {
        this.associateFeatureWithDocAndTopicBy(feature, doc, topic, 1);
    }

    associateFeatureWithDocAndTopicBy(feature, doc, topic, delta) {
        // update statistics to reflect association between word, topic and document
        if(topic === -1) {
            topic = -1;
        }
        this.perDocumentTopics.set(doc, topic,
            delta + this.perDocumentTopics.get(doc, topic)
        );

        if(topic === -1) { throw new Error('undefined topic')}
        this.perTopicFeatures.set(topic, feature,
            delta + this.perTopicFeatures.get(topic, feature)
        );

        this.perDocumentFrequency[doc] += delta;
        this.perTopicFrequency[topic] += delta;
    }

    dissociateFeatureWithDocAndTopic(feature, doc, topic) {
        this.associateFeatureWithDocAndTopicBy(feature, doc, topic, -1);
    }

    constructor() {}

    model() {
        return (new LDModel()).initializeTopicsAndDocumentsAndPriors(
            this.perTopicFeatures,
            this.perDocumentTopics,
            this.topicPriors
        );
    }

    randomize() {
        //Initialize the topic model by assigning a random topic to each word"

        var topic, random;

        random = new Random();

        this.documents.forEach((doc, di) => {
            doc.forEach((word, wj) => {
                topic = random.nextInt(this.topicCount);
                this.associateFeatureWithDocAndTopic(word, di, topic);
                this.perWordTopic.set(packKeys(di, wj), topic);
            });
        });
        console.log('PAST RANDOMIZE');
    }

    setupForDocumentsFeatureCountTopicCount(docs, features, topics) {
        this.documents = docs;
        this.topicCount = topics;
        this.featureCount = features;
        this.documentCount = docs.length;

        this.perDocumentTopics = Matrix.rowsColumnsElement(this.documentCount, this.topicCount, 0.0);
        this.perDocumentFrequency = fillArray(0, this.documentCount);
        console.log(this.topicCount, this.featureCount);
        this.perTopicFeatures = Matrix.rowsColumnsElement(this.topicCount, this.featureCount, 0.0);
        this.perTopicFrequency = fillArray(0, this.topicCount);

        this.topicPriors = fillArray(1.0 / this.topicCount, this.topicCount);
        this.featurePriors = fillArray(1.0 / this.featureCount, this.featureCount);

        this.perWordTopic = new Map();
    }

    topicProbabilityOverAndFeature(doc, feature) {
        // Compute P(t | d, f) given previous topic allocation and priors.
        // The result is a distribution, not a value!

        var featurePrior, topics, docFrequency;

        featurePrior = this.featurePriors[feature];
        topics = this.perDocumentTopics.atRow(doc);
        docFrequency = this.perDocumentFrequency[doc];

        return LDMultinomial.normalized(
            range(this.topicCount).map(topic => {
                var pFeature, pTopic;

                // bayesian estimates proportional to feature and topic marginals
                // (with normalization terms, don't ask!)

                pFeature = (this.perTopicFeatures.get(topic, feature)) + featurePrior;
                pFeature = pFeature / (1.0 + (this.perTopicFrequency[topic]));

                pTopic = (topics[topic]) + (this.topicPriors[topic]);
                pTopic = pTopic / (docFrequency + ((this.topicPriors[topic]) * this.topicCount));

                return pFeature * pTopic;
            })
        );
    }

    update() {
        var topic;

        this.documents.forEach((document, di) => {
            document.forEach((word, wj) => {
                var packedKey = packKeys(di, wj);
                topic = this.perWordTopic.get(packedKey);
                this.dissociateFeatureWithDocAndTopic(word, di, topic);
                topic = this.topicProbabilityOverAndFeature(di, word).sample();
                if(topic === -1) {
                    topic = this.topicProbabilityOverAndFeature(di, word).sample();
                }
                this.associateFeatureWithDocAndTopic(word, di, topic);
                this.perWordTopic.set(packedKey, topic);
            });
        });
    }
}

module.exports = LDAllocator;
