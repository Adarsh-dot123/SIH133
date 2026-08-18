"""
MedFlow User & Credentials Manager CLI
Utility script to view, create, and manage encrypted credentials stored in medflow.db
"""

import sys
import argparse
import datetime
import bcrypt
import sqlite3

DB_PATH = "medflow.db"

def hash_pw(password: str) -> str:
    pwd_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")

def verify_pw(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False

def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def list_users():
    conn = get_conn()
    c = conn.cursor()
    rows = c.execute("""
        SELECT u.id, u.email, u.full_name, u.role, u.department, u.designation, u.abha_id, u.phone, u.is_active, h.name as hospital_name, u.hashed_password
        FROM users u
        LEFT JOIN hospitals h ON u.hospital_id = h.id
        ORDER BY u.id ASC
    """).fetchall()
    
    print("\n" + "=" * 95)
    print(f"  {'ID':<4} | {'Email':<25} | {'Role':<15} | {'ABHA ID':<18} | {'Hospital':<20}")
    print("=" * 95)
    
    for r in rows:
        hosp = (r["hospital_name"] or "State Network")[:18]
        abha = (r["abha_id"] or "N/A")[:18]
        print(f"  {r['id']:<4} | {r['email']:<25} | {r['role']:<15} | {abha:<18} | {hosp:<20}")
        print(f"       -> Name: {r['full_name']} | Dept: {r['department'] or 'General'} | Desig: {r['designation'] or 'Staff'}")
        print(f"       -> Bcrypt Hash: {r['hashed_password'][:30]}...")
        print("-" * 95)
    
    print(f"\nTotal Registered Stakeholder Accounts in Database: {len(rows)}")
    conn.close()

def add_user(email, password, full_name, role, department=None, designation=None, abha_id=None, hospital_id=None, phone=None):
    conn = get_conn()
    c = conn.cursor()
    
    # Check if exists
    existing = c.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
    if existing:
        print(f"Error: User with email '{email}' already exists.")
        conn.close()
        return
    
    hashed = hash_pw(password)
    now = datetime.datetime.utcnow().isoformat()
    c.execute("""
        INSERT INTO users (email, hashed_password, full_name, role, department, designation, abha_id, hospital_id, phone, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    """, (email, hashed, full_name, role, department, designation, abha_id, hospital_id, phone, now))
    conn.commit()
    user_id = c.lastrowid
    conn.close()
    
    print(f"\n[SUCCESS] User '{email}' (ID: {user_id}) successfully created!")
    print(f"   Role: {role} | Bcrypt Hash: {hashed[:25]}...")

def test_login(email, password):
    conn = get_conn()
    c = conn.cursor()
    user = c.execute("SELECT id, email, full_name, role, hashed_password FROM users WHERE email = ? OR abha_id = ?", (email, email)).fetchone()
    conn.close()
    
    if not user:
        print(f"\n[FAILED] Login Failed: No account found matching '{email}'")
        return
    
    if verify_pw(password, user["hashed_password"]):
        print(f"\n[SUCCESS] Authentication SUCCESSFUL!")
        print(f"   User: {user['full_name']} (ID #{user['id']})")
        print(f"   Role: {user['role']}")
        print(f"   Hash Verified via Bcrypt.")
    else:
        print(f"\n[FAILED] Password verification failed for '{email}'.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="MedFlow Credential Database CLI")
    parser.add_argument("action", choices=["list", "create", "test-login"], help="Action to perform")
    parser.add_argument("--email", help="User email")
    parser.add_argument("--password", help="User password")
    parser.add_argument("--name", help="Full name")
    parser.add_argument("--role", choices=["PATIENT", "HOSPITAL_STAFF", "GOVT_ADMIN"], default="PATIENT", help="Stakeholder Role")
    parser.add_argument("--dept", help="Department")
    parser.add_argument("--desig", help="Designation")
    parser.add_argument("--abha", help="ABHA ID")
    parser.add_argument("--hosp", type=int, help="Hospital ID")
    parser.add_argument("--phone", help="Phone number")

    args = parser.parse_args()

    if args.action == "list":
        list_users()
    elif args.action == "create":
        if not args.email or not args.password or not args.name:
            print("Error: --email, --password, and --name are required for creating a user.")
        else:
            add_user(
                email=args.email,
                password=args.password,
                full_name=args.name,
                role=args.role,
                department=args.dept,
                designation=args.desig,
                abha_id=args.abha,
                hospital_id=args.hosp,
                phone=args.phone
            )
    elif args.action == "test-login":
        if not args.email or not args.password:
            print("Error: --email and --password are required.")
        else:
            test_login(args.email, args.password)
