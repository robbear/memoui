import Database from '../../public/src/utilities/Database.js';

/* global assert */
/* global indexedDB */

//
// Change this to false if you want to preserve the database after
// the last test for manual inspection.
//
const cleanDatabase = true;

const DBNAME = 'test-db';
const version = 1;

let database;

function cleanup(done, cb) {
    if (database) {
      database.close();
    }
    
    let request = indexedDB.deleteDatabase(DBNAME);
    
    request.onsuccess = (event) => {
      if (cb) cb();
      database = new Database(DBNAME, version);
      done();
    };
    
    request.onerror = (event) => {
      console.error(`failed to delete database: ${event.error}`);
    };
    
    request.onblocked = (event) => {
      console.error('deleteDatabase is blocked');
    };
}

describe("Database", () => {
  
  beforeEach((done) => {
    cleanup(done, () => {
      database = new Database(DBNAME, version);      
    });
  });
  
  after((done) => {
    if (cleanDatabase) {
      cleanup(done);
    }
    else {
      done();
    }
  });

  it('initializes the database and object stores', (done) => {
    database.open(done)
    .then((db) => {
      assert.exists(db);
      done();
    });
  });

});