"use strict";

class LDFeatureSpace {
    addNewFeature() {
        "Hook for subclasses to reserve storage for new feature"
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
