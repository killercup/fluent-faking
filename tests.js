var expect = require('chai').expect;
var Promise = require('bluebird');

var T = require('./index');

describe("Faking DSL", function () {
  function newEntity() {
    var thingies = [];
    return {
      fake: function (opts) {
        opts = opts || {};
        thingies.push(opts);
        return Promise.resolve(opts);
      },
      all: thingies
    };
  }

  describe("crate", function () {
    it("can create stuff", function () {
      var Entity = newEntity();

      return (
        T.create(5, Entity).entries()
      )
      .then(function () {
        expect(Entity.all).to.have.length(5);
      });
    });

    it("fails with entities that don't specify a `fake` method", function () {
      expect(function () {
        return T.create(5, Error);
      }).to.throw();
    });
  });

  describe("remembers", function () {
    it("created stuff in the test context", function () {
      var context = this;
      var Thingy = newEntity();

      var rememberAs = T.rememberAs.bind(null, context);

      return (
        T.create(5, Thingy).entries()
        .then(rememberAs('thingies'))
      )
      .then(function (data) {
        expect(context.thingies).to.exist();
        expect(context.thingies).to.eql(Thingy.all);
      });
    });
  });

  describe("in parallel", function () {
    it("parallelizes tasks", function () {
      var Thingy = newEntity();
      var Entity = newEntity();

      return (
        T.inParallel([
          T.create(1, Thingy).entry(),
          T.create(3, Entity).entries()
        ])
      )
      .then(function () {
        expect(Thingy.all).to.have.length(1);
        expect(Entity.all).to.have.length(3);
      });
    });

    it("works as second step", function () {
      var Base = newEntity();
      var Thingy = newEntity();
      var Entity = newEntity();

      return (
        T.create(1, Base).entry()
        .then(T.inParallel([
          T.create(2, Thingy).entries(),
          T.create(6, Entity).entries()
        ]))
      )
      .then(function () {
        expect(Base.all).to.have.length(1);
        expect(Thingy.all).to.have.length(2);
        expect(Entity.all).to.have.length(6);
      });
    });

    it("works as second step and passes down the data", function () {
      var Base = newEntity();
      var Thingy = newEntity();
      var Entity = newEntity();

      var saved;
      var save = function (index, data) {
        saved = data[0];
      };

      var BASE_DATA = {awesomeness: {level: 42}};

      return (
        T.create(1, Base, BASE_DATA).entry()
        .then(T.inParallel([
          T.create(2, Thingy).entries,
          T.create(6, Entity, save).entries
        ]))
      )
      .then(function () {
        expect(Base.all).to.have.length(1);
        expect(Thingy.all).to.have.length(2);
        expect(Entity.all).to.have.length(6);

        expect(saved).to.eql(BASE_DATA);
      });
    });
  });

  describe("for each in chain", function () {
    it("does something", function () {
      var Author = newEntity();
      var Post = newEntity();

      return (
        T.create(2, Author).entries()
        .then(T.forEach(T.create(5, Post).entries))
      )
      .then(function () {
        expect(Author.all).to.have.length(2);
        expect(Post.all).to.have.length(2 * 5);
      });
    });
  });

  describe("for the first in chain", function () {
    it("does something", function () {
      var Author = newEntity();
      var Award = newEntity();

      return (
        T.create(5, Author).entries()
        .then(T.forTheFirst(T.create(1, Award).entry))
      )
      .then(function () {
        expect(Author.all).to.have.length(5);
        expect(Award.all).to.have.length(1);
      });
    });
  });

  describe("complex chains", function () {
    it("work flawlessly", function () {
      var Thingy = newEntity();
      var Entity = newEntity();
      var Stuff = newEntity();

      return (
        T.inParallel([
          T.create(1, Thingy).entry(),
          T.create(3, Entity).entries()
            .then(T.forEach(T.create(2, Stuff).entries))
        ])
      )
      .then(function () {
        expect(Thingy.all).to.have.length(1);
        expect(Entity.all).to.have.length(3);
        expect(Stuff.all).to.have.length(3 * 2);
      });
    });

    it("allow usage of custom functions", function () {
      var Admin = newEntity();
      var Author = newEntity();
      var Post = newEntity();
      var withUniqId = function () {
        var id = 1;
        return function () { id += 1; return {id: id}; };
      };
      var forAuthor = function (index, author, authorIndex) {
        return {author: author.id};
      };

      return (
        T.inParallel([
          T.create(1, Admin).entry(),
          T.create(3, Author, withUniqId()).entries()
            .then(T.forEach(T.create(2, Post, forAuthor).entries))
        ])
      )
      .then(function () {
        expect(Admin.all).to.have.length(1);
        expect(Author.all).to.have.length(3);
        expect(Post.all).to.have.length(3 * 2);

        Author.all.forEach(function (author) {
          expect(
            Post.all.filter(function (post) {
              return post.author === author.id;
            })
          ).to.have.length(2);
        });
      });
    });
  });
});
