/**
 * Merchant payout details shown at checkout.
 * Set these in Railway / env.local.json — never commit real account numbers to git.
 *
 * For automatic card payments that settle to your bank, use Stripe
 * (STRIPE_SECRET_KEY) and add your bank in the Stripe Dashboard.
 */
function getMerchantPaymentDetails() {
  return {
    bank: {
      enabled: Boolean(process.env.BANK_ACCOUNT_NUMBER || process.env.BANK_IBAN),
      accountTitle: process.env.BANK_ACCOUNT_TITLE || 'Aurum Jewel Co.',
      bankName: process.env.BANK_NAME || '',
      accountNumber: process.env.BANK_ACCOUNT_NUMBER || '',
      iban: process.env.BANK_IBAN || '',
      branch: process.env.BANK_BRANCH || ''
    },
    jazzcash: {
      enabled: Boolean(process.env.JAZZCASH_MERCHANT_NUMBER),
      number: process.env.JAZZCASH_MERCHANT_NUMBER || '',
      accountTitle: process.env.JAZZCASH_ACCOUNT_TITLE || process.env.BANK_ACCOUNT_TITLE || 'Aurum Jewel Co.'
    },
    easypaisa: {
      enabled: Boolean(process.env.EASYPAISA_MERCHANT_NUMBER),
      number: process.env.EASYPAISA_MERCHANT_NUMBER || '',
      accountTitle: process.env.EASYPAISA_ACCOUNT_TITLE || process.env.BANK_ACCOUNT_TITLE || 'Aurum Jewel Co.'
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
