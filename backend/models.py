from pydantic import BaseModel, Field
from datetime import datetime
from typing import Dict, List, Optional, Any, Union
from enum import Enum

class MachineStatus(str, Enum):
    RUNNING = "running"
    IDLE = "idle"
    MAINTENANCE = "maintenance"
    ERROR = "error"
    OFFLINE = "offline"

class AlarmSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"
    WARNING = "warning"

class AlertType(str, Enum):
    FAULT_PREDICTION = "fault_prediction"
    ANOMALY_DETECTION = "anomaly_detection"
    PERFORMANCE_DEGRADATION = "performance_degradation"
    MAINTENANCE_REQUIRED = "maintenance_required"
    SENSOR_DRIFT = "sensor_drift"
    VALVE_WEAR = "valve_wear"

class ProcessData(BaseModel):
    """Model for process data from machines"""
    machine_id: str
    timestamp: datetime
    temperature: float = Field(..., description="Temperature in Celsius")
    pressure: float = Field(..., description="Pressure in bar")
    flow_rate: float = Field(..., description="Flow rate in L/min")
    motor_speed: float = Field(..., description="Motor speed in RPM")
    vibration: float = Field(..., description="Vibration level in mm/s")
    power_consumption: float = Field(..., description="Power consumption in kW")
    additional_params: Optional[Dict[str, Any]] = Field(default_factory=dict)

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class AlarmData(BaseModel):
    """Model for alarm data"""
    machine_id: str
    timestamp: datetime
    alarm_id: str
    severity: AlarmSeverity
    message: str
    acknowledged: bool = False
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    resolved: bool = False
    resolved_at: Optional[datetime] = None
    category: Optional[str] = None
    source: Optional[str] = None

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }

class StatusData(BaseModel):
    """Model for machine status data"""
    machine_id: str
    timestamp: datetime
    status: MachineStatus
    health_score: float = Field(..., ge=0, le=100, description="Health score percentage")
    uptime_percentage: float = Field(..., ge=0, le=100, description="Uptime percentage")
    last_maintenance: Optional[datetime] = None
    next_maintenance: Optional[datetime] = None
    operating_hours: Optional[float] = None
    cycle_count: Optional[int] = None
    efficiency: Optional[float] = Field(None, ge=0, le=100, description="Efficiency percentage")
    availability: Optional[float] = Field(None, ge=0, le=100, description="Availability percentage")

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }

class ControlCommand(BaseModel):
    """Model for control commands"""
    machine_id: str
    command: str
    parameters: Dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime
    user_id: Optional[str] = None
    command_id: Optional[str] = None
    status: str = "pending"  # pending, sent, acknowledged, completed, failed
    response: Optional[str] = None

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class MLAlert(BaseModel):
    """Model for ML-generated alerts"""
    machine_id: str
    timestamp: datetime
    alert_type: AlertType
    severity: AlarmSeverity
    message: str
    confidence: float = Field(..., ge=0, le=1, description="Confidence score")
    ttf_days: Optional[float] = Field(None, description="Time to failure in days")
    mtbf_hours: Optional[float] = Field(None, description="Mean time between failures in hours")
    anomaly_score: Optional[float] = Field(None, ge=0, le=1, description="Anomaly score")
    affected_components: Optional[List[str]] = Field(default_factory=list)
    recommended_actions: Optional[List[str]] = Field(default_factory=list)
    model_version: Optional[str] = None
    features_used: Optional[Dict[str, Any]] = Field(default_factory=dict)

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class MachineOverview(BaseModel):
    """Model for machine overview data"""
    machine_id: str
    name: str
    type: str
    location: str
    status: MachineStatus
    health_score: float
    uptime_percentage: float
    last_maintenance: Optional[datetime]
    next_maintenance: Optional[datetime]
    active_alarms: int
    critical_alerts: int
    efficiency: Optional[float] = None
    availability: Optional[float] = None
    last_updated: datetime

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }

class MachineDetails(BaseModel):
    """Model for detailed machine information"""
    machine_id: str
    name: str
    type: str
    location: str
    manufacturer: str
    model: str
    serial_number: str
    installation_date: Optional[datetime]
    status: MachineStatus
    health_score: float
    uptime_percentage: float
    last_maintenance: Optional[datetime]
    next_maintenance: Optional[datetime]
    operating_hours: Optional[float]
    cycle_count: Optional[int]
    efficiency: Optional[float]
    availability: Optional[float]
    specifications: Optional[Dict[str, Any]] = Field(default_factory=dict)
    current_process_data: Optional[ProcessData] = None
    recent_alarms: Optional[List[AlarmData]] = Field(default_factory=list)
    ml_alerts: Optional[List[MLAlert]] = Field(default_factory=list)
    last_updated: datetime

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }

class AuthToken(BaseModel):
    """Model for authentication token"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    refresh_token: Optional[str] = None
    scope: Optional[str] = None

class User(BaseModel):
    """Model for user data"""
    user_id: str
    username: str
    email: str
    full_name: str
    role: str
    permissions: List[str] = Field(default_factory=list)
    last_login: Optional[datetime] = None
    created_at: datetime
    is_active: bool = True

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }

class SystemStatus(BaseModel):
    """Model for overall system status"""
    timestamp: datetime
    total_machines: int
    running_machines: int
    idle_machines: int
    maintenance_machines: int
    error_machines: int
    offline_machines: int
    total_alarms: int
    critical_alarms: int
    warning_alarms: int
    average_health_score: float
    average_uptime: float
    system_load: Optional[float] = None
    memory_usage: Optional[float] = None
    disk_usage: Optional[float] = None
    network_status: str = "healthy"
    mqtt_status: str = "connected"
    database_status: str = "healthy"

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class WebSocketMessage(BaseModel):
    """Model for WebSocket messages"""
    type: str  # process_data, alarm, status, ml_alert, command_response
    machine_id: Optional[str] = None
    timestamp: datetime
    data: Dict[str, Any]
    message_id: Optional[str] = None

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class HistoricalDataRequest(BaseModel):
    """Model for historical data requests"""
    machine_id: Optional[str] = None
    start_time: datetime
    end_time: datetime
    data_type: str  # process, alarms, status, ml_alerts
    aggregation: Optional[str] = None  # avg, min, max, sum
    interval: Optional[str] = None  # 1m, 5m, 1h, 1d
    limit: Optional[int] = Field(None, le=10000)

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class MaintenanceRecord(BaseModel):
    """Model for maintenance records"""
    record_id: str
    machine_id: str
    maintenance_type: str  # preventive, corrective, emergency
    scheduled_date: datetime
    actual_date: Optional[datetime] = None
    duration_hours: Optional[float] = None
    technician: Optional[str] = None
    description: str
    parts_replaced: Optional[List[str]] = Field(default_factory=list)
    cost: Optional[float] = None
    status: str = "scheduled"  # scheduled, in_progress, completed, cancelled
    notes: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }