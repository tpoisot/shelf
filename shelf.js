var fs = require('fs');
var os = require('os');
var path = require('path');

var entries = require('./lib/entries.js');
var keys = require('./lib/keys.js');
var doi = require('./lib/doi.js');
var pdf = require('./lib/icanhazpdf.js');

/**
@param {String} folder The folder to use / create
*/
function makeFolderIfNotExist(folder) {
  fs.accessSync(folder, fs.F_OK, function(err) {
    if (err) fs.mkdirSync(folder);
  })
};

function Library(library) {

  // Default path if none given
  if (library === undefined) {
    var home = process.env.HOME || process.env.USERPROFILE;
    library = home + "/.pandoc";
  }
  this.path = path.resolve(library);

  // Build the path for records and files
  this.records = this.path + "/records/";
  makeFolderIfNotExist(this.records);

  this.files = this.path + "/files/";
  makeFolderIfNotExist(this.files);

  // Read entries
  this.entries = [];
  this.read();
}

Library.prototype.read = function() {
  var files = fs.readdirSync(this.records);
  this.entries = [];
  for (var i = 0; i < files.length; i++) {
    // This is the file we read FROM
    var loadFrom = this.records + files[i];
    // We can `require` JSON objects
    var entry = require(loadFrom);
    // We convert this into an object
    var entryObject = new entries.Entry(entry, this);
    // If there is no id present, we generate one
    if (entryObject.content.id === undefined) {
      entryObject.content.id = this.generate(entryObject.content);
    }
    // Knowing the id, this is the filename the reference should have
    var loadExpect = this.records + entryObject.id() + ".json";
    // If there is a mismatch, we fix it
    if (loadExpect !== loadFrom) {
      // by removing the old file
      fs.unlinkSync(loadFrom);
      // and writing the correct one
      fs.writeFile(loadExpect, entryObject.json(), 'utf-8', function(e) {
        console.log(e);
      });
    }
    // Then we add the entry to the library
    this.entries.push(entryObject);
  }
};

Library.prototype.keys = function() {
  return this.entries.map(function(element, index, array) {
    return element.id();
  });
};

Library.prototype.entry = function(id) {
  var ok = this.entries.filter(function(element, index, array) {
    return element.id() === id;
  });
  if (ok.length === 1) {
    return ok[0];
  } else {
    return undefined;
  }
};

Library.prototype.generate = function(entry) {
  var rootAut = keys.Author(entry).toLowerCase().substr(0, 4);
  var rootDat = keys.Yr(entry);
  var rootLet = keys.title_first_letters(entry);
  var rootKey = rootAut + rootDat + rootLet;
  var trialKey = rootKey;
  var trials = 1;
  while (this.entry(trialKey)) {
    trials += 1;
    trialKey = rootKey + String(trials);
  }
  return trialKey;
};

Library.prototype.write = function(file, keys) {
  // File is used to determine where to write the library
  if (file === undefined) {
    file = this.path + "/default.json";
  }
  // Keys is an optional array with the keys to extract
  if (keys === undefined) {
    // If not defined, we return all the entries
    keys = this.keys();
  }
  // The final step is to filter the correct entries, then map a function to return the content only
  var entries = this.entries.filter(function(e, i, a) {
    return keys.indexOf(e.id()) > -1;
  }).map(function(e) {
    return e.content
  });
  // Finally, we write the entries in the output file
  fs.writeFileSync(file, JSON.stringify(entries, null, 2), 'utf-8', function(
    err) {
    if (err) console.log(err)
  });
};

Library.prototype.new = function(infos) {
  var entry = new entries.Entry(infos);
  entry.content.id = this.generate(entry.content);
  // The reference is written to file
  fs.writeFileSync(this.records + "/" + entry.id() + ".json", entry.json(),
    'utf-8',
    function(err) {
      console.log(err);
    });
  // The library is reloaded immediately after
  this.read(); // IDEA: maybe push instead of reloading?
  // NOTE the id of the new reference is returned because it might be useful
  return entry.id();
}

Library.prototype.attach = function(id, file) {
  var entry = this.entry(id);
  // TODO: Only if there is a valid entry
  var moveFileTo = this.files + id + ".pdf";
  fs.stat(file, function(err, stats) {
    if (err) {
      console.log(err);
    } else {
      fs.renameSync(file, moveFileTo, function(e) {
        if (e) {
          console.log(e);
        }
      });
    }
  });
};

Library.prototype.icanhazpdf = function(id) {
  var entry = this.entry(id);
  var file = pdf.get(entry.doi());
  this.attach(entry.id(), file);
}

module.exports.Library = Library;
module.exports.keys = keys;
module.exports.doi = doi;
module.exports.pdf = pdf;
