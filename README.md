# Industrial Intelligence Platform (IIP)

A comprehensive Kubernetes-based Industrial Intelligence Platform that integrates OT and IT systems, leveraging AI/ML for predictive maintenance, real-time SCADA control, and data analytics.

## Architecture Overview

### Core Components
- **Edge Gateway**: NVIDIA Jetson devices with MQTT and OPC-UA
- **Kubernetes Cluster**: Service mesh (Istio), Kong API Gateway
- **Microservices**: FastAPI/Flask with autoscaling
- **Storage**: InfluxDB, PostgreSQL, MinIO
- **Messaging**: RabbitMQ, Redis clusters
- **MLOps**: Feast, MLflow, Argo Workflows
- **CI/CD**: GitOps with ArgoCD
- **Frontend**: React SPA

### Security Features
- Multi-namespace DMZ architecture
- RBAC and network policies
- JWT authentication
- HTTPS/TLS encryption
- Secret management

## Project Structure

```
iip-platform/
├── helm-charts/           # Helm chart templates
├── k8s-manifests/         # Raw Kubernetes YAML files
├── infrastructure/        # Infrastructure components
├── microservices/         # Application services
├── mlops/                # MLOps components
├── security/             # Security policies and RBAC
├── networking/           # Istio and Kong configurations
├── ci-cd/               # GitLab CI and ArgoCD configs
├── monitoring/          # Prometheus and Grafana
└── docs/               # Documentation
```

## Quick Start

1. Deploy infrastructure components
2. Set up security policies
3. Deploy microservices
4. Configure MLOps pipeline
5. Set up monitoring and observability

## Documentation

See the `docs/` directory for detailed deployment guides and operational procedures.
