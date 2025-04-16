/**
 * Prometheus Metrics Configuration
 * 
 * This file sets up Prometheus metrics for the Culinary Canvas application.
 * It provides metrics for HTTP requests, database queries, and application health.
 */

const promClient = require('prom-client');

// Create a Registry to register the metrics
const register = new promClient.Registry();

// Add default metrics (Node.js and process metrics)
promClient.collectDefaultMetrics({ register });

// Define custom metrics

// HTTP request duration metric
const httpRequestDurationMicroseconds = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10] // in seconds
});

// HTTP request counter
const httpRequestCounter = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status']
});

// Database query duration metric
const dbQueryDurationMicroseconds = new promClient.Histogram({
  name: 'database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['query_type', 'table'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10] // in seconds
});

// Database query counter
const dbQueryCounter = new promClient.Counter({
  name: 'database_queries_total',
  help: 'Total number of database queries',
  labelNames: ['query_type', 'table', 'status']
});

// Supabase API request metrics
const supabaseRequestCounter = new promClient.Counter({
  name: 'supabase_requests_total',
  help: 'Total number of Supabase API requests',
  labelNames: ['endpoint', 'status']
});

// Supabase error counter
const supabaseErrorCounter = new promClient.Counter({
  name: 'supabase_error_total',
  help: 'Total number of Supabase API errors',
  labelNames: ['endpoint', 'error_code']
});

// Authentication metrics
const authCounter = new promClient.Counter({
  name: 'auth_attempts_total',
  help: 'Total number of authentication attempts',
  labelNames: ['method', 'success']
});

// JWT validation error counter
const jwtValidationErrorCounter = new promClient.Counter({
  name: 'auth_jwt_validation_errors_total',
  help: 'Total number of JWT validation errors',
  labelNames: ['error_type']
});

// User session counter
const userSessionGauge = new promClient.Gauge({
  name: 'user_sessions_total',
  help: 'Current number of active user sessions'
});

// Register all metrics
register.registerMetric(httpRequestDurationMicroseconds);
register.registerMetric(httpRequestCounter);
register.registerMetric(dbQueryDurationMicroseconds);
register.registerMetric(dbQueryCounter);
register.registerMetric(supabaseRequestCounter);
register.registerMetric(supabaseErrorCounter);
register.registerMetric(authCounter);
register.registerMetric(jwtValidationErrorCounter);
register.registerMetric(userSessionGauge);

// Middleware to measure HTTP request duration
const metricsMiddleware = (req, res, next) => {
  // Skip metrics route to avoid creating a loop
  if (req.path === '/metrics') {
    return next();
  }

  const start = Date.now();
  
  // Record end time and update metrics when the response is sent
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000; // Convert to seconds
    
    // Use a normalized route path to avoid high cardinality
    const route = req.route ? req.route.path : req.path;
    
    // Update HTTP request metrics
    httpRequestDurationMicroseconds
      .labels(req.method, route, res.statusCode)
      .observe(duration);
    
    httpRequestCounter
      .labels(req.method, route, res.statusCode.toString())
      .inc();
  });
  
  next();
};

/**
 * Middleware for instrumenting Supabase requests
 * 
 * Usage example:
 * try {
 *   const start = Date.now();
 *   const { data, error } = await supabase.from('recipes').select('*');
 *   metrics.observeSupabaseQuery('select', 'recipes', Date.now() - start, error);
 * } catch (error) {
 *   metrics.recordSupabaseError('recipes', error.code || 'unknown');
 * }
 */
const observeSupabaseQuery = (queryType, table, durationMs, error) => {
  const duration = durationMs / 1000; // Convert to seconds
  
  dbQueryDurationMicroseconds
    .labels(queryType, table)
    .observe(duration);
  
  dbQueryCounter
    .labels(queryType, table, error ? 'error' : 'success')
    .inc();
  
  supabaseRequestCounter
    .labels(table, error ? 'error' : 'success')
    .inc();
  
  if (error) {
    supabaseErrorCounter
      .labels(table, error.code || 'unknown')
      .inc();
  }
};

/**
 * Record a Supabase error
 */
const recordSupabaseError = (endpoint, errorCode) => {
  supabaseErrorCounter
    .labels(endpoint, errorCode || 'unknown')
    .inc();
};

/**
 * Record an authentication attempt
 */
const recordAuthAttempt = (method, success) => {
  authCounter
    .labels(method, success ? 'success' : 'failure')
    .inc();
};

/**
 * Record a JWT validation error
 */
const recordJwtValidationError = (errorType) => {
  jwtValidationErrorCounter
    .labels(errorType || 'unknown')
    .inc();
};

/**
 * Update the number of active user sessions
 */
const setActiveUserSessions = (count) => {
  userSessionGauge.set(count);
};

/**
 * Increment the number of active user sessions
 */
const incrementUserSessions = () => {
  userSessionGauge.inc();
};

/**
 * Decrement the number of active user sessions
 */
const decrementUserSessions = () => {
  userSessionGauge.dec();
};

module.exports = {
  register,
  metricsMiddleware,
  observeSupabaseQuery,
  recordSupabaseError,
  recordAuthAttempt,
  recordJwtValidationError,
  setActiveUserSessions,
  incrementUserSessions,
  decrementUserSessions
}; 