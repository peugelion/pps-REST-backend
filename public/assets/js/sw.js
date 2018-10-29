'use strict';

self.addEventListener('push', function(event) {
  console.log('[Service Worker] Push Received.');
  console.log(`[Service Worker] Push had this data: "${event.data.text()}"`);
  console.log('event.data', event.data);

  var pushData = JSON.parse(event.data.text());

  const title = pushData.title;
  const options = {
    body: pushData.body,
    icon: pushData.icon
  };

  const notificationPromise = self.registration.showNotification(title, options);
  // This method takes a promise and the browser will keep the service worker alive and running until the promise passed in has resolved.
	event.waitUntil(notificationPromise);
});

self.addEventListener('notificationclick', function(event) {
  console.log('[Service Worker] Notification click Received.');

  event.notification.close();

  // event.waitUntil(
  //   clients.openWindow('http://localhost:3000/taskOverview')
  // );
});