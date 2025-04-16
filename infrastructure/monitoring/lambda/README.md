# Culinary Canvas Health Check Lambda

This module provides AWS Lambda-based health monitoring for the Culinary Canvas website.

## Features

- Regular health checks of the website every 5 minutes
- Metrics publishing to CloudWatch
- Configurable alarms for site availability and response time
- Slack notifications for health check failures (when configured)

## Architecture

The module creates the following resources:

- Lambda function to perform health checks
- IAM role and policies for the Lambda function
- CloudWatch log group for Lambda logs
- CloudWatch Event Rule to schedule health checks
- CloudWatch Alarms for site availability and response time

## Configuration

### Required Variables

- `website_url`: The URL of the website to monitor
- `domain_name`: The domain name to use in metrics dimensions

### Optional Variables

- `prefix`: A prefix to add to resource names (default: "culinary-canvas")
- `environment`: The environment name (default: "dev")
- `project_name`: The project name (default: "culinary-canvas")
- `alarm_actions`: A list of ARNs to notify when alarms trigger (e.g., SNS topics)
- `enable_alarm_actions`: Whether to enable alarm actions (default: true)
- `tags`: Additional tags to add to resources

## Metrics

The Lambda function publishes the following metrics to CloudWatch:

- `ResponseTime`: The response time of the website in milliseconds
- `HealthCheckFailed`: 1 if the health check failed, 0 if successful

## Alarms

The module creates two alarms:

1. **WebsiteUnavailable**: Triggers when the website is unavailable for 2 consecutive checks
2. **HighResponseTime**: Triggers when the website response time exceeds 3000ms for 2 consecutive checks

## Usage

```hcl
module "health_check" {
  source = "./infrastructure/monitoring/lambda"
  
  website_url      = "https://culinarycanvas.com"
  domain_name      = "culinarycanvas.com"
  environment      = "prod"
  alarm_actions    = [aws_sns_topic.alerts.arn]
} 