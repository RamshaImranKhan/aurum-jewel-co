const mongoose = require('mongoose')

function requireDb(req, res, next) {
  if (mongoose.connection.readyState === 1) {
    return next()
  }

  const configured = Boolean(process.env.MONGO_URI)
  return res.status(503).json({
    message: configured
      ? 'Database is connecting. Please retry in a few seconds.'
      : 'Database is not configured. Set MONGO_URI in Railway Variables and redeploy.',
    mongo: 'disconnected',
    mongoUriConfigured: configured
  })
}

module.exports = requireDb
