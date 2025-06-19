from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import asyncio
import json
import logging
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import uvicorn
from contextlib import asynccontextmanager

# Import our modules
from mqtt_client import MQTTClient
from data_store import DataStore
from websocket_manager import WebSocketManager
from models import (
    ProcessData, AlarmData, StatusData, ControlCommand,
    MLAlert, AuthToken
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global instances
data_store = DataStore()
websocket_manager = WebSocketManager()
mqtt_client = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan events"""
    global mqtt_client
    
    # Startup
    logger.info("Starting Industrial Intelligence Platform Backend")
    
    # Initialize MQTT client
    mqtt_client = MQTTClient(
        broker_host=os.getenv("MQTT_BROKER_HOST", "localhost"),
        broker_port=int(os.getenv("MQTT_BROKER_PORT", "1883")),
        data_store=data_store,
        websocket_manager=websocket_manager
    )
    
    # Start MQTT client
    await mqtt_client.start()
    
    # Generate some mock data for demo
    await generate_mock_data()
    
    yield
    
    # Shutdown
    logger.info("Shutting down Industrial Intelligence Platform Backend")
    if mqtt_client:
        await mqtt_client.stop()

# Create FastAPI app
app = FastAPI(
    title="Industrial Intelligence Platform API",
    description="Backend API for Industrial Intelligence Platform",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for API
class LoginRequest(BaseModel):
    username: str
    password: str
    remember_me: bool = False

class ControlRequest(BaseModel):
    machine_id: str
    command: str
    parameters: Optional[Dict[str, Any]] = None

# Authentication endpoints
@app.post("/api/auth/login")
async def login(request: LoginRequest):
    """Mock authentication endpoint"""
    # Mock authentication - in production, verify against real auth system
    if request.username == "admin" and request.password == "password":
        token = AuthToken(
            access_token="mock_jwt_token_12345",
            token_type="bearer",
            expires_in=3600 if not request.remember_me else 86400
        )
        return token.dict()
    else:
        raise HTTPException(status_code=401, detail="Invalid credentials")

@app.post("/api/auth/logout")
async def logout():
    """Logout endpoint"""
    return {"message": "Logged out successfully"}

# Process data endpoints
@app.get("/api/process")
async def get_process_data():
    """Get latest process data from all machines"""
    return data_store.get_latest_process_data()

@app.get("/api/process/{machine_id}")
async def get_machine_process_data(machine_id: str):
    """Get latest process data for specific machine"""
    data = data_store.get_machine_process_data(machine_id)
    if not data:
        raise HTTPException(status_code=404, detail="Machine not found")
    return data

# Alarm endpoints
@app.get("/api/alarms")
async def get_alarms():
    """Get active alarms"""
    return data_store.get_active_alarms()

@app.get("/api/alarms/{machine_id}")
async def get_machine_alarms(machine_id: str):
    """Get alarms for specific machine"""
    return data_store.get_machine_alarms(machine_id)

# Status endpoints
@app.get("/api/status")
async def get_status():
    """Get system and PLC status"""
    return data_store.get_system_status()

@app.get("/api/status/{machine_id}")
async def get_machine_status(machine_id: str):
    """Get status for specific machine"""
    status = data_store.get_machine_status(machine_id)
    if not status:
        raise HTTPException(status_code=404, detail="Machine not found")
    return status

# Control endpoints
@app.post("/api/control")
async def send_control_command(request: ControlRequest):
    """Send control command to machine via MQTT"""
    try:
        command = ControlCommand(
            machine_id=request.machine_id,
            command=request.command,
            parameters=request.parameters or {},
            timestamp=datetime.utcnow()
        )
        
        # Send command via MQTT
        if mqtt_client:
            await mqtt_client.send_command(command)
        
        # Store command in data store
        data_store.add_command(command)
        
        return {"message": "Command sent successfully", "command_id": str(command.timestamp)}
    except Exception as e:
        logger.error(f"Error sending control command: {e}")
        raise HTTPException(status_code=500, detail="Failed to send command")

# ML Alerts endpoints
@app.get("/api/alerts")
async def get_ml_alerts():
    """Get ML predictions and alerts"""
    return data_store.get_ml_alerts()

@app.get("/api/alerts/{machine_id}")
async def get_machine_alerts(machine_id: str):
    """Get ML alerts for specific machine"""
    return data_store.get_machine_ml_alerts(machine_id)

# Machines endpoints
@app.get("/api/machines")
async def get_machines():
    """Get all machines with their current status"""
    return data_store.get_machines_overview()

@app.get("/api/machines/{machine_id}")
async def get_machine_details(machine_id: str):
    """Get detailed information for specific machine"""
    machine = data_store.get_machine_details(machine_id)
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")
    return machine

# WebSocket endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time data"""
    await websocket_manager.connect(websocket)
    try:
        while True:
            # Keep connection alive and handle incoming messages
            data = await websocket.receive_text()
            # Echo back for heartbeat
            await websocket.send_text(f"Echo: {data}")
    except WebSocketDisconnect:
        websocket_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        websocket_manager.disconnect(websocket)

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "mqtt_connected": mqtt_client.is_connected() if mqtt_client else False,
        "active_websockets": len(websocket_manager.active_connections)
    }

async def generate_mock_data():
    """Generate mock data for demonstration"""
    logger.info("Generating mock data...")
    
    # Mock machines
    machines = [
        "BPM2000", "Robot_C3", "Conveyor_A1", "Press_B2", 
        "Welder_D4", "Inspector_E5"
    ]
    
    for machine_id in machines:
        # Mock process data
        process_data = ProcessData(
            machine_id=machine_id,
            timestamp=datetime.utcnow(),
            temperature=20.0 + (hash(machine_id) % 50),
            pressure=1.0 + (hash(machine_id) % 10) * 0.1,
            flow_rate=10.0 + (hash(machine_id) % 20),
            motor_speed=1500 + (hash(machine_id) % 500),
            vibration=0.1 + (hash(machine_id) % 10) * 0.01,
            power_consumption=100.0 + (hash(machine_id) % 200)
        )
        data_store.add_process_data(process_data)
        
        # Mock status data
        status_data = StatusData(
            machine_id=machine_id,
            timestamp=datetime.utcnow(),
            status="running" if hash(machine_id) % 3 != 0 else "idle",
            health_score=85 + (hash(machine_id) % 15),
            uptime_percentage=95.0 + (hash(machine_id) % 5),
            last_maintenance=datetime.utcnow() - timedelta(days=hash(machine_id) % 30),
            next_maintenance=datetime.utcnow() + timedelta(days=30 - (hash(machine_id) % 10))
        )
        data_store.add_status_data(status_data)
        
        # Mock some alarms
        if hash(machine_id) % 4 == 0:
            alarm_data = AlarmData(
                machine_id=machine_id,
                timestamp=datetime.utcnow(),
                alarm_id=f"ALM_{machine_id}_{hash(machine_id) % 100}",
                severity="warning" if hash(machine_id) % 2 == 0 else "critical",
                message=f"High temperature detected on {machine_id}",
                acknowledged=False
            )
            data_store.add_alarm_data(alarm_data)
        
        # Mock ML alerts
        if hash(machine_id) % 3 == 0:
            ml_alert = MLAlert(
                machine_id=machine_id,
                timestamp=datetime.utcnow(),
                alert_type="fault_prediction",
                severity="medium",
                message=f"Potential bearing wear detected on {machine_id}",
                confidence=0.75 + (hash(machine_id) % 25) * 0.01,
                ttf_days=15 + (hash(machine_id) % 30),
                mtbf_hours=720 + (hash(machine_id) % 480),
                anomaly_score=0.3 + (hash(machine_id) % 40) * 0.01
            )
            data_store.add_ml_alert(ml_alert)

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8000")),
        reload=True
    )