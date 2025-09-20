// models/index.js - Central models export
const mongoose = require('mongoose');

// Customer Schema
const customerSchema = new mongoose.Schema({
  name: { type: String, required: true, index: true },
  region: { type: String, required: true, index: true },
  type: { type: String, enum: ['Enterprise', 'SMB', 'Startup'], required: true },
  email: { 
    type: String, 
    validate: {
      validator: function(v) {
        return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v);
      },
      message: 'Please enter a valid email'
    }
  },
  phone: String,
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt field before saving
customerSchema.pre('save', function() {
  this.updatedAt = new Date();
});

// Product Schema
const productSchema = new mongoose.Schema({
  name: { type: String, required: true, index: true },
  category: { type: String, required: true, index: true },
  price: { type: Number, required: true, min: 0 },
  description: { type: String, maxlength: 1000 },
  sku: { type: String, unique: true, sparse: true },
  specifications: {
    weight: Number,
    dimensions: {
      length: Number,
      width: Number,
      height: Number
    },
    color: String,
    material: String
  },
  inventory: {
    inStock: { type: Number, default: 0, min: 0 },
    reserved: { type: Number, default: 0, min: 0 },
    reorderLevel: { type: Number, default: 10, min: 0 }
  },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now }
});

productSchema.pre('save', function() {
  this.updatedAt = new Date();
});

// Sales Schema
const salesSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  salesRep: { type: String, required: true, index: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  revenue: { type: Number, required: true, min: 0 },
  discount: { type: Number, default: 0, min: 0, max: 100 }, // Percentage
  taxAmount: { type: Number, default: 0, min: 0 },
  totalAmount: { type: Number }, // revenue + tax - discount
  orderDate: { type: Date, required: true, index: true },
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'], 
    default: 'confirmed' 
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  notes: String,
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now }
});

salesSchema.pre('save', function() {
  this.updatedAt = new Date();
  
  // Calculate total amount if not provided
  if (!this.totalAmount) {
    const discountAmount = (this.revenue * this.discount) / 100;
    this.totalAmount = this.revenue - discountAmount + (this.taxAmount || 0);
  }
});

// Analytics Report Schema
const analyticsReportSchema = new mongoose.Schema({
  reportDate: { type: Date, required: true, index: true },
  dateRange: {
    start: { type: Date, required: true },
    end: { type: Date, required: true }
  },
  totalRevenue: { type: Number, required: true },
  totalOrders: { type: Number, required: true },
  avgOrderValue: { type: Number, required: true },
  
  // Top performers
  topProducts: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    productName: String,
    category: String,
    revenue: Number,
    quantity: Number,
    orders: Number
  }],
  
  topCustomers: [{
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    customerName: String,
    revenue: Number,
    orders: Number,
    region: String,
    type: String
  }],
  
  // Regional analysis
  regionStats: [{
    region: String,
    revenue: Number,
    orders: Number,
    avgOrderValue: Number
  }],
  
  // Category performance
  categoryStats: [{
    category: String,
    revenue: Number,
    quantity: Number,
    orders: Number
  }],
  
  // Time series data
  monthlyTrend: [{
    month: Date,
    revenue: Number,
    orders: Number
  }],
  
  // Sales rep performance
  salesRepStats: [{
    salesRep: String,
    revenue: Number,
    orders: Number,
    avgOrderValue: Number
  }],
  
  // Additional metrics
  metrics: {
    growthRate: Number, // Percentage
    conversionRate: Number,
    customerRetentionRate: Number,
    averageOrderProcessingTime: Number, // in days
    topSellingDay: String,
    peakSalesHour: Number
  },
  
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: Date.now, expires: 2592000 } // 30 days TTL
});

// Indexes for better query performance
customerSchema.index({ region: 1, type: 1 });
customerSchema.index({ name: 'text', email: 'text' });

productSchema.index({ category: 1, price: 1 });
productSchema.index({ name: 'text', description: 'text' });

salesSchema.index({ orderDate: 1, customer: 1 });
salesSchema.index({ orderDate: 1, product: 1 });
salesSchema.index({ customer: 1, orderDate: -1 });
salesSchema.index({ product: 1, orderDate: -1 });
salesSchema.index({ salesRep: 1, orderDate: -1 });
salesSchema.index({ status: 1, orderDate: -1 });

analyticsReportSchema.index({ 'dateRange.start': 1, 'dateRange.end': 1 });
analyticsReportSchema.index({ reportDate: -1 });

// Virtual fields
customerSchema.virtual('fullAddress').get(function() {
  if (!this.address) return '';
  const { street, city, state, zipCode, country } = this.address;
  return [street, city, state, zipCode, country].filter(Boolean).join(', ');
});

productSchema.virtual('availableStock').get(function() {
  return Math.max(0, (this.inventory?.inStock || 0) - (this.inventory?.reserved || 0));
});

salesSchema.virtual('discountAmount').get(function() {
  return (this.revenue * (this.discount || 0)) / 100;
});

salesSchema.virtual('profitMargin').get(function() {
  // This would require product cost data to calculate accurately
  // For demo purposes, assuming 30% profit margin
  return this.revenue * 0.3;
});

// Static methods
customerSchema.statics.findByRegion = function(region) {
  return this.find({ region, isActive: true });
};

productSchema.statics.findByCategory = function(category) {
  return this.find({ category, isActive: true });
};

salesSchema.statics.findByDateRange = function(startDate, endDate) {
  return this.find({
    orderDate: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    }
  });
};

salesSchema.statics.getRevenueBySalesRep = function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        orderDate: { $gte: new Date(startDate), $lte: new Date(endDate) }
      }
    },
    {
      $group: {
        _id: '$salesRep',
        totalRevenue: { $sum: '$revenue' },
        totalOrders: { $sum: 1 },
        avgOrderValue: { $avg: '$revenue' }
      }
    },
    { $sort: { totalRevenue: -1 } }
  ]);
};

// Instance methods
customerSchema.methods.getRecentOrders = function(limit = 10) {
  return mongoose.model('Sales').find({ customer: this._id })
    .sort({ orderDate: -1 })
    .limit(limit)
    .populate('product', 'name category price');
};

productSchema.methods.getSalesStats = function(startDate, endDate) {
  return mongoose.model('Sales').aggregate([
    {
      $match: {
        product: this._id,
        orderDate: { 
          $gte: new Date(startDate), 
          $lte: new Date(endDate) 
        }
      }
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$revenue' },
        totalQuantity: { $sum: '$quantity' },
        totalOrders: { $sum: 1 },
        avgOrderValue: { $avg: '$revenue' }
      }
    }
  ]);
};

// Middleware hooks
customerSchema.post('save', function(doc) {
  console.log(`Customer ${doc.name} has been saved`);
});

productSchema.post('save', function(doc) {
  console.log(`Product ${doc.name} has been saved`);
});

salesSchema.post('save', function(doc) {
  console.log(`Sale recorded: ${doc.revenue} revenue on ${doc.orderDate}`);
});

// Create and export models
const Customer = mongoose.model('Customer', customerSchema);
const Product = mongoose.model('Product', productSchema);
const Sales = mongoose.model('Sales', salesSchema);
const AnalyticsReport = mongoose.model('AnalyticsReport', analyticsReportSchema);

module.exports = {
  Customer,
  Product,
  Sales,
  AnalyticsReport,
  
  // Export schemas for testing purposes
  schemas: {
    customerSchema,
    productSchema,
    salesSchema,
    analyticsReportSchema
  }
};