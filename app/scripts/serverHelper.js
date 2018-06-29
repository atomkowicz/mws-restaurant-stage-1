import IndexedDB from './db';
import { fillReviewsHTML } from './restaurant_info';

const PORT = 1337; // Change this to your server port

/**
 * Common database helper functions.
 */
class ServerHelper {

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    return `http://localhost:${PORT}/`;
  }


  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback) {
    var cached = null;

    // check for data cached in database
    IndexedDB.getRestaurants()
      .then((cachedRestaurants) => {
        if (cachedRestaurants.length) {
          if (!cached) {
            cached = true;
            // console.log(cachedRestaurants)
            return callback(null, cachedRestaurants);
          }
        }
      })

    // fetch data from network and update in database
    fetch(ServerHelper.DATABASE_URL + 'restaurants', { headers: { 'Accept': 'application/json' } })
      .then(response => response.json())
      .then(restaurants => {
        IndexedDB.saveRestaurants(restaurants);
        if (!cached) return callback(null, restaurants);
      }).catch((e) => {
        console.log("Error fetching data from server", e);
      });
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    var cached = null;

    // check for data cached in database
    IndexedDB.getRestaurants()
      .then((cachedRestaurants) => {
        if (cachedRestaurants.length) {
          if (!cached) {
            cached = true;
            var restaurant = cachedRestaurants.find(rest=>rest.id == id);
            return callback(null, restaurant);
          }
        }
      })

    fetch(ServerHelper.DATABASE_URL + 'restaurants/' + id, { headers: { 'Accept': 'application/json' } })
      .then(response => response.json())
      .then(restaurant => {
        if (!cached) return callback(null, restaurant);
      }).catch((e) => {
        console.log("Error fetching data from server 😢", e);
        callback("Error fetching data from server", null);
      });
  }

  /**
   * Fetch a restaurant's reviews by its ID.
   */
  static fetchReviewsForRestaurant(id, callback) {
    var cached = null;

    // check for data cached in database
    IndexedDB.getReviews(id)
      .then((stashedReviews) => {
        if (stashedReviews) {
          if (!cached) {
            cached = true;
            return callback(null, stashedReviews);
          }
        }
      })

    fetch(ServerHelper.DATABASE_URL + 'reviews/?restaurant_id=' + id, { headers: { 'Accept': 'application/json' } })
      .then(response => response.json())
      .then(reviews => {
        IndexedDB.saveReviews(reviews);
        if (!cached) return callback(null, reviews);
        /// DELETE ALL REVIEWS DELETE ALL REVIEWS DELETE ALL REVIEWS DELETE ALL REVIEWSDELETE ALL REVIEWSDELETE ALL REVIEWS
        //ServerHelper.deleteAllReviews(reviews);
        /// DELETE ALL REVIEWS DELETE ALL REVIEWS DELETE ALL REVIEWS DELETE ALL REVIEWSDELETE ALL REVIEWSDELETE ALL REVIEWS
      }).catch((e) => {
        console.log("Error fetching reviews from server 😢", e);
      });
  }

  /**
   * Post a review.
   */
  static postReview(data, callback) {

    fetch(ServerHelper.DATABASE_URL + 'reviews/', {
      headers: { 'Accept': 'application/json' },
      method: 'POST',
      body: JSON.stringify(data)
    })
      .then((result) => {
        if (result.statusText == "Created") {
          console.log("Review was successfully posted to server 😌");

          fetch(ServerHelper.DATABASE_URL + 'reviews/?restaurant_id=' + data.restaurant_id, { headers: { 'Accept': 'application/json' } })
            .then(response => response.json())
            .then(reviews => {
              IndexedDB.saveReviews(reviews);
              return callback(null, reviews);
            }).catch((e) => {
              console.log("Error fetching reviews from server 😢", e);
            });

        } else {
          return callback("Error, review was not created: " + result.statusText, null);
        }
      })
      .catch((e) => {
        if (navigator.onLine === false) {
          // We are offline, save review to indexedDB for later
          IndexedDB.saveWaitingReview(data);
          console.log("You're offline! 😱, I'm saving review to indexedDB until connection is restored 😓");
          window.addEventListener('online', function test(callback) { ServerHelper.updateIndicator(callback) });
        }
      });
  }

  static updateIndicator(callback) {
    if (navigator.onLine) {
      console.log("😎 You're online again! I'm posting stashed review and clearing db 😊");

      window.removeEventListener('online', ServerHelper.updateIndicator);
      const waitingReviews = IndexedDB.getWaitingReviews();

      waitingReviews.then(reviews => {
        if (reviews.length) {
          reviews.forEach(review => {
            ServerHelper.postReview(review, (error, reviews) => {
              console.log("Refreshing reviews list...");
              fillReviewsHTML(reviews);
              IndexedDB.clearWaitingReviews();
            });
          })
        }
      })
    }
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    ServerHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    ServerHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    ServerHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    ServerHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    ServerHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    return (`/img/${restaurant.photograph || restaurant.id}.jpg`);
  }

  /**
   * Restaurant image URL - icon for desktop
   */
  static imageUrlDeskForRestaurant(restaurant) {
    let imgUrl = `${restaurant.photograph || restaurant.id}-desk.jpg`;
    return (`/img/${imgUrl}`);
  }

  /**
   * Restaurant image URL - icon for mobile
   */
  static imageUrlMobileForRestaurant(restaurant) {
    let imgUrl = `${restaurant.photograph || restaurant.id}-mobile.jpg`;
    return (`/img/${imgUrl}`);
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {

    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: ServerHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP
    });
    return marker;
  }

  /**
   * Delete review.
   */
  static deleteReview(id) {
    fetch(ServerHelper.DATABASE_URL + 'reviews/' + id, {
      headers: { 'Accept': 'application/json' },
      method: 'DELETE',
    })
  }

  static deleteAllReviews(reviews) {
    for (let review of reviews) {
      ServerHelper.deleteReview(review.id);
    }
  }

}

export default ServerHelper;
