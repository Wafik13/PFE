import asyncio
import json
import logging
from typing import List, Dict, Any
from fastapi import WebSocket
from datetime import datetime

logger = logging.getLogger(__name__)

class WebSocketManager:
    """Manager for WebSocket connections"""
    
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.connection_info: Dict[WebSocket, Dict[str, Any]] = {}
    
    async def connect(self, websocket: WebSocket):
        """Accept a new WebSocket connection"""
        await websocket.accept()
        self.active_connections.append(websocket)
        self.connection_info[websocket] = {
            "connected_at": datetime.utcnow(),
            "last_ping": datetime.utcnow()
        }
        logger.info(f"WebSocket connected. Total connections: {len(self.active_connections)}")
        
        # Send welcome message
        welcome_message = {
            "type": "connection",
            "message": "Connected to Industrial Intelligence Platform",
            "timestamp": datetime.utcnow().isoformat(),
            "connection_id": id(websocket)
        }
        await self.send_personal_message(welcome_message, websocket)
    
    def disconnect(self, websocket: WebSocket):
        """Remove a WebSocket connection"""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        if websocket in self.connection_info:
            del self.connection_info[websocket]
        logger.info(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")
    
    async def send_personal_message(self, message: Dict[str, Any], websocket: WebSocket):
        """Send a message to a specific WebSocket connection"""
        try:
            await websocket.send_text(json.dumps(message, default=str))
        except Exception as e:
            logger.error(f"Error sending personal message: {e}")
            self.disconnect(websocket)
    
    async def broadcast(self, message: Dict[str, Any]):
        """Broadcast a message to all connected WebSocket clients"""
        if not self.active_connections:
            return
        
        # Create a copy of connections to avoid modification during iteration
        connections_copy = self.active_connections.copy()
        
        # Send message to all connections
        disconnected_connections = []
        
        for connection in connections_copy:
            try:
                await connection.send_text(json.dumps(message, default=str))
                # Update last ping time
                if connection in self.connection_info:
                    self.connection_info[connection]["last_ping"] = datetime.utcnow()
            except Exception as e:
                logger.error(f"Error broadcasting to connection: {e}")
                disconnected_connections.append(connection)
        
        # Remove disconnected connections
        for connection in disconnected_connections:
            self.disconnect(connection)
        
        if message.get("type") != "heartbeat":  # Don't log heartbeat messages
            logger.debug(f"Broadcasted message to {len(connections_copy) - len(disconnected_connections)} connections")
    
    async def broadcast_to_machine_subscribers(self, machine_id: str, message: Dict[str, Any]):
        """Broadcast a message to clients subscribed to a specific machine"""
        # For now, broadcast to all connections
        # In a more advanced implementation, you could track machine subscriptions
        message["machine_id"] = machine_id
        await self.broadcast(message)
    
    async def send_heartbeat(self):
        """Send heartbeat to all connected clients"""
        heartbeat_message = {
            "type": "heartbeat",
            "timestamp": datetime.utcnow().isoformat(),
            "active_connections": len(self.active_connections)
        }
        await self.broadcast(heartbeat_message)
    
    async def send_system_notification(self, notification_type: str, message: str, severity: str = "info"):
        """Send a system notification to all connected clients"""
        notification = {
            "type": "system_notification",
            "notification_type": notification_type,
            "message": message,
            "severity": severity,
            "timestamp": datetime.utcnow().isoformat()
        }
        await self.broadcast(notification)
        logger.info(f"System notification sent: {message}")
    
    async def send_alarm_notification(self, alarm_data: Dict[str, Any]):
        """Send an alarm notification to all connected clients"""
        notification = {
            "type": "alarm_notification",
            "alarm": alarm_data,
            "timestamp": datetime.utcnow().isoformat()
        }
        await self.broadcast(notification)
        logger.info(f"Alarm notification sent for machine {alarm_data.get('machine_id')}")
    
    async def send_ml_alert_notification(self, alert_data: Dict[str, Any]):
        """Send an ML alert notification to all connected clients"""
        notification = {
            "type": "ml_alert_notification",
            "alert": alert_data,
            "timestamp": datetime.utcnow().isoformat()
        }
        await self.broadcast(notification)
        logger.info(f"ML alert notification sent for machine {alert_data.get('machine_id')}")
    
    async def send_command_response(self, command_data: Dict[str, Any], response_data: Dict[str, Any]):
        """Send a command response to all connected clients"""
        response = {
            "type": "command_response",
            "command": command_data,
            "response": response_data,
            "timestamp": datetime.utcnow().isoformat()
        }
        await self.broadcast(response)
        logger.info(f"Command response sent for machine {command_data.get('machine_id')}")
    
    def get_connection_stats(self) -> Dict[str, Any]:
        """Get statistics about WebSocket connections"""
        now = datetime.utcnow()
        stats = {
            "total_connections": len(self.active_connections),
            "connections": []
        }
        
        for websocket, info in self.connection_info.items():
            connection_stats = {
                "connection_id": id(websocket),
                "connected_at": info["connected_at"].isoformat(),
                "last_ping": info["last_ping"].isoformat(),
                "duration_seconds": (now - info["connected_at"]).total_seconds()
            }
            stats["connections"].append(connection_stats)
        
        return stats
    
    async def cleanup_stale_connections(self, max_idle_minutes: int = 30):
        """Clean up connections that haven't been active for a while"""
        now = datetime.utcnow()
        stale_connections = []
        
        for websocket, info in self.connection_info.items():
            idle_time = (now - info["last_ping"]).total_seconds() / 60
            if idle_time > max_idle_minutes:
                stale_connections.append(websocket)
        
        for websocket in stale_connections:
            try:
                await websocket.close()
            except:
                pass
            self.disconnect(websocket)
        
        if stale_connections:
            logger.info(f"Cleaned up {len(stale_connections)} stale WebSocket connections")
    
    async def start_heartbeat_task(self, interval_seconds: int = 30):
        """Start a background task to send periodic heartbeats"""
        async def heartbeat_loop():
            while True:
                try:
                    await self.send_heartbeat()
                    await self.cleanup_stale_connections()
                    await asyncio.sleep(interval_seconds)
                except Exception as e:
                    logger.error(f"Error in heartbeat loop: {e}")
                    await asyncio.sleep(interval_seconds)
        
        # Start the heartbeat task
        asyncio.create_task(heartbeat_loop())
        logger.info(f"WebSocket heartbeat task started with {interval_seconds}s interval")
    
    async def subscribe_to_machine(self, websocket: WebSocket, machine_id: str):
        """Subscribe a WebSocket connection to updates from a specific machine"""
        # In a more advanced implementation, you would track machine subscriptions
        # For now, we'll just send a confirmation
        subscription_message = {
            "type": "subscription",
            "machine_id": machine_id,
            "status": "subscribed",
            "timestamp": datetime.utcnow().isoformat()
        }
        await self.send_personal_message(subscription_message, websocket)
        logger.info(f"WebSocket {id(websocket)} subscribed to machine {machine_id}")
    
    async def unsubscribe_from_machine(self, websocket: WebSocket, machine_id: str):
        """Unsubscribe a WebSocket connection from updates from a specific machine"""
        # In a more advanced implementation, you would remove machine subscriptions
        # For now, we'll just send a confirmation
        unsubscription_message = {
            "type": "unsubscription",
            "machine_id": machine_id,
            "status": "unsubscribed",
            "timestamp": datetime.utcnow().isoformat()
        }
        await self.send_personal_message(unsubscription_message, websocket)
        logger.info(f"WebSocket {id(websocket)} unsubscribed from machine {machine_id}")