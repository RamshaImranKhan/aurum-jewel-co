const Cart = require('../models/Cart')
const User = require('../models/User')
const { isEmailConfigured, sendCartReminderEmail } = require('./emailService')

const DEFAULT_IDLE_HOURS = 24
const DEFAULT_CHECK_MS = 60 * 60 * 1000

function getIdleMs() {
  const hours = Number(process.env.CART_REMINDER_HOURS) || DEFAULT_IDLE_HOURS
  return Math.max(1, hours) * 60 * 60 * 1000
}

function getCheckIntervalMs() {
  const ms = Number(process.env.CART_REMINDER_CHECK_MS) || DEFAULT_CHECK_MS
  return Math.max(15 * 60 * 1000, ms)
}

async function runCartReminders() {
  if (!isEmailConfigured()) return

  const idleSince = new Date(Date.now() - getIdleMs())
  const carts = await Cart.find({
    'items.0': { $exists: true },
    updatedAt: { $lte: idleSince },
    $or: [{ cartReminderSentAt: null }, { cartReminderSentAt: { $exists: false } }]
  })
    .limit(50)
    .lean()

  for (const cart of carts) {
    try {
      const user = await User.findById(cart.user).select('name email').lean()
      if (!user?.email) continue

      await sendCartReminderEmail(user, cart)
      await Cart.updateOne({ _id: cart._id }, { $set: { cartReminderSentAt: new Date() } })
      console.log(`Cart reminder sent to ${user.email}`)
    } catch (err) {
      console.error('Cart reminder failed:', err?.message || err)
    }
  }
}

function startCartReminderJob() {
  if (!isEmailConfigured()) {
    console.log('Cart reminder job disabled: SMTP not configured')
    return
  }

  const run = () => {
    runCartReminders().catch((err) => console.error('Cart reminder job error:', err?.message || err))
  }

  setTimeout(run, 30_000)
  setInterval(run, getCheckIntervalMs())
  console.log(`Cart reminder job started (idle ${getIdleMs() / 3600000}h, check every ${getCheckIntervalMs() / 60000}min)`)
}

module.exports = { startCartReminderJob, runCartReminders }
