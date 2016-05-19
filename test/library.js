describe('Library', function() {

  describe('loading', function() {

    it('should create the appropriate folders');

    it('should create a default path if none is given', function() {
      var lib = new shelf.Library();
      chai.assert.include(lib.path, ".pandoc");
    });

    it('should use the given path if a path is given', function() {
      var library = path.resolve("./test/data");
      var lib = new shelf.Library(library);
      chai.assert.equal(library, lib.path);
    });

    it('should fix the file name if the filename and the key are mismatched');

  });

  describe('writing', function() {

    it('should write a default.json file in the path', function() {
      var library = path.resolve("./test/data");
      var lib = new shelf.Library(library);
      lib.write();
      chai.assert.isFile(library + "/default.json");
    });

  });

});
