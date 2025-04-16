const https = require('https');
const http = require('http');
const AWS = require('aws-sdk');

// Initialize CloudWatch client
const cloudwatch = new AWS.CloudWatch();

exports.handler = async (event) => {
  console.log('Starting health check');
  
  // Read environment variables
  const url = process.env.WEBSITE_URL;
  if (!url) {
    console.error('WEBSITE_URL environment variable is not set');
    return { statusCode: 500, body: 'Configuration error: WEBSITE_URL not set' };
  }
  
  try {
    // Measure response time
    const startTime = new Date().getTime();
    const response = await makeRequest(url);
    const endTime = new Date().getTime();
    const responseTime = endTime - startTime;
    
    console.log(`Health check completed for ${url}. Status: ${response.statusCode}. Response time: ${responseTime}ms`);
    
    // Define health status based on response code
    const isHealthy = response.statusCode >= 200 && response.statusCode < 300;
    
    // Send metrics to CloudWatch
    await publishMetrics(url, isHealthy, responseTime, response.statusCode);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        url: url,
        responseTime: responseTime,
        statusCode: response.statusCode,
        isHealthy: isHealthy,
        timestamp: new Date().toISOString()
      })
    };
  } catch (error) {
    console.error(`Health check failed for ${url}:`, error);
    
    // Send failure metrics to CloudWatch
    await publishMetrics(url, false, 0, 500);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message,
        url: url,
        isHealthy: false,
        timestamp: new Date().toISOString()
      })
    };
  }
};

// Helper function to make HTTP/HTTPS request
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const request = client.get(url, (response) => {
      // Handle redirects (3xx status codes)
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        resolve(makeRequest(response.headers.location));
      } else {
        resolve(response);
      }
    });
    
    // Set timeout to 5 seconds
    request.setTimeout(5000, () => {
      request.destroy();
      reject(new Error('Request timeout after 5000ms'));
    });
    
    request.on('error', (error) => {
      reject(error);
    });
  });
}

// Helper function to publish metrics to CloudWatch
async function publishMetrics(url, isHealthy, responseTime, statusCode) {
  const domain = new URL(url).hostname;
  
  const params = {
    MetricData: [
      {
        MetricName: 'HealthStatus',
        Dimensions: [
          {
            Name: 'Domain',
            Value: domain
          }
        ],
        Unit: 'Count',
        Value: isHealthy ? 1 : 0
      },
      {
        MetricName: 'ResponseTime',
        Dimensions: [
          {
            Name: 'Domain',
            Value: domain
          }
        ],
        Unit: 'Milliseconds',
        Value: responseTime
      },
      {
        MetricName: 'StatusCode',
        Dimensions: [
          {
            Name: 'Domain',
            Value: domain
          }
        ],
        Unit: 'Count',
        Value: statusCode
      }
    ],
    Namespace: 'CulinaryCanvas/WebsiteHealth'
  };
  
  try {
    await cloudwatch.putMetricData(params).promise();
    console.log('Successfully published metrics to CloudWatch');
  } catch (error) {
    console.error('Error publishing metrics to CloudWatch:', error);
  }
} 