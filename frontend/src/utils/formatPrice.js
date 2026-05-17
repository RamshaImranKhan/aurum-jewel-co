export function formatPriceINR(amount) {
  const value = Number(amount || 0)
  const formatted = value.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
  return `Rs. ${formatted}`
}


