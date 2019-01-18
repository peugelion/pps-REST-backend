/* https://medium.com/the-node-js-collection/simple-server-side-cache-for-express-js-with-node-js-45ff296ca0f0 */
let mcache = require('memory-cache');

mcacheObj = {};

mcacheObj.cache = (duration) => {
  return (req, res, next) => {
    // var production = process.env.NODE_ENV === 'production'
    // if (!production) {
    let key = '__express__' + req.originalUrl || req.url
    let cachedBody = mcache.get(key)
    // console.log('cached ?', cachedBody);
    if (cachedBody) {
      res.send(cachedBody)
      return
    } else {
      res.sendResponse = res.send
      res.send = (body) => {
        mcache.put(key, body, duration * 1000);
        res.sendResponse(body)
      }
      next()
    }
    // } else {
    //   // ne koristi u produkciji
    //   res.sendResponse = res.send
    //   res.send = (body) => res.sendResponse(body)
    //   next()
    // }
  }
}

module.exports = mcacheObj;