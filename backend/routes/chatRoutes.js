const express = require('express')
const { GoogleGenAI } = require('@google/genai')
const jwt = require('jsonwebtoken')
const ChatMessage = require('../models/ChatMessage')
const Product = require('../models/Product')
const Cart = require('../models/Cart')
const Order = require('../models/Order')
const User = require('../models/User')

const router = express.Router()
const COUPONS = {
  SAVE10: { discountType: 'percent', discountValue: 10 },
  FLAT5: { discountType: 'flat', discountValue: 5 },
  FREESHIP: { discountType: 'shipping', discountValue: 100 }
}

async function optionalAuth(req, _res, next) {
  const auth = String(req.headers.authorization || '')
  if (!auth.startsWith('Bearer ')) return next()
  const token = auth.slice(7)
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret')
    if (decoded?.id) {
      const user = await User.findById(decoded.id).select('-password')
      if (user) req.user = user
    }
  } catch (_e) {
    // allow anonymous fallback
  }
  next()
}

router.use(optionalAuth)

function shouldForceCommerceIntent(text) {
  const lower = String(text || '').toLowerCase()
  return (
    /(where is my order|track|tracking|order status|tracking of products?|previous order|past orders?|order history|my orders?|recent orders?|last orders?|order summary)/.test(lower) ||
    /(all products|products list|product list|list of products|show products|show me products|catalog|collection|price less|price greater|under|above|between|ring|necklace|earring|bracelet|pendant|chain|jewelry|jewellery)/.test(lower) ||
    /(add .*cart|add to cart|remove .*cart|remove from cart|clear cart|empty cart|remove all items)/.test(lower) ||
    /(apply coupon|coupon code|promo|discount|offer|deals?)/.test(lower) ||
    /(abandoned cart|left in cart|remind.*cart|cart reminder)/.test(lower)
  )
}

function getGeminiKey() {
  return String(process.env.GEMINI_API_KEY || '').trim()
}

function hasValidGeminiKey() {
  const key = getGeminiKey()
  return Boolean(key && key !== 'PASTE_YOUR_GEMINI_API_KEY_HERE' && key !== 'your_gemini_api_key_here')
}

function isLikelyGeneralKnowledgeQuestion(text) {
  const lower = String(text || '').toLowerCase()
  if (!lower.trim()) return false
  return /(who is|what is|where is|where are|where was|when was|when did|how old|how many|tell me about|explain|define|history of|about|capital of|meaning of|why|how does|how do|give me|describe|located|location of|random|any )/.test(
    lower
  )
}

function pickRandom(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return ''
  return arr[Math.floor(Math.random() * arr.length)]
}

function extractGeneralTopic(text) {
  return String(text || '')
    .toLowerCase()
    .replace(
      /^(who\s+is|what\s+is|where\s+is|where\s+are|where\s+was|when\s+was|when\s+did|tell me about|explain|define|meaning of|history of|about|i want to know about|give me|show me|describe)\s+/i,
      ''
    )
    .replace(/\b(the|city|country|place|located|location of|in simple words|in simple terms)\b/g, ' ')
    .replace(/\b(any|random|some|a|an)\b/g, ' ')
    .replace(/[?.!,]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

async function answerFromWikipedia(text) {
  const topic = extractGeneralTopic(text) || String(text || '').trim()
  if (!topic) return null
  const wiki = await fetchWikipediaSummary(topic)
  if (!wiki) return null
  return `${wiki.title}: ${wiki.extract}\n\nRead more: ${wiki.url}`
}

async function fetchWikipediaSummary(topic) {
  const query = String(topic || '').trim()
  if (!query) return null
  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=1&namespace=0&format=json`
    const searchRes = await fetch(searchUrl)
    if (!searchRes.ok) return null
    const searchData = await searchRes.json()
    const bestTitle = Array.isArray(searchData?.[1]) ? searchData[1][0] : ''
    if (!bestTitle) return null

    const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(bestTitle)}`
    const summaryRes = await fetch(summaryUrl)
    if (!summaryRes.ok) return null
    const summaryData = await summaryRes.json()
    const extract = String(summaryData?.extract || '').trim()
    if (!extract) return null
    const pageUrl = summaryData?.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(bestTitle)}`

    return {
      title: String(summaryData?.title || bestTitle),
      extract,
      url: pageUrl
    }
  } catch (_e) {
    return null
  }
}

function extractBudget(text) {
  const m = String(text || '')
    .toLowerCase()
    .match(/(?:under|below|less than|upto|up to)\s*(?:rs\.?|inr|\$)?\s*(\d+)/)
  return m ? Number(m[1]) : null
}

function extractMinBudget(text) {
  const m = String(text || '')
    .toLowerCase()
    .match(/(?:above|greater than|more than|at least|min(?:imum)?)\s*(?:rs\.?|inr|\$)?\s*(\d+)/)
  return m ? Number(m[1]) : null
}

function extractRating(text) {
  const m = String(text || '').toLowerCase().match(/(\d(?:\.\d)?)\s*(?:star|stars|rating)/)
  return m ? Number(m[1]) : null
}

function cartTotals(cart) {
  const itemsPrice = (cart.items || []).reduce((s, i) => s + i.price * i.qty, 0)
  let shippingPrice = itemsPrice >= 75 ? 0 : 10
  if (cart.coupon?.discountType === 'shipping') shippingPrice = 0
  const taxPrice = Number((itemsPrice * 0.1).toFixed(2))
  let discount = 0
  if (cart.coupon?.discountType === 'percent') {
    discount = Number(((itemsPrice * cart.coupon.discountValue) / 100).toFixed(2))
  } else if (cart.coupon?.discountType === 'flat') {
    discount = Number(Math.min(itemsPrice, cart.coupon.discountValue).toFixed(2))
  }
  const total = Number(Math.max(0, itemsPrice + shippingPrice + taxPrice - discount).toFixed(2))
  return { itemsPrice, shippingPrice, taxPrice, discount, total }
}

async function handleCommerceIntent({ text, req }) {
  const lower = text.toLowerCase()

  if (/(previous order|past orders?|order history|my orders?|recent orders?|last orders?|order summary)/.test(lower)) {
    if (!req.user) return { handled: true, reply: 'Please log in first so I can show your previous order details.' }

    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(3).lean().exec()
    if (!orders.length) {
      return { handled: true, reply: 'I could not find any previous orders for your account yet.' }
    }

    const summaryLines = orders.map((order, idx) => {
      const itemCount = Array.isArray(order.orderItems) ? order.orderItems.reduce((s, i) => s + Number(i.qty || 0), 0) : 0
      const topItems = (order.orderItems || []).slice(0, 2).map((i) => i.name).join(', ')
      const paid = order.isPaid ? 'Paid' : 'Payment pending'
      const delivered = order.isDelivered ? 'Delivered' : 'In transit'
      return `${idx + 1}) Order ${String(order._id).slice(-6)} | ${new Date(order.createdAt).toLocaleDateString()} | ${itemCount} item(s) | Rs. ${order.totalPrice} | ${paid}, ${delivered}${topItems ? ` | Items: ${topItems}` : ''}`
    })

    return {
      handled: true,
      reply: `Here are your recent orders:\n- ${summaryLines.join('\n- ')}`,
      orders: orders.map((order) => ({
        _id: order._id,
        createdAt: order.createdAt,
        totalPrice: order.totalPrice,
        isPaid: order.isPaid,
        isDelivered: order.isDelivered,
        paymentMethod: order.paymentMethod || 'card',
        itemCount: Array.isArray(order.orderItems) ? order.orderItems.reduce((s, i) => s + Number(i.qty || 0), 0) : 0,
        items: (order.orderItems || []).slice(0, 3).map((i) => ({ name: i.name, qty: i.qty, price: i.price }))
      }))
    }
  }

  if (/(where is my order|track|tracking|order status)/.test(lower)) {
    if (!req.user) return { handled: true, reply: 'Please log in so I can securely fetch your order status.' }
    const explicitId = text.match(/\b[0-9a-f]{24}\b/i)?.[0]
    const order = explicitId
      ? await Order.findOne({ _id: explicitId, user: req.user._id })
      : await Order.findOne({ user: req.user._id }).sort({ createdAt: -1 })
    if (!order) return { handled: true, reply: 'I could not find an order. Share your order ID or place an order first.' }
    const timeline = [
      `Order placed: ${order.createdAt ? new Date(order.createdAt).toLocaleString() : 'N/A'}`,
      `Payment: ${order.isPaid ? `confirmed (${new Date(order.paidAt || order.createdAt).toLocaleString()})` : 'pending'}`,
      `Delivery: ${order.isDelivered ? `delivered (${new Date(order.deliveredAt || Date.now()).toLocaleString()})` : 'in transit'}`
    ]
    return { handled: true, reply: `Order ${order._id} status:\n- ${timeline.join('\n- ')}` }
  }

  if (/(show me|tell me|i want|want|find|search|looking for|recommend|suggest|all products|products list|product list|list of products|show products|show me products|products you have|catalog|collection|what products|ring|necklace|earring|bracelet|pendant|chain|jewelry|jewellery)/.test(lower)) {
    const maxPrice = extractBudget(text)
    const minPrice = extractMinBudget(text)
    const minRating = extractRating(text)
    
    const categoryKeywordsSearch = ['ring', 'necklace', 'earring', 'bracelet', 'pendant', 'chain', 'jewelry', 'jewellery']
    const hasCategoryKeyword = categoryKeywordsSearch.some((k) => lower.includes(k))
    const isGeneralProductRequest = /(all products|products list|product list|list of products|show products|show me products|products you have|catalog|collection|what products)/.test(lower)
    
    if (!hasCategoryKeyword && !maxPrice && !minPrice && !minRating && !isGeneralProductRequest) {
      return { handled: false }
    }

    const filter = {}
    if (maxPrice || minPrice) {
      filter.price = {}
      if (maxPrice) filter.price.$lte = maxPrice
      if (minPrice) filter.price.$gte = minPrice
    }
    if (minRating) filter.rating = { $gte: minRating }

    const categoryKeywords = ['ring', 'necklace', 'earring', 'bracelet', 'pendant', 'chain']
    const categoryHit = categoryKeywords.find((k) => lower.includes(k))
    if (categoryHit) filter.category = { $regex: categoryHit, $options: 'i' }

    const products = await Product.find(filter)
      .select('name price rating category images metal gemstone')
      .sort({ rating: -1, reviews: -1, createdAt: -1 })
      .limit(8)
      .lean()
      .exec()
    if (!products.length) {
      return { handled: true, reply: 'No exact matches found. Try widening budget/filters and I can suggest alternatives.' }
    }
    const lines = products.map((p) => `${p.name} - Rs. ${p.price} (${p.rating || 0} stars)`)
    return {
      handled: true,
      reply: `Here are top matches:\n- ${lines.join('\n- ')}`,
      products
    }
  }

  if (/(add .*cart|add to cart)/.test(lower)) {
    if (!req.user) return { handled: true, reply: 'Please log in first, then I can add items to your cart.' }
    // Extract product name from phrases like:
    // - "add Nova Tennis Bracelet to cart"
    // - "add Nova Tennis Bracelet in cart"
    // - "add Nova Tennis Bracelet"
    const matchToCart = String(text).match(/add\s+(.+?)\s+(?:to\s+|in\s+|into\s+)?cart\b/i)
    const matchAddOnly = !matchToCart ? String(text).match(/add\s+(.+)/i) : null
    let nameMatch = String(matchToCart?.[1] || matchAddOnly?.[1] || '').trim()
    // Remove leftover filler words that break the product-name search.
    nameMatch = nameMatch
      .replace(/\b(please|now|quickly|just)\b/gi, '')
      .replace(/\b(to|in|into)\s+cart\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim()

    if (!nameMatch || nameMatch.length < 3) {
      return { handled: true, reply: 'Which product should I add? Example: "add Nova Tennis Bracelet to cart".' }
    }

    const product = await Product.findOne({ name: { $regex: nameMatch, $options: 'i' } }).lean().exec()
    if (!product) return { handled: true, reply: 'I could not find that product. Try the full product name.' }
    const cart = (await Cart.findOne({ user: req.user._id })) || (await Cart.create({ user: req.user._id, items: [] }))
    const existing = cart.items.find((i) => String(i.product) === String(product._id))
    if (existing) existing.qty += 1
    else {
      cart.items.push({ product: product._id, name: product.name, price: product.price, image: product.images?.[0] || '', qty: 1 })
    }
    await cart.save()
    const totals = cartTotals(cart)
    return { handled: true, reply: `${product.name} added to cart. Cart total is now Rs. ${totals.total}.` }
  }

  if (/(remove .*cart|remove from cart)/.test(lower)) {
    if (!req.user) return { handled: true, reply: 'Please log in first, then I can remove cart items.' }
    // Try to extract the product name part from phrases like:
    // - "remove Nova Tennis Bracelet from cart"
    // - "remove items from cart"
    // - "remove all items from cart"
    const clearAll = /(remove\s+all\s+items|clear\s+cart|empty\s+cart|remove\s+everything)/.test(lower)
    if (clearAll) {
      const cart = await Cart.findOne({ user: req.user._id })
      if (!cart) return { handled: true, reply: 'Your cart is already empty.' }
      cart.items = []
      cart.coupon = { code: '', discountType: 'none', discountValue: 0 }
      await cart.save()
      return { handled: true, reply: 'Done — I cleared your cart.' }
    }

    const matchFromCart = lower.match(/remove\s+(.+?)\s+from\s+cart/)
    const matchAfterRemove = !matchFromCart ? lower.match(/remove\s+(.+)/) : null
    let query = (matchFromCart?.[1] || matchAfterRemove?.[1] || '').trim()
    // Remove common filler words that don't help find the product.
    query = query.replace(/\b(me|my|items?|item|please|now)\b/g, '').trim()
    // If user only said "remove items from cart", we don't know which item.
    if (!query || query.length < 3 || query === 'cart') {
      return { handled: true, reply: 'Which item would you like to remove? For example: "remove Nova Tennis Bracelet from cart".' }
    }
    const cart = await Cart.findOne({ user: req.user._id })
    if (!cart) return { handled: true, reply: 'Your cart is already empty.' }
    const item = cart.items.find((i) => i.name.toLowerCase().includes(query.toLowerCase()))
    if (!item) return { handled: true, reply: 'I could not find that item in your cart.' }
    item.deleteOne()
    await cart.save()
    return { handled: true, reply: `${item.name} removed from your cart.` }
  }

  if (
    /(discount|discounts|coupon|coupons|promo|promocode|offer|offers|deal|deals)/.test(lower) &&
    !/(apply coupon|use coupon|coupon code\s+[a-z0-9]+|apply\s+[a-z0-9]{4,12})/.test(lower)
  ) {
    return {
      handled: true,
      reply: 'Use "apply coupon SAVE10" to get 10% off.'
    }
  }

  if (/(apply coupon|coupon code|promo)/.test(lower)) {
    if (!req.user) return { handled: true, reply: 'Please log in first so I can apply coupons to your cart.' }
    const code = text.toUpperCase().match(/\b[A-Z0-9]{4,12}\b/)?.[0] || ''
    const coupon = COUPONS[code]
    if (!coupon) return { handled: true, reply: 'Invalid coupon. Try SAVE10, FLAT5, or FREESHIP.' }
    const cart = (await Cart.findOne({ user: req.user._id })) || (await Cart.create({ user: req.user._id, items: [] }))
    cart.coupon = { code, ...coupon }
    await cart.save()
    const totals = cartTotals(cart)
    return { handled: true, reply: `Coupon ${code} applied. New estimated total: Rs. ${totals.total}.` }
  }

  if (/(abandoned cart|left in cart|remind.*cart|cart reminder)/.test(lower)) {
    if (!req.user) return { handled: true, reply: 'Please log in first so I can check your saved cart items.' }
    const cart = await Cart.findOne({ user: req.user._id }).lean().exec()
    if (!cart || !cart.items?.length) {
      return { handled: true, reply: 'Your cart is empty right now. I can help you find products to add.' }
    }
    const preview = cart.items.slice(0, 3).map((i) => `${i.name} x${i.qty}`).join(', ')
    return {
      handled: true,
      reply: `Reminder: you still have ${cart.items.length} item(s) in your cart (${preview}). Want me to help you checkout now?`
    }
  }

  return { handled: false }
}

async function buildStoreContext() {
  try {
    const products = await Product.find({})
      .select('name price category rating countInStock metal gemstone')
      .sort({ rating: -1, reviews: -1, createdAt: -1 })
      .limit(16)
      .lean()
      .exec()
    if (!products.length) return 'No products are loaded in the catalog yet.'
    return products
      .map(
        (p) =>
          `- ${p.name} | ${p.category || 'Jewellery'} | Rs. ${p.price} | Rating ${p.rating || 0} | Stock ${p.countInStock ?? 0}${p.metal ? ` | ${p.metal}` : ''}`
      )
      .join('\n')
  } catch {
    return 'Catalog is temporarily unavailable.'
  }
}

async function answerWithGemini({ userMessage, history, storeContext, userName }) {
  const geminiKey = getGeminiKey()
  const ai = new GoogleGenAI({ apiKey: geminiKey })

  const system = [
    'You are Aurum Assist, the AI assistant for Aurum Jewel Co. (fine jewellery e-commerce in Lahore, Pakistan).',
    'Answer clearly in plain English. Keep answers concise unless the user asks for detail.',
    '',
    'You can help with:',
    '1) GENERAL QUESTIONS — geography, history, science, people, definitions, study help, coding, math, etc.',
    '2) SHOP QUESTIONS — products, prices, recommendations, cart, coupons, orders, shipping, returns, payments.',
    '',
    'Store policies:',
    '- Shipping: usually 3–7 business days; free shipping over Rs. 75.',
    '- Returns: within 14 days for eligible items (ask for order ID).',
    '- Coupons: SAVE10 (10% off), FLAT5 (Rs. 5 off), FREESHIP (free shipping).',
    '- Support email: support@aurumjewelco.com | Phone: 03214248458 | Address: Shop #2, Lahore.',
    '- Never ask for card numbers or passwords.',
    '',
    `Logged-in customer: ${userName || 'Guest (not logged in)'}`,
    '',
    'Product catalog snapshot:',
    storeContext
  ].join('\n')

  const contents = []
  if (Array.isArray(history)) {
    for (const h of history.slice(-10)) {
      const role = h?.role === 'assistant' ? 'model' : 'user'
      const text = typeof h?.content === 'string' ? h.content.trim() : ''
      if (text) contents.push({ role, parts: [{ text }] })
    }
  }
  contents.push({ role: 'user', parts: [{ text: userMessage }] })

  const candidateModels = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash']
  let lastError = null
  for (const modelName of candidateModels) {
    try {
      const aiResponse = await ai.models.generateContent({
        model: modelName,
        contents,
        config: { systemInstruction: system }
      })
      const aiText = String(aiResponse?.text || '').trim()
      if (aiText) return { reply: aiText, model: modelName }
    } catch (err) {
      lastError = err
    }
  }
  throw lastError || new Error('Gemini returned an empty response')
}

async function fallbackReply(message) {
  const text = String(message || '').trim().toLowerCase()
  if (!text) return "Hi! I'm here to help with jewelry shopping, orders, or chat about anything else. What's on your mind?"

  if (isLikelyGeneralKnowledgeQuestion(text)) {
    const wikiAnswer = await answerFromWikipedia(text)
    if (wikiAnswer) return wikiAnswer
  }

  if (/(random|any).*(indian\s+)?singer|give me.*singer/.test(text)) {
    const singer = pickRandom(['Arijit Singh', 'Shreya Ghoshal', 'Sonu Nigam', 'Sunidhi Chauhan', 'Atif Aslam', 'Neha Kakkar'])
    const wiki = await fetchWikipediaSummary(singer)
    if (wiki) return `${wiki.title}: ${wiki.extract}\n\nRead more: ${wiki.url}`
    return `Try this singer: ${singer}.`
  }
  if (/(indian singer|singer from india|pakistani singer|singer from pakistan)/.test(text)) {
    const indian = ['Arijit Singh', 'Shreya Ghoshal', 'Sonu Nigam', 'Sunidhi Chauhan', 'Lata Mangeshkar']
    const pakistani = ['Atif Aslam', 'Ali Zafar', 'Rahat Fateh Ali Khan', 'Abida Parveen']
    const pool = /(pakistani singer|singer from pakistan)/.test(text) ? pakistani : indian
    const singer = pickRandom(pool)
    const wiki = await fetchWikipediaSummary(singer)
    if (wiki) return `${wiki.title}: ${wiki.extract}\n\nRead more: ${wiki.url}`
    return `You can explore this singer: ${singer}.`
  }

  if (/(billie\s*eilish)/.test(text)) {
    return 'Billie Eilish is an American singer-songwriter known for songs like "bad guy" and "Happier Than Ever." She became famous for her unique voice, dark-pop style, and minimalist visual aesthetic.'
  }
  if (/(what\s+is\s+ai|what is artificial intelligence|\bai\b)/.test(text)) {
    return 'AI (Artificial Intelligence) is technology that lets computers perform tasks that usually need human intelligence, like understanding language, recognizing images, and making predictions.'
  }
  if (/(what\s+is\s+blockchain|\bblockchain\b)/.test(text)) {
    return 'Blockchain is a shared digital record (ledger) where transactions are stored in linked blocks. It is hard to change old records, which makes it useful for trust and transparency.'
  }
  if (/(who\s+is|what\s+is|where\s+is|where\s+are|explain|define|meaning of|located)/.test(text)) {
    const wikiAnswer = await answerFromWikipedia(text)
    if (wikiAnswer) return wikiAnswer
    const topic = extractGeneralTopic(text)
    if (topic) {
      return `I can help with "${topic}". Ask again with a bit more detail and I will explain it simply.`
    }
    return 'Great question. Share the exact topic, and I will explain it simply.'
  }
  if (/(hello|hi|hey|how are you)/.test(text)) {
    return "Hey! I'm doing well. Ask me anything — I can help with shopping and also general questions."
  }
  if (/(math|solve|calculate)/.test(text)) {
    return 'Sure — send me the full math problem, and I will solve it step by step.'
  }
  if (/(code|programming|javascript|python|react|node)/.test(text)) {
    return 'Absolutely. Share your coding question or error, and I will help you debug or explain it clearly.'
  }
  if (/(history|science|geography|english|study|exam)/.test(text)) {
    return 'Yes — I can help with study topics too. Send your question and I will explain it in simple points.'
  }
  if (/(return|refund|exchange|cancel)/.test(text)) {
    return "For returns/refunds: share your order ID and what you'd like to return, and I'll help you through the process."
  }
  if (/(ship|delivery|arrive|tracking)/.test(text)) {
    return "For shipping/delivery: share your order ID and I can help you track your package and provide delivery details."
  }
  if (/(payment|pay|stripe|card|upi)/.test(text)) {
    return "For payments: you can securely pay at checkout with cards or other methods. If payment failed, let me know the error."
  }
  if (/(ring|necklace|earring|bracelet|chain|pendant)/.test(text)) {
    return "Looking for jewelry? Tell me what you're interested in (type, budget, metal, gemstone style), and I'll suggest options."
  }
  if (/(contact|support|help|email|phone)/.test(text)) {
    return "You can email support@aurumjewelco.com for detailed inquiries. But feel free to ask me here too - I can help with most things!"
  }
  return 'I can help with shopping and general questions. Try asking something like "where is Lahore?" or "show me rings under 5000".'
}

async function saveChatMessage({ sessionId, userMessage, assistantReply, provider, req }) {
  await ChatMessage.create({
    sessionId,
    userMessage,
    assistantReply,
    provider,
    userId: req.user?._id || null,
    metadata: {
      ip: req.ip || '',
      userAgent: req.get('user-agent') || ''
    }
  })
}

function jsonChat(res, payload) {
  return res.json(payload)
}

// POST /api/chat
router.post('/', async (req, res) => {
  const { message, history, sessionId } = req.body || {}

  const userMessage = String(message || '').trim()
  const chatSessionId = String(sessionId || '').trim() || `guest-${Date.now()}`
  if (!userMessage) {
    return res.status(400).json({ message: 'message is required' })
  }

  const respond = async ({ reply, provider, products, orders }) => {
    await saveChatMessage({
      sessionId: chatSessionId,
      userMessage,
      assistantReply: reply,
      provider,
      req
    })
    return jsonChat(res, {
      reply,
      provider,
      sessionId: chatSessionId,
      products: Array.isArray(products) ? products : undefined,
      orders: Array.isArray(orders) ? orders : undefined
    })
  }

  // 1) Shop actions that need database/cart APIs (fast path)
  try {
    if (shouldForceCommerceIntent(userMessage)) {
      const intent = await handleCommerceIntent({ text: userMessage, req })
      if (intent.handled) {
        return respond({
          reply: intent.reply,
          provider: hasValidGeminiKey() ? 'commerce' : 'fallback',
          products: intent.products,
          orders: intent.orders
        })
      }
    }
  } catch (intentError) {
    console.error('Chat intent error:', intentError)
  }

  // 2) Gemini AI for general + shop conversation
  if (hasValidGeminiKey()) {
    try {
      const storeContext = await buildStoreContext()
      const { reply, model } = await answerWithGemini({
        userMessage,
        history,
        storeContext,
        userName: req.user?.name || ''
      })
      return respond({ reply, provider: `gemini:${model}` })
    } catch (e) {
      console.error('Chat AI error:', e?.message || e)
    }
  }

  // 3) Smart fallback (Wikipedia + rules) when AI is unavailable
  const reply = await fallbackReply(userMessage)
  return respond({ reply, provider: 'fallback' })
})

module.exports = router

