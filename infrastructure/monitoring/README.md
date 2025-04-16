# Culinary Canvas Monitoring

This module provides monitoring infrastructure for the Culinary Canvas application, including:

- Website health checks using AWS Lambda
- CloudWatch dashboards for metrics visualization
- CloudWatch alarms for availability and performance
- SNS notifications for alerting via email

## Architecture

The monitoring solution consists of:

1. **Lambda-based Health Checks**: Regular checks of website availability and performance
2. **CloudWatch Metrics**: Custom metrics for response time and availability
3. **CloudWatch Alarms**: Triggers when the website is unavailable or slow
4. **SNS Topic**: Sends notifications to subscribers when alarms trigger
5. **CloudWatch Dashboard**: Visualizes website health and performance

## Usage

### Prerequisites

- AWS CLI configured with appropriate permissions
- Terraform 1.x
- An S3 bucket for Terraform state storage
- A DynamoDB table for state locking

### Deployment

To deploy the monitoring infrastructure:

```bash
# Initialize Terraform (dev environment)
terraform init -backend-config="key=culinary-canvas-dev/monitoring/terraform.tfstate"

# Plan the deployment
terraform plan -var-file="environments/dev.tfvars" -out=tfplan

# Apply the changes
terraform apply tfplan
```

For production:

```bash
terraform init -backend-config="key=culinary-canvas-prod/monitoring/terraform.tfstate"
terraform plan -var-file="environments/prod.tfvars" -out=tfplan
terraform apply tfplan
```

## Configuration

Configuration is managed through Terraform variables. Environment-specific configurations are stored in the `environments/` directory:

- `dev.tfvars`: Development environment configuration
- `prod.tfvars`: Production environment configuration

## Outputs

The module provides the following outputs:

- `sns_topic_arn`: ARN of the SNS topic for monitoring alerts
- `lambda_function_name`: Name of the health check Lambda function
- `lambda_function_arn`: ARN of the health check Lambda function
- `dashboard_name`: Name of the CloudWatch dashboard
- `availability_alarm_arn`: ARN of the website availability CloudWatch alarm
- `response_time_alarm_arn`: ARN of the response time CloudWatch alarm

## Health Check Details

The Lambda-based health check:

- Runs every 5 minutes
- Checks website availability
- Measures response time
- Publishes metrics to CloudWatch
- Triggers alarms for:
  - Website unavailability (2 consecutive failures)
  - High response time (>3 seconds for 2 consecutive checks)

## Alarming and Notification

Alarms trigger notifications to the configured email addresses. To add or remove notification recipients, modify the `alert_emails` variable in the appropriate environment's .tfvars file.