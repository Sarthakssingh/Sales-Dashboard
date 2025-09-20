# Sales Analytics Dashboard - Backend

A comprehensive sales analytics dashboard backend built with Node.js, Express.js, and MongoDB featuring real-time updates, advanced data aggregation, and RESTful APIs.

## 🚀 Features

### Core Functionality
- **RESTful API** with Express.js
- **MongoDB** database with Mongoose ODM
- **Real-time updates** via WebSocket (Socket.IO)
- **Advanced data aggregation** with MongoDB aggregation pipelines
- **Date-range filtering** and pagination
- **Comprehensive analytics** and reporting
- **Input validation** and error handling
- **Performance optimized** with indexes and caching

### API Endpoints

#### Analytics
- `GET /api/analytics` - Comprehensive analytics with caching
- `GET /api/analytics/summary` - Quick summary metrics
- `GET /api/analytics/trends` - Time-based trend analysis

#### Sales
- `GET /api/sales` - Get sales with filtering and pagination
- `POST /api/sales` - Create new sale
- `GET /api/sales/:id` - Get specific sale
- `PUT /api/sales/:id` - Update sale
- `DELETE /api/sales/:id` - Delete sale

#### Customers & Products
- `GET /api/customers` - Get customers with pagination
- `GET /api/products` - Get products with pagination

## 📋 Prerequisites

- **Node.js** (v16.0.0 or higher)
- **MongoDB** (v4.4 or higher)
- **npm** (v8.0.0 or higher)

## 🛠️ Installation

### 1. Clone and Setup
```bash
# Clone the repository
git clone <repository-url>
cd sales-dashboard-backend

# Install dependencies
npm install
```

### 2. Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your configuration
nano .env
```

### 3. Database Setup

#### Option A: Local MongoDB
```bash
# Start MongoDB service
mongod

# The application will connect to mongodb://localhost:27017/sales_dashboard
```

#### Option B: MongoDB Atlas (Cloud)
```bash
# Update MONGODB_URI in .env file
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/sales_dashboard?retryWrites=true&w=majority
```

### 4. Seed Database
```bash
# Populate database with sample data
npm run seed
```

### 5. Start Server
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

## 📊 Database Schema

### Collections

#### Customers
```javascript
{
  _id: ObjectId,
  name: String,
  region: String, // 'North America', 'Europe', 'Asia'
  type: String,   // 'Enterprise', 'SMB', 'Startup'
  email: String,
  phone: String,
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

#### Products
```javascript
{
  _id: ObjectId,
  name: String,
  category: String, // 'Electronics', 'Accessories', 'Gaming', 'Wearables'
  price: Number,
  description: String,
  sku: String,
  specifications: {
    weight: Number,
    dimensions: { length: Number, width: Number, height: Number },
    color: String,
    material: String
  },
  inventory: {
    inStock: Number,
    reserved: Number,
    reorderLevel: Number
  },
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

#### Sales
```javascript
{
  _id: ObjectId,
  customer: ObjectId, // Reference to Customer
  product: ObjectId,  // Reference to Product
  salesRep: String,
  quantity: Number,
  unitPrice: Number,
  revenue: Number,
  discount: Number,   // Percentage
  taxAmount: Number,
  totalAmount: Number,
  orderDate: Date,
  status: String,     // 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'
  paymentStatus: String, // 'pending', 'paid', 'failed', 'refunded'
  notes: String,
  createdAt: Date,
  updatedAt: Date
}
```

#### Analytics Reports (Cached)
```javascript
{
  _id: ObjectId,
  reportDate: Date,
  dateRange: { start: Date, end: Date },
  totalRevenue: Number,
  totalOrders: Number,
  avgOrderValue: Number,
  topProducts: [{ productId, productName, revenue, quantity, orders }],
  topCustomers: [{ customerId, customerName, revenue, orders, region }],
  regionStats: [{ region, revenue, orders, avgOrderValue }],
  categoryStats: [{ category, revenue, quantity, orders }],
  monthlyTrend: [{ month, revenue, orders }],
  salesRepStats: [{ salesRep, revenue, orders, avgOrderValue }],
  createdAt: Date,
  expiresAt: Date // TTL index for auto-cleanup
}
```

## 🔄 Real-time Features

### WebSocket Events

#### Client to Server
- `request_analytics_update` - Request fresh analytics
- `subscribe_to_updates` - Subscribe to specific data types
- `ping` - Heartbeat check

#### Server to Client
- `connection_established` - Connection confirmation
- `analytics_updated` - New analytics data available
- `sales_data_changed` - Sales collection changed
- `data_update_notification` - General data update notification
- `system_message` - System announcements

### MongoDB Change Streams
The application uses MongoDB Change Streams to monitor database changes in real-time:

```javascript
// Automatically detects changes in Sales, Customers, and Products collections
// Broadcasts updates to connected WebSocket clients
// Requires MongoDB replica set or sharded cluster
```

## 📈 API Usage Examples

### Get Analytics Data
```bash
# Get analytics for date range
curl "http://localhost:5000/api/analytics?startDate=2024-01-01&endDate=2024-12-31"

# Get cached analytics (if available)
curl "http://localhost:5000/api/analytics?startDate=2024-01-01&endDate=2024-12-31&useCache=true"
```

### Filter Sales Data
```bash
# Get sales with multiple filters
curl "http://localhost:5000/api/sales?startDate=2024-01-01&region=North%20America&minRevenue=1000&page=1&limit=20"

# Sort by revenue descending
curl "http://localhost:5000/api/sales?sortBy=revenue&sortOrder=desc"
```

### Create New Sale
```bash
curl -X POST http://localhost:5000/api/sales \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "60f7b3b3b3b3b3b3b3b3b3b3",
    "productId": "60f7b3b3b3b3b3b3b3b3b3b4",
    "salesRep": "John Doe",
    "quantity": 2,
    "unitPrice": 299.99,
    "orderDate": "2024-01-15"
  }'
```

## 🚀 Performance Optimizations

### Database Indexes
```javascript
// Compound indexes for common queries
{ orderDate: 1, customer: 1 }
{ orderDate: 1, product: 1 }
{ customer: 1, orderDate: -1 }
{ salesRep: 1, orderDate: -1 }

// Text indexes for search functionality
{ name: 'text', description: 'text' }
{ name: 'text', email: 'text' }
```

### Caching Strategy
- **Analytics Reports**: Cached for 30 minutes (configurable)
- **TTL Indexes**: Auto-cleanup of expired cache entries
- **Memory Usage**: Optimized aggregation pipelines

### Query Optimization
- **Pagination**: Efficient skip/limit with proper indexing
- **Aggregation Pipelines**: Optimized for large datasets
- **Projection**: Return only required fields

## 🔒 Security Features

- **Helmet.js**: Security headers
- **CORS**: Cross-origin request protection
- **Rate Limiting**: Prevent API abuse
- **Input Validation**: express-validator for request validation
- **Error Handling**: Comprehensive error responses
- **JWT Ready**: Authentication structure prepared

## 📝 Development Scripts

```bash
# Start development server with auto-reload
npm run dev

# Seed database with sample data
npm run seed

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

## 🧪 Testing

The application includes comprehensive test coverage:

```bash
# Install test dependencies
npm install --save-dev jest supertest mongodb-memory-server

# Run all tests
npm test

# Run specific test file
npm test sales.test.js

# Generate coverage report
npm run test:coverage
```

## 📦 Production Deployment

### Environment Variables
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://localhost:27017/sales_dashboard
JWT_SECRET=your-super-secret-jwt-key
CORS_ORIGIN=https://yourdomain.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Docker Deployment
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

### PM2 Process Manager
```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start server.js --name "sales-dashboard"

# Monitor logs
pm2 logs sales-dashboard

# Restart application
pm2 restart sales-dashboard
```

## 📊 Monitoring & Logging

### Health Check Endpoint
```bash
curl http://localhost:5000/api/health
```

Response:
```json
{
  "status": "OK",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600.123,
  "memory": {
    "rss": 50331648,
    "heapTotal": 25165824,
    "heapUsed": 15728640,
    "external": 2097152
  },
  "version": "1.0.0"
}
```

### Logging
- **Morgan**: HTTP request logging
- **Console**: Application events and errors
- **Production**: Consider using Winston for advanced logging

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Troubleshooting

### Common Issues

#### MongoDB Connection Error
```bash
# Ensure MongoDB is running
mongod

# Check connection string in .env
MONGODB_URI=mongodb://localhost:27017/sales_dashboard
```

#### Port Already in Use
```bash
# Change port in .env or kill existing process
lsof -ti:5000 | xargs kill -9
```

#### WebSocket Connection Issues
```bash
# Ensure CORS_ORIGIN is set correctly
CORS_ORIGIN=http://localhost:3000

# Check firewall settings for WebSocket traffic
```

### Performance Issues
- Monitor MongoDB slow query log
- Use MongoDB Compass for query analysis
- Consider adding more indexes for frequently queried fields
- Implement Redis caching for heavy operations

## 📞 Support

For support and questions:
- Create an issue in the repository
- Check existing documentation
- Review MongoDB and Express.js official documentation

---

**Built with ❤️ using Node.js, Express.js, and MongoDB**
