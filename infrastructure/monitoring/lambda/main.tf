provider "aws" {
  region = var.aws_region
}

locals {
  resource_prefix = "${var.prefix}-${var.environment}"
  function_name   = "${local.resource_prefix}-health-check"
  handler_file    = "${path.module}/src/index.js"
  runtime         = "nodejs18.x"
  description     = "Website health check function for ${var.project_name}"
  timeout         = 30
  memory_size     = 128
}

# IAM role for Lambda function
resource "aws_iam_role" "lambda_role" {
  name = "${local.resource_prefix}-health-check-role"

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
    Name        = "${local.resource_prefix}-health-check-role"
    Environment = var.environment
    Project     = var.project_name
  }
}

# IAM policy for CloudWatch access
resource "aws_iam_policy" "lambda_logging" {
  name        = "${local.resource_prefix}-health-check-logging-policy"
  description = "IAM policy for logging from Lambda health check"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "cloudwatch:PutMetricData"
        ]
        Effect   = "Allow"
        Resource = "*"
      }
    ]
  })
}

# Attach policy to role
resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = aws_iam_policy.lambda_logging.arn
}

# Lambda function
resource "aws_lambda_function" "health_check" {
  filename         = data.archive_file.lambda_zip.output_path
  function_name    = local.function_name
  role             = aws_iam_role.lambda_role.arn
  handler          = "index.handler"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime          = "nodejs18.x"
  timeout          = 30
  memory_size      = 128

  environment {
    variables = {
      WEBSITE_URL = var.website_url
      DOMAIN_NAME = var.domain_name
    }
  }

  tags = {
    Name        = local.function_name
    Environment = var.environment
    Project     = var.project_name
  }
}

# CloudWatch log group for Lambda
resource "aws_cloudwatch_log_group" "health_check" {
  name              = "/aws/lambda/${local.function_name}"
  retention_in_days = 30

  tags = {
    Name        = "${local.resource_prefix}-health-check-logs"
    Environment = var.environment
    Project     = var.project_name
  }
}

# Archive Lambda source code
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/src"
  output_path = "${path.module}/dist/health_check.zip"
}

# CloudWatch event rule to trigger Lambda every 5 minutes
resource "aws_cloudwatch_event_rule" "health_check_schedule" {
  name                = "${local.resource_prefix}-health-check-schedule"
  description         = "Trigger health check Lambda function every 5 minutes"
  schedule_expression = "rate(5 minutes)"

  tags = {
    Name        = "${local.resource_prefix}-health-check-schedule"
    Environment = var.environment
    Project     = var.project_name
  }
}

# CloudWatch event target
resource "aws_cloudwatch_event_target" "health_check_target" {
  rule      = aws_cloudwatch_event_rule.health_check_schedule.name
  target_id = "health_check_lambda"
  arn       = aws_lambda_function.health_check.arn
}

# Permission for CloudWatch to invoke Lambda
resource "aws_lambda_permission" "allow_cloudwatch" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.health_check.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.health_check_schedule.arn
}

# CloudWatch alarm for website unavailability
resource "aws_cloudwatch_metric_alarm" "website_down" {
  alarm_name          = "${local.resource_prefix}-website-down"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 2
  metric_name         = "HealthCheckFailed"
  namespace           = "CulinaryCanvas/Monitoring"
  period              = 300
  statistic           = "Maximum"
  threshold           = 1
  alarm_description   = "This alarm triggers when the website is unavailable"
  alarm_actions       = var.enable_alarm_actions ? var.alarm_actions : []
  ok_actions          = var.enable_alarm_actions ? var.alarm_actions : []

  dimensions = {
    DomainName = var.domain_name
  }

  tags = {
    Name        = "${local.resource_prefix}-website-down-alarm"
    Environment = var.environment
    Project     = var.project_name
  }
}

# CloudWatch alarm for high response time
resource "aws_cloudwatch_metric_alarm" "high_response_time" {
  alarm_name          = "${local.resource_prefix}-high-response-time"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "ResponseTime"
  namespace           = "CulinaryCanvas/Monitoring"
  period              = 300
  statistic           = "Average"
  threshold           = 2000  # 2 seconds in milliseconds
  alarm_description   = "This alarm triggers when the website response time is high"
  alarm_actions       = var.enable_alarm_actions ? var.alarm_actions : []
  ok_actions          = var.enable_alarm_actions ? var.alarm_actions : []

  dimensions = {
    DomainName = var.domain_name
  }

  tags = {
    Name        = "${local.resource_prefix}-high-response-time-alarm"
    Environment = var.environment
    Project     = var.project_name
  }
} 
} 