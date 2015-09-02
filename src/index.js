"use strict";

import LDDocumentFeatureSpace from './lda/lddocumentfeaturespace';
import LDMultinomial from './lda/ldmultinomial';
var utils = require('./utils'),
    packKeys = utils.packKeys,
    sumItems = utils.sumItems,
    zipMap = utils.zipMap,
    timesDo = utils.timesDo,
    fillArray = utils.fillArray,
    range = utils.range,
    Random = utils.Random;

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


console.log('------------ LDA ------------');

var Matrix = require('./math/matrix').Matrix;
import LDModel from './lda/model';

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

// https://www.npmjs.com/package/github-download
var ghdownload = require('github-download');

var codemine = {
    /**
     * @returns Promise<baseDirPath>
     */
    start: function codemineStart(loaderTask) {
        return loaderTask();
    }
};

function githuRepo(ghDownloadParams) {
    return function innerGithuRepo() {
        console.log('DOWNLOAD REPOSITORY FROM GITHUB');
        return new Promise(function(resolve, reject) {
            var subRepo = 'sample/' + Date.now() + '/';

            ghdownload(ghDownloadParams, process.cwd() + '/' + subRepo)
                .on('error', function(err) {
                    reject(err)
                })
                .on('end', function() {
                    console.log(subRepo);

                    resolve(subRepo);
                });
        });
    }
}

function localFolder(dir) {
    return function localFolder() {
        console.log('USING LOCAL REPOSITORY');
        return new Promise(function(resolve, reject) {
            var subRepo = dir + '/';

            resolve(subRepo);
        });
    }
}

function traverseDir(globPattern) {
    return function innerTraverseDir(basePattern) {
        var pattern = basePattern + globPattern;
        console.log('APPLY PATTERN', pattern);
        return new Promise(function(resolve, reject) {
            // options is optional
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

function computeTopicsForIterations(numTopics, iterations) {
    return function innerComputeTopicsForIterations(tm) {
        var lda = new LDAllocator();
        var methodFeatures = [];
        tm.methodTexts.forEach(v => {
            return methodFeatures.push(v)
        });

        tm.topicModel = lda.allocateIteratingFeaturesTopics(
            methodFeatures,
            iterations,
            tm.featureSpace.featureCount(),
            numTopics
        );

        return tm;
    }
}

/**
 *
 */
function showAllTopics(tm) {
    //console.log(tm);
    for(var i = 0; i < 30; i++) {
        console.log(
            tm.sortedTopic(i).slice(0, 10)
        );
    }
}

codemine.start(
    //githuRepo({user: 'onsetsu', repo: 'bloob', ref: 'master'})
    localFolder('sample/bloob/')
)
    .then(traverseDir('/lib/physics/**/*.js'))
    .then(readFiles)
    .then(attachAsts)
    .then(modules => modules.map(module => {
        console.log(module.fileName);
        return module;
    }))
    .then(extractTextToTopicModel)
    .then(computeTopicsForIterations(10, 30)) // compute 10 topics using 30 iterations
    .then(showAllTopics)
    .then(() => { console.log('END'); })
    .catch(error => { throw error; })
;
