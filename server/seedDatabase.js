// seedDatabase.js - Script to populate the database with sample data
const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sales_dashboard', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected for seeding...');
  } catch (error) {
    console.error('MongoDB Connection Error:', error);
    process.exit(1);
  }
};

// Import schemas (same as in server.js)
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

const Customer = mongoose.model('Customer', customerSchema);
const Product = mongoose.model('Product', productSchema);
const Sales = mongoose.model('Sales', salesSchema);

// Sample data
const sampleCustomers = [
  {
    name: 'Acme Corporation',
    region: 'North America',
    type: 'Enterprise',
    email: 'contact@acme.com',
    phone: '+1-555-0101'
  },
  {
    name: 'TechStart Inc',
    region: 'North America',
    type: 'Startup',
    email: 'hello@techstart.com',
    phone: '+1-555-0102'
  },
  {
    name: 'Global Solutions Ltd',
    region: 'Europe',
    type: 'Enterprise',
    email: 'info@globalsolutions.eu',
    phone: '+44-20-7946-0958'
  },
  {
    name: 'Digital Dynamics',
    region: 'Asia',
    type: 'SMB',
    email: 'support@digitaldynamics.asia',
    phone: '+65-6789-1234'
  },
  {
    name: 'Innovation Labs Pte',
    region: 'Asia',
    type: 'SMB',
    email: 'contact@innovationlabs.sg',
    phone: '+65-9876-5432'
  },
  {
    name: 'Future Systems GmbH',
    region: 'Europe',
    type: 'Enterprise',
    email: 'sales@futuresystems.de',
    phone: '+49-89-123456'
  },
  {
    name: 'Smart Enterprises LLC',
    region: 'North America',
    type: 'Enterprise',
    email: 'business@smartenterprises.com',
    phone: '+1-555-0103'
  },
  {
    name: 'NextGen Solutions',
    region: 'Europe',
    type: 'Startup',
    email: 'team@nextgensolutions.fr',
    phone: '+33-1-23-45-67-89'
  },
  {
    name: 'Pacific Tech Co',
    region: 'Asia',
    type: 'SMB',
    email: 'info@pacifictech.jp',
    phone: '+81-3-1234-5678'
  },
  {
    name: 'Atlantic Industries',
    region: 'North America',
    type: 'Enterprise',
    email: 'sales@atlanticindustries.ca',
    phone: '+1-416-555-0104'
  },
  {
    name: 'European Dynamics',
    region: 'Europe',
    type: 'SMB',
    email: 'contact@europeandynamics.it',
    phone: '+39-02-1234567'
  },
  {
    name: 'Asian Ventures Ltd',
    region: 'Asia',
    type: 'Startup',
    email: 'hello@asianventures.hk',
    phone: '+852-1234-5678'
  }
];

const sampleProducts = [
  {
    name: 'Laptop Pro X1',
    category: 'Electronics',
    price: 1299.99,
    description: 'High-performance laptop for professionals',
    sku: 'LPX1-001'
  },
  {
    name: 'Smartphone Ultra 5G',
    category: 'Electronics',
    price: 899.99,
    description: 'Latest 5G smartphone with advanced features',
    sku: 'SU5G-002'
  },
  {
    name: 'Wireless Headphones Pro',
    category: 'Accessories',
    price: 199.99,
    description: 'Premium wireless headphones with noise cancellation',
    sku: 'WHP-003'
  },
  {
    name: 'Tablet Air 12"',
    category: 'Electronics',
    price: 599.99,
    description: 'Lightweight tablet for productivity and entertainment',
    sku: 'TA12-004'
  },
  {
    name: 'Smart Watch Series 7',
    category: 'Wearables',
    price: 399.99,
    description: 'Advanced fitness and health tracking smartwatch',
    sku: 'SWS7-005'
  },
  {
    name: 'Digital Camera 4K',
    category: 'Electronics',
    price: 799.99,
    description: 'Professional 4K digital camera',
    sku: 'DC4K-006'
  },
  {
    name: 'Gaming Console Pro',
    category: 'Gaming',
    price: 499.99,
    description: 'Next-generation gaming console',
    sku: 'GCP-007'
  },
  {
    name: '4K Monitor 32"',
    category: 'Electronics',
    price: 449.99,
    description: 'Ultra-wide 4K professional monitor',
    sku: 'MON32-008'
  },
  {
    name: 'Bluetooth Speaker',
    category: 'Accessories',
    price: 89.99,
    description: 'Portable wireless Bluetooth speaker',
    sku: 'BTS-009'
  },
  {
    name: 'Fitness Tracker Band',
    category: 'Wearables',
    price: 149.99,
    description: 'Advanced fitness tracking wristband',
    sku: 'FTB-010'
  },
  {
    name: 'Wireless Mouse Pro',
    category: 'Accessories',
    price: 59.99,
    description: 'Ergonomic wireless mouse for professionals',
    sku: 'WMP-011'
  },
  {
    name: 'Mechanical Keyboard RGB',
    category: 'Accessories',
    price: 129.99,
    description: 'RGB backlit mechanical gaming keyboard',
    sku: 'MKR-012'
  },
  {
    name: 'USB-C Hub 8-in-1',
    category: 'Accessories',
    price: 79.99,
    description: '8-port USB-C hub with multiple connections',
    sku: 'UCH8-013'
  },
  {
    name: 'Portable SSD 1TB',
    category: 'Electronics',
    price: 159.99,
    description: 'High-speed portable SSD storage',
    sku: 'PSSD1-014'
  },
  {
    name: 'Wireless Charger Pad',
    category: 'Accessories',
    price: 39.99,
    description: 'Fast wireless charging pad for smartphones',
    sku: 'WCP-015'
  }
];

const salesReps = [
  'John Smith',
  'Sarah Johnson', 
  'Mike Wilson',
  'Lisa Chen',
  'David Brown',
  'Emma Davis',
  'Alex Rodriguez',
  'Jennifer Taylor',
  'Michael Chang',
  'Rachel Green'
];

// Helper function to generate random date within range
const getRandomDate = (start, end) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

// Helper function to generate realistic sales data
const generateSalesData = (customers, products, count = 1000) => {
  const sales = [];
  const startDate = new Date('2022-01-01');
  const endDate = new Date('2024-12-31');

  for (let i = 0; i < count; i++) {
    const customer = customers[Math.floor(Math.random() * customers.length)];
    const product = products[Math.floor(Math.random() * products.length)];
    const salesRep = salesReps[Math.floor(Math.random() * salesReps.length)];
    
    // Generate realistic quantities based on product category
    let quantity;
    if (product.category === 'Electronics') {
      quantity = Math.floor(Math.random() * 5) + 1; // 1-5 for electronics
    } else if (product.category === 'Accessories') {
      quantity = Math.floor(Math.random() * 10) + 1; // 1-10 for accessories
    } else {
      quantity = Math.floor(Math.random() * 3) + 1; // 1-3 for others
    }

    // Add some price variation (±20%)
    const priceVariation = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
    const unitPrice = Math.round(product.price * priceVariation * 100) / 100;
    const revenue = Math.round(quantity * unitPrice * 100) / 100;

    // Generate seasonal patterns (higher sales in Q4)
    const orderDate = getRandomDate(startDate, endDate);
    const isQ4 = orderDate.getMonth() >= 9; // Oct, Nov, Dec
    
    // Boost Q4 sales probability
    if (!isQ4 && Math.random() < 0.3) {
      continue; // Skip some non-Q4 sales to create seasonality
    }

    sales.push({
      customer: customer._id,
      product: product._id,
      salesRep,
      quantity,
      unitPrice,
      revenue,
      orderDate
    });
  }

  return sales.sort((a, b) => a.orderDate - b.orderDate);
};

// Main seeding function
const seedDatabase = async () => {
  try {
    console.log('Starting database seeding...');

    // Clear existing data
    console.log('Clearing existing data...');
    await Customer.deleteMany({});
    await Product.deleteMany({});
    await Sales.deleteMany({});

    console.log('Existing data cleared.');

    // Insert customers
    console.log('Inserting customers...');
    const insertedCustomers = await Customer.insertMany(sampleCustomers);
    console.log(`${insertedCustomers.length} customers inserted.`);

    // Insert products
    console.log('Inserting products...');
    const insertedProducts = await Product.insertMany(sampleProducts);
    console.log(`${insertedProducts.length} products inserted.`);

    // Generate and insert sales data
    console.log('Generating sales data...');
    const salesData = generateSalesData(insertedCustomers, insertedProducts, 1200);
    
    console.log('Inserting sales data in batches...');
    const batchSize = 100;
    for (let i = 0; i < salesData.length; i += batchSize) {
      const batch = salesData.slice(i, i + batchSize);
      await Sales.insertMany(batch);
      console.log(`Inserted batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(salesData.length/batchSize)}`);
    }

    console.log(`${salesData.length} sales records inserted.`);

    // Create indexes for better performance
    console.log('Creating database indexes...');
    
    await Customer.createIndexes();
    await Product.createIndexes();
    await Sales.createIndexes();

    // Additional composite indexes for common queries
    await Sales.collection.createIndex({ orderDate: 1, customer: 1 });
    await Sales.collection.createIndex({ orderDate: 1, product: 1 });
    await Sales.collection.createIndex({ customer: 1, orderDate: -1 });
    await Sales.collection.createIndex({ product: 1, orderDate: -1 });

    console.log('Database indexes created.');

    // Generate some statistics
    const stats = {
      customers: await Customer.countDocuments(),
      products: await Product.countDocuments(),
      sales: await Sales.countDocuments(),
      totalRevenue: await Sales.aggregate([
        { $group: { _id: null, total: { $sum: '$revenue' } } }
      ]),
      dateRange: await Sales.aggregate([
        {
          $group: {
            _id: null,
            minDate: { $min: '$orderDate' },
            maxDate: { $max: '$orderDate' }
          }
        }
      ])
    };

    console.log('\n=== Database Seeding Complete ===');
    console.log('Statistics:');
    console.log(`- Customers: ${stats.customers}`);
    console.log(`- Products: ${stats.products}`);
    console.log(`- Sales Records: ${stats.sales}`);
    console.log(`- Total Revenue: ${stats.totalRevenue[0]?.total?.toLocaleString() || 0}`);
    console.log(`- Date Range: ${stats.dateRange[0]?.minDate?.toISOString().split('T')[0]} to ${stats.dateRange[0]?.maxDate?.toISOString().split('T')[0]}`);

    // Sample queries to verify data
    console.log('\n=== Sample Data Verification ===');
    
    const sampleSale = await Sales.findOne()
      .populate('customer', 'name region type')
      .populate('product', 'name category price');
    
    if (sampleSale) {
      console.log('Sample Sale Record:');
      console.log(`- Date: ${sampleSale.orderDate.toISOString().split('T')[0]}`);
      console.log(`- Customer: ${sampleSale.customer.name} (${sampleSale.customer.region})`);
      console.log(`- Product: ${sampleSale.product.name} (${sampleSale.product.category})`);
      console.log(`- Sales Rep: ${sampleSale.salesRep}`);
      console.log(`- Quantity: ${sampleSale.quantity}`);
      console.log(`- Revenue: ${sampleSale.revenue}`);
    }

    // Regional distribution
    const regionalStats = await Sales.aggregate([
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
          totalRevenue: { $sum: '$revenue' },
          totalSales: { $sum: 1 }
        }
      },
      { $sort: { totalRevenue: -1 } }
    ]);

    console.log('\nRegional Sales Distribution:');
    regionalStats.forEach(region => {
      console.log(`- ${region._id}: ${region.totalRevenue.toLocaleString()} (${region.totalSales} sales)`);
    });

    console.log('\n=== Seeding Process Complete ===');
    
  } catch (error) {
    console.error('Error during database seeding:', error);
    throw error;
  }
};

// Run the seeding process
const runSeeder = async () => {
  await connectDB();
  await seedDatabase();
  
  console.log('Database seeding completed successfully!');
  console.log('You can now start the server with: npm start');
  
  // Close the database connection
  await mongoose.connection.close();
  process.exit(0);
};

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
  process.exit(1);
});

// Execute if run directly
if (require.main === module) {
  runSeeder().catch(console.error);
}

module.exports = { seedDatabase, connectDB };