import idb from 'idb';

const dbPromise = idb.open('restaurants', 1, (upgradeDb) => {
  switch (upgradeDb.oldVersion) {
    case 0:
      var restaurantsDb = upgradeDb.createObjectStore('restaurants');
      var reviewsDb = upgradeDb.createObjectStore('reviews');
      // restaurantsDb.put("restaurant", { keyPath: 'id' });
  }
})

class Database {

  static getRestaurants() {
    return dbPromise.then((db) => {
      if (!db) return;
      const transaction = db.transaction('restaurants');
      const store = transaction.objectStore('restaurants');
      return store.getAll();
    }).catch(err => {
      console.log('error getting data from database', err)
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
      console.log(reviews)   
      reviews.forEach(review => store.put(review, parseInt(review.id)));
    }).catch(err => {
      console.log('error saving reviews to database', err)
    })
  }

}

export default Database;