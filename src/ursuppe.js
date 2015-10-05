'use strict';

// TODO: replace generation criteria with termination criteria

var Optimize = {
    Maximize: function (a, b) { return a >= b; },
    Minimize: function (a, b) { return a < b; }
};

var Select1 = {
    "Tournament2": function(pop) {
        var n = pop.length;
        var a = pop[Math.floor(Math.random()*n)];
        var b = pop[Math.floor(Math.random()*n)];
        return this.optimize(a.fitness, b.fitness) ? a.entity : b.entity;
    }, "Tournament3": function(pop) {
        var n = pop.length;
        var a = pop[Math.floor(Math.random()*n)];
        var b = pop[Math.floor(Math.random()*n)];
        var c = pop[Math.floor(Math.random()*n)];
        var best = this.optimize(a.fitness, b.fitness) ? a : b;
        best = this.optimize(best.fitness, c.fitness) ? best : c;
        return best.entity;
    }, "Fittest": function(pop) {
        return pop[0].entity;
    }, "Random": function(pop) {
        return pop[Math.floor(Math.random()*pop.length)].entity;
    }, "RandomLinearRank": function(pop) {
        this.internalGenState["rlr"] = this.internalGenState["rlr"]||0;
        return pop[Math.floor(Math.random()*Math.min(pop.length,(this.internalGenState["rlr"]++)))].entity;
    }, "Sequential": function(pop) {
        this.internalGenState["seq"] = this.internalGenState["seq"]||0;
        return pop[(this.internalGenState["seq"]++)%pop.length].entity;
    }
};

var Select2 = {
    "Tournament2": function(pop) {
        return [Select1.Tournament2.call(this, pop), Select1.Tournament2.call(this, pop)];
    }, "Tournament3": function(pop) {
        return [Select1.Tournament3.call(this, pop), Select1.Tournament3.call(this, pop)];
    }, "Random": function(pop) {
        return [Select1.Random.call(this, pop), Select1.Random.call(this, pop)];
    }, "RandomLinearRank": function(pop) {
        return [Select1.RandomLinearRank.call(this, pop), Select1.RandomLinearRank.call(this, pop)];
    }, "Sequential": function(pop) {
        return [Select1.Sequential.call(this, pop), Select1.Sequential.call(this, pop)];
    }, "FittestRandom": function(pop) {
        return [Select1.Fittest.call(this, pop), Select1.Random.call(this, pop)];
    }
};

var range = require('range').range;
var ee = require('event-emitter');
var Promise = require('bluebird');

// Promises in a doUntil fashion
function doUntil(body, terminationCriteria) {
    function singleIter(prom, cb) {
        var newProm = prom.then(body);

        newProm.then(function(newValue) {
            if(terminationCriteria(newValue)) {
                cb(newValue);
            } else {
                singleIter(newProm, cb);
            }
        });
    }

    return function(initialValue) {
        return new Promise(function(outerResolve, reject) {
            singleIter(Promise.resolve(initialValue), outerResolve);
        });
    }
}

function Genetic() {
    // population
    this.fitness = null;
    this.seed = null;
    this.mutate = null;
    this.crossover = null;
    this.select1 = null;
    this.select2 = null;
    this.optimize = null;
    this.generation = null;

    this.configuration = {
        size: 250,
        crossover: 0.9,
        mutation: 0.2,
        iterations: 100,
        fittestAlwaysSurvives: true,
        maxResults: 100,
        skip: 0
    };

    this.userData = {};
    this.internalGenState = {};

    this.emitter = ee({});
}

Genetic.prototype.start = function() {
    var i = 0; // current generation/iteration/generation number

    var iteration = (function(bar) {
        this.internalGenState = {};

        return Promise.all(bar.entities.map(function(entity, index) {
                return Promise.resolve(this.fitness(entity, index))
                    .then(function(fitness) {
                        return {
                            fitness: fitness,
                            entity: entity
                        };
                    });
            }, this))
            .bind(this)
            .then(function(pop) {
                return pop.sort((function (a, b) {
                    return this.optimize(a.fitness, b.fitness) ? -1 : 1;
                }).bind(this));
            })
            .then(function(pop) {
                // generation notification
                var stats = this.getStats(pop);

                var r = this.generation ? this.generation(pop, i, stats) : true;
                var isFinished = (typeof r != "undefined" && !r) || (i == this.configuration.iterations-1);

                if (isFinished || this.configuration["skip"] == 0 || i%this.configuration["skip"] == 0) {
                    this.emitter.emit('notification', pop.slice(0, this.maxResults), i, stats, isFinished);
                }

                if(isFinished) {
                    this.emitter.emit('finished', pop, i, stats);
                    ++i;
                    return {
                        isFinished: isFinished
                    };
                } else {
                    ++i;
                    return Promise.resolve(pop)
                        .then(this.breed.bind(this))
                        .then(function(newEntities) {
                            return {
                                isFinished: isFinished,
                                entities: newEntities
                            };
                        });
                }
            });
    }).bind(this);

    function shouldTerminate(foo) {
        return foo.isFinished;
    }

    return this.getInitialPopulation()
        .then(function(entities) { return { entities: entities }})
        .then(doUntil(iteration, shouldTerminate));
};

Genetic.prototype.getInitialPopulation = function() {
    return Promise.all(range(0, this.configuration.size).map(function(index) {
        return this.seed();
    }, this));
};

Genetic.prototype.getStats = function(pop) {
    var mean = pop.reduce(function (a, b) { return a + b.fitness; }, 0)/pop.length;
    var stdev = Math.sqrt(pop
            .map(function (a) { return (a.fitness - mean) * (a.fitness - mean); })
            .reduce(function (a, b) { return a+b; }, 0)/pop.length);

    return {
        maximum: pop[0].fitness,
        minimum: pop[pop.length-1].fitness,
        mean: mean,
        stdev: stdev
    };
};

Genetic.prototype.breed = function(pop) {
    function mutateOrNot(entity) {
        // applies mutation based on mutation probability
        return Math.random() <= this.configuration.mutation && this.mutate ? this.mutate(entity) : entity;
    }

    return Promise.resolve()
        .bind(this)
        .then(function() {
            // crossover and mutate

            var appendFittest = (function(newPop) {
                if (this.configuration.fittestAlwaysSurvives) { // lets the best solution fall through
                    newPop.push(pop[0].entity);
                }

                return newPop;
            }).bind(this);

            var newPopulationComplete = (function(newPop) {
                return newPop.length >= this.configuration.size;
            }).bind(this);

            var populate = (function(newPop) {
                if (
                    this.crossover // if there is a crossover function
                    && Math.random() <= this.configuration.crossover // base crossover on specified probability
                    && newPop.length+1 < this.configuration.size // keeps us from going 1 over the max population size
                ) {
                    return Promise.resolve(this.select2(pop))
                        .spread(this.crossover)
                        .then(function(children) {
                            newPop.push(children[0], children[1]);
                            return newPop;
                        });
                } else {
                    return Promise.resolve(this.select1(pop))
                        .then(function(individual) {
                            newPop.push(individual);
                            return newPop;
                        });
                }
            }).bind(this);

            return Promise.resolve([])
                .then(appendFittest)
                // TODO: should be done in the following fashion
                // while (newPopulationComplete()) {
                //   populate();
                // }
                // so if the population size is 1 with the fittest surviving, we currently get 2 individuals
                .then(doUntil(populate, newPopulationComplete));
        }
    ).map(mutateOrNot);
};

Genetic.prototype.on = function(eventName, callback) {
    this.emitter.on(eventName, callback.bind(this));
};

Genetic.prototype.evolve = function(config, userData) {
    var k;
    for (k in config) {
        this.configuration[k] = config[k];
    }

    for (k in userData) {
        this.userData[k] = userData[k];
    }

    return this.start();
};

module.exports = {
    create: function() {
        return new Genetic();
    },
    Select1: Select1,
    Select2: Select2,
    Optimize: Optimize
};
