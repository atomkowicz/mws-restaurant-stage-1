import idb from 'idb';

const dbPromise = idb.open('test-db', 1, (upgradeDb) => {
  switch (upgradeDb.oldVersion) {
    case 0:
      var tableStore = upgradeDb.createObjectStore('tableTest');
      tableStore.put("world", "hello");
  }
})

class Database {

  static fetchRest() {
    dbPromise.then(function (db) {
      var tx = db.transaction('keyval');
      var keyValStore = tx.objectStore('tableTest');
      return keyValStore.get('hello');
    }).then(function (val) {
      console.log('The value of "hello" is:', val);
    });
  }

}

export default Database;