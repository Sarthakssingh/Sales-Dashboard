// websocketServer.js - Real-time updates with Socket.IO
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

class WebSocketServer {
  constructor(server) {
    this.io = socketIo(server, {
      cors: {
        origin: process.env.CORS_ORIGIN || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.connectedClients = new Map();
    this.setupEventHandlers();
    this.setupMongoChangeStreams();
  }

  // Authentication middleware for WebSocket connections
  authenticateSocket(socket, next) {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        console.log('WebSocket connection without token - allowing for demo');
        return next(); // Allow unauthenticated for demo purposes
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      socket.userRole = decoded.role;
      
      next();
    } catch (error) {
      console.log('WebSocket authentication error:', error.message);
      next(); // Allow connection anyway for demo
    }
  }

  setupEventHandlers() {
    // Authentication middleware
    this.io.use((socket, next) => this.authenticateSocket(socket, next));

    this.io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);
      
      // Store client connection info
      this.connectedClients.set(socket.id, {
        socket,
        userId: socket.userId,
        connectedAt: new Date(),
        lastActivity: new Date()
      });

      // Join user-specific room if authenticated
      if (socket.userId) {
        socket.join(`user_${socket.userId}`);
      }

      // Join general analytics room
      socket.join('analytics');

      // Handle client events
      this.setupClientEventHandlers(socket);

      // Send initial connection data
      socket.emit('connection_established', {
        clientId: socket.id,
        timestamp: new Date().toISOString(),
        connectedClients: this.connectedClients.size
      });

      // Broadcast new connection to other clients
      socket.broadcast.emit('client_connected', {
        connectedClients: this.connectedClients.size
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        console.log(`Client disconnected: ${socket.id}, Reason: ${reason}`);
        
        this.connectedClients.delete(socket.id);
        
        // Broadcast disconnection to remaining clients
        socket.broadcast.emit('client_disconnected', {
          connectedClients: this.connectedClients.size
        });
      });

      // Handle errors
      socket.on('error', (error) => {
        console.error(`Socket error for client ${socket.id}:`, error);
      });
    });
  }

  setupClientEventHandlers(socket) {
    // Handle analytics requests
    socket.on('request_analytics_update', async (data) => {
      try {
        console.log(`Analytics update requested by ${socket.id}`);
        
        // Update last activity
        const client = this.connectedClients.get(socket.id);
        if (client) {
          client.lastActivity = new Date();
        }

        // Emit acknowledgment
        socket.emit('analytics_update_requested', {
          requestId: data.requestId,
          timestamp: new Date().toISOString()
        });

        // You could trigger a fresh analytics calculation here
        // and emit the results back to the client
        
      } catch (error) {
        console.error('Error handling analytics update request:', error);
        socket.emit('error', {
          message: 'Failed to process analytics update request',
          error: error.message
        });
      }
    });

    // Handle subscription to specific data updates
    socket.on('subscribe_to_updates', (data) => {
      const { types = [] } = data;
      
      types.forEach(type => {
        switch (type) {
          case 'sales':
            socket.join('sales_updates');
            break;
          case 'customers':
            socket.join('customer_updates');
            break;
          case 'products':
            socket.join('product_updates');
            break;
          case 'analytics':
            socket.join('analytics_updates');
            break;
          default:
            console.log(`Unknown subscription type: ${type}`);
        }
      });

      socket.emit('subscriptions_updated', {
        subscribed: types,
        timestamp: new Date().toISOString()
      });
    });

    // Handle heartbeat/ping
    socket.on('ping', (data) => {
      socket.emit('pong', {
        ...data,
        serverTime: new Date().toISOString()
      });
    });
  }

  // MongoDB Change Streams for real-time database updates
  setupMongoChangeStreams() {
    try {
      // Watch Sales collection for changes
      const salesChangeStream = mongoose.connection.db.collection('sales').watch(
        [{ $match: { operationType: { $in: ['insert', 'update', 'delete'] } } }],
        { fullDocument: 'updateLookup' }
      );

      salesChangeStream.on('change', (change) => {
        console.log('Sales data changed:', change.operationType);
        
        // Emit to all clients subscribed to sales updates
        this.io.to('sales_updates').emit('sales_data_changed', {
          operationType: change.operationType,
          documentId: change.documentKey?._id,
          timestamp: new Date().toISOString(),
          data: change.fullDocument
        });

        // Emit general analytics update notification
        this.io.to('analytics').emit('data_update_notification', {
          source: 'sales',
          type: change.operationType,
          timestamp: new Date().toISOString()
        });
      });

      // Watch Customers collection
      const customersChangeStream = mongoose.connection.db.collection('customers').watch(
        [{ $match: { operationType: { $in: ['insert', 'update', 'delete'] } } }],
        { fullDocument: 'updateLookup' }
      );

      customersChangeStream.on('change', (change) => {
        console.log('Customer data changed:', change.operationType);
        
        this.io.to('customer_updates').emit('customer_data_changed', {
          operationType: change.operationType,
          documentId: change.documentKey?._id,
          timestamp: new Date().toISOString(),
          data: change.fullDocument
        });
      });

      // Watch Products collection
      const productsChangeStream = mongoose.connection.db.collection('products').watch(
        [{ $match: { operationType: { $in: ['insert', 'update', 'delete'] } } }],
        { fullDocument: 'updateLookup' }
      );

      productsChangeStream.on('change', (change) => {
        console.log('Product data changed:', change.operationType);
        
        this.io.to('product_updates').emit('product_data_changed', {
          operationType: change.operationType,
          documentId: change.documentKey?._id,
          timestamp: new Date().toISOString(),
          data: change.fullDocument
        });
      });

      console.log('MongoDB Change Streams initialized successfully');

    } catch (error) {
      console.error('Error setting up MongoDB Change Streams:', error);
      console.log('Change streams require MongoDB replica set or sharded cluster');
    }
  }

  // Broadcast new sales data to all connected clients
  broadcastSalesUpdate(salesData) {
    this.io.to('analytics').emit('new_sales_data', {
      data: salesData,
      timestamp: new Date().toISOString(),
      connectedClients: this.connectedClients.size
    });
  }

  // Broadcast analytics updates
  broadcastAnalyticsUpdate(analyticsData) {
    this.io.to('analytics_updates').emit('analytics_updated', {
      data: analyticsData,
      timestamp: new Date().toISOString()
    });
  }

  // Send targeted notifications to specific users
  sendUserNotification(userId, notification) {
    this.io.to(`user_${userId}`).emit('notification', {
      ...notification,
      timestamp: new Date().toISOString()
    });
  }

  // Broadcast system-wide announcements
  broadcastSystemMessage(message) {
    this.io.emit('system_message', {
      message,
      timestamp: new Date().toISOString(),
      type: 'announcement'
    });
  }

  // Get connected clients statistics
  getConnectionStats() {
    const stats = {
      totalConnections: this.connectedClients.size,
      rooms: Object.keys(this.io.sockets.adapter.rooms),
      clients: Array.from(this.connectedClients.values()).map(client => ({
        id: client.socket.id,
        userId: client.userId,
        connectedAt: client.connectedAt,
        lastActivity: client.lastActivity
      }))
    };

    return stats;
  }

  // Graceful shutdown
  shutdown() {
    console.log('Shutting down WebSocket server...');
    
    // Notify all clients about shutdown
    this.broadcastSystemMessage('Server is shutting down for maintenance');
    
    // Close all connections
    this.io.close(() => {
      console.log('WebSocket server closed');
    });
  }
}

module.exports = WebSocketServer;