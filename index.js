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

function sumItems(arr) {
    return arr.reduce((acc, value) => acc + value, 0);
}

// testing sumItems
// console.log(sumItems([1,4,68,3]));
// should be 76

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
            //var ast = esprima.parse(sourceCode);
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
        //console.log(row, column);
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
// takes two Arrays and a callback, and maps into a new Array by calling the callback with same-indexed value from both input Arrays
/**
 *
 * @param listA
 * @param listB
 * @param callback
 * @returns {Array}
 */
function zipMap(listA, listB, callback) {
    var upTo = Math.min(listA.length, listB.length),
        arr = [];
    for(var i = 0; i < upTo; i++) {
        arr.push(callback(listA[i], listB[i], i, listA, listB));
    }
    return arr;
}

// testing zipMap
// zipMap([1,2,3,4,5], [6,7,8], (a, b) => a + b);
// should return [7, 9, 11];

/*
 * POLYFILL Array.prototype.findIndex
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/findIndex
 */
if (!Array.prototype.findIndex) {
    Array.prototype.findIndex = function(predicate) {
        if (this === null) {
            throw new TypeError('Array.prototype.findIndex called on null or undefined');
        }
        if (typeof predicate !== 'function') {
            throw new TypeError('predicate must be a function');
        }
        var list = Object(this);
        var length = list.length >>> 0;
        var thisArg = arguments[1];
        var value;

        for (var i = 0; i < length; i++) {
            value = list[i];
            if (predicate.call(thisArg, value, i, list)) {
                return i;
            }
        }
        return -1;
    };
}

class LDMultinomial {
    /**
     * Even mixture of two multinomials
     * @param aMultinomial
     */
    __add__(aMultinomial) {
        return LDMultinomial.normalized(
            zipMap(this.probabilities, aMultinomial.probabilities, (a, b) => a + b)
        );
    }

    /**
     * Non-normalizing addition. Faster in chained additions but requires subsequent normalization
     * @param aMultinomial
     */
    __addadd__(aMultinomial) {
        return LDMultinomial.raw(
            zipMap(this.probabilities, aMultinomial.probabilities, (a, b) => a + b)
        );
    }

    normalize() {
        var sum = sumItems(this.probabilities);
        this.probabilities = this.probabilities.map(p => p / sum);
    }

    observe(frequencies) {
        this.probabilities = frequencies;
        this.normalize();
    }

    /**
     * Draw a sample index from the distribution
     */
    sample() {
        var r = Math.random();
        return this.probabilities.findIndex((p, i, arr) => {
            r -= p;
            return r < 0;
        });
    }

    static initialize() {
        // LDMultinomial initialize

        this.Rand = new Random();
    }

    static normalized(observation) {
        var multinomial = new LDMultinomial();
        multinomial.observe(observation);
        return multinomial;
    }

    static raw(observation) {
        var multinomial = new LDMultinomial();
        multinomial.probabilities = observation;
        return multinomial;
    }
}

/**
 * Calculate cosine similarity on two given vectors, represented as Arrays
 * @param vector1
 * @param vector2
 * @returns {Number}
 */
function cosineSimilarity(vector1, vector2) {
    return sumItems(zipMap(vector1, vector2, (i, k) => i * k));
}

class LDModel {
    documentSimilarityOfAnd(doc1, doc2) {
        return cosineSimilarity(
            this.topicsForDocumentAt(doc1),
            this.topicsForDocumentAt(doc2)
        );
    }

    documentsForTopicAt(topic) {
        return this.perDocumentTopics.atColumn(topic);
    }

    featureSimilarityOfAnd(word1, word2) {
        return cosineSimilarity(
            this.topicsForFeatureAt(word1),
            this.topicsForFeatureAt(word2)
        );
    }

    featuresForTopicAt(topic) {
        return this.perTopicFeatures.atRow(topic);
    }

    initializeTopicsAndDocumentsAndPriors(topics, documents, priors) {
        //console.log(topics);
        this.perTopicFeatures = topics;
        this.perDocumentTopics = documents;
        this.topicPriors = priors;

        return this;
    }

    topicsForDocumentAt(docid) {
        return this.perDocumentTopics.atRow(docid);
    }

    topicsForFeatureAt(word) {
        return this.perTopicFeatures.atColumn(word);
    }
}

class LDAllocator {
    allocateIteratingFeaturesTopics(docs, numIterations, numFeatures, numTopics) {
        // Train model with given documents for given number of iterations.
        //console.log('LDA THERE');
        this.setupForDocumentsFeatureCountTopicCount(docs, numFeatures, numTopics);
        this.randomize();
        for(var i = 0; i < numIterations; i++) {
            this.update();
        }
        //console.log('LDA THERE AT END');
        return this.model();
    }

    associateFeatureWithDocAndTopic(feature, doc, topic) {
        //console.log('LDAllocator associateFeatureWithDocAndTopic');
        this.associateFeatureWithDocAndTopicBy(feature, doc, topic, 1);
        //console.log('LDAllocator associateFeatureWithDocAndTopic2');
    }

    associateFeatureWithDocAndTopicBy(feature, doc, topic, delta) {
        // update statistics to reflect association between word, topic and document
        //console.log('LDAllocator associateFeatureWithDocAndTopicBy1');
        //console.log('LDAllocator associateFeatureWithDocAndTopicBy1', feature, doc, topic, delta);
        if(topic === -1) {
            topic = -1;
        }
        this.perDocumentTopics.set(doc, topic,
            delta + this.perDocumentTopics.get(doc, topic)
        );
        //console.log('LDAllocator associateFeatureWithDocAndTopicBy2', feature, doc, topic, delta);
        if(topic === -1) { throw new Error('undefined topic')}
        this.perTopicFeatures.set(topic, feature,
            delta + this.perTopicFeatures.get(topic, feature)
        );
        //console.log('LDAllocator associateFeatureWithDocAndTopicBy3');

        this.perDocumentFrequency[doc] += delta;
        //console.log('LDAllocator associateFeatureWithDocAndTopicBy4');
        this.perTopicFrequency[topic] += delta;
        //console.log('LDAllocator associateFeatureWithDocAndTopicBy5');
    }

    dissociateFeatureWithDocAndTopic(feature, doc, topic) {
        this.associateFeatureWithDocAndTopicBy(feature, doc, topic, -1);
    }

    constructor() {}

    model() {
        return (new LDModel()).initializeTopicsAndDocumentsAndPriors(
            this.perTopicFeatures,
            this.perDocumentTopics,
            this.topicPriors);
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
        //console.log('LDA UPDATE THERE');

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
        //console.log('LDA UPDATE2 THERE');
    }
}

/*
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

console.log(model.featuresForTopicAt(0));
console.log(model.featuresForTopicAt(1));

console.log(model.topicsForDocumentAt(5));

console.log(model.documentSimilarityOfAnd(0, 1));
console.log(model.documentSimilarityOfAnd(4, 5));
console.log(model.documentSimilarityOfAnd(1, 5));
*/

console.log('------------ Glob Mine ------------');

var glob = require('glob');
var fs = require('fs');

// options is optional
function traverseDir(pattern) {
    return new Promise(function(resolve, reject) {
        glob(pattern, function (err, files) {
            // files is an array of filenames.
            // If the `nonull` option is set, and nothing
            // was found, then files is ["**/*.js"]
            // er is an error object or null.
            if(err) {
                reject(err);
            } else {
                resolve(files);
            }
        });
    });
}

function readFiles(files) {
    return Promise.all(files.map(fileName => new Promise(function(resolve, reject) {
        fs.readFile(fileName, { encoding: 'utf8' }, function (err, data) {
            if(err) {
                reject(err);
            } else {
                resolve({
                    fileName: fileName,
                    sourceString: data
                });
            }
        });
    })));
}

function attachAsts(files) {
    return files.map(file => {
        var ast = esprima.parse(file.sourceString);
        file.ast = ast;
        return file;
    });
}

class JSTopicModel {
    constructor() {
        this.methodTexts = new Map();
        this.featureSpace = new LDDocumentFeatureSpace();
    }

    sortedTopic(topic) {
        return this.topicModel.featuresForTopicAt(topic)
                .map((value, index) => [value, index])
                .sort((a, b) => b[0] - (a[0]))
                //.map(pair => this.featureSpace.interpret(pair[1]));
                .map(pair => [pair[0], this.featureSpace.interpret(pair[1])]);
    }
}

function extractTextToTopicModel(modules) {
    var tm = new JSTopicModel();

    var frequencies, methodFeatures, docId;
    frequencies = new Map();
    methodFeatures = new Map();

    docId = 0;

    modules.forEach(method => {
        var textVisitor = new ExtractTextVisitor();

        estools.traverse(method.ast, textVisitor);
        textVisitor.literals.forEach(symbol => {
            frequencies.set(symbol, frequencies.has(symbol) ?
                1 + frequencies.get(symbol) : 1
            );
        });
        methodFeatures.set(method, textVisitor.literals);
        docId += 1;
    });

    methodFeatures.forEach((features, method) => {
        var reducedFeatures = features.filter(feature => frequencies.get(feature) > 2);
        tm.methodTexts.set(method, tm.featureSpace.representAll(reducedFeatures));
    });

    return tm;
}

class ExtractTextVisitor {
    constructor() {
        this.literals = [];
    }

    enter(node, parent) {
        switch(node.type) {
            case 'Literal':
                this.literals.push(node.value);
                break;
            case 'Identifier':
                this.literals.push(node.name);
                break;
            default:
                break;
        }
    }
}

function computeTopicsForIterations(tm) {
    var lda = new LDAllocator();
    var methodFeatures = [];
    tm.methodTexts.forEach(v => {
        return methodFeatures.push(v)
    });
    var iterations = 30; // TODO, HACK: hard-coded value
    var numTopics = 30; // TODO, HACK: hard-coded value

    tm.topicModel = lda.allocateIteratingFeaturesTopics(
        methodFeatures,
        iterations,
        tm.featureSpace.featureCount() + 1,
        numTopics
    );

    return tm;
}

function showAllTopics(tm) {
    //console.log(tm);
    for(var i = 0; i < 30; i++) {
        console.log(
            tm.sortedTopic(i).slice(0, 10)
        );
    }
}

traverseDir('sample/bloob/**/*.js')
    .then(readFiles)
    .then(attachAsts)
    .then(modules => modules.map(module => {
        //console.log(module.fileName);
        return module;
    }))
    .then(extractTextToTopicModel)
    .then(computeTopicsForIterations)
    .then(showAllTopics)
    .then(() => { console.log('END'); })
    .catch(error => { throw error; })
;
