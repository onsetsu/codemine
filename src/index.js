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

console.log('------------ Glob Mine ------------');

import LDModel from './lda/model';
import LDAllocator from './lda/allocator';

var glob = require('glob');
var fs = require('fs');

var esprima = require('esprima');
var estools = require('estools');

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

function showAllTopics(topicModel) {
    //console.log(tm);
    for(var i = 0; i < 30; i++) {
        console.log(
            topicModel.sortedTopic(i).slice(0, 10)
        );
    }
}

codemine.start(
    githuRepo({user: 'onsetsu', repo: 'bloob', ref: 'master'})
    //localFolder('sample/bloob/')
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

ghdownload({user: 'onsetsu', repo: 'bloob', ref: 'master'}, process.cwd() + '/' + 'foobar')
    .on('error', function(err) {
        console.log(err);
        throw err;
    })
    .on('end', function() {
        console.log('GH DOWNLOAD SUCCESSED');
    });