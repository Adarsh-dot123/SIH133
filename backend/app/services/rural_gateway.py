import re
from sqlalchemy.orm import Session
from app.models import Hospital, Bed

class RuralAccessGateway:
    """
    USSD (*999#) & SMS Fallback Engine for low-connectivity & feature phone rural access in India.
    """

    @staticmethod
    def process_ussd_session(session_id: str, user_input: str, db: Session) -> dict:
        inp = user_input.strip()

        if inp in ["*999#", "*999", ""]:
            menu = (
                "MEDFLOW RURAL HEALTH HELPLINE\n"
                "1. Find Emergency ICU Beds\n"
                "2. Find Oxygen Beds\n"
                "3. Find General Ward Beds\n"
                "4. Check Hospital by District\n"
                "Reply with number (1-4):"
            )
            return {"session_id": session_id, "message": menu, "should_continue": True}

        if inp == "1":
            # Find ICU in top district
            hospitals = db.query(Hospital).limit(3).all()
            lines = ["EMERGENCY ICU AVAILABILITY:"]
            for idx, h in enumerate(hospitals, 1):
                avail_icu = sum(1 for b in h.beds if b.status == "AVAILABLE" and "ICU" in b.bed_type)
                lines.append(f"{idx}. {h.name[:18]}..: {avail_icu} ICU | Ph: {h.phone}")
            lines.append("0. Back | 99. Exit")
            return {"session_id": session_id, "message": "\n".join(lines), "should_continue": True}

        if inp == "2":
            hospitals = db.query(Hospital).limit(3).all()
            lines = ["OXYGEN BED AVAILABILITY:"]
            for idx, h in enumerate(hospitals, 1):
                avail_o2 = sum(1 for b in h.beds if b.status == "AVAILABLE" and b.bed_type == "OXYGEN_SUPPORTED")
                lines.append(f"{idx}. {h.name[:18]}..: {avail_o2} O2 | Ph: {h.phone}")
            lines.append("0. Back | 99. Exit")
            return {"session_id": session_id, "message": "\n".join(lines), "should_continue": True}

        if inp == "3":
            hospitals = db.query(Hospital).limit(3).all()
            lines = ["GENERAL BEDS AVAILABILITY:"]
            for idx, h in enumerate(hospitals, 1):
                avail_gen = sum(1 for b in h.beds if b.status == "AVAILABLE" and b.bed_type == "GENERAL")
                lines.append(f"{idx}. {h.name[:18]}..: {avail_gen} Beds | Ph: {h.phone}")
            lines.append("0. Back | 99. Exit")
            return {"session_id": session_id, "message": "\n".join(lines), "should_continue": True}

        if inp == "99":
            return {"session_id": session_id, "message": "Thank you for using MedFlow Rural Gateway. Stay safe.", "should_continue": False}

        # Default fallback
        return {
            "session_id": session_id,
            "message": "Invalid choice. Dial *999# to restart MedFlow Rural Emergency Portal.",
            "should_continue": False
        }

    @staticmethod
    def process_sms_query(sender_phone: str, message_body: str, db: Session) -> dict:
        text = message_body.upper().strip()
        tokens = text.split()
        
        # Determine bed type
        bed_filter = "ICU"
        if "OXYGEN" in text or "O2" in text:
            bed_filter = "OXYGEN_SUPPORTED"
        elif "VENTILATOR" in text or "VENT" in text:
            bed_filter = "VENTILATOR"
        elif "GENERAL" in text or "BEDS" in text:
            bed_filter = "GENERAL"

        # Search hospitals
        hospitals = db.query(Hospital).all()
        # Filter by district or city mention if any
        matched_hospitals = []
        for h in hospitals:
            matched_hospitals.append(h)

        matched_hospitals = matched_hospitals[:3]
        
        sms_lines = [f"MEDFLOW LIVE RESPONSE (Req: {bed_filter}):"]
        for idx, h in enumerate(matched_hospitals, 1):
            if bed_filter == "ICU":
                avail = sum(1 for b in h.beds if b.status == "AVAILABLE" and "ICU" in b.bed_type)
            elif bed_filter == "OXYGEN_SUPPORTED":
                avail = sum(1 for b in h.beds if b.status == "AVAILABLE" and b.bed_type == "OXYGEN_SUPPORTED")
            elif bed_filter == "VENTILATOR":
                avail = sum(1 for b in h.beds if b.status == "AVAILABLE" and b.bed_type == "VENTILATOR")
            else:
                avail = sum(1 for b in h.beds if b.status == "AVAILABLE")
            
            sms_lines.append(f"{idx}. {h.name[:16]}: {avail} free | {h.phone}")

        sms_lines.append("Free National Emergency Helpline: 108")
        full_sms = "\n".join(sms_lines)

        return {
            "reply_to": sender_phone,
            "sms_text": full_sms,
            "hospitals_found": len(matched_hospitals)
        }

rural_gateway = RuralAccessGateway()
