"use strict";

var LDFeatureSpace = require('./ldfeaturespace'),
    utils = require('./../utils'),
    packKeys = utils.packKeys,
    sumItems = utils.sumItems;

class LDDocumentFeatureSpace extends LDFeatureSpace {
    TfIdfIn(aFeatureId, aDocumentId) {
        return (this.frequencyOfIn(aFeatureId, aDocumentId))
            * ((this.documentCount / (this.perFeatureDocuments[aFeatureId]))); // .log() ???
    }

    addNewFeature() {
        super.addNewFeature();
        this.perFeatureDocuments.push(0);
        this.perFeatureFrequency.push(0);
    }

    associateFeatureWith(aFeatureId, aDocumentId) {
        var packedKey = packKeys(aDocumentId, aFeatureId);

        if(!this.documentFeatureCounts.has(packedKey)) {
            this.documentFeatureCounts.set(packedKey, 0);
        }

        var count = this.documentFeatureCounts.get(packedKey);
        this.documentFeatureCounts.set(packedKey, 1 + count);
    }

    documentProportionOf(aFeatureId) {
        return (this.perFeatureFrequency[aFeatureId]) / (this.documentCount);
    }

    estimateFeaturePriors() {
        var sum = sumItems(this.perFeatureFrequency);

        return this.perFeatureFrequency.map(freq => freq / sum);
    }

    frequencyOfIn(aFeature, aDocument) {
        var packedKey = packKeys(aDocument, aFeature);

        if(!this.documentFeatureCounts.has(packedKey)) {
            this.documentFeatureCounts.set(packedKey, 0);
        }

        return this.documentFeatureCounts.get(packedKey);
    }

    constructor() {
        super();
        this.documentCount = 0;
        this.documentFeatureCounts = new Map();
        this.perDocumentSize = [];
        this.perFeatureDocuments = [];
        this.perFeatureFrequency = [];
    }

    represent(aFeature) {
        var id = super.represent(aFeature);
        this.perFeatureFrequency[id] += 1;
        return id;
    }

    representAll(aCollection) {
        var doc, uniqueFeatures, featureVector;

        doc = this.documentCount + 1;
        this.documentCount = doc;

        uniqueFeatures = new Set();

        featureVector = aCollection.map(each => {
            let id = this.represent(each);
            this.associateFeatureWith(id, doc);
            uniqueFeatures.add(id);
            return id;
        });

        uniqueFeatures.forEach(id => {
            this.perFeatureDocuments[id] += 1;
        });

        this.perDocumentSize.push(aCollection.length);
        return featureVector;
    }
}

export default LDDocumentFeatureSpace;
