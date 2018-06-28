import idb from 'idb';

const dbPromise = idb.open('restaurants', 1, (upgradeDb) => {
  switch (upgradeDb.oldVersion) {
    case 0:
      var restaurantsStore = upgradeDb.createObjectStore('restaurants');
      var reviewsStore = upgradeDb.createObjectStore('reviews');
      var waitingStore = upgradeDb.createObjectStore('waiting', {keyPath: 'key', autoIncrement: true});
      reviewsStore.createIndex("restaurant_id", "restaurant_id", { unique: false });
  }
})

class IndexedDB {

  static getRestaurants() {
    return dbPromise.then((db) => {
      if (!db) return;
      const transaction = db.transaction('restaurants');
      const store = transaction.objectStore('restaurants');
      return store.getAll();
    }).catch(err => {
      console.log('error getting restaurants from database', err)
    })
  }

  static saveRestaurants(restaurants) {
    return dbPromise.then((db) => {
      const transaction = db.transaction('restaurants', 'readwrite');
      const store = transaction.objectStore('restaurants');     
      restaurants.forEach(restaurant => store.put(restaurant, restaurant.id));
    }).catch(err => {
      console.log('error saving restaurants to database', err)
    })
  }

  static saveReviews(reviews) {
    return dbPromise.then((db) => {
      const transaction = db.transaction('reviews', 'readwrite');
      const store = transaction.objectStore('reviews');  
      reviews.forEach(review => store.put(review, parseInt(review.id)));
    }).catch(err => {
      console.log('error saving reviews to database', err)
    })
  }

  static getReviews(id) {
    return dbPromise.then((db) => {
      if (!db) return;
      const transaction = db.transaction('reviews');
      const store = transaction.objectStore('reviews');
      var reviewsIndex = store.index('restaurant_id');
      return store.getAll(id);
    }).catch(err => {
      console.log('error getting review from database', err)
    })
  }

  static saveWaitingReview(review) {
    return dbPromise.then((db) => {
      const transaction = db.transaction('waiting', 'readwrite');
      const store = transaction.objectStore('waiting');  
      store.put(review)
    }).catch(err => {
      console.log('error saving review to database', err)
    })
  }

  static getWaitingReviews() {
    return dbPromise.then((db) => {
      if (!db) return;
      const transaction = db.transaction('waiting');
      const store = transaction.objectStore('waiting');
      return store.getAll();
    }).catch(err => {
      console.log('error getting review from database', err)
    })
  }

  static clearWaitingReviews() {
    return dbPromise.then((db) => {
      if (!db) return;
      const transaction = db.transaction('waiting', 'readwrite');
      const store = transaction.objectStore('waiting');
      return store.clear();
    }).catch(err => {
      console.log('error clearing waiting store', err)
    })
  }
}

export default IndexedDB;