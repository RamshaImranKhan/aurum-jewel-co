/** Public merchant bank details (receiving account). Set on Vercel if Railway env is missing. */
export function getMerchantBankFromEnv() {
  return {
    accountTitle: import.meta.env.VITE_BANK_ACCOUNT_TITLE || '',
    bankName: import.meta.env.VITE_BANK_NAME || '',
    accountNumber: import.meta.env.VITE_BANK_ACCOUNT_NUMBER || '',
    iban: import.meta.env.VITE_BANK_IBAN || '',
    branch: import.meta.env.VITE_BANK_BRANCH || ''
  }
}

export function mergeMerchantBank(apiBank) {
  const fromEnv = getMerchantBankFromEnv()
  const merged = {
    enabled: true,
    accountTitle: apiBank?.accountTitle || fromEnv.accountTitle || 'Aurum Jewel Co.',
    bankName: apiBank?.bankName || fromEnv.bankName || '',
    accountNumber: apiBank?.accountNumber || fromEnv.accountNumber || '',
    iban: apiBank?.iban || fromEnv.iban || '',
    branch: apiBank?.branch || fromEnv.branch || ''
  }
  merged.configured = Boolean(merged.iban || merged.accountNumber)
  return merged
}
