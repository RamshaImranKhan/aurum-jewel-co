function lazyRoute(modulePath) {
  let router
  return (req, res, next) => {
    if (!router) router = require(modulePath)
    return router(req, res, next)
  }
}

module.exports = lazyRoute
