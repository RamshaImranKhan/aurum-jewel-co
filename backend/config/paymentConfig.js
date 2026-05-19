const StoreSettings = require('../models/StoreSettings')

/**
 * Merchant payout details shown at checkout.
 * Admin can save via /api/admin/payment-settings (MongoDB).
 * Env vars (Railway) are used as fallback.
 */
async function getMerchantPaymentDetails() {
  let saved = null
  try {
    saved = await StoreSettings.findOne({ key: 'payment' }).lean().exec()
  } catch {
    saved = null
  }

  const accountTitle =
    saved?.bankAccountTitle || process.env.BANK_ACCOUNT_TITLE || 'Aurum Jewel Co.'
  const bankName = saved?.bankName || process.env.BANK_NAME || ''
  const accountNumber = saved?.bankAccountNumber || process.env.BANK_ACCOUNT_NUMBER || ''
  const iban = saved?.bankIban || process.env.BANK_IBAN || ''
  const branch = saved?.bankBranch || process.env.BANK_BRANCH || ''

  const jazzcashNumber =
    saved?.jazzcashNumber || process.env.JAZZCASH_MERCHANT_NUMBER || ''
  const jazzcashTitle =
    saved?.jazzcashAccountTitle ||
    process.env.JAZZCASH_ACCOUNT_TITLE ||
    accountTitle
  const easypaisaNumber =
    saved?.easypaisaNumber || process.env.EASYPAISA_MERCHANT_NUMBER || ''
  const easypaisaTitle =
    saved?.easypaisaAccountTitle ||
    process.env.EASYPAISA_ACCOUNT_TITLE ||
    accountTitle

  return {
    bank: {
      enabled: true,
      configured: Boolean(accountNumber || iban),
      accountTitle,
      bankName,
      accountNumber,
      iban,
      branch
    },
    jazzcash: {
      enabled: true,
      configured: Boolean(jazzcashNumber),
      number: jazzcashNumber,
      accountTitle: jazzcashTitle
    },
    easypaisa: {
      enabled: true,
      configured: Boolean(easypaisaNumber),
      number: easypaisaNumber,
      accountTitle: easypaisaTitle
    },
    stripe: {
      enabled: Boolean(
        process.env.STRIPE_SECRET_KEY &&
          process.env.STRIPE_SECRET_KEY !== 'sk_test_placeholder' &&
          !String(process.env.STRIPE_SECRET_KEY).includes('...') &&
          process.env.STRIPE_PUBLISHABLE_KEY &&
          process.env.STRIPE_PUBLISHABLE_KEY !== 'pk_test_placeholder'
      ),
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || ''
    }
  }
}

module.exports = { getMerchantPaymentDetails }
