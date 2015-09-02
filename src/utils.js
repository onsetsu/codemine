// utility; transforms two keys into a single one
exports.packKeys = (function() {
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

exports.sumItems = function sumItems(arr) {
    return arr.reduce((acc, value) => acc + value, 0);
};

/**
 * takes two Arrays and a callback, and maps into a new Array by calling the callback with same-indexed value from both input Arrays
 * @param listA
 * @param listB
 * @param callback
 * @returns {Array}
 */
exports.zipMap = function zipMap(listA, listB, callback) {
    var upTo = Math.min(listA.length, listB.length),
        arr = [];
    for(var i = 0; i < upTo; i++) {
        arr.push(callback(listA[i], listB[i], i, listA, listB));
    }
    return arr;
};


exports.timesDo = function timesDo(x, fn) {
    for(let i = 0; i < x; i++) {
        fn(x);
    }
};

exports.fillArray = function fillArray(value, length) {
    var arr = [];
    for(var i = 0; i < length; i++) {
        arr.push(value);
    }
    return arr;
};

exports.range = function range(end) {
    var arr = [];
    for(var i = 0; i < end; i++) {
        arr.push(i);
    }
    return arr;
};

exports.Random = class Random {
    nextInt(upTo) {
        return parseInt((Math.random() * upTo), 10);
    }
};

// TODO: testing Random
// fillArray(2, 20).forEach(upTo => console.log((new Random()).nextInt(upTo)));
