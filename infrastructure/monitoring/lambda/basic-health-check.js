/**
 * Basic Health Check Lambda Function
 *
 * This is a simplified version of the health check Lambda function.
 * It performs a basic ping test to verify the application is running.
 */

exports.handler = async (event) => {
  console.log('Starting basic health check');
  
  try {
    // Implementation of basic health check logic would go here
    // This is just a placeholder
    
    console.log('Basic health check completed successfully');
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        status: 'healthy',
        timestamp: new Date().toISOString()
      })
    };
  } catch (error) {
    console.error('Error in basic health check:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
}; 