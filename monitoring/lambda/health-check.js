/**
 * CulinaryCanvas Health Check Lambda
 * 
 * This Lambda function performs health checks on the Culinary Canvas application
 * by testing various API endpoints and functionalities.
 */

const https = require('https');
const AWS = require('aws-sdk');

// Initialize AWS clients
const cloudwatch = new AWS.CloudWatch();
const sns = new AWS.SNS();

// Configuration
const config = {
  endpoints: [
    { path: '/', name: 'home' },
    { path: '/api/recipes', name: 'recipes-api' },
    { path: '/api/chefs', name: 'chefs-api' },
    { path: '/api/health', name: 'health-api' }
  ],
  // Customize thresholds according to your needs
  thresholds: {
    responseTime: 2000, // 2 seconds
    successRate: 0.95   // 95%
  },
  // This should be set via environment variable
  siteUrl: process.env.SITE_URL || 'https://culinarycanvas.example.com',
  snsTopicArn: process.env.SNS_TOPIC_ARN,
  environment: process.env.ENVIRONMENT || 'staging',
  metricNamespace: 'CulinaryCanvas'
};

/**
 * Sends metrics to CloudWatch
 */
async function sendMetrics(metrics) {
  const params = {
    MetricData: metrics.map(metric => ({
      MetricName: metric.name,
      Dimensions: [
        {
          Name: 'Environment',
          Value: config.environment
        },
        {
          Name: 'Endpoint',
          Value: metric.endpoint
        }
      ],
      Value: metric.value,
      Unit: metric.unit,
      Timestamp: new Date()
    })),
    Namespace: config.metricNamespace
  };

  return cloudwatch.putMetricData(params).promise();
}

/**
 * Sends alert notification via SNS
 */
async function sendAlert(message, subject) {
  if (!config.snsTopicArn) {
    console.log('No SNS topic ARN provided, skipping alert');
    return;
  }

  const params = {
    Message: message,
    Subject: subject,
    TopicArn: config.snsTopicArn
  };

  return sns.publish(params).promise();
}

/**
 * Makes an HTTP request to the specified endpoint
 */
function checkEndpoint(path) {
  const url = new URL(path, config.siteUrl);
  const startTime = Date.now();
  
  return new Promise((resolve) => {
    const req = https.get(url.toString(), (res) => {
      const responseTime = Date.now() - startTime;
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          responseTime,
          success: res.statusCode >= 200 && res.statusCode < 400,
          data
        });
      });
    });
    
    req.on('error', (error) => {
      resolve({
        statusCode: 0,
        responseTime: Date.now() - startTime,
        success: false,
        error: error.message
      });
    });
    
    // Timeout after 10 seconds
    req.setTimeout(10000, () => {
      req.abort();
      resolve({
        statusCode: 0,
        responseTime: 10000,
        success: false,
        error: 'Request timed out'
      });
    });
  });
}

/**
 * Main handler function for the Lambda
 */
exports.handler = async (event) => {
  console.log('Starting health check');
  
  const results = [];
  const metrics = [];
  let allSuccessful = true;
  
  // Check each endpoint
  for (const endpoint of config.endpoints) {
    try {
      console.log(`Checking endpoint: ${endpoint.path}`);
      const result = await checkEndpoint(endpoint.path);
      
      results.push({
        endpoint: endpoint.name,
        path: endpoint.path,
        ...result
      });
      
      // Collect metrics
      metrics.push(
        {
          name: 'ResponseTime',
          endpoint: endpoint.name,
          value: result.responseTime,
          unit: 'Milliseconds'
        },
        {
          name: 'StatusCode',
          endpoint: endpoint.name, 
          value: result.statusCode,
          unit: 'None'
        },
        {
          name: 'Success',
          endpoint: endpoint.name,
          value: result.success ? 1 : 0,
          unit: 'Count'
        }
      );
      
      allSuccessful = allSuccessful && result.success;
      
      // Alert on slow response time
      if (result.responseTime > config.thresholds.responseTime) {
        await sendAlert(
          `Endpoint ${endpoint.path} responded slowly: ${result.responseTime}ms`,
          `[${config.environment.toUpperCase()}] Slow Response Alert`
        );
      }
      
      // Alert on error
      if (!result.success) {
        await sendAlert(
          `Endpoint ${endpoint.path} health check failed with status code ${result.statusCode}`,
          `[${config.environment.toUpperCase()}] Endpoint Failure Alert`
        );
      }
      
    } catch (error) {
      console.error(`Error checking endpoint ${endpoint.path}:`, error);
      allSuccessful = false;
    }
  }
  
  // Send all metrics to CloudWatch
  try {
    await sendMetrics(metrics);
  } catch (error) {
    console.error('Error sending metrics to CloudWatch:', error);
  }
  
  // Calculate success rate
  const successRate = results.filter(r => r.success).length / results.length;
  
  // Alert if overall success rate is below threshold
  if (successRate < config.thresholds.successRate) {
    try {
      await sendAlert(
        `Health check success rate is below threshold: ${(successRate * 100).toFixed(1)}%`,
        `[${config.environment.toUpperCase()}] Low Success Rate Alert`
      );
    } catch (error) {
      console.error('Error sending alert:', error);
    }
  }
  
  console.log('Health check complete, results:', JSON.stringify(results, null, 2));
  
  return {
    statusCode: allSuccessful ? 200 : 500,
    body: JSON.stringify({
      success: allSuccessful,
      results,
      timestamp: new Date().toISOString()
    })
  };
}; 