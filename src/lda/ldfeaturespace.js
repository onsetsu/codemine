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

export default LDFeatureSpace;
