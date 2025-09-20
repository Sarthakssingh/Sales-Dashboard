// // routes/index.js - Main routes file
// const express = require('express');
// const analyticsRoutes = require('./analytics');
// const salesRoutes = require('./sales');
// const customerRoutes = require('./customers');
// const productRoutes = require('./products');

// const router = express.Router();

// // Health check endpoint
// router.get('/health', (req, res) => {
//   res.json({ 
//     status: 'OK', 
//     timestamp: new Date().toISOString(),
//     uptime: process.uptime(),
//     memory: process.memoryUsage(),
//     version: process.env.npm_package_version || '1.0.0'
//   });
// });

// // Mount sub-routes
// router.use('/analytics', analyticsRoutes);
// router.use('/sales', salesRoutes);
// router.use('/customers', customerRoutes);
// router.use('/products', productRoutes);

// module.exports = router;

// // routes/analytics.js - Analytics specific routes
// const express = require('express');
// const mongoose = require('mongoose');
// const { query, validationResult } = require('express-validator');

// // const router = express.Router();

// // Import models (assuming they're exported from models/index.js)
// const { Sales, Customer, Product, AnalyticsReport } = require('../models');

// // Validation middleware for date queries
// const validateDateQuery = [
//   query('startDate').optional().isISO8601().withMessage('Invalid start date format'),
//   query('endDate').optional().isISO8601().withMessage('Invalid end date format'),
//   (req, res, next) => {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({ errors: errors.array() });
//     }
    
//     const startDate = req.query.startDate;
//     const endDate = req.query.endDate;
    
//     if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
//       return res.status(400).json({ error: 'Start date must be before end date' });
//     }
    
//     next();
//   }
// ];

// // GET /api/analytics - Main analytics endpoint
// router.get('/', validateDateQuery, async (req, res) => {
//   try {
//     const {
//       startDate = '2022-01-01',
//       endDate = new Date().toISOString().split('T')[0],
//       useCache = 'true'
//     } = req.query;

//     // Check for cached report if cache is enabled
//     if (useCache === 'true') {
//       const cacheThreshold = new Date(Date.now() - (process.env.ANALYTICS_CACHE_TTL || 1800) * 1000);
      
//       const cachedReport = await AnalyticsReport.findOne({
//         'dateRange.start': new Date(startDate),
//         'dateRange.end': new Date(endDate + 'T23:59:59.999Z'),
//         createdAt: { $gte: cacheThreshold }
//       }).sort({ createdAt: -1 });

//       if (cachedReport) {
//         return res.json({
//           ...cachedReport.toObject(),
//           cached: true,
//           cacheAge: Math.floor((Date.now() - cachedReport.createdAt.getTime()) / 1000)
//         });
//       }
//     }

//     // Generate fresh analytics
//     const analyticsData = await generateAnalytics(startDate, endDate);
    
//     // Save to cache
//     const savedReport = await new AnalyticsReport(analyticsData).save();

//     // Emit real-time update if WebSocket server is available
//     const wsServer = req.app.get('wsServer');
//     if (wsServer) {
//       wsServer.broadcastAnalyticsUpdate(analyticsData);
//     }

//     res.json({
//       ...analyticsData,
//       cached: false,
//       reportId: savedReport._id
//     });

//   } catch (error) {
//     console.error('Error generating analytics:', error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });

// // GET /api/analytics/summary - Quick summary metrics
// router.get('/summary', validateDateQuery, async (req, res) => {
//   try {
//     const {
//       startDate = '2022-01-01',
//       endDate = new Date().toISOString().split('T')[0]
//     } = req.query;

//     const summary = await Sales.aggregate([
//       {
//         $match: {
//           orderDate: {
//             $gte: new Date(startDate),
//             $lte: new Date(endDate + 'T23:59:59.999Z')
//           }
//         }
//       },
//       {
//         $group: {
//           _id: null,
//           totalRevenue: { $sum: '$revenue' },
//           totalOrders: { $sum: 1 },
//           avgOrderValue: { $avg: '$revenue' },
//           maxOrderValue: { $max: '$revenue' },
//           minOrderValue: { $min: '$revenue' }
//         }
//       }
//     ]);

//     const result = summary[0] || {
//       totalRevenue: 0,
//       totalOrders: 0,
//       avgOrderValue: 0,
//       maxOrderValue: 0,
//       minOrderValue: 0
//     };

//     res.json({
//       ...result,
//       dateRange: { startDate, endDate },
//       timestamp: new Date().toISOString()
//     });

//   } catch (error) {
//     console.error('Error generating analytics summary:', error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });

// // GET /api/analytics/trends - Time-based trend analysis
// router.get('/trends', validateDateQuery, async (req, res) => {
//   try {
//     const {
//       startDate = '2022-01-01',
//       endDate = new Date().toISOString().split('T')[0],
//       granularity = 'month' // month, week, day
//     } = req.query;

//     let groupBy;
//     switch (granularity) {
//       case 'day':
//         groupBy = {
//           year: { $year: '$orderDate' },
//           month: { $month: '$orderDate' },
//           day: { $dayOfMonth: '$orderDate' }
//         };
//         break;
//       case 'week':
//         groupBy = {
//           year: { $year: '$orderDate' },
//           week: { $week: '$orderDate' }
//         };
//         break;
//       case 'month':
//       default:
//         groupBy = {
//           year: { $year: '$orderDate' },
//           month: { $month: '$orderDate' }
//         };
//     }

//     const trends = await Sales.aggregate([
//       {
//         $match: {
//           orderDate: {
//             $gte: new Date(startDate),
//             $lte: new Date(endDate + 'T23:59:59.999Z')
//           }
//         }
//       },
//       {
//         $group: {
//           _id: groupBy,
//           revenue: { $sum: '$revenue' },
//           orders: { $sum: 1 },
//           avgOrderValue: { $avg: '$revenue' }
//         }
//       },
//       { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 } }
//     ]);

//     res.json({
//       trends,
//       granularity,
//       dateRange: { startDate, endDate },
//       totalPeriods: trends.length
//     });

//   } catch (error) {
//     console.error('Error generating trend analysis:', error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });

// // Helper function to generate comprehensive analytics
// async function generateAnalytics(startDate, endDate) {
//   const matchCriteria = {
//     orderDate: {
//       $gte: new Date(startDate),
//       $lte: new Date(endDate + 'T23:59:59.999Z')
//     }
//   };

//   // Run all aggregations in parallel for better performance
//   const [
//     totalStats,
//     topProducts,
//     topCustomers,
//     regionStats,
//     categoryStats,
//     monthlyTrend,
//     salesRepStats
//   ] = await Promise.all([
//     // Total statistics
//     Sales.aggregate([
//       { $match: matchCriteria },
//       {
//         $group: {
//           _id: null,
//           totalRevenue: { $sum: '$revenue' },
//           totalOrders: { $sum: 1 },
//           avgOrderValue: { $avg: '$revenue' }
//         }
//       }
//     ]),

//     // Top products
//     Sales.aggregate([
//       { $match: matchCriteria },
//       {
//         $lookup: {
//           from: 'products',
//           localField: 'product',
//           foreignField: '_id',
//           as: 'productInfo'
//         }
//       },
//       { $unwind: '$productInfo' },
//       {
//         $group: {
//           _id: '$product',
//           productName: { $first: '$productInfo.name' },
//           category: { $first: '$productInfo.category' },
//           totalRevenue: { $sum: '$revenue' },
//           totalQuantity: { $sum: '$quantity' },
//           totalOrders: { $sum: 1 }
//         }
//       },
//       { $sort: { totalRevenue: -1 } },
//       { $limit: 10 }
//     ]),

//     // Top customers
//     Sales.aggregate([
//       { $match: matchCriteria },
//       {
//         $lookup: {
//           from: 'customers',
//           localField: 'customer',
//           foreignField: '_id',
//           as: 'customerInfo'
//         }
//       },
//       { $unwind: '$customerInfo' },
//       {
//         $group: {
//           _id: '$customer',
//           customerName: { $first: '$customerInfo.name' },
//           region: { $first: '$customerInfo.region' },
//           type: { $first: '$customerInfo.type' },
//           totalRevenue: { $sum: '$revenue' },
//           totalOrders: { $sum: 1 }
//         }
//       },
//       { $sort: { totalRevenue: -1 } },
//       { $limit: 10 }
//     ]),

//     // Regional statistics
//     Sales.aggregate([
//       { $match: matchCriteria },
//       {
//         $lookup: {
//           from: 'customers',
//           localField: 'customer',
//           foreignField: '_id',
//           as: 'customerInfo'
//         }
//       },
//       { $unwind: '$customerInfo' },
//       {
//         $group: {
//           _id: '$customerInfo.region',
//           region: { $first: '$customerInfo.region' },
//           totalRevenue: { $sum: '$revenue' },
//           totalOrders: { $sum: 1 },
//           avgOrderValue: { $avg: '$revenue' }
//         }
//       },
//       { $sort: { totalRevenue: -1 } }
//     ]),

//     // Category performance
//     Sales.aggregate([
//       { $match: matchCriteria },
//       {
//         $lookup: {
//           from: 'products',
//           localField: 'product',
//           foreignField: '_id',
//           as: 'productInfo'
//         }
//       },
//       { $unwind: '$productInfo' },
//       {
//         $group: {
//           _id: '$productInfo.category',
//           category: { $first: '$productInfo.category' },
//           totalRevenue: { $sum: '$revenue' },
//           totalQuantity: { $sum: '$quantity' },
//           totalOrders: { $sum: 1 }
//         }
//       },
//       { $sort: { totalRevenue: -1 } }
//     ]),

//     // Monthly trend
//     Sales.aggregate([
//       { $match: matchCriteria },
//       {
//         $group: {
//           _id: {
//             year: { $year: '$orderDate' },
//             month: { $month: '$orderDate' }
//           },
//           totalRevenue: { $sum: '$revenue' },
//           totalOrders: { $sum: 1 }
//         }
//       },
//       {
//         $project: {
//           _id: 0,
//           month: {
//             $dateFromParts: {
//               year: '$_id.year',
//               month: '$_id.month',
//               day: 1
//             }
//           },
//           revenue: '$totalRevenue',
//           orders: '$totalOrders'
//         }
//       },
//       { $sort: { month: 1 } }
//     ]),

//     // Sales rep performance
//     Sales.aggregate([
//       { $match: matchCriteria },
//       {
//         $group: {
//           _id: '$salesRep',
//           salesRep: { $first: '$salesRep' },
//           totalRevenue: { $sum: '$revenue' },
//           totalOrders: { $sum: 1 },
//           avgOrderValue: { $avg: '$revenue' }
//         }
//       },
//       { $sort: { totalRevenue: -1 } },
//       { $limit: 10 }
//     ])
//   ]);

//   const stats = totalStats[0] || { totalRevenue: 0, totalOrders: 0, avgOrderValue: 0 };

//   return {
//     reportDate: new Date(),
//     dateRange: {
//       start: new Date(startDate),
//       end: new Date(endDate + 'T23:59:59.999Z')
//     },
//     totalRevenue: stats.totalRevenue,
//     totalOrders: stats.totalOrders,
//     avgOrderValue: stats.avgOrderValue,
//     topProducts: topProducts.map(p => ({
//       productId: p._id,
//       productName: p.productName,
//       category: p.category,
//       revenue: p.totalRevenue,
//       quantity: p.totalQuantity,
//       orders: p.totalOrders
//     })),
//     topCustomers: topCustomers.map(c => ({
//       customerId: c._id,
//       customerName: c.customerName,
//       revenue: c.totalRevenue,
//       orders: c.totalOrders,
//       region: c.region,
//       type: c.type
//     })),
//     regionStats: regionStats.map(r => ({
//       region: r.region,
//       revenue: r.totalRevenue,
//       orders: r.totalOrders,
//       avgOrderValue: r.avgOrderValue
//     })),
//     categoryStats: categoryStats.map(c => ({
//       category: c.category,
//       revenue: c.totalRevenue,
//       quantity: c.totalQuantity,
//       orders: c.totalOrders
//     })),
//     monthlyTrend,
//     salesRepStats: salesRepStats.map(s => ({
//       salesRep: s.salesRep,
//       revenue: s.totalRevenue,
//       orders: s.totalOrders,
//       avgOrderValue: s.avgOrderValue
//     }))
//   };
// }

// module.exports = router;

// // routes/sales.js - Sales specific routes
// const express = require('express');
// const { body, query, validationResult } = require('express-validator');
// const { Sales, Customer, Product } = require('../models');

// // const router = express.Router();

// // GET /api/sales - Get sales with filtering and pagination
// router.get('/', [
//   query('startDate').optional().isISO8601(),
//   query('endDate').optional().isISO8601(),
//   query('page').optional().isInt({ min: 1 }),
//   query('limit').optional().isInt({ min: 1, max: 100 })
// ], async (req, res) => {
//   try {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({ errors: errors.array() });
//     }

//     const {
//       startDate = '2022-01-01',
//       endDate = new Date().toISOString().split('T')[0],
//       customer,
//       product,
//       region,
//       category,
//       salesRep,
//       minRevenue,
//       maxRevenue,
//       page = 1,
//       limit = 50,
//       sortBy = 'orderDate',
//       sortOrder = 'desc'
//     } = req.query;

//     const skip = (parseInt(page) - 1) * parseInt(limit);
//     const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

//     // Build match criteria
//     const matchCriteria = {
//       orderDate: {
//         $gte: new Date(startDate),
//         $lte: new Date(endDate + 'T23:59:59.999Z')
//       }
//     };

//     if (customer) matchCriteria.customer = mongoose.Types.ObjectId(customer);
//     if (product) matchCriteria.product = mongoose.Types.ObjectId(product);
//     if (salesRep) matchCriteria.salesRep = new RegExp(salesRep, 'i');
//     if (minRevenue) matchCriteria.revenue = { ...matchCriteria.revenue, $gte: parseFloat(minRevenue) };
//     if (maxRevenue) matchCriteria.revenue = { ...matchCriteria.revenue, $lte: parseFloat(maxRevenue) };

//     const pipeline = [
//       { $match: matchCriteria },
//       {
//         $lookup: {
//           from: 'customers',
//           localField: 'customer',
//           foreignField: '_id',
//           as: 'customerInfo'
//         }
//       },
//       {
//         $lookup: {
//           from: 'products',
//           localField: 'product',
//           foreignField: '_id',
//           as: 'productInfo'
//         }
//       },
//       { $unwind: '$customerInfo' },
//       { $unwind: '$productInfo' }
//     ];

//     // Add region filter if specified
//     if (region) {
//       pipeline.push({ $match: { 'customerInfo.region': region } });
//     }

//     // Add category filter if specified
//     if (category) {
//       pipeline.push({ $match: { 'productInfo.category': category } });
//     }

//     // Get total count for pagination
//     const totalPipeline = [...pipeline, { $count: 'total' }];
//     const totalResult = await Sales.aggregate(totalPipeline);
//     const total = totalResult.length > 0 ? totalResult[0].total : 0;

//     // Add pagination and sorting
//     pipeline.push(
//       { $sort: sort },
//       { $skip: skip },
//       { $limit: parseInt(limit) },
//       {
//         $project: {
//           _id: 1,
//           orderDate: 1,
//           salesRep: 1,
//           quantity: 1,
//           unitPrice: 1,
//           revenue: 1,
//           customer: '$customerInfo.name',
//           customerRegion: '$customerInfo.region',
//           customerType: '$customerInfo.type',
//           product: '$productInfo.name',
//           productCategory: '$productInfo.category',
//           productPrice: '$productInfo.price'
//         }
//       }
//     );

//     const sales = await Sales.aggregate(pipeline);

//     res.json({
//       sales,
//       pagination: {
//         currentPage: parseInt(page),
//         totalPages: Math.ceil(total / parseInt(limit)),
//         total,
//         limit: parseInt(limit),
//         hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
//         hasPrev: parseInt(page) > 1
//       },
//       filters: {
//         dateRange: { startDate, endDate },
//         customer,
//         product,
//         region,
//         category,
//         salesRep,
//         revenueRange: { min: minRevenue, max: maxRevenue }
//       },
//       sorting: { sortBy, sortOrder }
//     });

//   } catch (error) {
//     console.error('Error fetching sales:', error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });

// // POST /api/sales - Create new sale
// router.post('/', [
//   body('customerId').isMongoId().withMessage('Invalid customer ID'),
//   body('productId').isMongoId().withMessage('Invalid product ID'),
//   body('salesRep').isLength({ min: 2, max: 100 }).withMessage('Sales rep name required (2-100 characters)'),
//   body('quantity').isInt({ min: 1, max: 10000 }).withMessage('Quantity must be between 1 and 10000'),
//   body('unitPrice').isFloat({ min: 0 }).withMessage('Unit price must be positive'),
//   body('orderDate').isISO8601().withMessage('Invalid order date format')
// ], async (req, res) => {
//   try {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({ errors: errors.array() });
//     }

//     const { customerId, productId, salesRep, quantity, unitPrice, orderDate } = req.body;

//     // Verify customer and product exist
//     const [customer, product] = await Promise.all([
//       Customer.findById(customerId),
//       Product.findById(productId)
//     ]);

//     if (!customer) {
//       return res.status(404).json({ error: 'Customer not found' });
//     }

//     if (!product) {
//       return res.status(404).json({ error: 'Product not found' });
//     }

//     // Create new sale
//     const sale = new Sales({
//       customer: customerId,
//       product: productId,
//       salesRep,
//       quantity,
//       unitPrice,
//       revenue: quantity * unitPrice,
//       orderDate: new Date(orderDate)
//     });

//     await sale.save();

//     // Populate the response
//     const populatedSale = await Sales.findById(sale._id)
//       .populate('customer', 'name region type email')
//       .populate('product', 'name category price sku');

//     // Emit real-time update
//     const wsServer = req.app.get('wsServer');
//     if (wsServer) {
//       wsServer.broadcastSalesUpdate(populatedSale);
//     }

//     res.status(201).json({
//       message: 'Sale created successfully',
//       sale: populatedSale
//     });

//   } catch (error) {
//     console.error('Error creating sale:', error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });

// // GET /api/sales/:id - Get specific sale
// router.get('/:id', async (req, res) => {
//   try {
//     const sale = await Sales.findById(req.params.id)
//       .populate('customer', 'name region type email phone')
//       .populate('product', 'name category price sku description');

//     if (!sale) {
//       return res.status(404).json({ error: 'Sale not found' });
//     }

//     res.json(sale);
//   } catch (error) {
//     console.error('Error fetching sale:', error);
//     if (error.name === 'CastError') {
//       return res.status(400).json({ error: 'Invalid sale ID' });
//     }
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });

// // PUT /api/sales/:id - Update sale
// router.put('/:id', [
//   body('quantity').optional().isInt({ min: 1, max: 10000 }),
//   body('unitPrice').optional().isFloat({ min: 0 }),
//   body('salesRep').optional().isLength({ min: 2, max: 100 })
// ], async (req, res) => {
//   try {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({ errors: errors.array() });
//     }

//     const { quantity, unitPrice, salesRep } = req.body;
//     const updateData = {};

//     if (quantity !== undefined) updateData.quantity = quantity;
//     if (unitPrice !== undefined) updateData.unitPrice = unitPrice;
//     if (salesRep !== undefined) updateData.salesRep = salesRep;

//     // Recalculate revenue if quantity or unitPrice changed
//     if (quantity !== undefined || unitPrice !== undefined) {
//       const existingSale = await Sales.findById(req.params.id);
//       if (!existingSale) {
//         return res.status(404).json({ error: 'Sale not found' });
//       }
      
//       const newQuantity = quantity !== undefined ? quantity : existingSale.quantity;
//       const newUnitPrice = unitPrice !== undefined ? unitPrice : existingSale.unitPrice;
//       updateData.revenue = newQuantity * newUnitPrice;
//     }

//     const sale = await Sales.findByIdAndUpdate(
//       req.params.id,
//       updateData,
//       { new: true, runValidators: true }
//     ).populate('customer', 'name region type')
//      .populate('product', 'name category price');

//     if (!sale) {
//       return res.status(404).json({ error: 'Sale not found' });
//     }

//     res.json({
//       message: 'Sale updated successfully',
//       sale
//     });

//   } catch (error) {
//     console.error('Error updating sale:', error);
//     if (error.name === 'CastError') {
//       return res.status(400).json({ error: 'Invalid sale ID' });
//     }
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });

// // DELETE /api/sales/:id - Delete sale
// router.delete('/:id', async (req, res) => {
//   try {
//     const sale = await Sales.findByIdAndDelete(req.params.id);

//     if (!sale) {
//       return res.status(404).json({ error: 'Sale not found' });
//     }

//     res.json({
//       message: 'Sale deleted successfully',
//       deletedSale: { id: sale._id, revenue: sale.revenue }
//     });

//   } catch (error) {
//     console.error('Error deleting sale:', error);
//     if (error.name === 'CastError') {
//       return res.status(400).json({ error: 'Invalid sale ID' });
//     }
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });

// module.exports = router;