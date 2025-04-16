variable "aws_region" {
  description = "The AWS region where resources should be created"
  type        = string
  default     = "us-east-1"
}

variable "prefix" {
  description = "Prefix to add to resource names"
  type        = string
  default     = "culinary-canvas"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "culinary-canvas"
}

variable "website_url" {
  description = "URL of the website to monitor"
  type        = string
}

variable "domain_name" {
  description = "Domain name of the website"
  type        = string
}

variable "alert_emails" {
  description = "List of email addresses to notify for alarms"
  type        = list(string)
  default     = []
}

variable "enable_alarm_actions" {
  description = "Whether to enable alarm actions"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
} 