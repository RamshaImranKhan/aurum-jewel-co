import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import HomeScreen from './screens/HomeScreen'
import ProductListScreen from './screens/ProductListScreen'
import ProductDetailScreen from './screens/ProductDetailScreen'
import MyListScreen from './screens/MyListScreen'
import CartScreen from './screens/CartScreen'
import CheckoutScreen from './screens/CheckoutScreen'
import PaymentScreen from './screens/PaymentScreen'
import ThankYouScreen from './screens/ThankYouScreen'
import LoginScreen from './screens/LoginScreen'
import RegisterScreen from './screens/RegisterScreen'
import ProfileScreen from './screens/ProfileScreen'
import OrderHistoryScreen from './screens/OrderHistoryScreen'
import AdminDashboardScreen from './screens/admin/AdminDashboardScreen'
import AdminProductListScreen from './screens/admin/AdminProductListScreen'
import AdminProductEditScreen from './screens/admin/AdminProductEditScreen'
import AdminUsersScreen from './screens/admin/AdminUsersScreen'
import AdminOrdersScreen from './screens/admin/AdminOrdersScreen'
import AdminSeoScreen from './screens/admin/AdminSeoScreen'
import AdminAnalyticsScreen from './screens/admin/AdminAnalyticsScreen'
import ChatWidget from './components/ChatWidget'
import './App.css'

function App() {
  return (
    <HelmetProvider>
      <Router>
        <div className="app">
          <Navbar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<HomeScreen />} />
              <Route path="/products" element={<ProductListScreen />} />
              <Route path="/my-list" element={<MyListScreen />} />
              <Route path="/product/:id" element={<ProductDetailScreen />} />
              <Route path="/cart" element={<CartScreen />} />
              <Route path="/checkout" element={<CheckoutScreen />} />
              <Route path="/order/:orderId/pay" element={<PaymentScreen />} />
              <Route path="/thank-you/:orderId" element={<ThankYouScreen />} />
              <Route path="/login" element={<LoginScreen />} />
              <Route path="/register" element={<RegisterScreen />} />
              <Route path="/profile" element={<ProfileScreen />} />
              <Route path="/admin/dashboard" element={<AdminDashboardScreen />} />
              <Route path="/admin/analytics" element={<AdminAnalyticsScreen />} />
              <Route path="/admin/products" element={<AdminProductListScreen />} />
              <Route path="/admin/product/:id/edit" element={<AdminProductEditScreen />} />
              <Route path="/admin/users" element={<AdminUsersScreen />} />
              <Route path="/admin/orders" element={<AdminOrdersScreen />} />
              <Route path="/admin/seo" element={<AdminSeoScreen />} />
            </Routes>
          </main>
          <Footer />
          <ChatWidget />
        </div>
      </Router>
    </HelmetProvider>
  )
}

export default App

