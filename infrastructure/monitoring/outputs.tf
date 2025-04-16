output "sns_topic_arn" {
  description = "ARN of the SNS topic for monitoring alerts"
  value       = aws_sns_topic.monitoring_alerts.arn
}

output "lambda_function_name" {
  description = "Name of the health check Lambda function"
  value       = module.website_health_check.lambda_function_name
}

output "lambda_function_arn" {
  description = "ARN of the health check Lambda function"
  value       = module.website_health_check.lambda_function_arn
}

output "dashboard_name" {
  description = "Name of the CloudWatch dashboard"
  value       = aws_cloudwatch_dashboard.website_monitoring.dashboard_name
}

output "availability_alarm_arn" {
  description = "ARN of the website availability CloudWatch alarm"
  value       = module.website_health_check.availability_alarm_arn
}

output "response_time_alarm_arn" {
  description = "ARN of the response time CloudWatch alarm"
  value       = module.website_health_check.response_time_alarm_arn
} 