import json
from typing import List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

ws_router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, event_type: str, data: dict):
        message = json.dumps({"event": event_type, "data": data})
        dead_connections = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                dead_connections.append(connection)
        for dead in dead_connections:
            self.disconnect(dead)

manager = ConnectionManager()

@ws_router.websocket("/ws/live")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # Send initial connected greeting
        await websocket.send_text(json.dumps({
            "event": "CONNECTED",
            "data": {"message": "MedFlow Live WebSocket Stream Connected"}
        }))
        while True:
            data = await websocket.receive_text()
            # Echo or process client ping
            try:
                parsed = json.loads(data)
                if parsed.get("action") == "PING":
                    await websocket.send_text(json.dumps({"event": "PONG", "data": {}}))
            except Exception:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)
