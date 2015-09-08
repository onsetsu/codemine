"use strict";

import LDDocumentFeatureSpace from './../lda/lddocumentfeaturespace';
import LDMultinomial from './../lda/ldmultinomial';
var utils = require('./../utils'),
    packKeys = utils.packKeys,
    sumItems = utils.sumItems,
    zipMap = utils.zipMap,
    timesDo = utils.timesDo,
    fillArray = utils.fillArray,
    range = utils.range,
    Random = utils.Random;

import LDModel from './../lda/model';
import LDAllocator from './../lda/allocator';

var glob = require('glob');
var fs = require('fs');

var esprima = require('esprima');
var estools = require('estools');

// https://www.npmjs.com/package/github-download
var ghdownload = require('github-download');

var codemine = {
    /**
     * @returns {Promise<baseDirPath>}
     */
    start: function codemineStart(loaderTask) {
        return loaderTask();
    },

    // TODO: github loader does not work on travis ci
    githuRepo: function githuRepo(ghDownloadParams) {
        /**
         * @returns {String} The relative path to which the reposity was loaded
         */
        return function innerGithuRepo() {
            console.log('DOWNLOAD REPOSITORY FROM GITHUB');
            return new Promise(function(resolve, reject) {
                var subRepo = 'sample/' + Date.now() + '/';

                ghdownload(ghDownloadParams, process.cwd() + '/' + subRepo)
                    .on('error', function(err) {
                        console.log('ERR DURING GH DOWNLOAD');
                        console.log(err);
                        reject(err)
                    })
                    .on('end', function() {
                        resolve(subRepo);
                    });
            });
        }
    },

    localFolder: function localFolder(dir) {
        return function localFolder() {
            console.log('USING LOCAL REPOSITORY');
            return new Promise(function(resolve, reject) {
                var subRepo = dir + '/';

                resolve(subRepo);
            });
        }
    },

    traverseDir: function traverseDir(globPattern) {
        return function innerTraverseDir(basePattern) {
            var pattern = basePattern + '/' + globPattern;
            console.log('APPLY PATTERN', pattern);
            return new Promise(function(resolve, reject) {
                // options is optional
                glob(pattern, function (err, files) {
                    // files is an array of filenames.
                    // If the `nonull` option is set, and nothing
                    // was found, then files is ["**/*.js"]
                    // er is an error object or null.
                    if(err) {
                        console.log('ERR DURING GLOB');
                        console.log(err);

                        reject(err);
                    } else {
                        resolve(files);
                    }
                });
            });
        }
    },

    readFiles: function readFiles(files) {
        return Promise.all(files.map(fileName => new Promise(function(resolve, reject) {
            fs.readFile(fileName, { encoding: 'utf8' }, function (err, data) {
                if(err) {
                    console.log('ERR DURING READFILE', fileName);
                    console.log(err);
                    reject(err);
                } else {
                    resolve({
                        fileName: fileName,
                        sourceString: data
                    });
                }
            });
        })));
    },

    attachAsts: function attachAsts(files) {
        return files.map(file => {
            try {
                var ast = esprima.parse(file.sourceString);
            } catch(e) {
                console.log('ERR DURING ATTACH AST');
                console.log(e);
            }
            file.ast = ast;
            return file;
        });
    },

    extractTextToTopicModel: function extractTextToTopicModel(modules) {
        var tm = new JSTopicModel();

        var frequencies = new Map(),
            methodFeatures = new Map(),
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
    },

    computeTopicsForIterations: function computeTopicsForIterations(numTopics, iterations) {
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
    },

    showAllTopics: function showAllTopics(topicModel) {
        // TODO: using topicModel.topicModel.topicPriors.length to get the number of topics is implementation-dependent
        for(var i = 0; i < topicModel.topicModel.topicPriors.length; i++) {
            console.log(
                topicModel.sortedTopic(i).slice(0, 10)
            );
        }
    }
};


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

module.exports = codemine;
