"use strict";

/*
This class helps to transform arbitrary hashable features (e.g. words or
collections of words) into natural numbers. The transformation is
required, as LDAllocator only accepts integer features.

    Example:

space := LDFeatureSpace new.
    space representAll: #(a b c 100).
gives #(1 2 3 4)
space representAll: #(a c d).
subsequently gives  #(1 3 5) because a and c are already known as
feature #1 and #3, c is inserted as new feature #5.

The space needs to be retained for later interpretation of encoded results:

    space interpret: 2
gives #b
space interpretAll: #(5 3 2 1)
gives #(#d #c #b #a)
*/
class LDFeatureSpace {
    addNewFeature() {
        // Hook for subclasses to reserve storage for new feature
    }

    featureCount() {
        return this.maxId;
    }

    constructor() {
        this.featureIdMap = new Map();
        this.idFeatureMap = new Map();
        this.maxId = -1;
    }

    interpret(aFeatureId) {
        return this.idFeatureMap.get(aFeatureId);
    }

    interpretAll(aCollection) {
        return aCollection.map(each => this.interpret(each));
    }

    represent(aFeature) {
        if (!this.featureIdMap.has(aFeature)) {
            this.maxId++;
            this.idFeatureMap.set(this.maxId, aFeature);
            this.addNewFeature();
            this.featureIdMap.set(aFeature, this.maxId);
        }
        return this.featureIdMap.get(aFeature);
    }

    representAll(aCollection) {
        return aCollection.map(each => this.represent(each));
    }
}

// utility; transforms two keys into a single one
var packKeys = (function() {
    var storage = new Map();

    return function twoToOne(keyA, keyB) {
        if (!storage.has(keyA)) {
            storage.set(keyA, new Map());
        }
        var stor2 = storage.get(keyA);
        if (!stor2.has(keyB)) {
            stor2.set(keyB, {
                keyA: keyA,
                keyB: keyB
            });
        }
        return stor2.get(keyB);
    }
})();

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
        var sum = 0;
        this.perFeatureFrequency.forEach(freq => {
            if(freq) {
                sum += freq;
            }
        });

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
        this.documentCount = 0.
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

var esprima = require('esprima');
var estools = require('estools');

var logVisitor = {
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
};

console.log('------------ GULP ------------');
var gulp = require('gulp');
var gulpApplyFn = require('./gulp-applyfn');

gulp.task('codemine', function () {
    return gulp.src('sample/bloob-engine/**/*.js')
        .pipe(gulpApplyFn(function(file, sourceCode) {
            var ast = esprima.parse(sourceCode);
            //console.log(file.path);
            //estools.traverse(ast, logVisitor);
        }));
});

gulp.start('codemine');

console.log('------------ Document Feature Space ------------');

var space = new LDDocumentFeatureSpace();
console.log(space);
console.log(space.representAll(['foo', 'bar', 'blub']));
console.log(space.representAll(['bar', 'bar', 'blub', 'baz']));
// show mapping of features to ids
space.featureIdMap.forEach((value, key) => console.log(key, '>', value));
//space.idFeatureMap.forEach((value, key) => console.log(key, '>', value));
// show entries in document-word matrix
//space.documentFeatureCounts.forEach((value, key) => console.log(key, value));
console.log(space);

console.log('------------ LDA ------------');

function timesDo(x, fn) {
    for(let i = 0; i < x; i++) {
        fn(x);
    }
}

function fillArray(value, length) {
    var arr = [];
    for(var i = 0; i < length; i++) {
        arr.push(value);
    }
    return arr;
}
function range(end) {
    var arr = [];
    for(var i = 0; i < end; i++) {
        arr.push(i);
    }
    return arr;
}

// testing range
// console.log(range(5));
// console.log(range(25));

class Random {
    nextInt(upTo) {
        return parseInt((Math.random() * upTo), 10);
    }
}

// testing Random
// fillArray(2, 20).forEach(upTo => console.log((new Random()).nextInt(upTo)));

class Matrix {
    constructor(rows, columns, element) {
        this.contents = [];
        for(var i = 0; i < rows; i++) {
            this.contents.push(fillArray(element, columns));
        }
    }

    get(row, column) {
        return this.contents[row][column];
    }

    set(row, column, value) {
        return this.contents[row][column] = value;
    }

    atRow(rowId) {
        return this.contents[rowId];
    }

    atColumn(columnId) {
        return this.contents.map(row => row[columnId]);
    }

    static rowsColumnsElement(rows, columns, element) {
        return new Matrix(rows, columns, element);
    }
}

class LDMultinomial {
    // TODO: implement this class

    static normalized(observation) {
        return (new LDMultinomial()).observe(observation);
    }
}

class LDModel {
    initializeTopicsAndDocumentsAndPriors(topics, documents, priors) {
        this.perTopicFeatures = topics;
        this.perDocumentTopics = documents;
        this.topicPriors = priors;
    }
}

class LDAllocator {
    allocateIteratingFeaturesTopics(docs, numIterations, numFeatures, numTopics) {
        // Train model with given documents for given number of iterations.

        this.setupForDocumentsFeatureCountTopicCount(docs, numFeatures, numTopics);
        this.randomize();
        timesDo(numIterations, this.update.bind(this));
        return this.model();
    }

    associateFeatureWithDocAndTopic(feature, doc, topic) {
        this.associateFeatureWithDocAndTopicBy(feature, doc, topic, 1);
    }

    associateFeatureWithDocAndTopicBy(feature, doc, topic, delta) {
        // update statistics to reflect association between word, topic and document

        this.perDocumentTopics.set(doc, topic,
            delta + this.perDocumentTopics.get(doc, topics)
        );

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
        return (new LDModel()).initializeTopicsAndDocumentsAndPriors(perTopicFeatures, perDocumentTopics, topicPriors);
    }

    randomize() {
        //Initialize the topic model by assigning a random topic to each word"

        var topic, random;

        random = new Random();

        this.documents.forEach((doc, di) => {
            doc.forEach(word, wj => {
                topic = random.nextInt(topicCount);
                this.associateFeatureWithDocAndTopic(word, di, topic);
                this.perWordTopic.set(packKeys(di, wj), topic);
            });
        });
    }

    setupForDocumentsFeatureCountTopicCount(docs, features, topics) {
        this.documents = docs;
        this.topicCount = topics;
        this.featureCount = features;
        this.documentCount = docs.length;

        this.perDocumentTopics = Matrix.rowsColumnsElement(documentCount, topicCount, 0.0);
        this.perDocumentFrequency = fillArray(0, documentCount);
        this.perTopicFeatures = Matrix.rowsColumnsElement(topicCount, featureCount, 0.0);
        this.perTopicFrequency = fillArray(0, topicCount);

        this.topicPriors = fillArray(1.0 / topicCount, topicCount);
        this.featurePriors = fillArray(1.0 / featureCount, featureCount);

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
            range(topicCount).map(topic => {
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
                topic = this.topicProbabilityOverAndFeature(di, word).sample(); // TODO implement sample on LDMultinomial
                this.associateFeatureWithDocAndTopic(word, di, topic);
                this.perWordTopic.set(packedKey, topic);
            });
        });
    }
}
