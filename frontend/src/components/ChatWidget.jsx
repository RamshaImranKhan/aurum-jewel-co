import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaComments, FaPaperPlane, FaTimes } from 'react-icons/fa'
import { cartAPI, chatAPI } from '../services/api'
import { formatPriceINR } from '../utils/formatPrice'
import './ChatWidget.css'

const STORAGE_KEY_PREFIX = 'aurum_chat_messages_v1'
const SESSION_KEY_PREFIX = 'aurum_chat_session_id_v1'
const GUEST_SCOPE_KEY = 'aurum_guest_chat_scope_v1'

function getGuestScopeId() {
  try {
    const existing = sessionStorage.getItem(GUEST_SCOPE_KEY)
    if (existing) return existing
    const created = `guest-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    sessionStorage.setItem(GUEST_SCOPE_KEY, created)
    return created
  } catch {
    return `guest-${Date.now()}`
  }
}

function getChatScope() {
  try {
    const rawUser = localStorage.getItem('user')
    const user = rawUser ? JSON.parse(rawUser) : null
    const userId = user?._id || user?.id || ''
    if (userId) return `user:${userId}`
  } catch {
    // ignore malformed user storage
  }
  return `guest:${getGuestScopeId()}`
}

function safeLoadMessages(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey)
    const parsed = JSON.parse(raw || '[]')
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant'))
      .slice(-50)
  } catch {
    return []
  }
}

function safeSaveMessages(storageKey, messages) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(messages.slice(-50)))
  } catch {
    // ignore
  }
}

function getOrCreateSessionId(sessionKey) {
  try {
    const existing = localStorage.getItem(sessionKey)
    if (existing) return existing
    const created = `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    localStorage.setItem(sessionKey, created)
    return created
  } catch {
    return `session-${Date.now()}`
  }
}

export default function ChatWidget() {
  const navigate = useNavigate()
  const [chatScope, setChatScope] = useState(() => getChatScope())
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState(() => {
    const restored = safeLoadMessages(`${STORAGE_KEY_PREFIX}:${getChatScope()}`)
    return restored.length
      ? restored
      : [{
          role: 'assistant',
          content:
            'Hi! I\'m Aurum Assist - your AI shopping companion. I can help with:\n\n💎 Shopping: Product search, recommendations, cart management\n🛒 Orders: Order tracking, returns, refunds, payments\n✨ General: I can also chat about anything else you\'d like to know!\n\nWhat can I help you with today?'
        }]
  })

  const listRef = useRef(null)
  const inputRef = useRef(null)
  const storageKey = `${STORAGE_KEY_PREFIX}:${chatScope}`
  const sessionKey = `${SESSION_KEY_PREFIX}:${chatScope}`

  useEffect(() => {
    const syncScope = () => setChatScope(getChatScope())
    window.addEventListener('storage', syncScope)
    window.addEventListener('focus', syncScope)
    return () => {
      window.removeEventListener('storage', syncScope)
      window.removeEventListener('focus', syncScope)
    }
  }, [])

  useEffect(() => {
    const nextScope = getChatScope()
    if (nextScope !== chatScope) {
      setChatScope(nextScope)
    }
  }, [chatScope, open, messages.length])

  useEffect(() => {
    const restored = safeLoadMessages(storageKey)
    if (restored.length) {
      setMessages(restored)
    } else {
      setMessages([{
        role: 'assistant',
        content:
          'Hi! I\'m Aurum Assist - your AI shopping companion. I can help with:\n\n💎 Shopping: Product search, recommendations, cart management\n🛒 Orders: Order tracking, returns, refunds, payments\n✨ General: I can also chat about anything else you\'d like to know!\n\nWhat can I help you with today?'
      }])
    }
  }, [storageKey])

  useEffect(() => {
    safeSaveMessages(storageKey, messages)
  }, [messages, storageKey])

  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => inputRef.current?.focus(), 0)
    return () => clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (!open) return
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [open, messages, loading])

  const history = useMemo(() => {
    return messages.map((m) => ({ role: m.role, content: typeof m.content === 'string' ? m.content : '' }))
  }, [messages])
  const quickPrompts = useMemo(() => ([
    'Show me rings under 5000',
    'What products do you have?',
    'Where is Lahore located?',
    'Explain what blockchain is in simple words'
  ]), [])

  async function removeFromCartByProductId(productId) {
    const { data: cart } = await cartAPI.getCart()
    const item = cart?.items?.find((i) => String(i.product?._id || i.product) === String(productId))
    if (!item?._id) throw new Error('Item not found in cart')
    await cartAPI.removeFromCart(item._id)
  }

  function buildProductsUrlFromText(text) {
    const raw = String(text || '').trim()
    if (!raw) return null

    const normalized = raw.toLowerCase().replace(/\s+/g, ' ')

    const showIntent =
      /\b(show|find|search|display|list)\b/.test(normalized) &&
      /\b(me|mme|my)\b/.test(normalized)
    if (!showIntent) return null

    // Explicit "all products" requests should never force a category/search filter.
    if (
      /\ball\b/.test(normalized) &&
      /\b(products?|prosucts?|items?|jewelry|jewellery|collection|catalog|catalogue)\b/.test(normalized)
    ) {
      return '/products'
    }

    const budgetMatch = normalized.match(/\b(under|uder|below|less than|upto|up to)\s*(rs\.?|inr)?\s*(\d+)\b/)
    const maxPrice = budgetMatch?.[3] ? Number(budgetMatch[3]) : null

    const categoryKeywords = [
      'bracelet',
      'bracelets',
      'ring',
      'rings',
      'necklace',
      'necklaces',
      'earring',
      'earrings',
      'pendant',
      'pendants',
      'bangle',
      'bangles'
    ]
    const matchedCategory = categoryKeywords.find((k) => normalized.includes(k)) || null

    const params = new URLSearchParams()
    if (matchedCategory) {
      const canonical = matchedCategory.endsWith('s') ? matchedCategory : `${matchedCategory}s`
      params.set('category', canonical.charAt(0).toUpperCase() + canonical.slice(1))
    } else {
      const cleaned = normalized
        .replace(/\b(show|find|search|display|list)\b/g, ' ')
        .replace(/\b(me|mme|my)\b/g, ' ')
        .replace(/\b(under|uder|below|less than|upto|up to)\b[\s\w]*\b\d+\b/g, ' ')
        .replace(/\ball\b/g, ' ')
        .replace(/\b(products?|prosucts?|items?|jewelry|jewellery|collection|catalog|catalogue)\b/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
      if (cleaned) params.set('search', cleaned)
    }
    if (maxPrice !== null && Number.isFinite(maxPrice)) params.set('maxPrice', String(maxPrice))

    if (!Array.from(params.keys()).length) return null
    return `/products?${params.toString()}`
  }

  async function send() {
    const text = input.trim()
    if (!text || loading) return

    setInput('')
    setLoading(true)
    setMessages((prev) => [...prev, { role: 'user', content: text }])

    try {
      const { data } = await chatAPI.send({ message: text, history, sessionId: getOrCreateSessionId(sessionKey) })
      const reply = typeof data?.reply === 'string' ? data.reply : ''
      const products = Array.isArray(data?.products) ? data.products : null
      const orders = Array.isArray(data?.orders) ? data.orders : null
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: reply || 'Sorry — I had trouble answering that.',
          products,
          orders
        }
      ])
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry — I couldn’t reach the chat service. Please try again in a moment.' }
      ])
    } finally {
      setLoading(false)
    }
  }

  async function sendPrompt(promptText) {
    if (loading) return
    const text = String(promptText || '').trim()
    if (!text) return

    setInput('')
    setLoading(true)
    setMessages((prev) => [...prev, { role: 'user', content: text }])

    try {
      const { data } = await chatAPI.send({ message: text, history, sessionId: getOrCreateSessionId(sessionKey) })
      const reply = typeof data?.reply === 'string' ? data.reply : ''
      const products = Array.isArray(data?.products) ? data.products : null
      const orders = Array.isArray(data?.orders) ? data.orders : null
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: reply || 'Sorry — I had trouble answering that.',
          products,
          orders
        }
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry — I couldn’t reach the chat service. Please try again in a moment.' }
      ])
    } finally {
      setLoading(false)
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="chat-widget">
      {open && (
        <div className="chat-panel" role="dialog" aria-label="Chat support">
          <div className="chat-header">
            <div className="chat-title">
              <FaComments />
              <span>Aurum Assist</span>
            </div>
            <button className="chat-icon-btn" onClick={() => setOpen(false)} aria-label="Close chat">
              <FaTimes />
            </button>
          </div>

          <div className="chat-messages" ref={listRef}>
            {messages.length <= 1 && (
              <div className="chat-quick-prompts" aria-label="Suggested prompts">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    className="chat-prompt-chip"
                    onClick={() => sendPrompt(prompt)}
                    disabled={loading}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}
            {messages.map((m, idx) => (
              <div key={idx} className={`chat-bubble ${m.role === 'user' ? 'user' : 'assistant'}`}>
                {m.content}
                {m.role === 'assistant' && Array.isArray(m.products) && m.products.length > 0 && (
                  <div className="chat-products">
                    {m.products.slice(0, 8).map((p) => (
                      <div key={p._id} className="chat-product-card">
                        <div className="chat-product-thumb">
                          {p?.images?.[0] ? (
                            <img src={p.images[0]} alt={p.name} />
                          ) : (
                            <div className="chat-product-thumb-fallback" />
                          )}
                        </div>
                        <div className="chat-product-meta">
                          <div className="chat-product-name">{p.name}</div>
                          <div className="chat-product-price">{formatPriceINR(p.price)}</div>
                          <div className="chat-product-actions">
                            <button
                              type="button"
                              className="chat-mini-btn"
                              onClick={() => {
                                navigate(`/product/${p._id}`)
                                setOpen(false)
                              }}
                            >
                              View
                            </button>
                            <button
                              type="button"
                              className="chat-mini-btn primary"
                              onClick={async () => {
                                const token = localStorage.getItem('token')
                                if (!token) {
                                  navigate('/register')
                                  setOpen(false)
                                  return
                                }
                                try {
                                  await cartAPI.addToCart(p._id, 1)
                                  setMessages((prev) => [...prev, { role: 'assistant', content: `${p.name} added to cart.` }])
                                } catch {
                                  setMessages((prev) => [...prev, { role: 'assistant', content: 'Please sign up or log in to add items to cart.' }])
                                }
                              }}
                            >
                              Add
                            </button>
                            <button
                              type="button"
                              className="chat-mini-btn danger"
                              onClick={async () => {
                                try {
                                  await removeFromCartByProductId(p._id)
                                  setMessages((prev) => [...prev, { role: 'assistant', content: `${p.name} removed from cart.` }])
                                } catch {
                                  setMessages((prev) => [...prev, { role: 'assistant', content: 'Could not remove (is it in your cart?).' }])
                                }
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {m.role === 'assistant' && Array.isArray(m.orders) && m.orders.length > 0 && (
                  <div className="chat-orders">
                    {m.orders.slice(0, 3).map((o) => (
                      <div key={o._id} className="chat-order-card">
                        <div className="chat-order-top">
                          <div className="chat-order-id">Order #{String(o._id).slice(-6)}</div>
                          <div className={`chat-order-badge ${o.isDelivered ? 'delivered' : 'transit'}`}>
                            {o.isDelivered ? 'Delivered' : 'In transit'}
                          </div>
                        </div>
                        <div className="chat-order-sub">
                          {new Date(o.createdAt).toLocaleDateString()} • {o.itemCount || 0} item(s) • {formatPriceINR(o.totalPrice || 0)}
                        </div>
                        <div className="chat-order-sub">
                          Payment: {o.isPaid ? 'Paid' : 'Pending'} • Method: {o.paymentMethod || 'card'}
                        </div>
                        {Array.isArray(o.items) && o.items.length > 0 && (
                          <div className="chat-order-items">
                            {o.items.map((item, itemIdx) => (
                              <div key={`${o._id}-${itemIdx}`} className="chat-order-item-line">
                                {item.name} x{item.qty}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {loading && <div className="chat-bubble assistant">Typing…</div>}
          </div>

          <div className="chat-input-row">
            <textarea
              ref={inputRef}
              className="chat-input"
              rows={1}
              placeholder="Type a message…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={loading}
            />
            <button className="chat-send-btn" onClick={send} disabled={loading || !input.trim()} aria-label="Send message">
              <FaPaperPlane />
            </button>
          </div>
        </div>
      )}

      {!open && (
        <button className="chat-fab" onClick={() => setOpen(true)} aria-label="Open chat">
          <FaComments />
          <span className="chat-fab-text">Chat</span>
        </button>
      )}
    </div>
  )
}

