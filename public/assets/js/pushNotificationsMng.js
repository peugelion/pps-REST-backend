// adding support for push notifications
//const applicationServerPublicKey = 'BHLCrsFGJQIVgg-XNp8F59C8UFF49GAVxvYMvyCURim3nMYI5TMdsOcrh-yJM7KbtZ3psi5FhfvaJbU_11jwtPY'; // the public VAPID Key
let isSubscribed = false;
let swRegistration = null;

if ('serviceWorker' in navigator && 'PushManager' in window) {
  window.addEventListener('load', function() {
    if (!navigator.serviceWorker.controller) {
      navigator.serviceWorker.register('/assets/js/sw.js')
        .then(function(swReg) {
          console.log('Service Worker is registered', swReg);

          swRegistration = swReg;
          initializeUI();
        })
        .catch(function(error) {
          console.error('Service Worker Error', error);
        });
    }
  });
} else {
  console.warn('Push messaging is not supported');
}

function initializeUI() {
  // Set the initial subscription value
  swRegistration.pushManager.getSubscription()
  .then(function(subscription) {
    isSubscribed = !(subscription === null);
    if (isSubscribed) {
      console.log('User IS subscribed.');
    } else {
      console.log('User is NOT subscribed.');
      subscribeUser();
    }
  });
}

function subscribeUser() {
  const applicationServerKey = urlB64ToUint8Array(vapidPublicKey);
  console.log('applicationServerKey ==== ', applicationServerKey);
  swRegistration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: applicationServerKey
  })
  .then(function(pushSubscription) {
    console.log('User is subscribed.');

    updateSubscriptionOnServer(pushSubscription);

    isSubscribed = true;
  })
  .catch(function(err) {
    console.log('Failed to subscribe the user: ', err);
  });
}

function askPermission() {
  return new Promise(function(resolve, reject) {
    const permissionResult = Notification.requestPermission(function(result) {
      resolve(result);
    });

    if (permissionResult) {
      permissionResult.then(resolve, reject);
    }
  })
  .then(function(permissionResult) {
    if (permissionResult !== 'granted') {
      throw new Error('We weren\'t granted permission.');
    }
  });
}

// This function uses the Permission API to get the permission state, falling back to 
// Notification.permission if the Permission API is not supported.
function getNotificationPermissionState() {
  if (navigator.permissions) {
    return navigator.permissions.query({name: 'notifications'})
    .then(function(result) {
      return result.state;
    });
  }

  return new Promise(function(resolve) {
    resolve(Notification.permission);
  });
}

function updateSubscriptionOnServer(subscription) {
  // TODO: Send subscription to application server
  console.log('subscription === ', subscription);
  sendSubscriptionToBackEnd(JSON.stringify(subscription));

}

function sendSubscriptionToBackEnd(subscription) {
  $.ajax({
    url: '/tasks/api/save-subscription/',
    type: 'POST',
    contentType: 'application/json; charset=utf-8',
    dataType: 'json',
    data: subscription
  }).then(
    function(data) {
      console.log('data === ', data);
    },
    function(jqXHR, textStatus, errorThrown){
      console.log('errorThrown === ', errorThrown);
      console.log('jqXHR === ', jqXHR);
  });
}

function urlB64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}