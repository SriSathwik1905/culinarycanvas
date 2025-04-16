provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  description = "AWS region for resources"
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment (staging or production)"
  default     = "staging"
}

variable "app_name" {
  description = "Application name"
  default     = "culinarycanvas"
}

variable "use_route53" {
  description = "Whether to create Route 53 records"
  default     = false
}

locals {
  tags = {
    Environment = var.environment
    Project     = var.app_name
    ManagedBy   = "Terraform"
  }
  
  full_app_name = "${var.app_name}-${var.environment}"
}

# S3 bucket for website hosting
resource "aws_s3_bucket" "website" {
  bucket = "${var.app_name}-${var.environment}-website"

  tags = {
    Name        = "${var.app_name}-${var.environment}-website"
    Environment = var.environment
  }
}

# Bucket configuration for website hosting
resource "aws_s3_bucket_website_configuration" "website" {
  bucket = aws_s3_bucket.website.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "index.html"
  }
}

# Bucket policy for public read access
resource "aws_s3_bucket_policy" "website" {
  bucket = aws_s3_bucket.website.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.website.arn}/*"
      }
    ]
  })
}

# CloudFront distribution
resource "aws_cloudfront_distribution" "website" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  price_class         = "PriceClass_100" # US, Canada, Europe

  origin {
    domain_name = aws_s3_bucket_website_configuration.website.website_endpoint
    origin_id   = "S3-${aws_s3_bucket.website.bucket}"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-${aws_s3_bucket.website.bucket}"
    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
  }

  # SPA routing - return index.html for 404s
  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Name        = "${var.app_name}-${var.environment}-cf"
    Environment = var.environment
  }
}

# Basic health check Lambda (simple ping test)
resource "aws_lambda_function" "basic_health_check" {
  filename         = "${path.module}/monitoring/lambda/basic-health-check.zip"
  function_name    = "${var.app_name}-${var.environment}-basic-health-check"
  role             = aws_iam_role.lambda_role.arn
  handler          = "index.handler"
  runtime          = "nodejs16.x"
  timeout          = 10
  memory_size      = 128
  source_code_hash = filebase64sha256("${path.module}/monitoring/lambda/basic-health-check.zip")

  environment {
    variables = {
      WEBSITE_URL = "https://${aws_cloudfront_distribution.website.domain_name}"
      ENVIRONMENT = var.environment
    }
  }

  tags = {
    Name        = "${var.app_name}-${var.environment}-basic-health-check"
    Environment = var.environment
  }
}

# IAM role for Lambda
resource "aws_iam_role" "lambda_role" {
  name = "${var.app_name}-${var.environment}-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "${var.app_name}-${var.environment}-lambda-role"
    Environment = var.environment
  }
}

# Basic CloudWatch policy for Lambda logging
resource "aws_iam_role_policy" "lambda_policy" {
  name   = "${var.app_name}-${var.environment}-lambda-policy"
  role   = aws_iam_role.lambda_role.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Effect   = "Allow"
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

# CloudWatch event rule to trigger health check every 5 minutes
resource "aws_cloudwatch_event_rule" "health_check_schedule" {
  name                = "${var.app_name}-${var.environment}-health-check-schedule"
  description         = "Trigger basic health check every 5 minutes"
  schedule_expression = "rate(5 minutes)"

  tags = {
    Name        = "${var.app_name}-${var.environment}-health-check-schedule"
    Environment = var.environment
  }
}

# CloudWatch event target to trigger the Lambda function
resource "aws_cloudwatch_event_target" "health_check_target" {
  rule      = aws_cloudwatch_event_rule.health_check_schedule.name
  target_id = "TriggerHealthCheckLambda"
  arn       = aws_lambda_function.basic_health_check.arn
}

# Permission for CloudWatch to invoke Lambda
resource "aws_lambda_permission" "allow_cloudwatch" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.basic_health_check.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.health_check_schedule.arn
}

# CloudWatch alarm for health check failures
resource "aws_cloudwatch_metric_alarm" "health_check_alarm" {
  alarm_name          = "${var.app_name}-${var.environment}-health-check-alarm"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 1
  alarm_description   = "Health check Lambda function is failing"
  alarm_actions       = []

  dimensions = {
    FunctionName = aws_lambda_function.basic_health_check.function_name
  }

  tags = {
    Name        = "${var.app_name}-${var.environment}-health-check-alarm"
    Environment = var.environment
  }
}

# Route 53 DNS record (if domain is managed in AWS)
resource "aws_route53_record" "website" {
  count = var.use_route53 && var.environment == "production" ? 1 : 0
  
  zone_id = data.aws_route53_zone.main[0].zone_id
  name    = var.environment == "production" ? "culinarycanvas.example.com" : "staging.culinarycanvas.example.com"
  type    = "A"
  
  alias {
    name                   = aws_cloudfront_distribution.website.domain_name
    zone_id                = aws_cloudfront_distribution.website.hosted_zone_id
    evaluate_target_health = false
  }
}

data "aws_route53_zone" "main" {
  count = var.use_route53 && var.environment == "production" ? 1 : 0
  
  name = "example.com"
}

# Monitoring resources - Cloudwatch
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${local.full_app_name}-dashboard"
  
  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        
        properties = {
          metrics = [
            ["AWS/CloudFront", "Requests", "DistributionId", aws_cloudfront_distribution.website.id],
            [".", "4xxErrorRate", ".", "."],
            [".", "5xxErrorRate", ".", "."]
          ]
          view    = "timeSeries"
          stacked = false
          region  = "us-east-1"
          title   = "CloudFront Metrics"
          period  = 300
        }
      }
    ]
  })
}

# Outputs
output "website_endpoint" {
  value = aws_s3_bucket_website_configuration.website.website_endpoint
}

output "cloudfront_domain" {
  value = aws_cloudfront_distribution.website.domain_name
}

output "environment" {
  value = var.environment
} 