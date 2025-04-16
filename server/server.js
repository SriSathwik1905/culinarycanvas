/**
 * Culinary Canvas Backend Server
 * 
 * Express server that provides API endpoints including a health check endpoint
 * for monitoring purposes.
 */

const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const os = require('os');
const path = require('path');
const dotenv = require('dotenv');
const metrics = require('./metrics');

// Load environment variables
dotenv.config();

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../dist')));

// Add Prometheus metrics middleware
app.use(metrics.metricsMiddleware);

// Initialize Supabase client (using environment variables in production)
const supabaseUrl = process.env.SUPABASE_URL || 'https://example.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

// Monitoring middleware to track request metrics
app.use((req, res, next) => {
  req.startTime = Date.now();
  
  // After response is sent, record metrics
  res.on('finish', () => {
    const duration = Date.now() - req.startTime;
    const statusCode = res.statusCode;
    
    console.log(`${req.method} ${req.path} - ${statusCode} - ${duration}ms`);
  });
  
  next();
});

/**
 * Prometheus metrics endpoint
 */
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', metrics.register.contentType);
    res.end(await metrics.register.metrics());
  } catch (error) {
    console.error('Error generating metrics:', error);
    res.status(500).send('Error generating metrics');
  }
});

/**
 * Health Check API Endpoint
 * 
 * This endpoint reports on the health of the application and its dependencies.
 * It's used by monitoring tools to determine if the application is functioning correctly.
 */
app.get('/api/health', async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Check database connection
    const queryStartTime = Date.now();
    const { data, error } = await supabase
      .from('health_checks')
      .select('id')
      .limit(1);
    
    const queryDuration = Date.now() - queryStartTime;
    
    // Record metrics for the database query
    metrics.observeSupabaseQuery('select', 'health_checks', queryDuration, error);
    
    const dbStatus = error ? 'error' : 'healthy';
    const dbResponseTime = Date.now() - startTime;
    
    // Get system metrics
    const systemInfo = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      freeMemory: os.freemem(),
      totalMemory: os.totalmem(),
      loadAverage: os.loadavg(),
    };
    
    // Determine overall health status
    const healthy = dbStatus === 'healthy';
    
    res.status(healthy ? 200 : 503).json({
      status: healthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      database: {
        status: dbStatus,
        responseTime: dbResponseTime,
        message: error ? error.message : 'Connected successfully'
      },
      system: systemInfo
    });
  } catch (error) {
    console.error('Health check error:', error);
    
    // Record the error in metrics
    metrics.recordSupabaseError('health_check', error.code || 'unknown');
    
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message || 'Unknown error occurred',
      environment: process.env.NODE_ENV || 'development'
    });
  }
});

/**
 * Deep Health Check API Endpoint
 * 
 * This endpoint performs a more thorough check of all system components
 * and is used for detailed diagnostics.
 */
app.get('/api/health/deep', async (req, res) => {
  const startTime = Date.now();
  const checks = {};
  
  try {
    // Database connectivity check
    try {
      const queryStartTime = Date.now();
      const { data, error } = await supabase
        .from('health_checks')
        .select('id, created_at')
        .limit(1);
      
      const queryDuration = Date.now() - queryStartTime;
      
      // Record metrics for the database query
      metrics.observeSupabaseQuery('select', 'health_checks', queryDuration, error);
      
      checks.database = {
        status: error ? 'error' : 'healthy',
        responseTime: Date.now() - startTime,
        message: error ? error.message : 'Connected successfully'
      };
    } catch (dbError) {
      metrics.recordSupabaseError('health_check_deep', dbError.code || 'unknown');
      
      checks.database = {
        status: 'error',
        responseTime: Date.now() - startTime,
        message: dbError.message
      };
    }
    
    // File system check
    try {
      const fs = require('fs');
      const testFile = path.join(os.tmpdir(), 'health-check-test.txt');
      fs.writeFileSync(testFile, 'test');
      fs.readFileSync(testFile, 'utf8');
      fs.unlinkSync(testFile);
      
      checks.fileSystem = {
        status: 'healthy',
        message: 'File system read/write successful'
      };
    } catch (fsError) {
      checks.fileSystem = {
        status: 'error',
        message: fsError.message
      };
    }
    
    // Memory check
    const memoryInfo = process.memoryUsage();
    const freeMemoryPercentage = os.freemem() / os.totalmem();
    
    checks.memory = {
      status: freeMemoryPercentage < 0.1 ? 'warning' : 'healthy',
      usage: memoryInfo,
      freePercentage: freeMemoryPercentage,
      message: freeMemoryPercentage < 0.1 
        ? 'Less than 10% free memory available' 
        : 'Memory usage normal'
    };
    
    // Network check (simple external connectivity test)
    try {
      const https = require('https');
      const networkStartTime = Date.now();
      
      await new Promise((resolve, reject) => {
        const req = https.get('https://google.com', (res) => {
          res.on('data', () => {});
          res.on('end', resolve);
        });
        
        req.on('error', reject);
        req.setTimeout(5000, () => reject(new Error('Network check timed out')));
      });
      
      checks.network = {
        status: 'healthy',
        responseTime: Date.now() - networkStartTime,
        message: 'External network connectivity verified'
      };
    } catch (netError) {
      checks.network = {
        status: 'error',
        message: netError.message
      };
    }
    
    // Overall status determination
    const overallStatus = Object.values(checks).some(check => check.status === 'error')
      ? 'unhealthy'
      : Object.values(checks).some(check => check.status === 'warning')
        ? 'degraded'
        : 'healthy';
        
    res.status(overallStatus === 'unhealthy' ? 503 : 200).json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks,
      totalResponseTime: Date.now() - startTime
    });
  } catch (error) {
    console.error('Deep health check error:', error);
    
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message || 'Unknown error occurred'
    });
  }
});

// Add other API routes here...

// Fallback route to serve SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check available at http://localhost:${PORT}/api/health`);
  console.log(`Metrics available at http://localhost:${PORT}/metrics`);
});

module.exports = app; // Export for testing 