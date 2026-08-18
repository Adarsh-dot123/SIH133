import random
import datetime

class IoTTelemetrySimulator:
    def __init__(self):
        self.devices = [
            {"sensor_id": "IOT-O2-TNK-01", "hospital_id": 1, "hospital_name": "Apollo Hospitals, Greams Road", "sensor_type": "OXYGEN_TANK_PRESSURE", "device_name": "Cryogenic Bulk Tank Sensor", "base_value": 16.4, "unit": "kL", "variance": 0.2},
            {"sensor_id": "IOT-O2-FLW-02", "hospital_id": 1, "hospital_name": "Apollo Hospitals, Greams Road", "sensor_type": "OXYGEN_FLOW_METER", "device_name": "Central ICU Manifold Flow", "base_value": 240.0, "unit": "L/min", "variance": 15.0},
            {"sensor_id": "IOT-BED-LC-101", "hospital_id": 1, "hospital_name": "Apollo Hospitals, Greams Road", "sensor_type": "SMART_BED_LOAD_CELL", "device_name": "ICU Bed #101 Weight Matrix", "base_value": 72.4, "unit": "kg", "variance": 1.5},
            {"sensor_id": "IOT-O2-TNK-02", "hospital_id": 2, "hospital_name": "Fortis Malar Hospital, Adyar", "sensor_type": "OXYGEN_TANK_PRESSURE", "device_name": "Cryo O2 Tank Transducer", "base_value": 11.2, "unit": "kL", "variance": 0.3},
            {"sensor_id": "IOT-BED-LC-204", "hospital_id": 2, "hospital_name": "Fortis Malar Hospital, Adyar", "sensor_type": "SMART_BED_LOAD_CELL", "device_name": "Cardiac ICU #204 Smart Matrix", "base_value": 68.0, "unit": "kg", "variance": 1.2},
            {"sensor_id": "IOT-O2-TNK-03", "hospital_id": 3, "hospital_name": "MIOT International, Manapakkam", "sensor_type": "OXYGEN_TANK_PRESSURE", "device_name": "Liquid O2 Telemetry Unit", "base_value": 19.1, "unit": "kL", "variance": 0.15},
            {"sensor_id": "IOT-O2-FLW-04", "hospital_id": 4, "hospital_name": "Kauvery Hospital, Alwarpet", "sensor_type": "OXYGEN_FLOW_METER", "device_name": "Emergency Ward Flow Sensor", "base_value": 180.0, "unit": "L/min", "variance": 10.0},
            {"sensor_id": "IOT-BED-LC-502", "hospital_id": 5, "hospital_name": "Government General Hospital (RGGGH)", "sensor_type": "SMART_BED_LOAD_CELL", "device_name": "Trauma Ward #502 Load Sensor", "base_value": 81.0, "unit": "kg", "variance": 2.0},
        ]

    def get_live_telemetry(self) -> list:
        telemetry_batch = []
        now = datetime.datetime.utcnow()

        for dev in self.devices:
            # Simulate slight sensor drift & noise
            delta = random.uniform(-dev["variance"], dev["variance"])
            val = round(max(0.0, dev["base_value"] + delta), 2)
            
            # Determine status
            status = "NORMAL"
            if dev["sensor_type"] == "OXYGEN_TANK_PRESSURE" and val < 4.0:
                status = "CRITICAL"
            elif dev["sensor_type"] == "OXYGEN_TANK_PRESSURE" and val < 8.0:
                status = "WARNING"
            elif dev["sensor_type"] == "OXYGEN_FLOW_METER" and val > 300.0:
                status = "WARNING"

            telemetry_batch.append({
                "sensor_id": dev["sensor_id"],
                "hospital_id": dev["hospital_id"],
                "hospital_name": dev["hospital_name"],
                "sensor_type": dev["sensor_type"],
                "device_name": dev["device_name"],
                "current_value": val,
                "unit": dev["unit"],
                "status": status,
                "timestamp": now
            })

        return telemetry_batch

iot_daemon = IoTTelemetrySimulator()
