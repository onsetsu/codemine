var utils = require('./../utils'),
    sumItems = utils.sumItems,
    zipMap = utils.zipMap;

/**
 * Calculate cosine similarity on two given vectors, represented as Arrays
 * @param vector1
 * @param vector2
 * @returns {Number}
 */
var cosineSimilarity = function(vector1, vector2) {
    return sumItems(
        zipMap(vector1, vector2, (i, k) => i * k)
    );
};

exports.cosineSimilarity = cosineSimilarity;
