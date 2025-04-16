/**
 * Monitoring Infrastructure for Culinary Canvas
 *
 * This Terraform module defines the monitoring infrastructure for the Culinary Canvas application,
 * including CloudWatch alarms, Lambda health check function, metrics, and dashboards.
 */

# CloudWatch Log Group for Lambda function
resource "aws_cloudwatch_log_group" "lambda_health_check" {
  name              = "/aws/lambda/${var.app_name}-${var.environment}-health-check"
  retention_in_days = 14
  
  tags = local.tags
}

# IAM Role for Lambda Health Check
resource "aws_iam_role" "lambda_health_check" {
  name = "${var.app_name}-${var.environment}-health-check-role"
  
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
  
  tags = local.tags
}

# IAM Policy for Lambda Health Check
resource "aws_iam_policy" "lambda_health_check" {
  name        = "${var.app_name}-${var.environment}-health-check-policy"
  description = "Policy for health check Lambda function"
  
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
      },
      {
        Action = [
          "cloudwatch:PutMetricData"
        ]
        Effect   = "Allow"
        Resource = "*"
      },
      {
        Action = [
          "sns:Publish"
        ]
        Effect   = "Allow"
        Resource = aws_sns_topic.alerts[0].arn
      }
    ]
  })
}

# Attach IAM Policy to IAM Role
resource "aws_iam_role_policy_attachment" "lambda_health_check" {
  role       = aws_iam_role.lambda_health_check.name
  policy_arn = aws_iam_policy.lambda_health_check.arn
}

# Lambda Function for Health Check (RENAMED to avoid conflict)
resource "aws_lambda_function" "enhanced_health_check" {
  function_name    = "${var.app_name}-${var.environment}-enhanced-health-check"
  role             = aws_iam_role.lambda_health_check.arn
  handler          = "health-check.handler"
  runtime          = "nodejs16.x"
  timeout          = 30
  memory_size      = 256
  
  filename         = "../monitoring/lambda/health-check.zip"
  source_code_hash = filebase64sha256("../monitoring/lambda/health-check.zip")
  
  environment {
    variables = {
      SITE_URL      = var.environment == "production" ? "https://${var.app_name}.example.com" : "https://staging.${var.app_name}.example.com"
      SNS_TOPIC_ARN = var.environment == "production" ? aws_sns_topic.alerts[0].arn : ""
      ENVIRONMENT   = var.environment
    }
  }
  
  tags = local.tags
}

# CloudWatch Event Rule to trigger Lambda every 5 minutes (RENAMED to avoid conflict)
resource "aws_cloudwatch_event_rule" "enhanced_health_check_schedule" {
  name                = "${var.app_name}-${var.environment}-enhanced-health-check-schedule"
  description         = "Trigger enhanced health check Lambda function"
  schedule_expression = "rate(5 minutes)"
  
  tags = local.tags
}

# CloudWatch Event Target for Lambda (RENAMED to avoid conflict)
resource "aws_cloudwatch_event_target" "enhanced_health_check" {
  rule      = aws_cloudwatch_event_rule.enhanced_health_check_schedule.name
  target_id = "EnhancedHealthCheckLambda"
  arn       = aws_lambda_function.enhanced_health_check.arn
}

# Lambda Permission for CloudWatch Events (RENAMED to avoid conflict)
resource "aws_lambda_permission" "enhanced_health_check" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.enhanced_health_check.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.enhanced_health_check_schedule.arn
}

# CloudWatch Alarms for Health Metrics

# Alarm for 5xx Error Rate
resource "aws_cloudwatch_metric_alarm" "error_rate_5xx" {
  alarm_name          = "${var.app_name}-${var.environment}-5xx-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "5xxErrorRate"
  namespace           = "AWS/CloudFront"
  period              = 300
  statistic           = "Average"
  threshold           = 5
  alarm_description   = "This alarm monitors for high 5xx error rates"
  alarm_actions       = var.environment == "production" ? [aws_sns_topic.alerts[0].arn] : []
  
  dimensions = {
    DistributionId = aws_cloudfront_distribution.website.id
  }
  
  tags = local.tags
}

# Alarm for 4xx Error Rate
resource "aws_cloudwatch_metric_alarm" "error_rate_4xx" {
  alarm_name          = "${var.app_name}-${var.environment}-4xx-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "4xxErrorRate"
  namespace           = "AWS/CloudFront"
  period              = 300
  statistic           = "Average"
  threshold           = 20
  alarm_description   = "This alarm monitors for high 4xx error rates"
  alarm_actions       = var.environment == "production" ? [aws_sns_topic.alerts[0].arn] : []
  
  dimensions = {
    DistributionId = aws_cloudfront_distribution.website.id
  }
  
  tags = local.tags
}

# Alarm for Lambda Health Check Errors
resource "aws_cloudwatch_metric_alarm" "enhanced_health_check_errors" {
  alarm_name          = "${var.app_name}-${var.environment}-enhanced-health-check-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 1
  alarm_description   = "This alarm monitors for enhanced health check Lambda function errors"
  alarm_actions       = var.environment == "production" ? [aws_sns_topic.alerts[0].arn] : []
  
  dimensions = {
    FunctionName = aws_lambda_function.enhanced_health_check.function_name
  }
  
  tags = local.tags
}

# Custom Metric to track Health Check Status
resource "aws_cloudwatch_dashboard" "health_metrics" {
  dashboard_name = "${var.app_name}-${var.environment}-health-metrics"
  
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
            ["CulinaryCanvas", "ResponseTime", "Endpoint", "home"],
            [".", ".", ".", "recipes-api"],
            [".", ".", ".", "chefs-api"],
            [".", ".", ".", "health-api"]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "API Response Times"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        
        properties = {
          metrics = [
            ["CulinaryCanvas", "Success", "Endpoint", "home"],
            [".", ".", ".", "recipes-api"],
            [".", ".", ".", "chefs-api"],
            [".", ".", ".", "health-api"]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "API Endpoint Health"
          period  = 300
          yAxis = {
            left = {
              min = 0
              max = 1
            }
          }
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 24
        height = 6
        
        properties = {
          metrics = [
            ["AWS/Lambda", "Invocations", "FunctionName", aws_lambda_function.enhanced_health_check.function_name],
            [".", "Errors", ".", "."],
            [".", "Duration", ".", ".", { yAxis = "right" }]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "Enhanced Health Check Lambda Performance"
          period  = 300
        }
      }
    ]
  })
}

# Output the health check Lambda ARN for reference
output "enhanced_health_check_lambda_arn" {
  value       = aws_lambda_function.enhanced_health_check.arn
  description = "ARN of the enhanced health check Lambda function"
} 