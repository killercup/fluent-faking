# fluent-faking

Helper methods to fluently describe data generation (CommonJS)

[![Build Status](https://travis-ci.org/killercup/fluent-faking.svg?branch=master)](https://travis-ci.org/killercup/fluent-faking)

## Example

```js
var Thingy, Entity, Foo; // each has a `.fake` method
var T = require('./faking_dsl');
var temp = {};

T.inParallel([
  T.create(1, Thingy).entry(),
  T.create(3, Entity).entries()
   .then(rememberAs('thingies', temp))
   .then(T.forEach(T.create(2, Foo).entries))
])
.then(function (oneThingyAndSixFoos) {
  // ...
})
```

## License

MIT
