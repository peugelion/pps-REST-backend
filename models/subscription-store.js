let Datastore = require('nedb'),
    path      = require('path'),
    webpush   = require('web-push'),
    fs        = require('fs');
    
let triggerPushMsg = function (subscription, dataToSend) {
  return webpush.sendNotification(subscription, dataToSend)
  .catch((err) => {
    // 404 - Not Found, 410 - Gone
    if (err.statusCode === 410 || err.statusCode === 404) {
      return null; //deleteSubscriptionFromDatabase(subscription._id);
    } else {
      console.log('Subscription is no longer valid: ', err);
    }
  });
}

module.exports = function() {
  // reading VAPID keys from a file
  let VAPIDs;
  fs.readFile('VAPID.keys', 'utf8', (err, data) => {
    if (err) throw err;
    if (data) VAPIDs = JSON.parse(data);
    else {
      VAPIDs = webpush.generateVAPIDKeys();
      vapidString = JSON.stringify(VAPIDs);
      fs.writeFile('VAPID.keys', vapidString, (err) => {
        if (err) throw err;
        console.log('The file has been written');
      });
    }
    webpush.setVapidDetails(
      'mailto:jovanovic.jovica@gmail.com',
      VAPIDs.publicKey,
      VAPIDs.privateKey
    );
  });
  // end reading VAPID keys from a file
  // load the database file with all subscriptions - this is temporary for push notification testing
  const subscriptions = new Datastore({
    filename: path.join(__dirname, '../db/subscription-store.db'),
    autoload: true
  });
  return {
    saveSubscriptionToDatabase: function(subscription) {
      return new Promise(function(resolve, reject) {
        subscriptions.insert(subscription, function(err, newDoc) {
          if (err) {
            reject(err);
            return;
          }

          resolve(newDoc._id);
        });
      });
    },
    getSubscriptionsFromDatabase: function() {
      return new Promise(function(resolve, reject) {
        subscriptions.find({}, function(err, docs) {
          if (err) {
            reject(err);
            return;
          }

          resolve(docs);
        })
      });
    },
    deleteSubscriptionFromDatabase: function(subscriptionId) {
      return new Promise(function(resolve, reject) {
      subscriptions.remove({_id: subscriptionId }, {}, function(err) {
          if (err) {
            reject(err);
            return;
          }

          resolve();
        });
      });
    },
    isValidSaveRequest: function(req, res) {
      // Check the request body has at least an endpoint.
      if (!req.body || !req.body.endpoint) {
        // Not a valid subscription.
        res.status(400);
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify({
          error: {
            id: 'no-endpoint',
            message: 'Subscription must have an endpoint.'
          }
        }));
        return false;
      }
      return true;
    },
    sendPushMsgs: function(dataToSend) {
      return this.getSubscriptionsFromDatabase()
      .then(function(subscriptions) {
        let promiseChain = Promise.resolve();

        for (let i = 0; i < subscriptions.length; i++) {
          const subscription = subscriptions[i];
          promiseChain = promiseChain.then(() => {
            return triggerPushMsg(subscription, dataToSend);
          });
        }

        return promiseChain;
      });
      // .then(() => {
      //   res.setHeader('Content-Type', 'application/json');
      //   res.send(JSON.stringify({ data: { success: true } }));
      // })
      // .catch(function(err) {
      //   res.status(500);
      //   res.setHeader('Content-Type', 'application/json');
      //   res.send(JSON.stringify({
      //     error: {
      //       message: `Unable to send messages to all subscriptions : '${err.message}'`
      //     }
      //   }));
      // });
    },
    getVAPIDPublicKey: function() {
      return VAPIDs.publicKey;
    }
  }
}();