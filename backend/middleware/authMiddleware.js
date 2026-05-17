const jwt = require('jsonwebtoken')
const User = require('../models/User')

async function protect(req, res, next) {
  const auth = req.headers.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null

  if (!token) {
    res.status(401)
    return next(new Error('Not authorized, no token'))
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = await User.findById(decoded.id).select('-password')
    if (!req.user) {
      res.status(401)
      return next(new Error('Not authorized, user not found'))
    }
    next()
  } catch (e) {
    res.status(401)
    next(new Error('Not authorized, token failed'))
  }
}

function admin(req, res, next) {
  if (req.user && req.user.isAdmin) {
    next()
  } else {
    res.status(401)
    next(new Error('Not authorized as an admin'))
  }
}

module.exports = { protect, admin }





