# Culinary Canvas Infrastructure

This directory contains the Terraform configuration for deploying the Culinary Canvas application infrastructure to AWS.

## Prerequisites

- [Terraform](https://www.terraform.io/downloads.html) (v1.0.0 or newer)
- AWS account with appropriate permissions
- AWS CLI installed and configured with access credentials

## Project Structure

- `main.tf` - Main infrastructure configuration (S3, CloudFront, basic monitoring)
- `monitoring.tf` - Enhanced monitoring infrastructure (Lambda health checks, CloudWatch dashboards)
- `monitoring/lambda/` - Lambda functions for health monitoring

## Preparing the Deployment

Before running Terraform, you need to prepare the Lambda deployment packages:

### On Windows

Run the prepare-lambdas.bat script:

```
cd infrastructure/monitoring/lambda
prepare-lambdas.bat
```

### On Linux/Mac

Run the prepare-lambdas.sh script:

```
cd infrastructure/monitoring/lambda
chmod +x prepare-lambdas.sh
./prepare-lambdas.sh
```

This will create the necessary zip files for Lambda deployments:

- `health-check.zip` - Enhanced health check used by monitoring.tf
- `basic-health-check.zip` - Basic health check used by main.tf

## Deployment

1. Initialize Terraform:

```
cd infrastructure
terraform init
```

2. Plan the deployment:

```
terraform plan -var="environment=staging"
```

3. Apply the configuration:

```
terraform apply -var="environment=staging"
```

For production deployment, use:

```
terraform apply -var="environment=production"
```

## Variables

- `aws_region` - AWS region to deploy resources (default: us-east-1)
- `environment` - Deployment environment (staging or production, default: staging)
- `app_name` - Application name (default: culinarycanvas)
- `use_route53` - Whether to create Route 53 records (default: false)

## Outputs

- `website_endpoint` - S3 website endpoint
- `cloudfront_domain` - CloudFront domain name
- `environment` - Deployment environment
- `enhanced_health_check_lambda_arn` - ARN of the enhanced health check Lambda function

## Troubleshooting

If you encounter issues with Terraform initialization due to duplicate resource definitions, ensure you've followed these steps:

1. Check that both `main.tf` and `monitoring.tf` use different resource names for Lambda functions and CloudWatch events
2. Make sure you've prepared both Lambda deployment packages correctly
3. Run `terraform init` again after making changes

## Notes on CI/CD

The GitHub Actions workflow (.github/workflows/ci-cd.yml) is set up to apply this Terraform configuration automatically for both staging and production environments. The workflow will check for AWS credentials and skip AWS deployment steps if they're not available. 