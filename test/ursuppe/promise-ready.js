var Genetic = require("../../src/ursuppe.js");
var assert = require("assert");
var Promise = require("bluebird");

describe("Promise", function() {
	it("can use promises everywhere", function (done) {
		var genetic = Genetic.create();
		genetic.optimize = Genetic.Optimize.Minimize;
		genetic.select1 = Genetic.Select1.Tournament2;
		genetic.select2 = Genetic.Select2.Tournament2;

		// start with random number between 0 and 99
		genetic.seed = function() {
			return Promise.resolve(
				Math.floor(Math.random() * 100)
			).delay(10);
		};

		// randomly increment or decrement numbers by 1
		genetic.mutate = function(entity) {
			//console.log(entity);
			return Promise.resolve(Math.random() <= 0.5 ? entity - 1 : entity + 1).delay(10);
		};

		genetic.crossover = function(entity1, entity2) {
			return Promise.resolve([entity1 + 2, entity2 - 2]).delay(10);
		};

		// fitness equals difference to 50
		genetic.fitness = function(entity) {
			return Promise.resolve(Math.abs(entity - 50)).delay(5);
		};

		// termination criteria
		genetic.generation = function(pop, i, stats) {
			return pop[0].fitness !== 0;
		};

		genetic.on("finished", function(pop, generation, stats) {
			console.log(stats);

			// stats should not contain NaN
			assert.equal(stats.maximum, stats.maximum);
			assert.equal(stats.minimum, stats.minimum);
			assert.equal(stats.mean, stats.mean);
			assert.equal(stats.stdev, stats.stdev);
		});

		var config = {
			iterations: 20,
			size: 30,
			crossover: 1.0,
			fittestAlwaysSurvives: false
		};
		genetic.evolve(config).then(function() {
			done();
		});
	});
});
