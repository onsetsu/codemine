"use strict";

//import codemine from './codemine/codemine';
//
//console.log('------------ Glob Mine ------------');
//
//codemine.start(
//    //codemine.githuRepo({user: 'onsetsu', repo: 'bloob', ref: 'master'})
//    codemine.localFolder('sample/bloob/')
//)
//    .then(codemine.traverseDir(
//        '/lib/physics/**/*.js'
//    ))
//    .then(codemine.readFiles)
//    .then(codemine.attachAsts)
//    .then(modules => modules.map(module => {
//        console.log(module.fileName);
//        return module;
//    }))
//    .then(codemine.extractTextToTopicModel)
//    .then(codemine.computeTopicsForIterations(10, 30)) // compute 10 topics using 30 iterations
//    .then(codemine.showAllTopics)
//    .then(() => { console.log('END'); })
//    .catch(error => { throw error; })
//;

var Promise = require('bluebird');

var range = require('./utils').range;
var codemine = require('./codemine/codemine');

var gulp = require('gulp');

var esprima = require('esprima');
var estools = require('estools');
var estraverse = require('estraverse');
var esutils = require('esutils');
var escodegen = require('escodegen');

var childProcess = require('child_process'),
    exec = childProcess.exec,
    execFile = childProcess.execFile;

var glob = require('glob');
var fs = require('fs');

var Mocha = require('mocha');

const COMMON_PATH = 'sample/codegen';
const PATH_TO_REPLACE = COMMON_PATH + '/input';
const TEST_PATH = COMMON_PATH + '/input/test';
const SRC_PATH = 'sample/codegen/input/src';
const SRC_GLOB_PATTERN = '**/*.js';
const TEST_GLOB_PATTERN = '**/*.js';
const COMPLETE_INPUT_TEST_GLOB_PATTERN = TEST_PATH + '/' + TEST_GLOB_PATTERN;

/*
 return new Promise(function(resolve, reject) {
 var child = exec(
 "mocha " + TEST_PATH + " --recursive",
 {
 cwd: process.cwd()
 }, (error, stdout, stderr) => {
 //console.log("stdout: " + stdout);
 //console.log("stderr: " + stderr);
 if(error) {
 //console.log("exec error: " + error);
 }
 resolve(stdout);
 }
 );
 })
 .then(function readResult(output) {
 function getNumPassing(output) {
 var foo = output
 .split(' passing')[0]
 //.split(' ');

 return foo || foo[foo.length-1];
 }
 function getNumFailing(output) {
 var bar = output
 .split(' passing')[0]
 //.split(' ');

 return bar || bar[bar.length-1];
 }

 console.log(
 'foo'
 //,
 //getNumPassing(output),
 //getNumFailing(output)
 );
 });
*/

class Population {
    constructor(individuals) {
        this.id = Population.nextId++;
        this.individuals = individuals;
    }

    static getInitialPopulation(numIndividuals) {
        return Promise.resolve(range(numIndividuals))
            .map((i, k) => {
                console.log(i, k);
                return Individual.build();
            })
            .then(individuals => new Population(individuals));
    }
}
Population.nextId = 0;

class Individual {
    constructor(fileDescriptions) {
        this.fileDescriptions = fileDescriptions;
    }

    static build() {
        return codemine.start(codemine.localFolder(SRC_PATH))
            .then(codemine.traverseDir(SRC_GLOB_PATTERN))
            .then(codemine.readFiles)
            .then(codemine.attachAsts)
            .then(fileDescriptions => new Individual(fileDescriptions));
    }
}

var mkpath = require('mkpath');

class Fitness {
    static evaluateFor(population) {
        return Promise.resolve(population)
            .then(population => population.individuals)
            .map((individual, i) => {
                var replaceDirectory = function(fileName) {
                    var newRelativePath = fileName.replace(
                            PATH_TO_REPLACE,
                            COMMON_PATH +
                            '/pop' + population.id +
                            '/ind' + i
                        );

                    return './' + newRelativePath;
                };

                var copyTests = new Promise(function(resolve, reject) {
                    console.log(COMPLETE_INPUT_TEST_GLOB_PATTERN, '=>', replaceDirectory(TEST_PATH));
                    gulp.start(function() {
                        var stream = gulp.src(COMPLETE_INPUT_TEST_GLOB_PATTERN)
                            .pipe(gulp.dest(replaceDirectory(TEST_PATH)))
                            .on('end', resolve);
                        return stream;
                    });
                });

                var writeFiles = Promise.resolve(individual.fileDescriptions)
                    .each(fileDescription => {
                        return new Promise(function(resolve, reject) {
                            var relativePath = replaceDirectory(fileDescription.fileName);

                            console.log(relativePath);
                            console.log(escodegen.generate(fileDescription.ast));
                            console.log(fileDescription.sourceString);

                            // create path to file if it not already exists
                            // TODO: use regex for replacement: endsWith '.js'
                            // TODO: race condition for concurrent mkpath lead to error
                            mkpath(relativePath.replace('.js', ''), function (err) {
                                if (err) throw err;
                                fs.writeFile(
                                    relativePath,
                                    escodegen.generate(fileDescription.ast),
                                    function(err) {
                                        if (err) throw err;
                                        resolve();
                                    }
                                );
                            });
                        });
                    });

                return Promise.join(writeFiles, copyTests).then(() => individual);
            }).each((individual, i) => {
                console.log(i);
                return new Promise(function(resolve, reject) {
                    var pattern = COMMON_PATH + '/pop' + population.id + '/ind' + i + '/test/**/*.js';
                    console.log('APPLY PATTERN', pattern);
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
                })
                    .then(files => {
                        console.log(files);
                        return new Promise(function(resolve, reject) {
                            var mocha = new Mocha({
                                reporter: 'json'
                            });

                            files.forEach(file => {
                                var path = process.cwd() + '/' + file;
                                console.log(path);
                                mocha.addFile(path);
                            });

                            mocha.run()
                                .on('test', function(test) {
                                    //console.log('Test started: '+test.title);
                                    console.log('TEST #####################################');
                                    console.log(arguments);
                                })
                                .on('test end', function(test) {
                                    //console.log('Test done: '+test.title);
                                    console.log('TEST END #####################################');
                                    console.log(arguments);
                                })
                                .on('pass', function(test) {
                                    //console.log('Test passed');
                                    //console.log(test);
                                    console.log('PASS #####################################');
                                    console.log(arguments);
                                })
                                .on('fail', function(test, err) {
                                    //console.log('Test fail');
                                    //console.log(test);
                                    //console.log(err);
                                    console.log('FAIL #####################################');
                                    console.log(arguments);
                                })
                                .on('end', function() {
                                    //console.log('All done');
                                    console.log('END #####################################');
                                    console.log(arguments);
                                    resolve();
                                });
                        });
                    });
            }).then(() => {
                console.log('END', arguments);
            });
    }
}

class TerminationCriteria {
    constructor(criteria) {
        this.criteria = criteria;
    }

    check(...args) {
        return this.criteria(...args);
    }
}

class Round {

}

var c = new TerminationCriteria(function(a, b, c) {
    return a + b < c;
});

class GeneticProgramming {

}

Population.getInitialPopulation(1)
    .then(Fitness.evaluateFor);

