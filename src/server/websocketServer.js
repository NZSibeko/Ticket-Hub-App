// src/server/websocketServer.js
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

class DashboardWebSocketServer {
  constructor(server) {
    this.wss = new WebSocket.Server({ 
      server,
      path: '/ws/dashboard',
      clientTracking: true
    });
    
    this.clients = new Map();
    this.dashboardData = {
      realTimeMetrics: {
        revenue: { current: 18420, change: 25, trend: [12000, 14500, 16800, 18420] },
        attendees: { current: 589, change: 15, trend: [300, 420, 510, 589] },
        conversion: { current: 4.2, change: 8, trend: [3.2, 3.5, 3.8, 4.2] },
        satisfaction: { current: 92, change: 3, trend: [85, 88, 90, 92] },
        activeEvents: { current: 8, change: 14, trend: [4, 6, 7, 8] },
        avgTicket: { current: 850, change: 5, trend: [800, 820, 840, 850] },
        scanRate: { current: 87, change: 6, trend: [78, 82, 85, 87] },
        refundRate: { current: 2.3, change: -10, trend: [3.5, 3.0, 2.7, 2.3] }
      },
      historicalData: {
        hourly: {
          revenue: [45000, 52000, 48000, 61000, 72000, 89000, 92000, 95000],
          attendees: [450, 520, 480, 610, 720, 890, 920, 950],
          labels: ['10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00', 'Now']
        }
      },
      eventPerformance: [
        { id: 1, name: 'Summer Music Festival', revenue: 85000, attendanceRate: 95, utilization: 98, category: 'Music' },
        { id: 2, name: 'Tech Conference 2024', revenue: 65000, attendanceRate: 88, utilization: 92, category: 'Corporate' },
        { id: 3, name: 'Food & Wine Expo', revenue: 45000, attendanceRate: 92, utilization: 95, category: 'Cultural' },
        { id: 4, name: 'Sports Championship', revenue: 95000, attendanceRate: 98, utilization: 99, category: 'Sports' },
      ],
      channels: [
        { name: 'Website', revenue: 125000, growth: 15, color: '#6366f1' },
        { name: 'Mobile App', revenue: 85000, growth: 28, color: '#8b5cf6' },
        { name: 'Partners', revenue: 45000, growth: 12, color: '#10b981' },
        { name: 'Box Office', revenue: 25000, growth: 5, color: '#f59e0b' },
      ]
    };

    this.startSimulation();
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.wss.on('connection', (ws, req) => {
      const clientId = uuidv4();
      this.clients.set(clientId, ws);
      
      console.log(`New WebSocket connection: ${clientId}`);
      
      // Send initial data
      this.sendToClient(ws, {
        type: 'init',
        data: this.dashboardData
      });

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          this.handleClientMessage(clientId, data, ws);
        } catch (error) {
          console.error('Error parsing client message:', error);
        }
      });

      ws.on('close', () => {
        console.log(`Client disconnected: ${clientId}`);
        this.clients.delete(clientId);
      });

      ws.on('error', (error) => {
        console.error(`WebSocket error for client ${clientId}:`, error);
      });
    });

    this.wss.on('error', (error) => {
      console.error('WebSocket server error:', error);
    });
  }

  handleClientMessage(clientId, data, ws) {
    console.log(`Message from ${clientId}:`, data);
    
    switch (data.type) {
      case 'subscribe':
        this.sendToClient(ws, {
          type: 'subscription_confirmed',
          channel: data.channel
        });
        break;
        
      case 'change_period':
        this.handlePeriodChange(data.period, ws);
        break;
        
      case 'request_update':
        this.sendDashboardUpdate(ws);
        break;
        
      default:
        console.log('Unknown message type:', data.type);
    }
  }

  handlePeriodChange(period, ws) {
    const projections = this.calculateProjections(period);
    
    this.sendToClient(ws, {
      type: 'period_update',
      period: period,
      projections: projections
    });
  }

  calculateProjections(period) {
    const multipliers = {
      '1h': { revenue: 1.15, attendees: 1.1, events: 1.05 },
      '3h': { revenue: 1.35, attendees: 1.25, events: 1.15 },
      '6h': { revenue: 1.6, attendees: 1.45, events: 1.3 },
      '24h': { revenue: 2.2, attendees: 1.9, events: 1.7 },
      '7d': { revenue: 5.8, attendees: 4.5, events: 3.2 }
    };

    const multiplier = multipliers[period] || multipliers['24h'];
    
    return {
      revenue: Math.round(this.dashboardData.realTimeMetrics.revenue.current * multiplier.revenue),
      attendees: Math.round(this.dashboardData.realTimeMetrics.attendees.current * multiplier.attendees),
      newEvents: Math.round(this.dashboardData.realTimeMetrics.activeEvents.current * multiplier.events),
      peakTime: this.getPeakTime(period)
    };
  }

  getPeakTime(period) {
    const peakTimes = {
      '1h': 'Next 60 mins',
      '3h': '19:00-22:00',
      '6h': '18:00-24:00',
      '24h': 'Evening (18:00-23:00)',
      '7d': 'Weekend peak'
    };
    return peakTimes[period] || peakTimes['24h'];
  }

  sendToClient(ws, data) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  broadcast(data) {
    this.clients.forEach((ws, clientId) => {
      this.sendToClient(ws, data);
    });
  }

  sendDashboardUpdate(ws = null) {
    const updateData = {
      type: 'dashboard_update',
      timestamp: new Date().toISOString(),
      data: this.dashboardData
    };

    if (ws) {
      this.sendToClient(ws, updateData);
    } else {
      this.broadcast(updateData);
    }
  }

  startSimulation() {
    // Simulate real-time updates
    setInterval(() => {
      this.updateMetrics();
      this.broadcast({
        type: 'metrics_update',
        timestamp: new Date().toISOString(),
        metrics: this.dashboardData.realTimeMetrics
      });
    }, 3000); // Update every 3 seconds

    // Simulate ticket scans
    setInterval(() => {
      this.simulateTicketScan();
    }, 5000); // Every 5 seconds

    // Simulate revenue updates
    setInterval(() => {
      this.simulateRevenueUpdate();
    }, 8000); // Every 8 seconds
  }

  updateMetrics() {
    const randomChange = (min, max) => Math.random() * (max - min) + min;
    
    Object.keys(this.dashboardData.realTimeMetrics).forEach(key => {
      const metric = this.dashboardData.realTimeMetrics[key];
      
      // Update current value
      const change = randomChange(-metric.current * 0.05, metric.current * 0.05);
      metric.current = Math.max(0, metric.current + change);
      
      // Update trend
      metric.trend = [...metric.trend.slice(1), metric.current];
      
      // Update change percentage
      const oldChange = metric.change;
      metric.change = oldChange + randomChange(-0.5, 0.5);
    });
  }

  simulateTicketScan() {
    const attendees = this.dashboardData.realTimeMetrics.attendees;
    const newAttendees = attendees.current + Math.floor(Math.random() * 10) + 1;
    
    attendees.current = newAttendees;
    attendees.trend = [...attendees.trend.slice(1), newAttendees];
    
    this.broadcast({
      type: 'ticket_scanned',
      timestamp: new Date().toISOString(),
      count: newAttendees
    });
  }

  simulateRevenueUpdate() {
    const revenue = this.dashboardData.realTimeMetrics.revenue;
    const amount = Math.floor(Math.random() * 500) + 100;
    
    revenue.current += amount;
    revenue.trend = [...revenue.trend.slice(1), revenue.current];
    
    this.broadcast({
      type: 'revenue_update',
      timestamp: new Date().toISOString(),
      amount: amount
    });
  }

  getStats() {
    return {
      connectedClients: this.clients.size,
      serverStatus: 'running'
    };
  }
}

module.exports = DashboardWebSocketServer;