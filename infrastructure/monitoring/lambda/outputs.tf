output "lambda_function_name" {
  description = "Name of the created Lambda function"
  value       = aws_lambda_function.health_check.function_name
}

output "lambda_function_arn" {
  description = "ARN of the created Lambda function"
  value       = aws_lambda_function.health_check.arn
}

output "cloudwatch_log_group_name" {
  description = "Name of the CloudWatch Log Group"
  value       = aws_cloudwatch_log_group.health_check.name
}

output "lambda_role_arn" {
  description = "ARN of the IAM role used by the Lambda function"
  value       = aws_iam_role.lambda_role.arn
}

output "availability_alarm_arn" {
  description = "ARN of the website availability CloudWatch alarm"
  value       = aws_cloudwatch_metric_alarm.website_unavailable.arn
}

output "response_time_alarm_arn" {
  description = "ARN of the response time CloudWatch alarm"
  value       = aws_cloudwatch_metric_alarm.high_response_time.arn
}

output "event_rule_arn" {
  description = "ARN of the CloudWatch Event Rule that triggers the health check"
  value       = aws_cloudwatch_event_rule.health_check.arn
} 