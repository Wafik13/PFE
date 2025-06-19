import asyncio
import logging
from collections import defaultdict, deque
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Deque
from threading import Lock

from models import (
    ProcessData, AlarmData, StatusData, ControlCommand, MLAlert,
    MachineOverview, MachineDetails, SystemStatus, MachineStatus
)

logger = logging.getLogger(__name__)

class DataStore:
    """In-memory data store for industrial data"""
    
    def __init__(self, max_history_size: int = 1000):
        self.max_history_size = max_history_size
        self.lock = Lock()
        
        # Data storage
        self.process_data: Dict[str, Deque[ProcessData]] = defaultdict(lambda: deque(maxlen=max_history_size))
        self.alarm_data: Dict[str, Deque[AlarmData]] = defaultdict(lambda: deque(maxlen=max_history_size))
        self.status_data: Dict[str, Deque[StatusData]] = defaultdict(lambda: deque(maxlen=max_history_size))
        self.ml_alerts: Dict[str, Deque[MLAlert]] = defaultdict(lambda: deque(maxlen=max_history_size))
        self.commands: Dict[str, Deque[ControlCommand]] = defaultdict(lambda: deque(maxlen=max_history_size))
        
        # Latest data cache for quick access
        self.latest_process: Dict[str, ProcessData] = {}
        self.latest_status: Dict[str, StatusData] = {}
        self.active_alarms: Dict[str, List[AlarmData]] = defaultdict(list)
        
        # Machine metadata
        self.machine_metadata: Dict[str, Dict[str, Any]] = {
            "BPM2000": {
                "name": "BPM2000 Production Line",
                "type": "Manufacturing Line",
                "location": "Factory Floor A",
                "manufacturer": "Industrial Systems Inc.",
                "model": "BPM2000-X",
                "serial_number": "BPM2000-001",
                "installation_date": "2020-01-15"
            },
            "Robot_C3": {
                "name": "Robotic Arm C3",
                "type": "Industrial Robot",
                "location": "Assembly Station 3",
                "manufacturer": "RoboTech Solutions",
                "model": "ARM-C3-Pro",
                "serial_number": "RBT-C3-007",
                "installation_date": "2021-03-10"
            },
            "Conveyor_A1": {
                "name": "Conveyor Belt A1",
                "type": "Material Handling",
                "location": "Production Line A",
                "manufacturer": "ConveyorCorp",
                "model": "CB-A1-2000",
                "serial_number": "CNV-A1-123",
                "installation_date": "2019-11-20"
            },
            "Press_B2": {
                "name": "Hydraulic Press B2",
                "type": "Press Machine",
                "location": "Forming Department",
                "manufacturer": "HydroPress Ltd",
                "model": "HP-B2-5000",
                "serial_number": "HYD-B2-456",
                "installation_date": "2020-08-05"
            },
            "Welder_D4": {
                "name": "Welding Station D4",
                "type": "Welding Equipment",
                "location": "Welding Bay D",
                "manufacturer": "WeldMaster Pro",
                "model": "WM-D4-Arc",
                "serial_number": "WLD-D4-789",
                "installation_date": "2021-01-12"
            },
            "Inspector_E5": {
                "name": "Quality Inspector E5",
                "type": "Inspection System",
                "location": "Quality Control",
                "manufacturer": "QualityVision Systems",
                "model": "QV-E5-Vision",
                "serial_number": "QVS-E5-321",
                "installation_date": "2021-06-18"
            }
        }
    
    def add_process_data(self, data: ProcessData):
        """Add process data to store"""
        with self.lock:
            self.process_data[data.machine_id].append(data)
            self.latest_process[data.machine_id] = data
            logger.debug(f"Added process data for {data.machine_id}")
    
    def add_alarm_data(self, data: AlarmData):
        """Add alarm data to store"""
        with self.lock:
            self.alarm_data[data.machine_id].append(data)
            
            # Update active alarms
            if not data.resolved:
                # Check if alarm already exists
                existing_alarm = None
                for alarm in self.active_alarms[data.machine_id]:
                    if alarm.alarm_id == data.alarm_id:
                        existing_alarm = alarm
                        break
                
                if existing_alarm:
                    # Update existing alarm
                    self.active_alarms[data.machine_id].remove(existing_alarm)
                
                self.active_alarms[data.machine_id].append(data)
            else:
                # Remove resolved alarm from active list
                self.active_alarms[data.machine_id] = [
                    alarm for alarm in self.active_alarms[data.machine_id]
                    if alarm.alarm_id != data.alarm_id
                ]
            
            logger.debug(f"Added alarm data for {data.machine_id}: {data.message}")
    
    def add_status_data(self, data: StatusData):
        """Add status data to store"""
        with self.lock:
            self.status_data[data.machine_id].append(data)
            self.latest_status[data.machine_id] = data
            logger.debug(f"Added status data for {data.machine_id}: {data.status}")
    
    def add_ml_alert(self, alert: MLAlert):
        """Add ML alert to store"""
        with self.lock:
            self.ml_alerts[alert.machine_id].append(alert)
            logger.debug(f"Added ML alert for {alert.machine_id}: {alert.message}")
    
    def add_command(self, command: ControlCommand):
        """Add control command to store"""
        with self.lock:
            self.commands[command.machine_id].append(command)
            logger.debug(f"Added command for {command.machine_id}: {command.command}")
    
    def get_latest_process_data(self) -> Dict[str, ProcessData]:
        """Get latest process data for all machines"""
        with self.lock:
            return self.latest_process.copy()
    
    def get_machine_process_data(self, machine_id: str) -> Optional[ProcessData]:
        """Get latest process data for specific machine"""
        with self.lock:
            return self.latest_process.get(machine_id)
    
    def get_process_history(self, machine_id: str, limit: int = 100) -> List[ProcessData]:
        """Get process data history for machine"""
        with self.lock:
            history = list(self.process_data[machine_id])
            return history[-limit:] if limit else history
    
    def get_active_alarms(self) -> Dict[str, List[AlarmData]]:
        """Get all active alarms"""
        with self.lock:
            return {k: v.copy() for k, v in self.active_alarms.items()}
    
    def get_machine_alarms(self, machine_id: str) -> List[AlarmData]:
        """Get active alarms for specific machine"""
        with self.lock:
            return self.active_alarms[machine_id].copy()
    
    def get_alarm_history(self, machine_id: str, limit: int = 100) -> List[AlarmData]:
        """Get alarm history for machine"""
        with self.lock:
            history = list(self.alarm_data[machine_id])
            return history[-limit:] if limit else history
    
    def get_system_status(self) -> SystemStatus:
        """Get overall system status"""
        with self.lock:
            total_machines = len(self.latest_status)
            running_machines = sum(1 for status in self.latest_status.values() if status.status == MachineStatus.RUNNING)
            idle_machines = sum(1 for status in self.latest_status.values() if status.status == MachineStatus.IDLE)
            maintenance_machines = sum(1 for status in self.latest_status.values() if status.status == MachineStatus.MAINTENANCE)
            error_machines = sum(1 for status in self.latest_status.values() if status.status == MachineStatus.ERROR)
            offline_machines = sum(1 for status in self.latest_status.values() if status.status == MachineStatus.OFFLINE)
            
            total_alarms = sum(len(alarms) for alarms in self.active_alarms.values())
            critical_alarms = sum(
                1 for alarms in self.active_alarms.values()
                for alarm in alarms if alarm.severity == "critical"
            )
            warning_alarms = sum(
                1 for alarms in self.active_alarms.values()
                for alarm in alarms if alarm.severity == "warning"
            )
            
            avg_health = sum(status.health_score for status in self.latest_status.values()) / max(total_machines, 1)
            avg_uptime = sum(status.uptime_percentage for status in self.latest_status.values()) / max(total_machines, 1)
            
            return SystemStatus(
                timestamp=datetime.utcnow(),
                total_machines=total_machines,
                running_machines=running_machines,
                idle_machines=idle_machines,
                maintenance_machines=maintenance_machines,
                error_machines=error_machines,
                offline_machines=offline_machines,
                total_alarms=total_alarms,
                critical_alarms=critical_alarms,
                warning_alarms=warning_alarms,
                average_health_score=avg_health,
                average_uptime=avg_uptime
            )
    
    def get_machine_status(self, machine_id: str) -> Optional[StatusData]:
        """Get status for specific machine"""
        with self.lock:
            return self.latest_status.get(machine_id)
    
    def get_ml_alerts(self) -> Dict[str, List[MLAlert]]:
        """Get all ML alerts"""
        with self.lock:
            result = {}
            for machine_id, alerts in self.ml_alerts.items():
                # Get recent alerts (last 24 hours)
                recent_alerts = [
                    alert for alert in alerts
                    if alert.timestamp > datetime.utcnow() - timedelta(hours=24)
                ]
                if recent_alerts:
                    result[machine_id] = recent_alerts
            return result
    
    def get_machine_ml_alerts(self, machine_id: str) -> List[MLAlert]:
        """Get ML alerts for specific machine"""
        with self.lock:
            alerts = list(self.ml_alerts[machine_id])
            # Return recent alerts (last 24 hours)
            return [
                alert for alert in alerts
                if alert.timestamp > datetime.utcnow() - timedelta(hours=24)
            ]
    
    def get_machines_overview(self) -> List[MachineOverview]:
        """Get overview of all machines"""
        with self.lock:
            machines = []
            
            # Get all known machines from metadata and current data
            all_machine_ids = set(self.machine_metadata.keys())
            all_machine_ids.update(self.latest_status.keys())
            all_machine_ids.update(self.latest_process.keys())
            
            for machine_id in all_machine_ids:
                metadata = self.machine_metadata.get(machine_id, {})
                status = self.latest_status.get(machine_id)
                active_alarms = len(self.active_alarms.get(machine_id, []))
                
                # Count critical alerts from ML alerts
                ml_alerts = self.ml_alerts.get(machine_id, [])
                critical_alerts = sum(
                    1 for alert in ml_alerts
                    if alert.severity in ["critical", "high"] and
                    alert.timestamp > datetime.utcnow() - timedelta(hours=24)
                )
                
                if status:
                    machine = MachineOverview(
                        machine_id=machine_id,
                        name=metadata.get("name", machine_id),
                        type=metadata.get("type", "Unknown"),
                        location=metadata.get("location", "Unknown"),
                        status=status.status,
                        health_score=status.health_score,
                        uptime_percentage=status.uptime_percentage,
                        last_maintenance=status.last_maintenance,
                        next_maintenance=status.next_maintenance,
                        active_alarms=active_alarms,
                        critical_alerts=critical_alerts,
                        efficiency=status.efficiency,
                        availability=status.availability,
                        last_updated=status.timestamp
                    )
                else:
                    # Create default status for machines without status data
                    machine = MachineOverview(
                        machine_id=machine_id,
                        name=metadata.get("name", machine_id),
                        type=metadata.get("type", "Unknown"),
                        location=metadata.get("location", "Unknown"),
                        status=MachineStatus.OFFLINE,
                        health_score=0.0,
                        uptime_percentage=0.0,
                        last_maintenance=None,
                        next_maintenance=None,
                        active_alarms=active_alarms,
                        critical_alerts=critical_alerts,
                        efficiency=None,
                        availability=None,
                        last_updated=datetime.utcnow()
                    )
                
                machines.append(machine)
            
            return machines
    
    def get_machine_details(self, machine_id: str) -> Optional[MachineDetails]:
        """Get detailed information for specific machine"""
        with self.lock:
            metadata = self.machine_metadata.get(machine_id, {})
            status = self.latest_status.get(machine_id)
            process_data = self.latest_process.get(machine_id)
            recent_alarms = list(self.alarm_data[machine_id])[-10:]  # Last 10 alarms
            ml_alerts = [
                alert for alert in self.ml_alerts[machine_id]
                if alert.timestamp > datetime.utcnow() - timedelta(hours=24)
            ]
            
            if not status and not process_data:
                return None
            
            # Parse installation date
            installation_date = None
            if metadata.get("installation_date"):
                try:
                    installation_date = datetime.fromisoformat(metadata["installation_date"])
                except:
                    pass
            
            return MachineDetails(
                machine_id=machine_id,
                name=metadata.get("name", machine_id),
                type=metadata.get("type", "Unknown"),
                location=metadata.get("location", "Unknown"),
                manufacturer=metadata.get("manufacturer", "Unknown"),
                model=metadata.get("model", "Unknown"),
                serial_number=metadata.get("serial_number", "Unknown"),
                installation_date=installation_date,
                status=status.status if status else MachineStatus.OFFLINE,
                health_score=status.health_score if status else 0.0,
                uptime_percentage=status.uptime_percentage if status else 0.0,
                last_maintenance=status.last_maintenance if status else None,
                next_maintenance=status.next_maintenance if status else None,
                operating_hours=status.operating_hours if status else None,
                cycle_count=status.cycle_count if status else None,
                efficiency=status.efficiency if status else None,
                availability=status.availability if status else None,
                specifications=metadata.get("specifications", {}),
                current_process_data=process_data,
                recent_alarms=recent_alarms,
                ml_alerts=ml_alerts,
                last_updated=status.timestamp if status else datetime.utcnow()
            )
    
    def acknowledge_alarm(self, machine_id: str, alarm_id: str, user_id: str) -> bool:
        """Acknowledge an alarm"""
        with self.lock:
            for alarm in self.active_alarms[machine_id]:
                if alarm.alarm_id == alarm_id:
                    alarm.acknowledged = True
                    alarm.acknowledged_by = user_id
                    alarm.acknowledged_at = datetime.utcnow()
                    logger.info(f"Alarm {alarm_id} acknowledged by {user_id}")
                    return True
            return False
    
    def resolve_alarm(self, machine_id: str, alarm_id: str, user_id: str) -> bool:
        """Resolve an alarm"""
        with self.lock:
            for alarm in self.active_alarms[machine_id]:
                if alarm.alarm_id == alarm_id:
                    alarm.resolved = True
                    alarm.resolved_at = datetime.utcnow()
                    # Remove from active alarms
                    self.active_alarms[machine_id].remove(alarm)
                    logger.info(f"Alarm {alarm_id} resolved by {user_id}")
                    return True
            return False
    
    def cleanup_old_data(self, max_age_hours: int = 24):
        """Clean up old data to prevent memory issues"""
        cutoff_time = datetime.utcnow() - timedelta(hours=max_age_hours)
        
        with self.lock:
            # Clean up old ML alerts
            for machine_id in self.ml_alerts:
                self.ml_alerts[machine_id] = deque(
                    [alert for alert in self.ml_alerts[machine_id] if alert.timestamp > cutoff_time],
                    maxlen=self.max_history_size
                )
            
            logger.info(f"Cleaned up data older than {max_age_hours} hours")