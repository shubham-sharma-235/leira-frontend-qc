# Leira Backend API

Production-ready Node.js backend for Leira website.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

3. Update `.env` with your MongoDB connection string:
```
MONGODB_URI=mongodb://localhost:27017/leira
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
CORS_ORIGIN=http://localhost:3000
```

4. Seed products (migrate hardcoded products to database):
```bash
npm run seed
```

5. Create admin user:
```bash
npm run create-admin
```
Default credentials:
- Email: `admin@leira.com`
- Password: `admin123`
⚠️ Change password after first login!

6. Run development server:
```bash
npm run dev
```

7. Run production server:
```bash
npm start
```

## API Endpoints

### Public Routes
- `GET /` - API status
- `GET /api/health` - Health check
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get single product
- `GET /api/products/slug/:id` - Get product by slug
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login user

### Protected Admin Routes
- `POST /api/products` - Create product (Admin only)
- `PUT /api/products/:id` - Update product (Admin only)
- `DELETE /api/products/:id` - Delete product (Admin only)
- `GET /api/auth/me` - Get current user

## Admin Panel

Access admin panel at: `http://localhost:3000/admin/login`

## Project Structure

```
backend/
├── config/          # Configuration files
│   └── database.js
├── controllers/     # Route controllers
│   ├── authController.js
│   └── productController.js
├── models/          # MongoDB models
│   ├── Product.js
│   └── User.js
├── routes/          # API routes
│   ├── auth.js
│   └── products.js
├── middleware/      # Custom middleware
│   └── auth.js
├── utils/           # Utility functions
│   └── generateToken.js
├── scripts/         # Utility scripts
│   ├── seedProducts.js
│   └── createAdmin.js
├── server.js        # Main server file
└── package.json     # Dependencies
```

## Environment Variables

- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment (development/production)
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - JWT secret key
- `JWT_EXPIRE` - JWT expiration (default: 7d)
- `CORS_ORIGIN` - Frontend URL
