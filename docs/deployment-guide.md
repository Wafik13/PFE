# Industrial Intelligence Platform (IIP) - Deployment Guide

This guide provides comprehensive instructions for deploying the Industrial Intelligence Platform across different environments using Kubernetes and Helm.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Infrastructure Preparation](#infrastructure-preparation)
4. [Deployment Process](#deployment-process)
5. [Post-Deployment Configuration](#post-deployment-configuration)
6. [Verification and Testing](#verification-and-testing)
7. [Troubleshooting](#troubleshooting)
8. [Scaling and Optimization](#scaling-and-optimization)

## Prerequisites

### Required Tools

```bash
# Install required CLI tools
kubectl >= 1.25.0
helm >= 3.10.0
argocd >= 2.8.0
istioctl >= 1.18.0
git >= 2.30.0
docker >= 20.10.0
```

### Kubernetes Cluster Requirements

- **Minimum Cluster Size:**
  - Development: 3 nodes (4 vCPU, 16GB RAM each)
  - Staging: 5 nodes (8 vCPU, 32GB RAM each)
  - Production: 10+ nodes (16 vCPU, 64GB RAM each)

- **Node Labels and Taints:**
  ```bash
  # Infrastructure nodes
  kubectl label nodes node-infra-1 node-infra-2 node-infra-3 node-type=infrastructure
  kubectl taint nodes node-infra-1 node-infra-2 node-infra-3 dedicated=infrastructure:NoSchedule
  
  # Application nodes
  kubectl label nodes node-app-1 node-app-2 node-app-3 node-type=application
  
  # ML/GPU nodes
  kubectl label nodes node-gpu-1 node-gpu-2 node-type=ml-inference
  kubectl label nodes node-gpu-1 node-gpu-2 accelerator=nvidia-tesla-v100
  kubectl taint nodes node-gpu-1 node-gpu-2 dedicated=gpu:NoSchedule
  ```

- **Storage Classes:**
  ```bash
  # Verify storage classes are available
  kubectl get storageclass
  # Expected: iip-ssd, iip-hdd, iip-nvme, iip-ssd-retain
  ```

### Network Requirements

- **Ingress Controller:** NGINX Ingress Controller
- **Service Mesh:** Istio 1.18+
- **DNS:** External DNS for automatic DNS management
- **Certificates:** cert-manager for TLS certificate management

## Environment Setup

### 1. Clone the Repository

```bash
git clone https://gitlab.company.com/iip/platform.git
cd platform
```

### 2. Environment-Specific Configuration

#### Development Environment

```bash
# Set environment variables
export ENVIRONMENT=dev
export DOMAIN=dev-iip.company.com
export NAMESPACE_PREFIX=iip-dev

# Copy and customize values
cp helm-charts/iip-platform/values-dev.yaml values-local.yaml
# Edit values-local.yaml with your specific configuration
```

#### Staging Environment

```bash
# Set environment variables
export ENVIRONMENT=staging
export DOMAIN=staging-iip.company.com
export NAMESPACE_PREFIX=iip-staging

# Use staging values
cp helm-charts/iip-platform/values-staging.yaml values-staging-local.yaml
```

#### Production Environment

```bash
# Set environment variables
export ENVIRONMENT=prod
export DOMAIN=iip.company.com
export NAMESPACE_PREFIX=iip-prod

# Use production values
cp helm-charts/iip-platform/values-prod.yaml values-prod-local.yaml
```

### 3. Secrets Management

#### Create Secret Files

```bash
# Create secrets directory
mkdir -p secrets/${ENVIRONMENT}

# Database passwords
echo -n 'your-postgres-password' > secrets/${ENVIRONMENT}/postgres-password
echo -n 'your-redis-password' > secrets/${ENVIRONMENT}/redis-password
echo -n 'your-rabbitmq-password' > secrets/${ENVIRONMENT}/rabbitmq-password

# MinIO credentials
echo -n 'minio-admin' > secrets/${ENVIRONMENT}/minio-root-user
echo -n 'your-minio-password' > secrets/${ENVIRONMENT}/minio-root-password

# InfluxDB credentials
echo -n 'influx-admin' > secrets/${ENVIRONMENT}/influxdb-admin-user
echo -n 'your-influxdb-password' > secrets/${ENVIRONMENT}/influxdb-admin-password
echo -n 'your-influxdb-token' > secrets/${ENVIRONMENT}/influxdb-admin-token

# JWT secret
openssl rand -base64 32 > secrets/${ENVIRONMENT}/jwt-secret

# API keys
echo -n 'your-weather-api-key' > secrets/${ENVIRONMENT}/weather-api-key
echo -n 'your-mqtt-username' > secrets/${ENVIRONMENT}/mqtt-username
echo -n 'your-mqtt-password' > secrets/${ENVIRONMENT}/mqtt-password
```

#### Apply Secrets to Kubernetes

```bash
# Create secrets in Kubernetes
kubectl create secret generic iip-database-secrets \
  --from-file=postgres-password=secrets/${ENVIRONMENT}/postgres-password \
  --from-file=redis-password=secrets/${ENVIRONMENT}/redis-password \
  --from-file=rabbitmq-password=secrets/${ENVIRONMENT}/rabbitmq-password \
  -n iip-infrastructure

kubectl create secret generic iip-storage-secrets \
  --from-file=minio-root-user=secrets/${ENVIRONMENT}/minio-root-user \
  --from-file=minio-root-password=secrets/${ENVIRONMENT}/minio-root-password \
  --from-file=influxdb-admin-user=secrets/${ENVIRONMENT}/influxdb-admin-user \
  --from-file=influxdb-admin-password=secrets/${ENVIRONMENT}/influxdb-admin-password \
  --from-file=influxdb-admin-token=secrets/${ENVIRONMENT}/influxdb-admin-token \
  -n iip-infrastructure

kubectl create secret generic iip-auth-secrets \
  --from-file=jwt-secret=secrets/${ENVIRONMENT}/jwt-secret \
  -n iip-applications

kubectl create secret generic iip-external-secrets \
  --from-file=weather-api-key=secrets/${ENVIRONMENT}/weather-api-key \
  --from-file=mqtt-username=secrets/${ENVIRONMENT}/mqtt-username \
  --from-file=mqtt-password=secrets/${ENVIRONMENT}/mqtt-password \
  -n iip-applications
```

## Infrastructure Preparation

### 1. Install Core Infrastructure

#### Install Istio Service Mesh

```bash
# Download and install Istio
curl -L https://istio.io/downloadIstio | sh -
export PATH=$PWD/istio-1.18.0/bin:$PATH

# Install Istio
istioctl install --set values.defaultRevision=default -y

# Enable sidecar injection for namespaces
kubectl label namespace iip-applications istio-injection=enabled
kubectl label namespace iip-mlops istio-injection=enabled
```

#### Install NGINX Ingress Controller

```bash
# Add NGINX Helm repository
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

# Install NGINX Ingress Controller
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.replicaCount=3 \
  --set controller.nodeSelector."node-type"=infrastructure \
  --set controller.tolerations[0].key=dedicated \
  --set controller.tolerations[0].value=infrastructure \
  --set controller.tolerations[0].effect=NoSchedule
```

#### Install cert-manager

```bash
# Add cert-manager Helm repository
helm repo add jetstack https://charts.jetstack.io
helm repo update

# Install cert-manager
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set installCRDs=true

# Create ClusterIssuer for Let's Encrypt
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-${ENVIRONMENT}
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@company.com
    privateKeySecretRef:
      name: letsencrypt-${ENVIRONMENT}
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

### 2. Install ArgoCD (GitOps)

```bash
# Add ArgoCD Helm repository
helm repo add argo https://argoproj.github.io/argo-helm
helm repo update

# Install ArgoCD
helm install argocd argo/argo-cd \
  --namespace argocd \
  --create-namespace \
  --set server.extraArgs[0]=--insecure \
  --set server.ingress.enabled=true \
  --set server.ingress.hosts[0]=argocd.${DOMAIN} \
  --set server.ingress.tls[0].secretName=argocd-tls \
  --set server.ingress.tls[0].hosts[0]=argocd.${DOMAIN}

# Get ArgoCD admin password
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
```

## Deployment Process

### Method 1: Direct Helm Deployment

#### 1. Add Required Helm Repositories

```bash
# Add all required Helm repositories
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo add kong https://charts.konghq.com
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts
helm repo add argo https://argoproj.github.io/argo-helm
helm repo update
```

#### 2. Deploy Infrastructure Components

```bash
# Deploy the IIP platform
helm install iip-platform ./helm-charts/iip-platform \
  --namespace iip-infrastructure \
  --create-namespace \
  --values values-${ENVIRONMENT}-local.yaml \
  --timeout 20m
```

#### 3. Monitor Deployment

```bash
# Watch deployment progress
kubectl get pods -n iip-infrastructure -w
kubectl get pods -n iip-applications -w
kubectl get pods -n iip-mlops -w

# Check deployment status
helm status iip-platform -n iip-infrastructure
```

### Method 2: GitOps with ArgoCD

#### 1. Configure ArgoCD Applications

```bash
# Apply ArgoCD applications
kubectl apply -f argocd/argocd-applications.yaml

# Sync applications
argocd app sync iip-platform-${ENVIRONMENT}
argocd app sync iip-infrastructure-${ENVIRONMENT}
argocd app sync iip-applications-${ENVIRONMENT}
argocd app sync iip-mlops-${ENVIRONMENT}
```

#### 2. Monitor ArgoCD Sync

```bash
# Check application status
argocd app list
argocd app get iip-platform-${ENVIRONMENT}

# Watch sync progress
argocd app wait iip-platform-${ENVIRONMENT} --timeout 1200
```

## Post-Deployment Configuration

### 1. Database Initialization

```bash
# Wait for PostgreSQL to be ready
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=postgresql -n iip-infrastructure --timeout=300s

# Initialize databases
kubectl exec -it postgresql-primary-0 -n iip-infrastructure -- psql -U postgres -c "CREATE DATABASE scada;"
kubectl exec -it postgresql-primary-0 -n iip-infrastructure -- psql -U postgres -c "CREATE DATABASE analytics;"
kubectl exec -it postgresql-primary-0 -n iip-infrastructure -- psql -U postgres -c "CREATE DATABASE mlflow;"
kubectl exec -it postgresql-primary-0 -n iip-infrastructure -- psql -U postgres -c "CREATE DATABASE feast;"
```

### 2. MinIO Bucket Creation

```bash
# Wait for MinIO to be ready
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=minio -n iip-infrastructure --timeout=300s

# Create required buckets
kubectl exec -it minio-0 -n iip-infrastructure -- mc alias set local http://localhost:9000 $MINIO_ROOT_USER $MINIO_ROOT_PASSWORD
kubectl exec -it minio-0 -n iip-infrastructure -- mc mb local/scada-data
kubectl exec -it minio-0 -n iip-infrastructure -- mc mb local/analytics-data
kubectl exec -it minio-0 -n iip-infrastructure -- mc mb local/ml-models
kubectl exec -it minio-0 -n iip-infrastructure -- mc mb local/mlflow-artifacts
kubectl exec -it minio-0 -n iip-infrastructure -- mc mb local/feast-data
```

### 3. InfluxDB Setup

```bash
# Wait for InfluxDB to be ready
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=influxdb -n iip-infrastructure --timeout=300s

# Create organization and buckets
kubectl exec -it influxdb-0 -n iip-infrastructure -- influx org create -n iip-${ENVIRONMENT}
kubectl exec -it influxdb-0 -n iip-infrastructure -- influx bucket create -n scada-metrics -o iip-${ENVIRONMENT}
kubectl exec -it influxdb-0 -n iip-infrastructure -- influx bucket create -n sensor-data -o iip-${ENVIRONMENT}
kubectl exec -it influxdb-0 -n iip-infrastructure -- influx bucket create -n performance-metrics -o iip-${ENVIRONMENT}
```

### 4. Kong API Gateway Configuration

```bash
# Wait for Kong to be ready
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=kong -n iip-infrastructure --timeout=300s

# Configure Kong services and routes (if not using declarative config)
kubectl exec -it kong-0 -n iip-infrastructure -- kong config init
```

### 5. ML Model Deployment

```bash
# Deploy sample ML models
kubectl apply -f k8s-manifests/ml-models/

# Verify KServe InferenceServices
kubectl get inferenceservice -n iip-mlops
```

## Verification and Testing

### 1. Health Checks

```bash
# Check all pods are running
kubectl get pods --all-namespaces | grep -v Running

# Check services
kubectl get svc --all-namespaces

# Check ingress
kubectl get ingress --all-namespaces
```

### 2. Connectivity Tests

```bash
# Test internal connectivity
kubectl run test-pod --image=curlimages/curl --rm -it --restart=Never -- /bin/sh

# Inside the test pod:
curl http://postgresql.iip-infrastructure.svc.cluster.local:5432
curl http://redis-master.iip-infrastructure.svc.cluster.local:6379
curl http://minio.iip-infrastructure.svc.cluster.local:9000
curl http://influxdb.iip-infrastructure.svc.cluster.local:8086
```

### 3. API Tests

```bash
# Test API Gateway
curl -k https://${DOMAIN}/api/health

# Test SCADA API
curl -k https://${DOMAIN}/api/scada/status

# Test ML Inference API
curl -k https://${DOMAIN}/api/ml/predict -X POST -H "Content-Type: application/json" -d '{"data": [1,2,3,4,5]}'
```

### 4. Frontend Access

```bash
# Access the frontend
echo "Frontend URL: https://${DOMAIN}"
echo "Grafana URL: https://${DOMAIN}/grafana"
echo "ArgoCD URL: https://argocd.${DOMAIN}"
```

### 5. Monitoring Verification

```bash
# Check Prometheus targets
kubectl port-forward svc/prometheus-server 9090:80 -n iip-infrastructure
# Open http://localhost:9090/targets

# Check Grafana dashboards
kubectl port-forward svc/grafana 3000:80 -n iip-infrastructure
# Open http://localhost:3000
```

## Troubleshooting

### Common Issues

#### 1. Pod Startup Issues

```bash
# Check pod logs
kubectl logs <pod-name> -n <namespace> --previous

# Describe pod for events
kubectl describe pod <pod-name> -n <namespace>

# Check resource constraints
kubectl top pods -n <namespace>
kubectl top nodes
```

#### 2. Storage Issues

```bash
# Check PVC status
kubectl get pvc --all-namespaces

# Check storage classes
kubectl get storageclass

# Check PV status
kubectl get pv
```

#### 3. Network Issues

```bash
# Check network policies
kubectl get networkpolicy --all-namespaces

# Check Istio configuration
istioctl proxy-config cluster <pod-name> -n <namespace>
istioctl analyze
```

#### 4. Certificate Issues

```bash
# Check certificate status
kubectl get certificate --all-namespaces
kubectl describe certificate <cert-name> -n <namespace>

# Check cert-manager logs
kubectl logs -n cert-manager deployment/cert-manager
```

### Recovery Procedures

#### 1. Database Recovery

```bash
# Restore from backup
kubectl exec -it postgresql-primary-0 -n iip-infrastructure -- pg_restore -U postgres -d <database> /backup/<backup-file>

# Check database connectivity
kubectl exec -it postgresql-primary-0 -n iip-infrastructure -- psql -U postgres -c "\l"
```

#### 2. Storage Recovery

```bash
# Restore MinIO data
kubectl exec -it minio-0 -n iip-infrastructure -- mc mirror /backup/minio/ local/

# Restore InfluxDB data
kubectl exec -it influxdb-0 -n iip-infrastructure -- influx restore /backup/influxdb/
```

## Scaling and Optimization

### 1. Horizontal Scaling

```bash
# Scale deployments
kubectl scale deployment scada-service --replicas=5 -n iip-applications
kubectl scale deployment ml-inference --replicas=3 -n iip-applications

# Scale StatefulSets
kubectl scale statefulset postgresql-primary --replicas=3 -n iip-infrastructure
```

### 2. Vertical Scaling

```bash
# Update resource requests/limits
kubectl patch deployment scada-service -n iip-applications -p '{
  "spec": {
    "template": {
      "spec": {
        "containers": [{
          "name": "scada",
          "resources": {
            "requests": {"cpu": "1", "memory": "2Gi"},
            "limits": {"cpu": "2", "memory": "4Gi"}
          }
        }]
      }
    }
  }
}'
```

### 3. Performance Tuning

```bash
# Optimize database connections
kubectl exec -it postgresql-primary-0 -n iip-infrastructure -- psql -U postgres -c "ALTER SYSTEM SET max_connections = 200;"
kubectl exec -it postgresql-primary-0 -n iip-infrastructure -- psql -U postgres -c "SELECT pg_reload_conf();"

# Optimize Redis memory
kubectl exec -it redis-master-0 -n iip-infrastructure -- redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

### 4. Monitoring and Alerting

```bash
# Add custom alerts
kubectl apply -f monitoring/custom-alerts.yaml

# Configure alert routing
kubectl apply -f monitoring/alert-routing.yaml
```

## Security Hardening

### 1. Network Security

```bash
# Apply strict network policies
kubectl apply -f k8s-manifests/security/network-policies-strict.yaml

# Enable Istio mTLS
kubectl apply -f - <<EOF
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: iip-applications
spec:
  mtls:
    mode: STRICT
EOF
```

### 2. RBAC Hardening

```bash
# Apply minimal RBAC
kubectl apply -f k8s-manifests/security/rbac-minimal.yaml

# Remove default service account permissions
kubectl patch serviceaccount default -n iip-applications -p '{"automountServiceAccountToken": false}'
```

### 3. Pod Security

```bash
# Apply Pod Security Standards
kubectl label namespace iip-applications pod-security.kubernetes.io/enforce=restricted
kubectl label namespace iip-applications pod-security.kubernetes.io/audit=restricted
kubectl label namespace iip-applications pod-security.kubernetes.io/warn=restricted
```

This deployment guide provides a comprehensive approach to deploying and managing the Industrial Intelligence Platform. Follow the steps sequentially and refer to the troubleshooting section for any issues encountered during deployment.