aws_region = "us-east-1"
environment = "dev"
prefix = "culinary-canvas"
project_name = "culinary-canvas"

website_url = "https://dev.culinarycanvas.com"
domain_name = "dev.culinarycanvas.com"

alert_emails = [
  "dev@culinarycanvas.com"
]

enable_alarm_actions = true

tags = {
  Environment = "development"
  ManagedBy   = "terraform"
  Project     = "culinary-canvas"
} 