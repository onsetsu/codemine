"use strict";

import codemine from './codemine/codemine';

console.log('------------ Glob Mine ------------');

codemine.start(
    //codemine.githuRepo({user: 'onsetsu', repo: 'bloob', ref: 'master'})
    //codemine.localFolder('sample/bloob/')
    codemine.localFolder('out')
)
    .then(codemine.traverseDir(
        //'/lib/physics/**/*.js'
        'src/**/*.js'
    ))
    .then(codemine.readFiles)
    .then(codemine.attachAsts)
    .then(modules => modules.map(module => {
        console.log(module.fileName);
        return module;
    }))
    .then(codemine.extractTextToTopicModel)
    .then(codemine.computeTopicsForIterations(10, 30)) // compute 10 topics using 30 iterations
    .then(codemine.showAllTopics)
    .then(() => { console.log('END'); })
    .catch(error => { throw error; })
;
