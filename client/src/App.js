import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Calendar, DollarSign, Users, Package, TrendingUp, Filter, Download, RefreshCw, MapPin, Target, Clock, Wifi, WifiOff } from 'lucide-react';

// API service class
class APIService {
  constructor(baseURL = 'http://localhost:5000/api') {
    this.baseURL = baseURL;
  }

  async fetch(endpoint, options = {}) {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API call failed for ${endpoint}:`, error);
      throw error;
    }
  }

  async getAnalytics(startDate, endDate) {
    return this.fetch(`/analytics?startDate=${startDate}&endDate=${endDate}`);
  }

  async getSales(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.fetch(`/sales?${queryString}`);
  }

  async getCustomers(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.fetch(`/customers?${queryString}`);
  }

  async getProducts(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.fetch(`/products?${queryString}`);
  }

  async createSale(saleData) {
    return this.fetch('/sales', {
      method: 'POST',
      body: JSON.stringify(saleData),
    });
  }

  async healthCheck() {
    return this.fetch('/health');
  }
}

// WebSocket service
class WebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = new Map();
  }

  connect(url = 'ws://localhost:5000') {
    // Simple WebSocket connection simulation for demo
    // In production, use Socket.IO client library
    try {
      this.isConnected = true;
      console.log('WebSocket connected (simulated)');
      
      // Simulate periodic updates
      setInterval(() => {
        if (this.isConnected) {
          this.emit('data_update', { timestamp: new Date() });
        }
      }, 30000);
      
    } catch (error) {
      console.error('WebSocket connection failed:', error);
      this.isConnected = false;
    }
  }

  emit(event, data) {
    this.listeners.forEach((callbacks, eventName) => {
      if (eventName === event) {
        callbacks.forEach(callback => callback(data));
      }
    });
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  disconnect() {
    this.isConnected = false;
    console.log('WebSocket disconnected');
  }
}

// Main Dashboard Component
const App = () => {
  // Services
  const [apiService] = useState(() => new APIService());
  const [wsService] = useState(() => new WebSocketService());

  // State management
  const [startDate, setStartDate] = useState('2024-01-01');
  const [endDate, setEndDate] = useState('2024-12-31');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [activeTab, setActiveTab] = useState('overview');
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  // Data state
  const [analyticsData, setAnalyticsData] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    topProducts: [],
    topCustomers: [],
    regionStats: [],
    categoryStats: [],
    monthlyTrend: [],
    salesRepStats: []
  });

  const [realtimeData, setRealtimeData] = useState({
    connectedClients: 0,
    lastUpdate: null
  });

  // Initialize connections
  useEffect(() => {
    const initializeServices = async () => {
      try {
        // Test backend connection
        await apiService.healthCheck();
        setConnectionStatus('connected');
        console.log('Backend connection established');

        // Initialize WebSocket
        wsService.connect();
        
        // Setup WebSocket listeners
        wsService.on('data_update', (data) => {
          setRealtimeData(prev => ({
            ...prev,
            lastUpdate: new Date(),
            connectedClients: Math.floor(Math.random() * 10) + 1 // Simulate
          }));
        });

      } catch (error) {
        console.error('Failed to connect to backend:', error);
        setConnectionStatus('error');
        setError('Backend connection failed. Using demo data.');
        
        // Load demo data if backend is unavailable
        loadDemoData();
      }
    };

    initializeServices();

    return () => {
      wsService.disconnect();
    };
  }, []);

  // Load demo data fallback
  const loadDemoData = () => {
    setAnalyticsData({
      totalRevenue: 2847635,
      totalOrders: 1247,
      avgOrderValue: 2284.50,
      topProducts: [
        { product: 'Laptop Pro X1', revenue: 425000, orders: 127, quantity: 189 },
        { product: 'Smartphone Ultra', revenue: 387000, orders: 245, quantity: 298 },
        { product: 'Digital Camera 4K', revenue: 298000, orders: 89, quantity: 134 },
        { product: 'Gaming Console Pro', revenue: 267000, orders: 156, quantity: 203 },
        { product: '4K Monitor 32"', revenue: 234000, orders: 98, quantity: 147 }
      ],
      topCustomers: [
        { customer: 'Acme Corporation', revenue: 156000, orders: 23, region: 'North America' },
        { customer: 'Global Solutions Ltd', revenue: 134000, orders: 19, region: 'Europe' },
        { customer: 'Smart Enterprises LLC', revenue: 128000, orders: 17, region: 'North America' },
        { customer: 'Future Systems GmbH', revenue: 119000, orders: 21, region: 'Europe' },
        { customer: 'Digital Dynamics', revenue: 98000, orders: 14, region: 'Asia' }
      ],
      regionStats: [
        { region: 'North America', revenue: 1234567, orders: 456 },
        { region: 'Europe', revenue: 987654, orders: 389 },
        { region: 'Asia', revenue: 625414, orders: 402 }
      ],
      categoryStats: [
        { category: 'Electronics', revenue: 1456789, quantity: 523 },
        { category: 'Accessories', revenue: 789456, quantity: 892 },
        { category: 'Gaming', revenue: 345678, quantity: 234 },
        { category: 'Wearables', revenue: 255712, quantity: 445 }
      ],
      monthlyTrend: [
        { month: '2024-01', revenue: 245000, orders: 98 },
        { month: '2024-02', revenue: 267000, orders: 112 },
        { month: '2024-03', revenue: 289000, orders: 125 },
        { month: '2024-04', revenue: 234000, orders: 94 },
        { month: '2024-05', revenue: 298000, orders: 134 },
        { month: '2024-06', revenue: 325000, orders: 145 },
        { month: '2024-07', revenue: 342000, orders: 156 },
        { month: '2024-08', revenue: 298000, orders: 134 },
        { month: '2024-09', revenue: 267000, orders: 119 },
        { month: '2024-10', revenue: 389000, orders: 167 },
        { month: '2024-11', revenue: 421000, orders: 189 },
        { month: '2024-12', revenue: 372000, orders: 174 }
      ],
      salesRepStats: [
        { salesRep: 'John Smith', revenue: 345000, orders: 87, avgOrderValue: 3966 },
        { salesRep: 'Sarah Johnson', revenue: 298000, orders: 76, avgOrderValue: 3921 },
        { salesRep: 'Mike Wilson', revenue: 267000, orders: 69, avgOrderValue: 3870 },
        { salesRep: 'Lisa Chen', revenue: 234000, orders: 62, avgOrderValue: 3774 },
        { salesRep: 'David Brown', revenue: 189000, orders: 54, avgOrderValue: 3500 }
      ]
    });
  };

  // Fetch analytics data
  const fetchAnalyticsData = async () => {
    if (connectionStatus !== 'connected') {
      return; // Use demo data if not connected
    }

    setLoading(true);
    setError(null);

    try {
      const data = await apiService.getAnalytics(startDate, endDate);
      setAnalyticsData({
        totalRevenue: data.totalRevenue || 0,
        totalOrders: data.totalOrders || 0,
        avgOrderValue: data.avgOrderValue || 0,
        topProducts: data.topProducts || [],
        topCustomers: data.topCustomers || [],
        regionStats: data.regionStats || [],
        categoryStats: data.categoryStats || [],
        monthlyTrend: data.monthlyTrend || [],
        salesRepStats: data.salesRepStats || []
      });
      setLastUpdated(new Date());
    } catch (err) {
      setError('Failed to fetch analytics data');
      console.error('Analytics fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data when date range changes
  useEffect(() => {
    fetchAnalyticsData();
  }, [startDate, endDate, connectionStatus]);

  // Manual refresh
  const handleRefresh = async () => {
    await fetchAnalyticsData();
  };

  // Utility functions
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value || 0);
  };

  const formatNumber = (value) => {
    return new Intl.NumberFormat('en-US').format(value || 0);
  };

  // Chart colors
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Sales Analytics Dashboard</h1>
              <div className="flex items-center mt-1 space-x-4">
                <p className="text-sm text-gray-500">
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </p>
                <div className="flex items-center space-x-1">
                  {connectionStatus === 'connected' ? (
                    <Wifi className="w-4 h-4 text-green-500" />
                  ) : (
                    <WifiOff className="w-4 h-4 text-red-500" />
                  )}
                  <span className={`text-xs ${connectionStatus === 'connected' ? 'text-green-500' : 'text-red-500'}`}>
                    {connectionStatus === 'connected' ? 'Connected' : 'Offline Mode'}
                  </span>
                </div>
                {realtimeData.connectedClients > 0 && (
                  <span className="text-xs text-blue-500">
                    {realtimeData.connectedClients} users online
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <Download className="w-4 h-4 mr-2" />
                Export
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-yellow-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Date Range Filter */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Date Range:</span>
          </div>
          <div className="flex items-center space-x-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="text-sm text-gray-500">
            {connectionStatus === 'connected' ? 'Live Data' : 'Demo Data'}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b px-6">
        <nav className="flex space-x-8">
          {['overview', 'products', 'customers', 'regions'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      <div className="p-6">
        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(analyticsData.totalRevenue)}
                </p>
                {connectionStatus === 'connected' && (
                  <p className="text-xs text-green-600 mt-1">● Live Data</p>
                )}
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(analyticsData.totalOrders)}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Package className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Order Value</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(analyticsData.avgOrderValue)}
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <TrendingUp className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Customers</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analyticsData.topCustomers.length}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Trend */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analyticsData.monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={formatCurrency} />
                  <Tooltip formatter={(value) => [formatCurrency(value), 'Revenue']} />
                  <Line type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Category Performance */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Performance</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analyticsData.categoryStats}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="revenue"
                  >
                    {analyticsData.categoryStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [formatCurrency(value), 'Revenue']} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Sales Rep Performance */}
            <div className="bg-white p-6 rounded-lg shadow-sm border lg:col-span-2">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Representative Performance</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analyticsData.salesRepStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="salesRep" />
                  <YAxis tickFormatter={formatCurrency} />
                  <Tooltip formatter={(value) => [formatCurrency(value), 'Revenue']} />
                  <Bar dataKey="revenue" fill="#8B5CF6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Products Chart */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Products by Revenue</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analyticsData.topProducts} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={formatCurrency} />
                  <YAxis dataKey="product" type="category" width={120} />
                  <Tooltip formatter={(value) => [formatCurrency(value), 'Revenue']} />
                  <Bar dataKey="revenue" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Top Products Table */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Product Performance Details</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 text-sm font-medium text-gray-600">Product</th>
                      <th className="text-right py-2 text-sm font-medium text-gray-600">Revenue</th>
                      <th className="text-right py-2 text-sm font-medium text-gray-600">Orders</th>
                      <th className="text-right py-2 text-sm font-medium text-gray-600">Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyticsData.topProducts.map((product, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="py-3 text-sm text-gray-900">{product.product || product.productName}</td>
                        <td className="py-3 text-sm text-right text-gray-900">
                          {formatCurrency(product.revenue)}
                        </td>
                        <td className="py-3 text-sm text-right text-gray-900">
                          {product.orders}
                        </td>
                        <td className="py-3 text-sm text-right text-gray-900">
                          {product.quantity}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'customers' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Customers Chart */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Customers by Revenue</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analyticsData.topCustomers}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="customer" 
                    angle={-45} 
                    textAnchor="end" 
                    height={100}
                    interval={0}
                  />
                  <YAxis tickFormatter={formatCurrency} />
                  <Tooltip formatter={(value) => [formatCurrency(value), 'Revenue']} />
                  <Bar dataKey="revenue" fill="#10B981" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Customer Details Table */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Performance Details</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 text-sm font-medium text-gray-600">Customer</th>
                      <th className="text-left py-2 text-sm font-medium text-gray-600">Region</th>
                      <th className="text-right py-2 text-sm font-medium text-gray-600">Revenue</th>
                      <th className="text-right py-2 text-sm font-medium text-gray-600">Orders</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyticsData.topCustomers.map((customer, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="py-3 text-sm text-gray-900">{customer.customer || customer.customerName}</td>
                        <td className="py-3 text-sm text-gray-600">
                          <span className="flex items-center">
                            <MapPin className="w-3 h-3 mr-1" />
                            {customer.region}
                          </span>
                        </td>
                        <td className="py-3 text-sm text-right text-gray-900">
                          {formatCurrency(customer.revenue)}
                        </td>
                        <td className="py-3 text-sm text-right text-gray-900">
                          {customer.orders}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'regions' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Regional Performance Chart */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Regional Performance</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analyticsData.regionStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="region" />
                  <YAxis tickFormatter={formatCurrency} />
                  <Tooltip formatter={(value) => [formatCurrency(value), 'Revenue']} />
                  <Bar dataKey="revenue" fill="#F59E0B" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Regional Stats Table */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Regional Statistics</h3>
              <div className="space-y-4">
                {analyticsData.regionStats.map((region, index) => (
                  <div key={index} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900 flex items-center">
                        <MapPin className="w-4 h-4 mr-2" />
                        {region.region}
                      </h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Revenue:</span>
                        <span className="ml-2 font-medium">{formatCurrency(region.revenue)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Orders:</span>
                        <span className="ml-2 font-medium">{formatNumber(region.orders)}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-600">Avg Order Value:</span>
                        <span className="ml-2 font-medium">
                          {formatCurrency(region.avgOrderValue || (region.revenue / region.orders))}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Connection Status Footer */}
      <footer className="bg-white border-t px-6 py-4 mt-8">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center space-x-4">
            <span>Backend Status: </span>
            <div className="flex items-center space-x-1">
              {connectionStatus === 'connected' ? (
                <div className="flex items-center text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                  Connected to http://localhost:5000
                </div>
              ) : connectionStatus === 'error' ? (
                <div className="flex items-center text-red-600">
                  <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                  Backend Unavailable - Using Demo Data
                </div>
              ) : (
                <div className="flex items-center text-yellow-600">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                  Connecting...
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span>Data Mode: {connectionStatus === 'connected' ? 'Live' : 'Demo'}</span>
            {realtimeData.lastUpdate && (
              <span>Last Real-time Update: {realtimeData.lastUpdate.toLocaleTimeString()}</span>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;