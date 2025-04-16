# Culinary Canvas Monitoring

This directory contains the monitoring configuration for the Culinary Canvas application. The monitoring setup includes:

- Prometheus alerts for detecting issues
- Grafana dashboards for visualizing metrics
- AWS Lambda health check function

## Components

### Prometheus Alerts

The `prometheus/alerts.yml` file contains alert rules that trigger notifications when certain conditions are met, such as:

- High error rates
- API latency issues
- Resource usage (CPU, memory, disk)
- Database performance problems
- Authentication issues

### Grafana Dashboard

The `dashboards/application-dashboard.json` file contains a comprehensive dashboard for monitoring the application's performance and health, including:

- HTTP request metrics by status code
- Response time percentiles
- System resource usage (CPU, memory, disk)
- Error rate monitoring
- Database query performance
- Supabase API usage

### Lambda Health Check

The `lambda/health-check.js` function runs on a schedule to test the application's API endpoints and reports metrics to CloudWatch. It checks:

- API endpoint availability
- Response time
- Error rates
- Success rates

## Setup and Deployment

The monitoring infrastructure is deployed automatically via the CI/CD pipeline. The configuration is managed in the infrastructure directory using Terraform.

### Deploying Prometheus and Grafana

The Prometheus and Grafana configuration is deployed as part of the main infrastructure deployment:

```bash
cd infrastructure
terraform init
terraform apply
```

### Deploying the Lambda Function

The Lambda function is deployed via GitHub Actions when changes are made to the Lambda code:

```bash
cd monitoring/lambda
npm install
npm run zip
# The GitHub Actions workflow will handle the deployment
```

## Accessing the Monitoring UI

- **Staging Environment**: https://monitoring-staging.culinarycanvas.example.com
- **Production Environment**: https://monitoring.culinarycanvas.example.com

## Alert Notifications

Alerts are sent to:

- Slack channel: #culinarycanvas-alerts
- Email: alerts@culinarycanvas.example.com

## Custom Metrics

The application sends custom metrics to Prometheus for monitoring:

- HTTP request counts and durations
- Database query performance
- Authentication metrics
- Session counts
- Supabase API usage

## Health Checks

Health checks are available at:

- `/api/health` - Basic health check
- `/api/health/deep` - Detailed health check with component status
- `/metrics` - Prometheus metrics endpoint

## Adding New Metrics

To add new metrics to the monitoring system:

1. Add the metric definition to `server/metrics.js`
2. Instrument your code to report the metric
3. Update the Grafana dashboard to visualize the metric
4. Add alert rules if needed

## Further Reading

- [Prometheus Documentation](https://prometheus.io/docs/introduction/overview/)
- [Grafana Documentation](https://grafana.com/docs/)
- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/) 