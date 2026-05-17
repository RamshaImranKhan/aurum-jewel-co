import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Add token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const configAPI = {
  getStripeKey: () => api.get('/config/stripe')
}

// Auth API
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (userData) => api.post('/auth/register', userData),
  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }
}

// Products API
export const productsAPI = {
  getAll: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  generateSEO: (data) => api.post('/products/generate-seo', data),
  generateSEOBulk: (payload) => api.post('/products/generate-seo/bulk', payload || {}),
  getSuggestions: (query) => api.get('/products/suggestions', { params: { query } }),
  getRecommendations: (params) => api.get('/products/recommendations', { params })
}

// Cart API
export const cartAPI = {
  getCart: () => api.get('/cart'),
  addToCart: (productId, quantity) => api.post('/cart', { productId, quantity }),
  updateCartItem: (itemId, quantity) => api.put(`/cart/${itemId}`, { quantity }),
  removeFromCart: (itemId) => api.delete(`/cart/${itemId}`),
  clearCart: () => api.delete('/cart'),
  applyCoupon: (code) => api.post('/cart/coupon', { code }),
  removeCoupon: () => api.delete('/cart/coupon')
}

// Orders API
export const ordersAPI = {
  create: (orderData) => api.post('/orders', orderData),
  getAll: () => api.get('/orders'),
  getAdminAll: () => api.get('/orders/all'),
  getById: (id) => api.get(`/orders/${id}`),
  getTracking: (id) => api.get(`/orders/${id}/tracking`),
  createPaymentIntent: (id) => api.post(`/orders/${id}/create-payment-intent`),
  payOrder: (id, paymentResult) => api.put(`/orders/${id}/pay`, paymentResult)
}

// User API
export const userAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (userData) => api.put('/users/profile', userData)
}

// Chat API
export const chatAPI = {
  send: (payload) => api.post('/chat', payload)
}

export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getSeoAudit: () => api.get('/admin/seo/audit'),
  getParasiteTemplate: (productId) => api.get(`/admin/seo/parasite-template/${productId}`)
}

export default api
export { api }

