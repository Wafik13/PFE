import asyncio
import json
import logging
from datetime import datetime
from typing import Optional, Dict, Any
import paho.mqtt.client as mqtt
from paho.mqtt.client import MQTTMessage

from models import ProcessData, AlarmData, StatusData, ControlCommand, WebSocketMessage
from data_store import DataStore
from websocket_manager import WebSocketManager

logger = logging.getLogger(__name__)

class MQTTClient:
    """MQTT client for handling industrial data communication"""
    
    def __init__(self, broker_host: str, broker_port: int, data_store: DataStore, websocket_manager: WebSocketManager):
        self.broker_host = broker_host
        self.broker_port = broker_port
        self.data_store = data_store
        self.websocket_manager = websocket_manager
        self.client: Optional[mqtt.Client] = None
        self.connected = False
        self.loop: Optional[asyncio.AbstractEventLoop] = None
        
        # MQTT topics
        self.topics = {
            "process": "industrial/factory/+/plc/process",
            "status": "industrial/factory/+/plc/status",
            "alarms": "industrial/factory/+/plc/alarms",
            "heartbeat": "industrial/factory/+/plc/heartbeat",
            "commands": "industrial/factory/+/plc/commands"
        }
        
        # Command topics for sending
        self.command_topics = {
            "control": "industrial/factory/{machine_id}/plc/control",
            "config": "industrial/factory/{machine_id}/plc/config"
        }
    
    async def start(self):
        """Start the MQTT client"""
        try:
            self.loop = asyncio.get_event_loop()
            
            # Create MQTT client
            self.client = mqtt.Client(client_id="iip_backend", protocol=mqtt.MQTTv311)
            
            # Set callbacks
            self.client.on_connect = self._on_connect
            self.client.on_disconnect = self._on_disconnect
            self.client.on_message = self._on_message
            self.client.on_subscribe = self._on_subscribe
            self.client.on_publish = self._on_publish
            
            # Set username/password if provided
            username = "admin"  # In production, use environment variables
            password = "password"
            if username and password:
                self.client.username_pw_set(username, password)
            
            # Connect to broker
            logger.info(f"Connecting to MQTT broker at {self.broker_host}:{self.broker_port}")
            
            # Use asyncio-compatible connection
            await self._connect_async()
            
            # Start the MQTT loop in a separate task
            asyncio.create_task(self._mqtt_loop())
            
            # Start mock data generation for demo
            asyncio.create_task(self._generate_mock_mqtt_data())
            
        except Exception as e:
            logger.error(f"Failed to start MQTT client: {e}")
            raise
    
    async def stop(self):
        """Stop the MQTT client"""
        if self.client and self.connected:
            logger.info("Disconnecting from MQTT broker")
            self.client.disconnect()
            self.connected = False
    
    def is_connected(self) -> bool:
        """Check if MQTT client is connected"""
        return self.connected
    
    async def _connect_async(self):
        """Async wrapper for MQTT connection"""
        def on_connect_wrapper(client, userdata, flags, rc):
            if rc == 0:
                self.connected = True
                logger.info("Connected to MQTT broker")
                # Subscribe to topics
                for topic_name, topic in self.topics.items():
                    client.subscribe(topic, qos=1)
                    logger.info(f"Subscribed to {topic_name}: {topic}")
            else:
                logger.error(f"Failed to connect to MQTT broker: {rc}")
        
        self.client.on_connect = on_connect_wrapper
        
        # Connect
        result = self.client.connect(self.broker_host, self.broker_port, 60)
        if result != mqtt.MQTT_ERR_SUCCESS:
            raise Exception(f"Failed to connect to MQTT broker: {result}")
        
        # Wait for connection
        for _ in range(50):  # Wait up to 5 seconds
            if self.connected:
                break
            await asyncio.sleep(0.1)
        
        if not self.connected:
            raise Exception("MQTT connection timeout")
    
    async def _mqtt_loop(self):
        """Run MQTT loop in asyncio"""
        while self.connected:
            try:
                self.client.loop(timeout=0.1)
                await asyncio.sleep(0.01)
            except Exception as e:
                logger.error(f"MQTT loop error: {e}")
                await asyncio.sleep(1)
    
    def _on_connect(self, client, userdata, flags, rc):
        """Callback for MQTT connection"""
        if rc == 0:
            self.connected = True
            logger.info("Connected to MQTT broker")
        else:
            logger.error(f"Failed to connect to MQTT broker: {rc}")
    
    def _on_disconnect(self, client, userdata, rc):
        """Callback for MQTT disconnection"""
        self.connected = False
        logger.info(f"Disconnected from MQTT broker: {rc}")
    
    def _on_subscribe(self, client, userdata, mid, granted_qos):
        """Callback for MQTT subscription"""
        logger.info(f"Subscribed to topic with QoS: {granted_qos}")
    
    def _on_publish(self, client, userdata, mid):
        """Callback for MQTT publish"""
        logger.debug(f"Message published: {mid}")
    
    def _on_message(self, client, userdata, msg: MQTTMessage):
        """Callback for MQTT message reception"""
        try:
            # Parse topic to extract machine ID and data type
            topic_parts = msg.topic.split('/')
            if len(topic_parts) >= 4:
                machine_id = topic_parts[2]
                data_type = topic_parts[4]
                
                # Decode message payload
                payload = json.loads(msg.payload.decode('utf-8'))
                
                # Process message based on type
                asyncio.create_task(self._process_message(machine_id, data_type, payload))
                
        except Exception as e:
            logger.error(f"Error processing MQTT message: {e}")
    
    async def _process_message(self, machine_id: str, data_type: str, payload: Dict[str, Any]):
        """Process received MQTT message"""
        try:
            timestamp = datetime.fromisoformat(payload.get('timestamp', datetime.utcnow().isoformat()))
            
            if data_type == 'process':
                # Process data
                process_data = ProcessData(
                    machine_id=machine_id,
                    timestamp=timestamp,
                    temperature=payload.get('temperature', 0.0),
                    pressure=payload.get('pressure', 0.0),
                    flow_rate=payload.get('flow_rate', 0.0),
                    motor_speed=payload.get('motor_speed', 0.0),
                    vibration=payload.get('vibration', 0.0),
                    power_consumption=payload.get('power_consumption', 0.0),
                    additional_params=payload.get('additional_params', {})
                )
                
                # Store data
                self.data_store.add_process_data(process_data)
                
                # Send to WebSocket clients
                ws_message = WebSocketMessage(
                    type="process_data",
                    machine_id=machine_id,
                    timestamp=timestamp,
                    data=process_data.dict()
                )
                await self.websocket_manager.broadcast(ws_message.dict())
                
            elif data_type == 'status':
                # Status data
                status_data = StatusData(
                    machine_id=machine_id,
                    timestamp=timestamp,
                    status=payload.get('status', 'unknown'),
                    health_score=payload.get('health_score', 0.0),
                    uptime_percentage=payload.get('uptime_percentage', 0.0),
                    last_maintenance=payload.get('last_maintenance'),
                    next_maintenance=payload.get('next_maintenance'),
                    operating_hours=payload.get('operating_hours'),
                    cycle_count=payload.get('cycle_count'),
                    efficiency=payload.get('efficiency'),
                    availability=payload.get('availability')
                )
                
                # Store data
                self.data_store.add_status_data(status_data)
                
                # Send to WebSocket clients
                ws_message = WebSocketMessage(
                    type="status",
                    machine_id=machine_id,
                    timestamp=timestamp,
                    data=status_data.dict()
                )
                await self.websocket_manager.broadcast(ws_message.dict())
                
            elif data_type == 'alarms':
                # Alarm data
                alarm_data = AlarmData(
                    machine_id=machine_id,
                    timestamp=timestamp,
                    alarm_id=payload.get('alarm_id', f"ALM_{machine_id}_{int(timestamp.timestamp())}"),
                    severity=payload.get('severity', 'medium'),
                    message=payload.get('message', 'Unknown alarm'),
                    acknowledged=payload.get('acknowledged', False),
                    acknowledged_by=payload.get('acknowledged_by'),
                    acknowledged_at=payload.get('acknowledged_at'),
                    resolved=payload.get('resolved', False),
                    resolved_at=payload.get('resolved_at'),
                    category=payload.get('category'),
                    source=payload.get('source')
                )
                
                # Store data
                self.data_store.add_alarm_data(alarm_data)
                
                # Send to WebSocket clients
                ws_message = WebSocketMessage(
                    type="alarm",
                    machine_id=machine_id,
                    timestamp=timestamp,
                    data=alarm_data.dict()
                )
                await self.websocket_manager.broadcast(ws_message.dict())
                
            elif data_type == 'heartbeat':
                # Heartbeat data - just log
                logger.debug(f"Heartbeat from {machine_id}: {payload}")
                
            else:
                logger.warning(f"Unknown data type: {data_type}")
                
        except Exception as e:
            logger.error(f"Error processing message for {machine_id}/{data_type}: {e}")
    
    async def send_command(self, command: ControlCommand):
        """Send control command via MQTT"""
        try:
            if not self.connected:
                raise Exception("MQTT client not connected")
            
            # Prepare command payload
            payload = {
                "command": command.command,
                "parameters": command.parameters,
                "timestamp": command.timestamp.isoformat(),
                "command_id": command.command_id or str(command.timestamp.timestamp()),
                "user_id": command.user_id
            }
            
            # Determine topic
            topic = self.command_topics["control"].format(machine_id=command.machine_id)
            
            # Publish command
            result = self.client.publish(topic, json.dumps(payload), qos=1)
            
            if result.rc == mqtt.MQTT_ERR_SUCCESS:
                logger.info(f"Command sent to {command.machine_id}: {command.command}")
            else:
                raise Exception(f"Failed to publish command: {result.rc}")
                
        except Exception as e:
            logger.error(f"Error sending command: {e}")
            raise
    
    async def _generate_mock_mqtt_data(self):
        """Generate mock MQTT data for demonstration"""
        machines = ["BPM2000", "Robot_C3", "Conveyor_A1", "Press_B2"]
        
        while self.connected:
            try:
                for machine_id in machines:
                    # Generate mock process data
                    import random
                    
                    process_payload = {
                        "timestamp": datetime.utcnow().isoformat(),
                        "temperature": 20 + random.uniform(-5, 15),
                        "pressure": 1.0 + random.uniform(-0.2, 0.5),
                        "flow_rate": 10 + random.uniform(-2, 5),
                        "motor_speed": 1500 + random.uniform(-100, 200),
                        "vibration": 0.1 + random.uniform(-0.05, 0.1),
                        "power_consumption": 100 + random.uniform(-20, 50)
                    }
                    
                    # Simulate receiving the data
                    await self._process_message(machine_id, "process", process_payload)
                    
                    # Occasionally generate alarms
                    if random.random() < 0.05:  # 5% chance
                        alarm_payload = {
                            "timestamp": datetime.utcnow().isoformat(),
                            "alarm_id": f"ALM_{machine_id}_{random.randint(1000, 9999)}",
                            "severity": random.choice(["warning", "critical", "medium"]),
                            "message": f"Random alarm on {machine_id}",
                            "acknowledged": False
                        }
                        await self._process_message(machine_id, "alarms", alarm_payload)
                
                # Wait before next iteration
                await asyncio.sleep(5)  # Generate data every 5 seconds
                
            except Exception as e:
                logger.error(f"Error generating mock data: {e}")
                await asyncio.sleep(10)