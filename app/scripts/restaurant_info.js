import ServerHelper from './serverHelper';

var restaurant;
var reviews;
var map;

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
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    registerServiceWorker();

    if (error) { // Got an error!
      console.error(error);
    } else {
      self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false
      });
      fillBreadcrumb();

      ServerHelper.mapMarkerForRestaurant(self.restaurant, self.map);
    }
  });

  fetchRestaurantReviewsFromURL((error, reviews) => {
    if (error) { // Got an error!
      console.error(error);
    }
  });
}

/**
 * Get current restaurant from page URL.
 */
const fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    // callback(error, null);
  } else {
    ServerHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML();
      fillFavouriteHTML();
      callback(null, restaurant)
    });
  }
}
/**fetchRestaurantReviewsFromURL
 * Get current reviews from page URL.
 */
const fetchRestaurantReviewsFromURL = (callback) => {
  if (self.reviews) { // already fetched!
    callback(null, self.reviews)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    // error = 'No restaurant id in URL'
    // callback(error, null);
  } else {
    ServerHelper.fetchReviewsForRestaurant(id, (error, reviews) => {
      self.reviews = reviews;
      if (!reviews) {
        console.error(error);
        return;
      }
      fillReviewsHTML(reviews);
      callback(null, reviews)
    });
  }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
const fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const picture = document.getElementById('restaurant-picture');

  const sourceMobile = document.createElement('source');
  sourceMobile.setAttribute('media', '(max-width: 400px)');
  sourceMobile.setAttribute('srcset', ServerHelper.imageUrlMobileForRestaurant(restaurant));
  picture.appendChild(sourceMobile);

  const sourceDesk = document.createElement('source');
  sourceDesk.setAttribute('media', '(min-width: 401px)');
  sourceDesk.setAttribute('srcset', ServerHelper.imageUrlForRestaurant(restaurant));
  picture.appendChild(sourceDesk);

  const image = document.createElement('img');
  image.src = ServerHelper.imageUrlForRestaurant(restaurant);
  image.alt = `Restaurant ${restaurant.name}`;
  image.className = 'restaurant-img';
  picture.append(image);

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }

  // fill reviews
  fillReviewsHTML(self.reviews);
  self.reviews = null;
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
const fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');

  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('th');
    day.scope = "row";
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
export const fillReviewsHTML = (reviews = self.reviews) => {
  const container = document.getElementById('reviews-container');

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  ul.innerHTML = "";
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
const fillFavouriteHTML = (restaurant = self.restaurant) => {
  const favouriteCheckbox = document.getElementById('favourite-input');
  favouriteCheckbox.checked = restaurant.is_favorite;
}


/**
 * Create review HTML and add it to the webpage.
 */
const createReviewHTML = (review) => {
  const li = document.createElement('li');
  const name = document.createElement('p');
  name.innerHTML = review.name;
  name.classList.add("review-name");
  li.appendChild(name);

  const date = document.createElement('p');
  date.innerHTML = review.createdAt;
  date.classList.add("review-date");
  li.appendChild(date);

  const rating = document.createElement('p');
  var s = "<div>☆</div>".repeat(parseInt(review.rating));
  rating.innerHTML = `Rating: ${s}`;
  rating.classList.add("review-rating");
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  li.appendChild(comments);

  return li;
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
const fillBreadcrumb = (restaurant = self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
const getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', () => {
  // show map on button click
  const showMap = document.getElementById('js-show-map');
  showMap.addEventListener('click', () => {
    document.getElementById('js-show-map').style.display = 'none';
    document.getElementById('map').style.display = 'block';
  });
});

const submit = document.getElementById("js-submit-review");

if (submit != null)
  submit.addEventListener("submit", (e) => {
    e.preventDefault();
    e.stopPropagation();
    var form = document.getElementById('js-submit-review');
    var formData = new FormData(form);

    var data = {};
    formData.forEach((value, key) => {
      data[key] = value;
    });

    const id = getParameterByName('id');
    data["restaurant_id"] = parseInt(id);

    if (!id) { // no id found in URL
      let error = 'No restaurant id in URL'
    } else {
      form.reset();

      ServerHelper.postReview(data, (error, reviews) => {
        self.reviews = reviews;
        if (!reviews) {
          console.error(error);
          return;
        }
        fillReviewsHTML(reviews);
      });
    }
  });


const favouriteCheckbox = document.getElementById("favourite-input");
if (favouriteCheckbox != null) {
  favouriteCheckbox.addEventListener('change', function () {

    const id = getParameterByName('id');
    if (!id) {
      console.log("no id found in url");
    } else {
      ServerHelper.markAsFavourite(id, this.checked);
    }
  });
}