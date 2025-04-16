# Culinary Canvas Health Check Lambda

This AWS Lambda function performs regular health checks on the Culinary Canvas application, monitoring endpoint availability, response times, and error rates.

## Features

- Monitors multiple application endpoints
- Sends metrics to CloudWatch
- Alerts via SNS when issues are detected
- Customizable thresholds for response time and success rate
- Detailed logging for troubleshooting

## Deployment

This Lambda function is deployed using Terraform. See the `infrastructure/main.tf` file for details.

## Environment Variables

The Lambda function requires the following environment variables:

- `SITE_URL` - The base URL of the application (e.g., `https://culinarycanvas.example.com`)
- `SNS_TOPIC_ARN` - The ARN of the SNS topic for alerts
- `ENVIRONMENT` - The deployment environment (`staging` or `production`)

## Metrics

The function publishes the following metrics to CloudWatch:

- `ResponseTime` - Time taken to respond to a request
- `StatusCode` - HTTP status code returned by the endpoint
- `Success` - Whether the endpoint returned a successful response (1 = success, 0 = failure)

## Alerts

Alerts are sent to the SNS topic under the following conditions:

- An endpoint responds with a non-2xx/3xx status code
- An endpoint's response time exceeds the threshold (default: 2000ms)
- The overall success rate falls below the threshold (default: 95%)

## Building the Lambda Package

To build the Lambda deployment package:

1. Install dependencies:
   ```
   npm install
   ```

2. Create a ZIP file for deployment:
   ```
   npm run zip
   ```

This will create `health-check.zip` which can be deployed to AWS Lambda. 