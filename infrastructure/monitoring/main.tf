provider "aws" {
  region = var.aws_region
}

# Configure terraform backend (should be configured via backend-config during init)
terraform {
  backend "s3" {
    bucket         = "culinary-canvas-terraform-state"
    key            = "culinary-canvas/monitoring/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "culinary-canvas-terraform-locks"
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# SNS Topic for Monitoring Alerts
resource "aws_sns_topic" "monitoring_alerts" {
  name = "${var.prefix}-${var.environment}-monitoring-alerts"
  
  tags = merge(var.tags, {
    Name        = "${var.prefix}-${var.environment}-monitoring-alerts"
    Environment = var.environment
    Project     = var.project_name
  })
}

# SNS Subscription for Email Alerts
resource "aws_sns_topic_subscription" "email_alerts" {
  count     = length(var.alert_emails)
  topic_arn = aws_sns_topic.monitoring_alerts.arn
  protocol  = "email"
  endpoint  = var.alert_emails[count.index]
}

# Web Health Check Lambda Module
module "website_health_check" {
  source = "./lambda"
  
  prefix           = var.prefix
  environment      = var.environment
  project_name     = var.project_name
  website_url      = var.website_url
  domain_name      = var.domain_name
  alarm_actions    = [aws_sns_topic.monitoring_alerts.arn]
  enable_alarm_actions = var.enable_alarm_actions
  
  tags = merge(var.tags, {
    Component = "health-check"
  })
}

# CloudWatch Dashboard for Monitoring
resource "aws_cloudwatch_dashboard" "website_monitoring" {
  dashboard_name = "${var.prefix}-${var.environment}-website-monitoring"
  
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
            ["CulinaryCanvas/Monitoring", "ResponseTime", "DomainName", var.domain_name]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "Website Response Time"
          period  = 300
          stat    = "Average"
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
            ["CulinaryCanvas/Monitoring", "HealthCheckFailed", "DomainName", var.domain_name]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "Website Availability"
          period  = 300
          stat    = "Maximum"
          yAxis = {
            left = {
              min = 0
              max = 1
            }
          }
        }
      },
      {
        type   = "alarm"
        x      = 0
        y      = 6
        width  = 24
        height = 6
        properties = {
          alarms = [
            module.website_health_check.availability_alarm_arn,
            module.website_health_check.response_time_alarm_arn
          ]
          title = "Website Health Alarms"
        }
      }
    ]
  })
} 