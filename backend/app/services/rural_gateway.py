"""
Rural Access Gateway — USSD (*999#) & SMS Fallback Engine
Supports low-connectivity / feature-phone access to MedFlow.

Session states (stored in _sessions dict keyed by session_id):
  stage      : 'MAIN' | 'BED_RESULTS' | 'DISTRICT_ASK' | 'DISTRICT_RESULTS' | 'ACTION'
  hospitals  : list of hospital IDs from the last search result
  hospital_id: the single hospital the patient selected for action
"""

from sqlalchemy.orm import Session, joinedload
from app.models import Hospital, Bed, District

# ---------------------------------------------------------------------------
# In-memory session store: {session_id -> {"stage": ..., ...}}
# ---------------------------------------------------------------------------
_sessions: dict = {}

MAIN_MENU = (
    "MEDFLOW RURAL HELPLINE\n"
    "1. Find ICU Beds\n"
    "2. Find Oxygen Beds\n"
    "3. Find General Beds\n"
    "4. Check Hospital by District\n"
    "Reply 1-4:"
)

ACTION_MENU = (
    "Choose action:\n"
    "1. Book Appointment\n"
    "2. Call Ambulance\n"
    "0. Back | 99. Exit"
)

class RuralAccessGateway:
    """
    USSD (*999#) & SMS Fallback Engine for low-connectivity & feature phone rural access in India.
    """
    @staticmethod
    def process_ussd_session(session_id: str, user_input: str, db: Session) -> dict:
        inp = user_input.strip()
        sess = _sessions.get(session_id, {"stage": "MAIN"})

        def reply(msg: str, cont: bool = True, next_stage: str = "MAIN", **extra):
            _sessions[session_id] = {"stage": next_stage, **extra}
            return {"session_id": session_id, "message": msg, "should_continue": cont}

        def fmt_hospital_list(hospitals_list) -> list:
            lines = []
            for idx, h in enumerate(hospitals_list, 1):
                avail = sum(1 for b in h.beds if b.status == "AVAILABLE")
                lines.append(f"{idx}. {h.name[:20]}\n   Beds:{avail} | Ph:{h.phone}")
            return lines

        def result_appointment(h) -> str:
            avail = sum(1 for b in h.beds if b.status == "AVAILABLE")
            return (
                f"APPOINTMENT CONFIRMED\n"
                f"Hospital: {h.name}\n"
                f"Address : {h.address[:40]}\n"
                f"Phone   : {h.phone}\n"
                f"Beds Avail: {avail}\n"
                f"Please call to confirm slot.\n"
                f"Helpline: 108\n"
                f"0=Menu | 99=Exit"
            )

        def result_ambulance(h) -> str:
            amb_info = "108 (National Helpline)"
            if hasattr(h, "ambulances") and h.ambulances:
                amb = h.ambulances[0]
                drv = getattr(amb, "driver_phone", None)
                num = getattr(amb, "vehicle_number", None)
                if drv:
                    amb_info = drv
                elif num:
                    amb_info = f"Vehicle {num}"
            return (
                f"AMBULANCE REQUESTED\n"
                f"Hospital: {h.name}\n"
                f"Address : {h.address[:40]}\n"
                f"Hosp Ph : {h.phone}\n"
                f"Amb Ph  : {amb_info}\n"
                f"Stay calm. Help is coming.\n"
                f"Helpline: 108\n"
                f"0=Menu | 99=Exit"
            )

        # ── Global exits ────────────────────────────────────────────────────
        if inp == "99":
            _sessions.pop(session_id, None)
            return {"session_id": session_id,
                    "message": "Thank you for using MedFlow. Stay safe.",
                    "should_continue": False}

        # ── Back / restart ───────────────────────────────────────────────────
        if inp in ["*999#", "*999", "", "0"]:
            return reply(MAIN_MENU, next_stage="MAIN")

        stage = sess.get("stage", "MAIN")

        # ────────────────────────────────────────────────────────────────────
        # STAGE: MAIN
        # ────────────────────────────────────────────────────────────────────
        if stage == "MAIN":
            if inp in ["1", "2", "3"]:
                type_map = {"1": "ICU", "2": "OXYGEN_SUPPORTED", "3": "GENERAL"}
                label_map = {"1": "ICU BED AVAILABILITY:", "2": "OXYGEN BED AVAILABILITY:", "3": "GENERAL BEDS:"}
                bed_type = type_map[inp]
                all_hosps = db.query(Hospital).options(joinedload(Hospital.beds)).limit(10).all()
                hospitals = sorted(
                    all_hosps,
                    key=lambda h: sum(1 for b in h.beds if b.status == "AVAILABLE" and bed_type in b.bed_type),
                    reverse=True
                )[:4]
                if not hospitals:
                    return reply(f"No hospitals with {bed_type} beds.\n" + MAIN_MENU, next_stage="MAIN")
                lines = [label_map[inp]] + fmt_hospital_list(hospitals)
                lines.append("Select no. 0=Back")
                return reply("\n".join(lines), next_stage="BED_RESULTS",
                             hospitals=[h.id for h in hospitals])

            if inp == "4":
                return reply(
                    "CHECK BY DISTRICT\nEnter district name:\n(e.g. Salem, Chennai)\n0=Back",
                    next_stage="DISTRICT_ASK"
                )
            return reply(MAIN_MENU, next_stage="MAIN")

        # ────────────────────────────────────────────────────────────────────
        # STAGE: BED_RESULTS — patient picks hospital number
        # ────────────────────────────────────────────────────────────────────
        if stage == "BED_RESULTS":
            hospital_ids = sess.get("hospitals", [])
            if inp.isdigit():
                choice = int(inp) - 1
                if 0 <= choice < len(hospital_ids):
                    h = db.query(Hospital).options(
                        joinedload(Hospital.beds),
                        joinedload(Hospital.ambulances)
                    ).filter(Hospital.id == hospital_ids[choice]).first()
                    if h:
                        msg = (
                            f"Selected: {h.name}\n"
                            f"Addr: {h.address[:35]}\n"
                            f"Ph  : {h.phone}\n\n"
                            + ACTION_MENU
                        )
                        return reply(msg, next_stage="ACTION", hospital_id=h.id)
            # Invalid selection — re-show list
            h_list = db.query(Hospital).options(joinedload(Hospital.beds)).filter(
                Hospital.id.in_(hospital_ids)).all()
            h_map = {h.id: h for h in h_list}
            h_ordered = [h_map[i] for i in hospital_ids if i in h_map]
            lines = ["Invalid. Pick a number:"] + fmt_hospital_list(h_ordered) + ["0=Back"]
            return reply("\n".join(lines), next_stage="BED_RESULTS", hospitals=hospital_ids)

        # ────────────────────────────────────────────────────────────────────
        # STAGE: DISTRICT_ASK — patient types a district name
        # ────────────────────────────────────────────────────────────────────
        if stage == "DISTRICT_ASK":
            district_query = inp
            hospitals = (
                db.query(Hospital)
                .join(District, Hospital.district_id == District.id)
                .options(joinedload(Hospital.beds))
                .filter(
                    District.name.ilike(f"%{district_query}%") |
                    Hospital.address.ilike(f"%{district_query}%")
                )
                .limit(4)
                .all()
            )
            if not hospitals:
                return reply(
                    f"No hospitals in '{district_query}'.\nTry again or 0=Back",
                    next_stage="DISTRICT_ASK"
                )
            lines = [f"HOSPITALS IN {district_query.upper()}:"] + fmt_hospital_list(hospitals)
            lines.append("Select no. 0=Back")
            return reply("\n".join(lines), next_stage="DISTRICT_RESULTS",
                         hospitals=[h.id for h in hospitals])

        # ────────────────────────────────────────────────────────────────────
        # STAGE: DISTRICT_RESULTS — same pick-a-hospital flow
        # ────────────────────────────────────────────────────────────────────
        if stage == "DISTRICT_RESULTS":
            hospital_ids = sess.get("hospitals", [])
            if inp.isdigit():
                choice = int(inp) - 1
                if 0 <= choice < len(hospital_ids):
                    h = db.query(Hospital).options(
                        joinedload(Hospital.beds),
                        joinedload(Hospital.ambulances)
                    ).filter(Hospital.id == hospital_ids[choice]).first()
                    if h:
                        msg = (
                            f"Selected: {h.name}\n"
                            f"Addr: {h.address[:35]}\n"
                            f"Ph  : {h.phone}\n\n"
                            + ACTION_MENU
                        )
                        return reply(msg, next_stage="ACTION", hospital_id=h.id)
            h_list = db.query(Hospital).options(joinedload(Hospital.beds)).filter(
                Hospital.id.in_(hospital_ids)).all()
            h_map = {h.id: h for h in h_list}
            h_ordered = [h_map[i] for i in hospital_ids if i in h_map]
            lines = ["Invalid. Pick a number:"] + fmt_hospital_list(h_ordered) + ["0=Back"]
            return reply("\n".join(lines), next_stage="DISTRICT_RESULTS", hospitals=hospital_ids)

        # ────────────────────────────────────────────────────────────────────
        # STAGE: ACTION — "1. Appointment" or "2. Ambulance"
        # ────────────────────────────────────────────────────────────────────
        if stage == "ACTION":
            hospital_id = sess.get("hospital_id")
            h = db.query(Hospital).options(
                joinedload(Hospital.beds),
                joinedload(Hospital.ambulances)
            ).filter(Hospital.id == hospital_id).first() if hospital_id else None

            if inp == "1":
                if not h:
                    return reply("Hospital not found.\n" + MAIN_MENU, next_stage="MAIN")
                return reply(result_appointment(h), next_stage="MAIN")

            if inp == "2":
                if not h:
                    return reply("Hospital not found.\n" + MAIN_MENU, next_stage="MAIN")
                return reply(result_ambulance(h), next_stage="MAIN")

            # Unknown — re-show action menu
            return reply(ACTION_MENU, next_stage="ACTION", hospital_id=hospital_id)

        # ── Fallback ─────────────────────────────────────────────────────────
        return reply(MAIN_MENU, next_stage="MAIN")

    @staticmethod
    def process_sms_query(sender_phone: str, message_body: str, db: Session) -> dict:
        """
        Stateful SMS flow keyed by sender_phone.

        Commands / keywords recognised:
          MENU / HI / HELLO      → show main SMS menu
          ICU / OXYGEN / GENERAL → search hospitals by bed type
          DISTRICT <name>        → search hospitals by district
          <number>               → pick hospital from last result list
          1 / APPT               → book appointment (after hospital chosen)
          2 / AMB / AMBULANCE    → call ambulance (after hospital chosen)
          STOP / BYE / 99        → end conversation
        """
        text = message_body.strip()
        text_up = text.upper()

        # Use sender_phone as session key (prefixed to avoid collision with USSD sessions)
        skey = f"sms:{sender_phone}"
        sess = _sessions.get(skey, {"stage": "MAIN"})

        def sms_reply(sms_text: str, cont: bool = True,
                      next_stage: str = "MAIN", hospitals_found: int = 0, **extra):
            _sessions[skey] = {"stage": next_stage, **extra}
            return {
                "reply_to": sender_phone,
                "sms_text": sms_text,
                "hospitals_found": hospitals_found,
                "should_continue": cont,
            }

        SMS_MAIN_MENU = (
            "MEDFLOW SMS HELPLINE\n"
            "Send:\n"
            "ICU     - ICU beds\n"
            "OXYGEN  - O2 beds\n"
            "GENERAL - General beds\n"
            "DISTRICT <name> - By district\n"
            "STOP to exit"
        )

        SMS_ACTION_MENU = (
            "Reply:\n"
            "1 - Book Appointment\n"
            "2 - Call Ambulance\n"
            "0 - Back | STOP to exit"
        )

        def fmt_sms_list(hospitals_list) -> str:
            lines = []
            for idx, h in enumerate(hospitals_list, 1):
                avail = sum(1 for b in h.beds if b.status == "AVAILABLE")
                lines.append(f"{idx}.{h.name[:16]}\n  Beds:{avail}|Ph:{h.phone}")
            return "\n".join(lines)

        def sms_appointment(h) -> str:
            avail = sum(1 for b in h.beds if b.status == "AVAILABLE")
            return (
                f"APPT CONFIRMED\n"
                f"{h.name}\n"
                f"{h.address[:40]}\n"
                f"Ph:{h.phone}\n"
                f"Beds:{avail} avail\n"
                f"Call hosp to confirm.\n"
                f"Helpline:108"
            )

        def sms_ambulance(h) -> str:
            amb_info = "108"
            if hasattr(h, "ambulances") and h.ambulances:
                amb = h.ambulances[0]
                drv = getattr(amb, "driver_phone", None)
                num = getattr(amb, "vehicle_number", None)
                amb_info = drv or (f"Veh {num}" if num else "108")
            return (
                f"AMBULANCE REQUESTED\n"
                f"{h.name}\n"
                f"{h.address[:40]}\n"
                f"Hosp:{h.phone}\n"
                f"Amb:{amb_info}\n"
                f"Stay calm. Help coming.\n"
                f"Helpline:108"
            )

        # ── Global stop ──────────────────────────────────────────────────────
        if text_up in ["STOP", "BYE", "EXIT", "99"]:
            _sessions.pop(skey, None)
            return {
                "reply_to": sender_phone,
                "sms_text": "Thank you for using MedFlow. Stay safe.",
                "hospitals_found": 0,
                "should_continue": False,
            }

        # ── Main menu trigger ────────────────────────────────────────────────
        if text_up in ["MENU", "HI", "HELLO", "START", "0", "*999#"]:
            return sms_reply(SMS_MAIN_MENU, next_stage="MAIN")

        stage = sess.get("stage", "MAIN")

        # ────────────────────────────────────────────────────────────────────
        # STAGE: MAIN or keyword commands (can arrive any time)
        # ────────────────────────────────────────────────────────────────────
        bed_type = None
        if "ICU" in text_up:
            bed_type = "ICU"
            label = "ICU BED RESULTS:"
        elif "OXYGEN" in text_up or "O2" in text_up:
            bed_type = "OXYGEN_SUPPORTED"
            label = "OXYGEN BED RESULTS:"
        elif "GENERAL" in text_up or "BEDS" in text_up:
            bed_type = "GENERAL"
            label = "GENERAL BED RESULTS:"
        elif "VENTILATOR" in text_up or "VENT" in text_up:
            bed_type = "VENTILATOR"
            label = "VENTILATOR RESULTS:"

        if bed_type:
            all_hosps = db.query(Hospital).options(joinedload(Hospital.beds)).limit(12).all()
            hospitals = sorted(
                all_hosps,
                key=lambda h: sum(1 for b in h.beds if b.status == "AVAILABLE" and bed_type in b.bed_type),
                reverse=True
            )[:4]
            if not hospitals:
                return sms_reply(f"No {bed_type} beds found.\n" + SMS_MAIN_MENU, next_stage="MAIN")
            body = label + "\n" + fmt_sms_list(hospitals) + "\nReply with number."
            return sms_reply(body, next_stage="BED_RESULTS",
                             hospitals_found=len(hospitals),
                             hospitals=[h.id for h in hospitals])

        # District keyword: "DISTRICT Salem" or "DIST Salem"
        if text_up.startswith("DISTRICT ") or text_up.startswith("DIST "):
            district_query = text.split(" ", 1)[1].strip()
            hospitals = (
                db.query(Hospital)
                .join(District, Hospital.district_id == District.id)
                .options(joinedload(Hospital.beds))
                .filter(
                    District.name.ilike(f"%{district_query}%") |
                    Hospital.address.ilike(f"%{district_query}%")
                )
                .limit(4)
                .all()
            )
            if not hospitals:
                return sms_reply(
                    f"No hospitals in '{district_query}'.\n"
                    "Try: DISTRICT Chennai",
                    next_stage="MAIN"
                )
            body = (
                f"HOSPITALS IN {district_query.upper()}:\n"
                + fmt_sms_list(hospitals)
                + "\nReply with number."
            )
            return sms_reply(body, next_stage="DISTRICT_RESULTS",
                             hospitals_found=len(hospitals),
                             hospitals=[h.id for h in hospitals])

        # ────────────────────────────────────────────────────────────────────
        # STAGE: BED_RESULTS or DISTRICT_RESULTS — numbered hospital pick
        # ────────────────────────────────────────────────────────────────────
        if stage in ("BED_RESULTS", "DISTRICT_RESULTS"):
            hospital_ids = sess.get("hospitals", [])

            if text.isdigit():
                choice = int(text) - 1
                if 0 <= choice < len(hospital_ids):
                    h = db.query(Hospital).options(
                        joinedload(Hospital.beds),
                        joinedload(Hospital.ambulances)
                    ).filter(Hospital.id == hospital_ids[choice]).first()
                    if h:
                        msg = (
                            f"Selected:{h.name}\n"
                            f"Addr:{h.address[:35]}\n"
                            f"Ph:{h.phone}\n\n"
                            + SMS_ACTION_MENU
                        )
                        return sms_reply(msg, next_stage="ACTION",
                                         hospitals_found=1, hospital_id=h.id)
            # Invalid pick — re-show list
            h_list = db.query(Hospital).options(joinedload(Hospital.beds)).filter(
                Hospital.id.in_(hospital_ids)).all()
            h_map = {h.id: h for h in h_list}
            h_ordered = [h_map[i] for i in hospital_ids if i in h_map]
            body = "Invalid. Pick a number:\n" + fmt_sms_list(h_ordered) + "\nReply with number."
            return sms_reply(body, next_stage=stage,
                             hospitals_found=len(h_ordered), hospitals=hospital_ids)

        # ────────────────────────────────────────────────────────────────────
        # STAGE: ACTION — "1" / "APPT" or "2" / "AMB"
        # ────────────────────────────────────────────────────────────────────
        if stage == "ACTION":
            hospital_id = sess.get("hospital_id")
            h = db.query(Hospital).options(
                joinedload(Hospital.beds),
                joinedload(Hospital.ambulances)
            ).filter(Hospital.id == hospital_id).first() if hospital_id else None

            if text in ["1"] or text_up in ["APPT", "APPOINTMENT"]:
                if not h:
                    return sms_reply("Hospital not found.\n" + SMS_MAIN_MENU, next_stage="MAIN")
                return sms_reply(sms_appointment(h), next_stage="MAIN", hospitals_found=1)

            if text in ["2"] or text_up in ["AMB", "AMBULANCE"]:
                if not h:
                    return sms_reply("Hospital not found.\n" + SMS_MAIN_MENU, next_stage="MAIN")
                return sms_reply(sms_ambulance(h), next_stage="MAIN", hospitals_found=1)

            # Unknown — re-show action menu
            return sms_reply(SMS_ACTION_MENU, next_stage="ACTION",
                             hospitals_found=0, hospital_id=hospital_id)

        # ── Fallback: unknown text → show help menu ───────────────────────────
        return sms_reply(SMS_MAIN_MENU, next_stage="MAIN")


rural_gateway = RuralAccessGateway()

