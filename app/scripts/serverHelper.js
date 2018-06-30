import IndexedDB from './IndexedDB';
import { fillReviewsHTML } from './restaurant_info';

const PORT = 1337; // Change this to your server port
export var currentOnlineHandler;

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

    // We are offline, get restaurants from IndexedDb
    if (navigator.onLine === false) {
      IndexedDB.getRestaurants()
        .then((cachedRestaurants) => {
          if (cachedRestaurants.length) {
            return callback(null, cachedRestaurants);
          }
        }).catch((e) => {
          console.log("Error getting restaurants from IndexedDB", e);
          callback("Error fetching data from server", null);
        });
    }

    // We are online, fetch restaurants from network and update in database
    if (navigator.onLine === true) {
      fetch(ServerHelper.DATABASE_URL + 'restaurants', { headers: { 'Accept': 'application/json' } })
        .then(response => response.json())
        .then(restaurants => {
          IndexedDB.saveRestaurants(restaurants);
          return callback(null, restaurants);
        }).catch((e) => {
          console.log("Error fetching data from server", e);
          callback("Error fetching data from server", null);
        });
    }
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {

    // We are offline, get restaurants from IndexedDb
    if (navigator.onLine === false) {
      IndexedDB.getRestaurants()
        .then((cachedRestaurants) => {
          if (cachedRestaurants.length) {
            var restaurant = cachedRestaurants.find(rest => rest.id == id);
            return callback(null, restaurant);
          }
        }).catch((e) => {
          console.log("Error getting restaurant from IndexedDB", e);
          callback("Error fetching data from server", null);
        });
    }

    // We are online, fetch restaurant from network and update in database
    if (navigator.onLine === true) {
      fetch(ServerHelper.DATABASE_URL + 'restaurants/' + id, { headers: { 'Accept': 'application/json' } })
        .then(response => response.json())
        .then(restaurant => {
          return callback(null, restaurant);
        }).catch((e) => {
          console.log("Error fetching data from server 😢", e);
          callback("Error fetching data from server", null);
        });
    }
  }

  /**
   * Fetch a restaurant's reviews by its ID.
   */
  static fetchReviewsForRestaurant(id, callback) {

    // We are offline, get restaurants from IndexedDb
    if (navigator.onLine === false) {
      IndexedDB.getReviews(id)
        .then((stashedReviews) => {
          console.log(stashedReviews);
          if (stashedReviews) {
            return callback(null, stashedReviews);
          }
        })
    }

    // We are online, fetch reviews from network and update in database
    if (navigator.onLine === true) {
      fetch(ServerHelper.DATABASE_URL + 'reviews/?restaurant_id=' + id, { headers: { 'Accept': 'application/json' } })
        .then(response => response.json())
        .then(reviews => {
          IndexedDB.saveReviews(reviews);
          return callback(null, reviews);
        }).catch((e) => {
          console.log("Error fetching reviews from server 😢", e);
        });
    }
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
          currentOnlineHandler = () => ServerHelper.updateIndicator(callback);
          window.addEventListener('online', currentOnlineHandler);
          console.log("added ", currentOnlineHandler);

        }
      });
  }

  /**
   * Mark restaurant as favourite.
   */
  static markAsFavourite(id, isFavourite) {

    const favourite = isFavourite ? "true" : "false";

    fetch(ServerHelper.DATABASE_URL + 'restaurants/' + id + '/?is_favorite=' + favourite, {
      headers: { 'Accept': 'application/json' },
      method: 'PUT',
    })
      .then((result) => {
        console.log(result);
      })
      .catch((e) => {
        console.log("Error, review was not updated: " + e);
      })
  }

  static updateIndicator(callback) {
    window.removeEventListener('online', currentOnlineHandler);
    console.log("removed ", currentOnlineHandler);
    if (navigator.onLine) {
      console.log("😎 You're online again! I'm posting stashed review and clearing db 😊");

      IndexedDB.getWaitingReviews().then(reviews => {
        if (reviews.length) {
          IndexedDB.clearWaitingReviews();
          reviews.forEach(review => {
            ServerHelper.postReview(review, (error, reviews) => {
              console.log("Refreshing reviews list...");
              console.log(reviews);
              return callback(null, reviews);
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
}

export default ServerHelper;
