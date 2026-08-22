import datetime
import bcrypt
from sqlalchemy.orm import Session
from app.models import User, DoctorProfile, UserRole

SEED_USERS = [
    # Govt Admin
    {
        "email": "admin@medflow.gov.in",
        "password": "Admin@123",
        "full_name": "Government Administrator",
        "role": UserRole.GOVT_ADMIN,
        "hospital_id": None,
        "department": "State Health Authority",
        "designation": "District Health Officer",
        "phone": "+91-9000000001",
        "doctor_profile": None
    },
    # Doctors
    {
        "email": "dr.arun@apollo.in",
        "password": "Doctor@123",
        "full_name": "Dr. Arun Sharma",
        "role": UserRole.HOSPITAL_STAFF,
        "hospital_id": 1,
        "department": "Cardiology",
        "designation": "Senior Cardiologist",
        "phone": "+91-9000000002",
        "doctor_profile": {"specialization": "Cardiology", "hospital_name": "Apol Hospitals"}
    },
    {
        "email": "dr.priya@fortis.in",
        "password": "Doctor@123",
        "full_name": "Dr. Priya Nair",
        "role": UserRole.HOSPITAL_STAFF,
        "hospital_id": 2,
        "department": "Pediatrics",
        "designation": "Senior Pediatrician",
        "phone": "+91-9000000003",
        "doctor_profile": {"specialization": "Pediatrics", "hospital_name": "Sunfeast Hospitals"}
    },
    {
        "email": "dr.rajan@kamaraj.in",
        "password": "Doctor@123",
        "full_name": "Dr. Rajan Kumar",
        "role": UserRole.HOSPITAL_STAFF,
        "hospital_id": 3,
        "department": "Neurology",
        "designation": "Senior Neurologist",
        "phone": "+91-9000000004",
        "doctor_profile": {"specialization": "Neurology", "hospital_name": "Kamaraj Hospitals"}
    },
    {
        "email": "dr.meena@nehru.in",
        "password": "Doctor@123",
        "full_name": "Dr. Meena Patel",
        "role": UserRole.HOSPITAL_STAFF,
        "hospital_id": 4,
        "department": "Pulmonology",
        "designation": "Senior Pulmonologist",
        "phone": "+91-9000000005",
        "doctor_profile": {"specialization": "Pulmonology", "hospital_name": "Nehru Hospitals"}
    },
    {
        "email": "dr.vikram@gandhi.in",
        "password": "Doctor@123",
        "full_name": "Dr. Vikram Singh",
        "role": UserRole.HOSPITAL_STAFF,
        "hospital_id": 5,
        "department": "Nephrology",
        "designation": "Senior Nephrologist",
        "phone": "+91-9000000006",
        "doctor_profile": {"specialization": "Nephrology", "hospital_name": "Gandhi Hospitals"}
    },
    # Patients
    {
        "email": "ramesh@patient.in",
        "password": "Patient@123",
        "full_name": "Ramesh Kumar",
        "role": UserRole.PATIENT,
        "hospital_id": None,
        "department": None,
        "designation": None,
        "phone": "+91-9000000007",
        "doctor_profile": None
    },
    {
        "email": "kavya@patient.in",
        "password": "Patient@123",
        "full_name": "Kavya Reddy",
        "role": UserRole.PATIENT,
        "hospital_id": None,
        "department": None,
        "designation": None,
        "phone": "+91-9000000008",
        "doctor_profile": None
    },
    {
        "email": "arjun@patient.in",
        "password": "Patient@123",
        "full_name": "Arjun Mehta",
        "role": UserRole.PATIENT,
        "hospital_id": None,
        "department": None,
        "designation": None,
        "phone": "+91-9000000009",
        "doctor_profile": None
    },
]


def get_password_hash(password: str) -> str:
    pwd_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def seed_users(db: Session):
    """Seed pre-defined demo users and doctor profiles if they don't exist."""
    for u in SEED_USERS:
        existing = db.query(User).filter(User.email == u["email"]).first()
        if not existing:
            user = User(
                email=u["email"],
                hashed_password=get_password_hash(u["password"]),
                full_name=u["full_name"],
                role=u["role"],
                hospital_id=u["hospital_id"],
                department=u["department"],
                designation=u["designation"],
                phone=u["phone"],
                is_active=True,
                created_at=datetime.datetime.utcnow()
            )
            db.add(user)
            db.flush()

            if u["doctor_profile"]:
                dp = DoctorProfile(
                    user_id=user.id,
                    specialization=u["doctor_profile"]["specialization"],
                    hospital_name=u["doctor_profile"]["hospital_name"],
                    is_available=True
                )
                db.add(dp)

    db.commit()
    print("✅ Demo users seeded successfully.")
