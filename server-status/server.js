/**
 * IoT Systems Labs Mock Server
 *
 * This Express server simulates an IoT device system that responds to requests
 * from the iotDomainConfig.ts client. It acts as if it's running at http://iotsystemslabs.local
 */

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const morgan = require("morgan");

// Import routes
const deviceRoutes = require("./routes/devices");
const authRoutes = require("./routes/auth");

// Import device state
const { deviceState } = require("./data/deviceState");

// Create Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'capacitor://localhost'],
  credentials: true
}));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(morgan('dev')); // Add request logging

// Add direct route for devices status before other routes
app.get('/api/devices/status', (req, res) => {
  console.log('Status endpoint called directly');
  res.json({
    status: 'online',
    online: true,
    timestamp: new Date().toISOString(),
    devices: deviceState
  });
});

// Use routes
app.use('/api/devices', deviceRoutes);
app.use('/api/auth', authRoutes);

// Add a root status endpoint for easier access
app.get('/status', (req, res) => {
  res.json({
    status: 'online',
    online: true,
    timestamp: new Date().toISOString(),
    message: 'IoT Systems Labs server is running'
  });
});

// Catch-all route for any other API endpoints
app.use("/api/*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint not found: ${req.method} ${req.originalUrl}`,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   IoT Systems Labs Mock Server                             ║
║   Running on http://localhost:${PORT}                         ║
║                                                            ║
║   This server simulates the IoT device system that would   ║
║   normally run at http://iotsystemslabs.local              ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);

  console.log("Available endpoints:");
  console.log("- GET  /api/devices/status");
  console.log("- GET  /api/devices");
  console.log("- POST /api/devices/control");
  console.log("- GET  /:room/:device/:action/:value?");
  console.log("- POST /api/devices/register");
  console.log("- POST /api/auth/login");

  // Log server status
  console.log("\nServer status:");
  console.log("- Time started:", new Date().toLocaleString());
  console.log("- Environment:", process.env.NODE_ENV || "development");
  console.log(
    "- CORS enabled for:",
    [
      "http://localhost:5173",
      "http://localhost:3000",
      "capacitor://localhost",
    ].join(", ")
  );

  // Log available rooms and devices
  console.log("\nAvailable rooms and devices:");
  Object.keys(deviceState).forEach((room) => {
    console.log(`- ${room}:`);
    Object.keys(deviceState[room]).forEach((device) => {
      console.log(`  - ${device}`);
    });
  });

  console.log("\nPress Ctrl+C to stop the server");
});

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\nShutting down server...");
  process.exit(0);
});

module.exports = app; // Export for testing

// Add after your middleware setup
// Store request history specifically for device control
const deviceControlHistory = [];
const MAX_CONTROL_HISTORY = 100; // Store more control requests

// Add middleware to capture device control requests
app.use((req, res, next) => {
  // Only track device control requests
  if (req.originalUrl.includes('/api/devices/control') || 
      (req.originalUrl.match(/\/[^\/]+\/[^\/]+\/[^\/]+/) && 
       !req.originalUrl.startsWith('/api/'))) {
    
    const timestamp = new Date().toISOString();
    const method = req.method;
    const url = req.originalUrl || req.url;
    
    // Extract control data from request
    let controlData = {};
    if (method === 'POST' || method === 'PUT') {
      controlData = req.body;
    } else if (method === 'GET') {
      // Try to parse REST-style URL pattern (/:room/:device/:action/:value?)
      const parts = url.split('/').filter(p => p);
      if (parts.length >= 3) {
        controlData = {
          room: parts[0],
          device: parts[1],
          action: parts[2],
          value: parts.length > 3 ? parts[3] : undefined
        };
      }
    }
    
    // Store in history
    deviceControlHistory.unshift({
      timestamp,
      method,
      url,
      controlData,
      headers: req.headers,
      body: req.body
    });
    
    // Limit history size
    if (deviceControlHistory.length > MAX_CONTROL_HISTORY) {
      deviceControlHistory.pop();
    }
    
    // Log device control request
    console.log(`
╔═══════════════════════════════════════════════════════════════════════════
║ [${timestamp}] DEVICE CONTROL REQUEST
║ Method: ${method}
║ URL: ${url}
║ Control Data: ${JSON.stringify(controlData)}
╚═══════════════════════════════════════════════════════════════════════════
    `);
  }
  
  next();
});

// Add endpoint to view device control history
app.get('/debug/device-control', (req, res) => {
  res.json({
    count: deviceControlHistory.length,
    requests: deviceControlHistory
  });
});

// Add HTML page to view device control history
app.get('/debug/device-control-ui', (req, res) => {
  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <title>IoT Device Control Debug</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 20px; }
      h1 { color: #333; }
      .request { 
        border: 1px solid #ddd; 
        padding: 10px; 
        margin-bottom: 10px; 
        border-radius: 5px;
      }
      .action-on { background-color: #e7ffe7; border-left: 5px solid #4CAF50; }
      .action-off { background-color: #ffe7e7; border-left: 5px solid #f44336; }
      .action-increase { background-color: #e7f3fe; border-left: 5px solid #2196F3; }
      .action-decrease { background-color: #fff3e7; border-left: 5px solid #FF9800; }
      .action-set { background-color: #f3e7fe; border-left: 5px solid #9C27B0; }
      .header { font-weight: bold; font-size: 1.1em; }
      .timestamp { color: #777; font-size: 0.9em; }
      .control-data { 
        background-color: #f5f5f5; 
        padding: 10px; 
        border-radius: 3px; 
        margin: 10px 0;
        font-family: monospace;
      }
      button { 
        background-color: #4CAF50; 
        color: white; 
        padding: 10px 15px; 
        border: none; 
        border-radius: 4px; 
        cursor: pointer; 
        margin-bottom: 20px;
      }
      button:hover { background-color: #45a049; }
      .filter-buttons {
        margin-bottom: 15px;
      }
      .filter-buttons button {
        margin-right: 10px;
        background-color: #555;
      }
      .filter-buttons button.active {
        background-color: #4CAF50;
      }
      .no-requests {
        padding: 20px;
        background-color: #f5f5f5;
        border-radius: 5px;
        text-align: center;
      }
    </style>
  </head>
  <body>
    <h1>IoT Device Control Debug</h1>
    <p>This page shows all device control requests made to the server.</p>
    
    <div class="filter-buttons">
      <button onclick="filterRequests('all')" class="active" id="filter-all">All Requests</button>
      <button onclick="filterRequests('on')" id="filter-on">ON Commands</button>
      <button onclick="filterRequests('off')" id="filter-off">OFF Commands</button>
      <button onclick="filterRequests('increase')" id="filter-increase">INCREASE Commands</button>
      <button onclick="filterRequests('decrease')" id="filter-decrease">DECREASE Commands</button>
      <button onclick="filterRequests('set')" id="filter-set">SET Commands</button>
    </div>
    
    <button onclick="refreshRequests()">Refresh Requests</button>
    <div id="requests-container"></div>
    
    <script>
      let allRequests = [];
      let currentFilter = 'all';
      
      function setActiveFilter(filter) {
        document.querySelectorAll('.filter-buttons button').forEach(btn => {
          btn.classList.remove('active');
        });
        document.getElementById('filter-' + filter).classList.add('active');
      }
      
      function filterRequests(filter) {
        currentFilter = filter;
        setActiveFilter(filter);
        displayRequests();
      }
      
      function displayRequests() {
        const container = document.getElementById('requests-container');
        container.innerHTML = '';
        
        let filteredRequests = allRequests;
        if (currentFilter !== 'all') {
          filteredRequests = allRequests.filter(req => 
            req.controlData && req.controlData.action && 
            req.controlData.action.toLowerCase() === currentFilter
          );
        }
        
        if (filteredRequests.length === 0) {
          container.innerHTML = '<div class="no-requests">No matching requests found.</div>';
          return;
        }
        
        filteredRequests.forEach(req => {
          const div = document.createElement('div');
          const actionClass = req.controlData && req.controlData.action ? 
                             'action-' + req.controlData.action.toLowerCase() : '';
          div.className = 'request ' + actionClass;
          
          const room = req.controlData?.room || 'unknown';
          const device = req.controlData?.device || 'unknown';
          const action = req.controlData?.action || 'unknown';
          const value = req.controlData?.value !== undefined ? req.controlData.value : '';
          
          div.innerHTML = \`
            <div class="header">\${req.method} \${req.url}</div>
            <div class="timestamp">\${req.timestamp}</div>
            <div class="control-data">
              Room: <strong>\${room}</strong> | 
              Device: <strong>\${device}</strong> | 
              Action: <strong>\${action}</strong>
              \${value ? ' | Value: <strong>' + value + '</strong>' : ''}
            </div>
            <details>
              <summary>Request Details</summary>
              <pre>\${JSON.stringify(req, null, 2)}</pre>
            </details>
          \`;
          
          container.appendChild(div);
        });
      }
      
      function refreshRequests() {
        fetch('/debug/device-control')
          .then(response => response.json())
          .then(data => {
            allRequests = data.requests;
            displayRequests();
          })
          .catch(error => {
            console.error('Error fetching requests:', error);
            document.getElementById('requests-container').innerHTML = 
              '<div class="no-requests">Error loading requests: ' + error.message + '</div>';
          });
      }
      
      // Load requests on page load
      document.addEventListener('DOMContentLoaded', refreshRequests);
      
      // Auto-refresh every 5 seconds
      setInterval(refreshRequests, 5000);
    </script>
  </body>
  </html>
  `;
  
  res.send(html);
});
