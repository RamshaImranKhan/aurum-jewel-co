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
      enabled: Boolean(process.env.JAZZCASH_MERCHANT_NUMBER),
      number: process.env.JAZZCASH_MERCHANT_NUMBER || '',
      accountTitle: process.env.JAZZCASH_ACCOUNT_TITLE || accountTitle
    },
    easypaisa: {
      enabled: Boolean(process.env.EASYPAISA_MERCHANT_NUMBER),
      number: process.env.EASYPAISA_MERCHANT_NUMBER || '',
      accountTitle: process.env.EASYPAISA_ACCOUNT_TITLE || accountTitle
    },
    stripe: {
      enabled: Boolean(
        process.env.STRIPE_SECRET_KEY &&
          process.env.STRIPE_SECRET_KEY !== 'sk_test_placeholder' &&
          process.env.STRIPE_PUBLISHABLE_KEY
      )
    }
  }
}

module.exports = { getMerchantPaymentDetails }
