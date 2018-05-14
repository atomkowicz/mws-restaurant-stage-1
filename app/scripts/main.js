import DBHelper from './dbhelper';

var restaurants,
  neighborhoods,
  cuisines
var map
var markers = []
var cSelect = document.getElementById('cuisines-select');
var nSelect = document.getElementById('neighborhoods-select');

/**
 * Fetch all neighborhoods and set their HTML.
 */
const fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods((error, neighborhoods) => {
    if (error) { // Got an error
      console.error(error);
    } else {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    }
  });
}

/**
 * Set neighborhoods HTML.
 */
const fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {

  const select = document.getElementById('neighborhoods-select');
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
}

/**
 * Fetch all cuisines and set their HTML.
 */
const fetchCuisines = () => {
  DBHelper.fetchCuisines((error, cuisines) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.cuisines = cuisines;
      fillCuisinesHTML();
    }
  });
}

/**
 * Set cuisines HTML.
 */
const fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');

  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
}

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  let loc = {
    lat: 40.722216,
    lng: -73.987501
  };
  self.map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: loc,
    scrollwheel: false
  });
  updateRestaurants();
}


/**
 * Update page and map for current restaurants.
 */
const updateRestaurants = () => {
  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      resetRestaurants(restaurants);
      fillRestaurantsHTML();
    }
  })
}

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
const resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';
  // Remove all map markers
  if (self.markers) self.markers.forEach(m => m.setMap(null));
  self.markers = [];
  self.restaurants = restaurants;
}

/**
 * Create all restaurants HTML and add them to the webpage.
 */
const fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  restaurants.forEach(restaurant => {
    let li = createRestaurantHTML(restaurant);
    ul.append(li);
    createObserver(li);
  });
  addMarkersToMap();
}

/**
 * Create restaurant HTML.
 */
const createRestaurantHTML = (restaurant) => {
  const li = document.createElement('li');
  li.id = `picture-container-${restaurant.id}`;
  li.classList.add('picture-container');
  li.setAttribute('data-url-mobile', DBHelper.imageUrlMobileForRestaurant(restaurant));
  li.setAttribute('data-url-desk', DBHelper.imageUrlDeskForRestaurant(restaurant));
  li.setAttribute('data-name', `${restaurant.name}`);

  const name = document.createElement('h2');
  name.innerHTML = restaurant.name;
  li.append(name);

  const neighborhood = document.createElement('p');
  neighborhood.innerHTML = restaurant.neighborhood;
  li.append(neighborhood);

  const address = document.createElement('p');
  address.innerHTML = restaurant.address;
  li.append(address);

  const more = document.createElement('a');
  more.innerHTML = 'View Details';
  more.href = DBHelper.urlForRestaurant(restaurant);
  more.setAttribute("aria-label", "Restaurant details page");
  li.append(more)
  return li
}

/**
 * Add markers for current restaurants to the map.
 */
const addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
    google.maps.event.addListener(marker, 'click', () => {
      window.location.href = marker.url
    });
    self.markers.push(marker);
  });
}

/**
 * Register Service Worker
 */
const registerServiceWorker = () => {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js').then(function (registration) {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      }, function (err) {
        console.log('ServiceWorker registration failed: ', err);
      });
    });
  }
};

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', () => {
  // registerServiceWorker();
  fetchNeighborhoods();
  fetchCuisines();

  [cSelect, nSelect].forEach(el => el.addEventListener('change', () => {
    updateRestaurants();
  }));

  // show map on button click
  const showMap = document.getElementById('js-show-map');
  showMap.addEventListener('click', () => {
    document.getElementById('js-show-map').style.display ='none';
    document.getElementById('map').style.display ='block';
  })
});


var prevRatio = 0.0;
function createObserver(el) {
  var observer;

  var options = {
    root: null,
    rootMargin: "0px",
    threshold: [1]
  };

  observer = new IntersectionObserver(handleIntersect, options);
  observer.observe(el);
}

function handleIntersect(entries, observer) {
  entries.forEach(function (entry) {
    if (entry.intersectionRatio > 0) {

      const picture = document.createElement('picture');

      const srcMobile = entry.target.dataset.urlMobile;
      const sourceMobile = document.createElement('source');
      sourceMobile.setAttribute('media', '(max-width: 799px)');
      sourceMobile.setAttribute('srcset', srcMobile);
      picture.appendChild(sourceMobile);

      const srcDesk = entry.target.dataset.urlDesk;
      const sourceDesk = document.createElement('source');
      sourceDesk.setAttribute('media', '(min-width: 800px)');
      sourceDesk.setAttribute('srcset', srcDesk);
      picture.appendChild(sourceDesk);

      const restName = entry.target.dataset.name;
      const image = document.createElement('img');
      image.className = 'restaurant-img';
      image.src = srcDesk;
      image.alt = `Restaurant ${restName}`;
      picture.append(image);
      entry.target.insertAdjacentElement('afterbegin', picture)
      observer.unobserve(entry.target);
    }

    prevRatio = entry.intersectionRatio;
  });
}