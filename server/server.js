// server.js - Main Express server with WebSocket support
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
require('dotenv').config();

const WebSocketServer = require('./websocketServer');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(limiter);

// MongoDB Connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sales_dashboard?replicaSet=rs&retryWrites=false', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB Connected Successfully');
  } catch (error) {
    console.error('MongoDB Connection Error:', error);
    process.exit(1);
  }
};

// MongoDB Schemas
const customerSchema = new mongoose.Schema({
  name: { type: String, required: true, index: true },
  region: { type: String, required: true, index: true },
  type: { type: String, enum: ['Enterprise', 'SMB', 'Startup'], required: true },
  email: String,
  phone: String,
  createdAt: { type: Date, default: Date.now, index: true }
});

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, index: true },
  category: { type: String, required: true, index: true },
  price: { type: Number, required: true },
  description: String,
  sku: { type: String, unique: true },
  createdAt: { type: Date, default: Date.now, index: true }
});

const salesSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  salesRep: { type: String, required: true, index: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  revenue: { type: Number, required: true, min: 0 },
  orderDate: { type: Date, required: true, index: true },
  createdAt: { type: Date, default: Date.now, index: true }
});

// Analytics Reports Schema for processed data
const analyticsReportSchema = new mongoose.Schema({
  reportDate: { type: Date, required: true, index: true },
  dateRange: {
    start: { type: Date, required: true },
    end: { type: Date, required: true }
  },
  totalRevenue: { type: Number, required: true },
  totalOrders: { type: Number, required: true },
  avgOrderValue: { type: Number, required: true },
  topProducts: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    productName: String,
    revenue: Number,
    quantity: Number,
    orders: Number
  }],
  topCustomers: [{
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    customerName: String,
    revenue: Number,
    orders: Number,
    region: String
  }],
  regionStats: [{
    region: String,
    revenue: Number,
    orders: Number,
    avgOrderValue: Number
  }],
  categoryStats: [{
    category: String,
    revenue: Number,
    quantity: Number,
    orders: Number
  }],
  createdAt: { type: Date, default: Date.now }
});

// Models
const Customer = mongoose.model('Customer', customerSchema);
const Product = mongoose.model('Product', productSchema);
const Sales = mongoose.model('Sales', salesSchema);
const AnalyticsReport = mongoose.model('AnalyticsReport', analyticsReportSchema);

// Validation middleware
const validateDateRange = [
  body('startDate').isISO8601().withMessage('Invalid start date format'),
  body('endDate').isISO8601().withMessage('Invalid end date format'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const startDate = new Date(req.body.startDate || req.query.startDate);
    const endDate = new Date(req.body.endDate || req.query.endDate);
    
    if (startDate >= endDate) {
      return res.status(400).json({ error: 'Start date must be before end date' });
    }
    
    next();
  }
];

// Data Aggregation Functions
const aggregateProductData = async (startDate, endDate) => {
  return await Sales.aggregate([
    {
      $match: {
        orderDate: { $gte: new Date(startDate), $lte: new Date(endDate) }
      }
    },
    {
      $lookup: {
        from: 'products',
        localField: 'product',
        foreignField: '_id',
        as: 'productInfo'
      }
    },
    { $unwind: '$productInfo' },
    {
      $group: {
        _id: '$product',
        productName: { $first: '$productInfo.name' },
        category: { $first: '$productInfo.category' },
        totalRevenue: { $sum: '$revenue' },
        totalQuantity: { $sum: '$quantity' },
        totalOrders: { $sum: 1 }
      }
    },
    { $sort: { totalRevenue: -1 } },
    { $limit: 10 }
  ]);
};

const aggregateCustomerData = async (startDate, endDate) => {
  return await Sales.aggregate([
    {
      $match: {
        orderDate: { $gte: new Date(startDate), $lte: new Date(endDate) }
      }
    },
    {
      $lookup: {
        from: 'customers',
        localField: 'customer',
        foreignField: '_id',
        as: 'customerInfo'
      }
    },
    { $unwind: '$customerInfo' },
    {
      $group: {
        _id: '$customer',
        customerName: { $first: '$customerInfo.name' },
        region: { $first: '$customerInfo.region' },
        type: { $first: '$customerInfo.type' },
        totalRevenue: { $sum: '$revenue' },
        totalOrders: { $sum: 1 }
      }
    },
    { $sort: { totalRevenue: -1 } },
    { $limit: 10 }
  ]);
};

const aggregateRegionalData = async (startDate, endDate) => {
  return await Sales.aggregate([
    {
      $match: {
        orderDate: { $gte: new Date(startDate), $lte: new Date(endDate) }
      }
    },
    {
      $lookup: {
        from: 'customers',
        localField: 'customer',
        foreignField: '_id',
        as: 'customerInfo'
      }
    },
    { $unwind: '$customerInfo' },
    {
      $group: {
        _id: '$customerInfo.region',
        region: { $first: '$customerInfo.region' },
        totalRevenue: { $sum: '$revenue' },
        totalOrders: { $sum: 1 },
        avgOrderValue: { $avg: '$revenue' }
      }
    },
    { $sort: { totalRevenue: -1 } }
  ]);
};

const aggregateCategoryData = async (startDate, endDate) => {
  return await Sales.aggregate([
    {
      $match: {
        orderDate: { $gte: new Date(startDate), $lte: new Date(endDate) }
      }
    },
    {
      $lookup: {
        from: 'products',
        localField: 'product',
        foreignField: '_id',
        as: 'productInfo'
      }
    },
    { $unwind: '$productInfo' },
    {
      $group: {
        _id: '$productInfo.category',
        category: { $first: '$productInfo.category' },
        totalRevenue: { $sum: '$revenue' },
        totalQuantity: { $sum: '$quantity' },
        totalOrders: { $sum: 1 }
      }
    },
    { $sort: { totalRevenue: -1 } }
  ]);
};

const getMonthlyTrend = async (startDate, endDate) => {
  return await Sales.aggregate([
    {
      $match: {
        orderDate: { $gte: new Date(startDate), $lte: new Date(endDate) }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$orderDate' },
          month: { $month: '$orderDate' }
        },
        totalRevenue: { $sum: '$revenue' },
        totalOrders: { $sum: 1 }
      }
    },
    {
      $project: {
        _id: 0,
        month: {
          $dateFromParts: {
            year: '$_id.year',
            month: '$_id.month',
            day: 1
          }
        },
        revenue: '$totalRevenue',
        orders: '$totalOrders'
      }
    },
    { $sort: { month: 1 } }
  ]);
};

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Get all customers
app.get('/api/customers', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const customers = await Customer.find()
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Customer.countDocuments();

    res.json({
      customers,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        total,
        limit
      }
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all products
app.get('/api/products', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const products = await Product.find()
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Product.countDocuments();

    res.json({
      products,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        total,
        limit
      }
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get sales data with filters
app.get('/api/sales', async (req, res) => {
  try {
    const {
      startDate = '2022-01-01',
      endDate = new Date().toISOString().split('T')[0],
      customer,
      product,
      region,
      page = 1,
      limit = 50
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build match criteria
    const matchCriteria = {
      orderDate: {
        $gte: new Date(startDate),
        $lte: new Date(endDate + 'T23:59:59.999Z')
      }
    };

    if (customer) matchCriteria.customer = new mongoose.Types.ObjectId(customer);
    if (product) matchCriteria.product = new mongoose.Types.ObjectId(product);

    const sales = await Sales.aggregate([
      { $match: matchCriteria },
      {
        $lookup: {
          from: 'customers',
          localField: 'customer',
          foreignField: '_id',
          as: 'customerInfo'
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: 'product',
          foreignField: '_id',
          as: 'productInfo'
        }
      },
      { $unwind: '$customerInfo' },
      { $unwind: '$productInfo' },
      ...(region ? [{ $match: { 'customerInfo.region': region } }] : []),
      { $sort: { orderDate: -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) },
      {
        $project: {
          _id: 1,
          orderDate: 1,
          salesRep: 1,
          quantity: 1,
          unitPrice: 1,
          revenue: 1,
          customer: '$customerInfo.name',
          customerRegion: '$customerInfo.region',
          customerType: '$customerInfo.type',
          product: '$productInfo.name',
          productCategory: '$productInfo.category'
        }
      }
    ]);

    // Get total count for pagination
    const totalPipeline = [
      { $match: matchCriteria },
      {
        $lookup: {
          from: 'customers',
          localField: 'customer',
          foreignField: '_id',
          as: 'customerInfo'
        }
      },
      { $unwind: '$customerInfo' },
      ...(region ? [{ $match: { 'customerInfo.region': region } }] : []),
      { $count: 'total' }
    ];

    const totalResult = await Sales.aggregate(totalPipeline);
    const total = totalResult.length > 0 ? totalResult[0].total : 0;

    res.json({
      sales,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      },
      filters: { startDate, endDate, customer, product, region }
    });
  } catch (error) {
    console.error('Error fetching sales:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get comprehensive analytics
app.get('/api/analytics', async (req, res) => {
  try {
    const {
      startDate = '2022-01-01',
      endDate = new Date().toISOString().split('T')[0]
    } = req.query;

    // Check if we have a cached report
    const existingReport = await AnalyticsReport.findOne({
      'dateRange.start': new Date(startDate),
      'dateRange.end': new Date(endDate + 'T23:59:59.999Z'),
      createdAt: { $gte: new Date(Date.now() - 30 * 60 * 1000) } // 30 minutes cache
    }).sort({ createdAt: -1 });

    if (existingReport) {
      return res.json({
        ...existingReport.toObject(),
        cached: true,
        cacheAge: Math.floor((Date.now() - existingReport.createdAt.getTime()) / 1000)
      });
    }

    // Calculate basic metrics
    const totalStatsResult = await Sales.aggregate([
      {
        $match: {
          orderDate: {
            $gte: new Date(startDate),
            $lte: new Date(endDate + 'T23:59:59.999Z')
          }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$revenue' },
          totalOrders: { $sum: 1 },
          avgOrderValue: { $avg: '$revenue' }
        }
      }
    ]);

    const totalStats = totalStatsResult[0] || {
      totalRevenue: 0,
      totalOrders: 0,
      avgOrderValue: 0
    };

    // Run all aggregations in parallel
    const [topProducts, topCustomers, regionStats, categoryStats, monthlyTrend] = await Promise.all([
      aggregateProductData(startDate, endDate),
      aggregateCustomerData(startDate, endDate),
      aggregateRegionalData(startDate, endDate),
      aggregateCategoryData(startDate, endDate),
      getMonthlyTrend(startDate, endDate)
    ]);

    // Prepare analytics report
    const analyticsData = {
      reportDate: new Date(),
      dateRange: {
        start: new Date(startDate),
        end: new Date(endDate + 'T23:59:59.999Z')
      },
      totalRevenue: totalStats.totalRevenue,
      totalOrders: totalStats.totalOrders,
      avgOrderValue: totalStats.avgOrderValue,
      topProducts: topProducts.map(p => ({
        productId: p._id,
        productName: p.productName,
        revenue: p.totalRevenue,
        quantity: p.totalQuantity,
        orders: p.totalOrders
      })),
      topCustomers: topCustomers.map(c => ({
        customerId: c._id,
        customerName: c.customerName,
        revenue: c.totalRevenue,
        orders: c.totalOrders,
        region: c.region
      })),
      regionStats: regionStats.map(r => ({
        region: r.region,
        revenue: r.totalRevenue,
        orders: r.totalOrders,
        avgOrderValue: r.avgOrderValue
      })),
      categoryStats: categoryStats.map(c => ({
        category: c.category,
        revenue: c.totalRevenue,
        quantity: c.totalQuantity,
        orders: c.totalOrders
      })),
      monthlyTrend
    };

    // Save analytics report
    const savedReport = await new AnalyticsReport(analyticsData).save();

    res.json({
      ...analyticsData,
      cached: false,
      reportId: savedReport._id
    });

  } catch (error) {
    console.error('Error generating analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new sale
app.post('/api/sales', [
  body('customerId').isMongoId().withMessage('Invalid customer ID'),
  body('productId').isMongoId().withMessage('Invalid product ID'),
  body('salesRep').isLength({ min: 2 }).withMessage('Sales rep name required'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('unitPrice').isFloat({ min: 0 }).withMessage('Unit price must be positive'),
  body('orderDate').isISO8601().withMessage('Invalid order date')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { customerId, productId, salesRep, quantity, unitPrice, orderDate } = req.body;

    // Verify customer and product exist
    const customer = await Customer.findById(customerId);
    const product = await Product.findById(productId);

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const sale = new Sales({
      customer: customerId,
      product: productId,
      salesRep,
      quantity,
      unitPrice,
      revenue: quantity * unitPrice,
      orderDate: new Date(orderDate)
    });

    await sale.save();

    // Populate the response
    const populatedSale = await Sales.findById(sale._id)
      .populate('customer', 'name region type')
      .populate('product', 'name category price');

    res.status(201).json(populatedSale);
  } catch (error) {
    console.error('Error creating sale:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('/{*any}', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server with WebSocket support
const startServer = async () => {
  await connectDB();
  
  // Initialize WebSocket server
  const wsServer = new WebSocketServer(server);
  
  // Make WebSocket server available to routes
  app.set('wsServer', wsServer);
  
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🔌 WebSocket server initialized`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  });

  // Graceful shutdown handling
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    wsServer.shutdown();
    server.close(() => {
      mongoose.connection.close();
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    wsServer.shutdown();
    server.close(() => {
      mongoose.connection.close();
      process.exit(0);
    });
  });
};

startServer().catch(console.error);

module.exports = app;