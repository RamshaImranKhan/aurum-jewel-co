const nodemailer = require('nodemailer')

let transporter

function getSiteUrl() {
  return String(process.env.FRONTEND_URL || process.env.SITE_URL || 'https://aurum-jewel-co.vercel.app').replace(
    /\/$/,
    ''
  )
}

function getFromAddress() {
  return process.env.EMAIL_FROM || 'Aurum Jewel Co <noreply@aurumjewelco.com>'
}

function isEmailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
}

function getTransporter() {
  if (!isEmailConfigured()) return null
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT) || 587
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465 || process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    })
  }
  return transporter
}

function formatInr(amount) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
    Number(amount || 0)
  )
}

function emailLayout(title, bodyHtml) {
  const siteUrl = getSiteUrl()
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#faf7f0;font-family:Segoe UI,Roboto,sans-serif;color:#0b0a0a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf7f0;padding:24px 12px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e8e0d0;">
        <tr><td style="background:linear-gradient(135deg,#0b0a0a,#1a1410);padding:24px;text-align:center;">
          <div style="color:#d4af37;font-size:22px;font-weight:700;">Aurum Jewel Co.</div>
          <div style="color:rgba(255,255,255,0.85);font-size:14px;margin-top:6px;">${title}</div>
        </td></tr>
        <tr><td style="padding:28px 24px;font-size:15px;line-height:1.6;">${bodyHtml}</td></tr>
        <tr><td style="padding:0 24px 24px;text-align:center;">
          <a href="${siteUrl}" style="display:inline-block;background:linear-gradient(135deg,#d4af37,#b76e79);color:#140f0b;text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:600;">Visit our shop</a>
        </td></tr>
        <tr><td style="padding:16px 24px;background:#f5f2ea;font-size:12px;color:#666;text-align:center;">
          Questions? Email <a href="mailto:support@aurumjewelco.com" style="color:#8b5a2b;">support@aurumjewelco.com</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

async function sendEmail({ to, subject, html, text }) {
  const transport = getTransporter()
  if (!transport) {
    console.warn('Email skipped: SMTP not configured (set SMTP_HOST, SMTP_USER, SMTP_PASS)')
    return { skipped: true }
  }
  if (!to) {
    console.warn('Email skipped: missing recipient')
    return { skipped: true }
  }

  const info = await transport.sendMail({
    from: getFromAddress(),
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  })
  return { messageId: info.messageId }
}

async function sendWelcomeEmail(user) {
  const siteUrl = getSiteUrl()
  const name = user.name || 'there'
  const html = emailLayout(
    'Welcome',
    `<p>Hi ${name},</p>
    <p>Thank you for creating an account at <strong>Aurum Jewel Co.</strong></p>
    <p>Browse our rings, necklaces, earrings, and bracelets — your next signature piece is waiting.</p>
    <p style="margin-top:20px;"><a href="${siteUrl}/products" style="color:#8b5a2b;font-weight:600;">Shop jewellery →</a></p>`
  )
  return sendEmail({
    to: user.email,
    subject: 'Welcome to Aurum Jewel Co.',
    html
  })
}

async function sendOrderConfirmationEmail(user, order) {
  const siteUrl = getSiteUrl()
  const name = user.name || 'Customer'
  const itemsHtml = (order.orderItems || [])
    .map(
      (item) =>
        `<tr>
          <td style="padding:8px 0;border-bottom:1px solid #eee;">${item.name} × ${item.qty}</td>
          <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;">${formatInr(item.price * item.qty)}</td>
        </tr>`
    )
    .join('')

  const html = emailLayout(
    'Order confirmed',
    `<p>Hi ${name},</p>
    <p>Thank you for your purchase! We have received your payment.</p>
    <p><strong>Order ID:</strong> ${order._id}</p>
    <table width="100%" style="margin:16px 0;font-size:14px;">${itemsHtml}</table>
    <p style="font-size:16px;"><strong>Total paid:</strong> ${formatInr(order.totalPrice)}</p>
    <p>We will prepare your order for delivery. You can track your order in your account.</p>
    <p style="margin-top:20px;"><a href="${siteUrl}/thank-you/${order._id}" style="color:#8b5a2b;font-weight:600;">View order →</a></p>`
  )

  return sendEmail({
    to: user.email,
    subject: `Order confirmed — ${formatInr(order.totalPrice)} | Aurum Jewel Co.`,
    html
  })
}

async function sendCartReminderEmail(user, cart) {
  const siteUrl = getSiteUrl()
  const name = user.name || 'there'
  const items = cart.items || []
  const subtotal = items.reduce((sum, i) => sum + Number(i.price || 0) * Number(i.qty || 0), 0)

  const itemsHtml = items
    .map(
      (item) =>
        `<li style="margin-bottom:8px;">${item.name} × ${item.qty} — ${formatInr(item.price * item.qty)}</li>`
    )
    .join('')

  const html = emailLayout(
    'Items waiting in your cart',
    `<p>Hi ${name},</p>
    <p>You left something beautiful in your cart. These pieces are still reserved for you:</p>
    <ul style="padding-left:20px;margin:16px 0;">${itemsHtml}</ul>
    <p><strong>Cart subtotal:</strong> ${formatInr(subtotal)}</p>
    <p>Complete checkout before they sell out.</p>
    <p style="margin-top:20px;"><a href="${siteUrl}/cart" style="color:#8b5a2b;font-weight:600;">Return to cart →</a></p>`
  )

  return sendEmail({
    to: user.email,
    subject: 'You have items in your cart — Aurum Jewel Co.',
    html
  })
}

module.exports = {
  isEmailConfigured,
  sendWelcomeEmail,
  sendOrderConfirmationEmail,
  sendCartReminderEmail
}
