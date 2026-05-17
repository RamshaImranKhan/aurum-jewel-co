const path = require('path')

function lazyRoute(modulePath) {
  let router
  const resolved = path.resolve(__dirname, '..', String(modulePath).replace(/^\.\//, ''))
  return (req, res, next) => {
    if (!router) router = require(resolved)
    return router(req, res, next)
  }
}

module.exports = lazyRoute
