/**
 * # Data Faking DSL
 *
 * Easily describe and create nested fake data. Very useful in tests.
 *
 * Let's say you want to create one thingy, three entities and two foos per
 * entity:
 *
 * ```js
 * var T = require('./faking_dsl');
 *
 * T.inParallel([
 *   T.create(1, Thingy).entry(),
 *   T.create(3, Entity).entries()
 *    .then(T.forEach(T.create(2, Foo).entries))
 * ])
 * ```
 *
 * The only special thing here is that `Thingy`, `Entity` and `Foo` all have
 * `.fake` methods that return promises. Those would look good own you own
 * database models too, wouldn't they?
 */

var Promise = require('bluebird');

/**
 * ## Create Some Fakes
 *
 * @param  {Number}   amount   Number of fakes to create
 * @param  {Object}   entity   The entity to fake
 * @param  {Function} entity.fake  Entity's fake method
 * @param  {Object}   extra    Default data, given to faking method
 * @param  {Object}   mapOpts  Options for `Promise.map`
 * @param  {Object}   mapOpts.concurrency  Concurrency limit for `.fake` calls
 * @return {Object}   Object with `.entries` method to continue the chain
 *
 * @example
 * ```js
 * var thingies = [];
 * var Thingy = {
 *   fake: function () {
 *     thingies.push(opts);
 *     return Promise.resolve();
 *   }
 * };
 *
 * T.create(5, Thingy).entries()
 * .then(function (data) {
 * 	 // => data is an array of 5 Thingy entries!
 * });
 * ```
 */
function create(amount, entity, extra, mapOpts) {
  if (!entity || typeof entity.fake !== 'function') {
    throw new Error(
      "`create` doesn't know how to fake this entity: " + entity
    )
  }

  var process = function (parent, parentIndex) {
    var range = [];
    for (var i = 0; i < amount; i++) {
      range.push(i);
    }

    return Promise.map(
      range,
      function (index) {
        var opts;
        if (typeof extra === 'function') {
          opts = extra(index, parent, parentIndex);
        } else {
          opts = extra;
        }

        return entity.fake(opts);
      },
      mapOpts
    );
  };
  return {
    entries: process,
    entry: process
  };
}

/**
 * ## Remember My Data
 *
 * @param  {Object} context Object to store data on, e.g. test context
 * @param  {String} name    Property name to which data will be saved
 * @return {Function} Adds data to context and returns the same data
 *
 * @example
 * ```js
 * var temp = {};
 * T.create(5, Thingy).entries()
 * .then(T.rememberAs(temp, 'thingies'));
 *
 * // Use `bind` to create a shortcut
 * var rememberAs = T.rememberAs.bind(null, temp);
 *
 * T.create(5, Thingy).entries()
 * .then(rememberAs('thingies'));
 * ```
 */
function rememberAs(context, name) {
  return function (data) {
    context[name] = data;
    return data;
  };
}

function doThis(list) {
  var process = function (parent) {
    var tasks;
    if (typeof parent === 'undefined') {
      tasks = list;
    } else {
      tasks = list.map(function (task) {
        if (typeof task === 'function') {
          return task(parent);
        }
        return task;
      });
    }
    return Promise.all(tasks);
  };

  var initial;

  initial = process;

  initial.then = function () {
    return process();
  };

  // initial.then = process;

  return initial;
}

// - - -

module.exports = {
  create: create,
  inParallel: doThis,
  forEach: function (fn) {
    return function (list) {
      return list.map(fn);
    };
  },
  forTheFirst: function (fn) {
    return function (list) {
      return fn(list[0]);
    };
  },
  rememberAs: rememberAs
};
