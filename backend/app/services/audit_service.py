import hashlib
import json
from datetime import datetime
from sqlalchemy.orm import Session
from app.models import AuditLog

GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000"

class BlockchainAuditService:
    @staticmethod
    def calculate_hash(prev_hash: str, timestamp_str: str, actor: str, action: str, resource_type: str, resource_id: str, new_val: str) -> str:
        payload = f"{prev_hash}|{timestamp_str}|{actor}|{action}|{resource_type}|{resource_id}|{new_val}"
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()

    @classmethod
    def log_action(
        cls,
        db: Session,
        actor_email: str,
        actor_role: str,
        action: str,
        resource_type: str,
        resource_id: str = None,
        previous_value: str = None,
        new_value: str = None,
        hospital_id: int = None,
        actor_id: int = None
    ) -> AuditLog:
        # Get latest block hash
        last_block = db.query(AuditLog).order_by(AuditLog.id.desc()).first()
        prev_hash = last_block.curr_hash if last_block else GENESIS_HASH
        
        now = datetime.utcnow()
        now_str = now.isoformat()
        
        curr_hash = cls.calculate_hash(
            prev_hash=prev_hash,
            timestamp_str=now_str,
            actor=actor_email or "SYSTEM",
            action=action,
            resource_type=resource_type,
            resource_id=str(resource_id or ""),
            new_val=str(new_value or "")
        )

        log_entry = AuditLog(
            actor_id=actor_id,
            actor_role=actor_role or "SYSTEM",
            actor_email=actor_email or "system@medflow.in",
            hospital_id=hospital_id,
            action=action,
            resource_type=resource_type,
            resource_id=str(resource_id) if resource_id else None,
            previous_value=str(previous_value) if previous_value else None,
            new_value=str(new_value) if new_value else None,
            timestamp=now,
            prev_hash=prev_hash,
            curr_hash=curr_hash
        )
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)
        return log_entry

    @classmethod
    def verify_chain_integrity(cls, db: Session) -> dict:
        blocks = db.query(AuditLog).order_by(AuditLog.id.asc()).all()
        if not blocks:
            return {
                "is_valid": True,
                "total_blocks_verified": 0,
                "last_block_hash": GENESIS_HASH,
                "chain_integrity_status": "Empty chain (Verified)"
            }

        expected_prev = GENESIS_HASH
        for block in blocks:
            if block.prev_hash != expected_prev:
                return {
                    "is_valid": False,
                    "total_blocks_verified": block.id - 1,
                    "last_block_hash": block.prev_hash,
                    "chain_integrity_status": f"TAMPER_DETECTED at Block #{block.id}: prev_hash mismatch"
                }
            
            recomputed = cls.calculate_hash(
                prev_hash=block.prev_hash,
                timestamp_str=block.timestamp.isoformat(),
                actor=block.actor_email,
                action=block.action,
                resource_type=block.resource_type,
                resource_id=str(block.resource_id or ""),
                new_val=str(block.new_value or "")
            )
            
            if recomputed != block.curr_hash:
                return {
                    "is_valid": False,
                    "total_blocks_verified": block.id - 1,
                    "last_block_hash": block.curr_hash,
                    "chain_integrity_status": f"TAMPER_DETECTED at Block #{block.id}: payload signature corrupted"
                }

            expected_prev = block.curr_hash

        return {
            "is_valid": True,
            "total_blocks_verified": len(blocks),
            "last_block_hash": blocks[-1].curr_hash,
            "chain_integrity_status": "Chain fully verified and cryptographically sound"
        }

audit_service = BlockchainAuditService()
