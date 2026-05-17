# E-Commerce Frontend

A modern, responsive e-commerce frontend built with React and Vite.

## Features

- 🏠 **Home Screen** - Hero section with featured products
- 🛍️ **Product Listing** - Browse products with filters and search
- 📦 **Product Details** - Detailed product view with reviews
- 🛒 **Shopping Cart** - Add, update, and remove items
- 💳 **Checkout** - Secure checkout process
- 👤 **User Authentication** - Login and registration
- 📋 **User Profile** - Manage personal information
- 📜 **Order History** - View past orders

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file (optional):
```env
VITE_API_URL=http://localhost:5000/api
```

4. Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## Project Structure

```
frontend/
├── src/
│   ├── components/      # Reusable components (Navbar, Footer)
│   ├── screens/         # Page components
│   ├── services/        # API service layer
│   ├── App.jsx          # Main app component
│   ├── App.css          # App styles
│   ├── main.jsx         # Entry point
│   └── index.css        # Global styles
├── index.html           # HTML template
├── vite.config.js       # Vite configuration
└── package.json         # Dependencies
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Technologies Used

- React 18
- React Router DOM
- Vite
- Axios
- React Icons

## API Integration

The frontend is configured to connect to a backend API. Update the `VITE_API_URL` in your `.env` file to point to your backend server.

API endpoints are defined in `src/services/api.js`:
- Authentication (`/api/auth`)
- Products (`/api/products`)
- Cart (`/api/cart`)
- Orders (`/api/orders`)
- Users (`/api/users`)

## Notes

- Currently using mock data for demonstration
- Replace mock API calls with actual API integration
- Authentication tokens are stored in localStorage
- Responsive design for mobile and desktop

