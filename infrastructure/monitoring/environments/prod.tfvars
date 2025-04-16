aws_region = "us-east-1"
environment = "prod"
prefix = "culinary-canvas"
project_name = "culinary-canvas"

website_url = "https://culinarycanvas.com"
domain_name = "culinarycanvas.com"

alert_emails = [
  "admin@culinarycanvas.com",
  "devops@culinarycanvas.com"
]

enable_alarm_actions = true

tags = {
  Environment = "production"
  ManagedBy   = "terraform"
  Project     = "culinary-canvas"
} 