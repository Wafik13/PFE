# Industrial Intelligence Platform (IIP) - Operational Guidelines

This document provides comprehensive operational guidelines for managing and maintaining the Industrial Intelligence Platform in production environments.

## Table of Contents

1. [Platform Overview](#platform-overview)
2. [Deployment Strategy](#deployment-strategy)
3. [Security Management](#security-management)
4. [Monitoring and Observability](#monitoring-and-observability)
5. [Backup and Disaster Recovery](#backup-and-disaster-recovery)
6. [Scaling and Performance](#scaling-and-performance)
7. [Troubleshooting](#troubleshooting)
8. [Maintenance Procedures](#maintenance-procedures)
9. [Compliance and Auditing](#compliance-and-auditing)
10. [Emergency Procedures](#emergency-procedures)

## Platform Overview

### Architecture Components

- **Edge Layer**: NVIDIA Jetson devices with MQTT/OPC-UA protocols
- **API Gateway**: Kong for traffic management and security
- **Service Mesh**: Istio for inter-service communication
- **Microservices**: SCADA control, Data Analytics, ML Inference
- **Storage Layer**: PostgreSQL, InfluxDB, MinIO, Redis, RabbitMQ
- **MLOps**: Feast, MLflow, Argo Workflows, KServe/Triton
- **Frontend**: React SPA with real-time dashboards
- **CI/CD**: GitLab CI with ArgoCD GitOps

### Environment Structure

```
Production Environment
├── iip-infrastructure (databases, messaging)
├── iip-applications (microservices, frontend)
├── iip-mlops (ML components)
├── monitoring (Prometheus, Grafana)
└── istio-system (service mesh)
```

## Deployment Strategy

### GitOps Workflow

1. **Development**
   - Feature branches trigger CI pipeline
   - Automated testing and security scanning
   - Deploy to development environment

2. **Staging**
   - Main branch deployments
   - Integration testing
   - Performance validation

3. **Production**
   - Tag-based releases
   - Manual approval gates
   - Blue-green deployment strategy

### Deployment Commands

```bash
# Deploy to development
argocd app sync iip-platform-dev

# Deploy to staging
argocd app sync iip-platform-staging

# Deploy to production (requires approval)
argocd app sync iip-platform-prod

# Rollback if needed
argocd app rollback iip-platform-prod
```

### Release Process

1. **Pre-deployment Checklist**
   - [ ] All tests passing
   - [ ] Security scans completed
   - [ ] Database migrations tested
   - [ ] Backup verification
   - [ ] Rollback plan prepared

2. **Deployment Steps**
   - Update image tags in ArgoCD
   - Monitor deployment progress
   - Verify health checks
   - Run smoke tests
   - Monitor metrics and logs

3. **Post-deployment Validation**
   - [ ] All services healthy
   - [ ] API endpoints responding
   - [ ] Real-time data flowing
   - [ ] ML inference working
   - [ ] Frontend accessible

## Security Management

### Secrets Management

```bash
# Rotate JWT secrets
kubectl create secret generic iip-jwt-secret \
  --from-literal=secret=$(openssl rand -base64 32) \
  --namespace=iip-applications \
  --dry-run=client -o yaml | kubectl apply -f -

# Update database passwords
kubectl patch secret postgresql-auth \
  --namespace=iip-infrastructure \
  --patch='{"data":{"password":"'$(echo -n "new-password" | base64)'"}}'

# Rotate TLS certificates
certbot renew --nginx
kubectl create secret tls iip-tls-secret \
  --cert=path/to/cert.pem \
  --key=path/to/key.pem \
  --namespace=iip-infrastructure
```

### RBAC Management

```bash
# Create service account for new service
kubectl create serviceaccount new-service-sa --namespace=iip-applications

# Bind role to service account
kubectl create rolebinding new-service-binding \
  --role=iip-application-role \
  --serviceaccount=iip-applications:new-service-sa \
  --namespace=iip-applications
```

### Network Policies

- Deny all traffic by default
- Allow specific ingress/egress rules
- Isolate namespaces
- Monitor network traffic

## Monitoring and Observability

### Key Metrics to Monitor

#### Infrastructure Metrics
- CPU, Memory, Disk usage
- Network I/O and latency
- Pod restart counts
- Node health status

#### Application Metrics
- Request rate and latency
- Error rates (4xx, 5xx)
- Database connection pools
- Message queue depths

#### Business Metrics
- SCADA data ingestion rate
- ML inference latency
- Predictive maintenance alerts
- Equipment uptime

### Alerting Rules

```yaml
# Critical Alerts
- alert: ServiceDown
  expr: up == 0
  for: 1m
  labels:
    severity: critical
  annotations:
    summary: "Service {{ $labels.instance }} is down"

- alert: HighErrorRate
  expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
  for: 2m
  labels:
    severity: warning
  annotations:
    summary: "High error rate detected"

- alert: DatabaseConnectionHigh
  expr: postgresql_connections_active / postgresql_connections_max > 0.8
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Database connection pool usage high"
```

### Log Management

```bash
# View application logs
kubectl logs -f deployment/scada-service -n iip-applications

# Search logs with specific pattern
kubectl logs -n iip-applications -l app=scada-service | grep ERROR

# Export logs for analysis
kubectl logs --since=1h -n iip-applications -l app=analytics-service > analytics.log
```

## Backup and Disaster Recovery

### Backup Strategy

#### Daily Backups
- PostgreSQL database dumps
- InfluxDB snapshots
- MinIO bucket replication
- Configuration backups

#### Weekly Backups
- Full cluster state backup
- Persistent volume snapshots
- Certificate backups

### Backup Commands

```bash
# PostgreSQL backup
kubectl exec -n iip-infrastructure postgresql-primary-0 -- \
  pg_dump -U postgres iip_database > backup_$(date +%Y%m%d).sql

# InfluxDB backup
kubectl exec -n iip-infrastructure influxdb-0 -- \
  influx backup /tmp/backup_$(date +%Y%m%d)

# MinIO backup (using mc client)
mc mirror minio/iip-data-lake s3://backup-bucket/$(date +%Y%m%d)/

# Velero cluster backup
velero backup create daily-backup-$(date +%Y%m%d) \
  --include-namespaces iip-infrastructure,iip-applications,iip-mlops
```

### Recovery Procedures

#### Database Recovery

```bash
# PostgreSQL recovery
kubectl exec -n iip-infrastructure postgresql-primary-0 -- \
  psql -U postgres -d iip_database < backup_20231201.sql

# InfluxDB recovery
kubectl exec -n iip-infrastructure influxdb-0 -- \
  influx restore /tmp/backup_20231201
```

#### Cluster Recovery

```bash
# Restore from Velero backup
velero restore create --from-backup daily-backup-20231201

# Verify restoration
kubectl get pods --all-namespaces
kubectl get pvc --all-namespaces
```

## Scaling and Performance

### Horizontal Pod Autoscaling

```bash
# Check HPA status
kubectl get hpa -n iip-applications

# Scale manually if needed
kubectl scale deployment scada-service --replicas=5 -n iip-applications

# Update HPA configuration
kubectl patch hpa scada-service-hpa -n iip-applications \
  --patch='{"spec":{"maxReplicas":10}}'
```

### Vertical Pod Autoscaling

```bash
# Check VPA recommendations
kubectl describe vpa scada-service-vpa -n iip-applications

# Apply VPA recommendations
kubectl patch deployment scada-service -n iip-applications \
  --patch='{"spec":{"template":{"spec":{"containers":[{"name":"scada-service","resources":{"requests":{"cpu":"500m","memory":"1Gi"}}}]}}}}'
```

### Database Scaling

```bash
# Scale PostgreSQL read replicas
kubectl scale statefulset postgresql-read --replicas=3 -n iip-infrastructure

# Scale Redis cluster
kubectl scale statefulset redis --replicas=6 -n iip-infrastructure
```

## Troubleshooting

### Common Issues

#### Pod Startup Issues

```bash
# Check pod status
kubectl get pods -n iip-applications

# Describe pod for events
kubectl describe pod <pod-name> -n iip-applications

# Check logs
kubectl logs <pod-name> -n iip-applications --previous
```

#### Network Connectivity Issues

```bash
# Test service connectivity
kubectl exec -n iip-applications <pod-name> -- \
  curl -v http://postgresql.iip-infrastructure.svc.cluster.local:5432

# Check network policies
kubectl get networkpolicies -n iip-applications

# Verify DNS resolution
kubectl exec -n iip-applications <pod-name> -- \
  nslookup postgresql.iip-infrastructure.svc.cluster.local
```

#### Performance Issues

```bash
# Check resource usage
kubectl top pods -n iip-applications
kubectl top nodes

# Check for resource constraints
kubectl describe node <node-name>

# Review metrics in Grafana
# Navigate to IIP Platform Overview dashboard
```

### Debug Commands

```bash
# Get cluster information
kubectl cluster-info
kubectl get nodes -o wide

# Check system pods
kubectl get pods -n kube-system
kubectl get pods -n istio-system

# Verify certificates
kubectl get certificates -A
kubectl describe certificate iip-tls-secret -n iip-infrastructure

# Check Istio configuration
istioctl proxy-config cluster <pod-name> -n iip-applications
istioctl analyze -n iip-applications
```

## Maintenance Procedures

### Regular Maintenance Tasks

#### Daily
- [ ] Check cluster health
- [ ] Review alerts and logs
- [ ] Verify backup completion
- [ ] Monitor resource usage

#### Weekly
- [ ] Update security patches
- [ ] Review performance metrics
- [ ] Clean up old logs
- [ ] Test disaster recovery procedures

#### Monthly
- [ ] Rotate secrets and certificates
- [ ] Update dependencies
- [ ] Capacity planning review
- [ ] Security audit

### Maintenance Commands

```bash
# Update cluster components
kubectl apply -f k8s-manifests/

# Clean up completed jobs
kubectl delete jobs --field-selector status.successful=1 -A

# Clean up old pods
kubectl delete pods --field-selector status.phase=Succeeded -A

# Update Helm charts
helm repo update
helm upgrade iip-platform helm-charts/iip-platform/
```

### Node Maintenance

```bash
# Drain node for maintenance
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data

# Perform maintenance (OS updates, hardware replacement)

# Uncordon node
kubectl uncordon <node-name>

# Verify node is ready
kubectl get nodes
```

## Compliance and Auditing

### Security Compliance

- **ISO 27001**: Information security management
- **IEC 62443**: Industrial cybersecurity standards
- **NIST Cybersecurity Framework**: Risk management
- **SOC 2 Type II**: Service organization controls

### Audit Procedures

```bash
# Generate audit logs
kubectl get events --all-namespaces --sort-by='.lastTimestamp'

# Export RBAC configuration
kubectl get rolebindings,clusterrolebindings -o yaml > rbac-audit.yaml

# Check security policies
kubectl get networkpolicies -A -o yaml > network-policies-audit.yaml

# Verify encryption at rest
kubectl get secrets -A -o yaml | grep -E "type:|data:"
```

### Compliance Monitoring

- Regular vulnerability scans
- Access control reviews
- Data encryption verification
- Audit trail maintenance

## Emergency Procedures

### Incident Response

#### Severity Levels

1. **Critical (P1)**: Complete system outage
2. **High (P2)**: Major functionality impacted
3. **Medium (P3)**: Minor functionality impacted
4. **Low (P4)**: Cosmetic issues

#### Response Procedures

##### P1 - Critical Incident

1. **Immediate Actions** (0-15 minutes)
   - Acknowledge alert
   - Assess impact and scope
   - Activate incident response team
   - Implement immediate workarounds

2. **Investigation** (15-60 minutes)
   - Identify root cause
   - Gather relevant logs and metrics
   - Document findings

3. **Resolution** (1-4 hours)
   - Implement fix
   - Test resolution
   - Monitor for stability
   - Communicate status updates

4. **Post-Incident** (24-48 hours)
   - Conduct post-mortem
   - Document lessons learned
   - Implement preventive measures

### Emergency Contacts

```yaml
Incident Response Team:
  - Platform Lead: +1-555-0101
  - DevOps Engineer: +1-555-0102
  - Security Officer: +1-555-0103
  - Database Admin: +1-555-0104

Escalation:
  - Engineering Manager: +1-555-0201
  - CTO: +1-555-0301

External Support:
  - Cloud Provider: Support Portal
  - Kubernetes Support: Enterprise Support
  - Security Vendor: 24/7 Hotline
```

### Emergency Commands

```bash
# Emergency scale down
kubectl scale deployment --all --replicas=0 -n iip-applications

# Emergency rollback
argocd app rollback iip-platform-prod

# Emergency maintenance mode
kubectl patch ingress iip-ingress -n iip-applications \
  --patch='{"metadata":{"annotations":{"nginx.ingress.kubernetes.io/default-backend":"maintenance-page"}}}'

# Emergency cluster drain
for node in $(kubectl get nodes -o name); do
  kubectl drain $node --ignore-daemonsets --delete-emptydir-data --force
done
```

## Performance Optimization

### Database Optimization

```sql
-- PostgreSQL performance tuning
SELECT * FROM pg_stat_activity WHERE state = 'active';
SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del 
FROM pg_stat_user_tables ORDER BY n_tup_ins DESC;

-- Create indexes for frequently queried columns
CREATE INDEX CONCURRENTLY idx_sensor_data_timestamp 
ON sensor_data(timestamp) WHERE timestamp > NOW() - INTERVAL '30 days';
```

### Application Optimization

```bash
# Profile application performance
kubectl exec -n iip-applications scada-service-xxx -- \
  python -m cProfile -o profile.stats app.py

# Monitor memory usage
kubectl exec -n iip-applications scada-service-xxx -- \
  python -m memory_profiler app.py
```

### Network Optimization

```bash
# Optimize Istio configuration
istioctl proxy-config cluster scada-service-xxx.iip-applications

# Check service mesh performance
istioctl proxy-config listeners scada-service-xxx.iip-applications
```

## Conclusion

This operational guide provides the foundation for managing the Industrial Intelligence Platform effectively. Regular review and updates of these procedures ensure optimal performance, security, and reliability of the platform.

For additional support or questions, refer to the platform documentation or contact the engineering team.

---

**Document Version**: 1.0  
**Last Updated**: December 2023  
**Next Review**: March 2024