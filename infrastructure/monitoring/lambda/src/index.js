const https = require('https');
const http = require('http');
const { URL } = require('url');
const AWS = require('aws-sdk');

// Initialize CloudWatch client
const cloudwatch = new AWS.CloudWatch();

/**
 * Performs a health check on the website and records metrics in CloudWatch
 */
exports.handler = async (event) => {
  // Get website URL from environment variables
  const websiteUrl = process.env.WEBSITE_URL;
  const domainName = process.env.DOMAIN_NAME || new URL(websiteUrl).hostname;
  
  console.log(`Checking health of ${websiteUrl}`);
  
  try {
    // Perform the health check
    const result = await checkWebsite(websiteUrl);
    console.log('Health check result:', result);
    
    // Publish metrics to CloudWatch
    await publishMetrics(result, domainName);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Health check completed successfully',
        result: result
      })
    };
  } catch (error) {
    console.error('Health check failed:', error);
    
    // Record failure metric
    await publishFailureMetric(domainName);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Health check failed',
        error: error.message
      })
    };
  }
};

/**
 * Checks the website health by making an HTTP request
 * @param {string} url - The URL to check
 * @returns {Object} - Result of the health check
 */
async function checkWebsite(url) {
  const startTime = Date.now();
  
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;
    
    const req = protocol.get(url, {
      timeout: 10000, // 10-second timeout
      headers: {
        'User-Agent': 'CulinaryCanvas-HealthCheck/1.0'
      }
    }, (res) => {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const statusCode = res.statusCode;
        const isHealthy = statusCode >= 200 && statusCode < 400;
        
        resolve({
          statusCode: statusCode,
          responseTime: responseTime,
          isHealthy: isHealthy,
          contentLength: data.length
        });
      });
    });
    
    req.on('error', (error) => {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      reject({
        error: error.message,
        responseTime: responseTime,
        isHealthy: false
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      reject({
        error: 'Request timed out',
        responseTime: responseTime,
        isHealthy: false
      });
    });
  });
}

/**
 * Publishes health metrics to CloudWatch
 * @param {Object} result - Result of the health check
 * @param {string} domainName - Domain name for the dimension
 */
async function publishMetrics(result, domainName) {
  const metrics = [
    {
      MetricName: 'ResponseTime',
      Value: result.responseTime,
      Unit: 'Milliseconds'
    },
    {
      MetricName: 'HealthCheckFailed',
      Value: result.isHealthy ? 0 : 1,
      Unit: 'Count'
    }
  ];
  
  const params = {
    Namespace: 'CulinaryCanvas/Monitoring',
    MetricData: metrics.map(metric => ({
      ...metric,
      Dimensions: [
        {
          Name: 'DomainName',
          Value: domainName
        }
      ],
      Timestamp: new Date()
    }))
  };
  
  return cloudwatch.putMetricData(params).promise();
}

/**
 * Publishes a failure metric in case of an exception
 * @param {string} domainName - Domain name for the dimension
 */
async function publishFailureMetric(domainName) {
  const params = {
    Namespace: 'CulinaryCanvas/Monitoring',
    MetricData: [
      {
        MetricName: 'HealthCheckFailed',
        Value: 1,
        Unit: 'Count',
        Dimensions: [
          {
            Name: 'DomainName',
            Value: domainName
          }
        ],
        Timestamp: new Date()
      }
    ]
  };
  
  return cloudwatch.putMetricData(params).promise();
} 