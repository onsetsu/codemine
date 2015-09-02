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

var utils = require('./../utils'),
    sumItems = utils.sumItems,
    zipMap = utils.zipMap,
    Random = utils.Random;

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

export default LDMultinomial;