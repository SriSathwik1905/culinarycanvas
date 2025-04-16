variable "aws_region" {
  description = "AWS region where the resources will be deployed"
  type        = string
  default     = "us-east-1"
}

variable "prefix" {
  description = "Prefix for resource names"
  type        = string
  default     = "cc"
}

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "culinary-canvas"
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
}

variable "website_url" {
  description = "URL of the website to check"
  type        = string
}

variable "domain_name" {
  description = "Domain name of the website"
  type        = string
}

variable "enable_alarm_actions" {
  description = "Enable CloudWatch alarm actions"
  type        = bool
  default     = true
}

variable "alarm_actions" {
  description = "List of ARNs for alarm actions (SNS topics, etc.)"
  type        = list(string)
  default     = []
} 