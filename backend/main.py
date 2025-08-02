import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from backend import models
from backend.database import SessionLocal, engine
from backend.utils import hash_password, mark_pending_as_absent
from apscheduler.schedulers.background import BackgroundScheduler
from backend.routers import admin_logs, admin_rooms, admin_users, attendance, auth, calendar, face_auth, generate_report, geofence, notification, profile, rooms

app = FastAPI()

origins = [
    "https://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

models.Base.metadata.create_all(bind=engine)

def create_admin_account():
    db = SessionLocal()
    try:
        admin = db.query(models.UserModel).filter(models.UserModel.role == "admin").first()
        if not admin:
            admin = models.UserModel(
                username="admin",
                email="your email here", # change this to a proper email
                hashed_password=hash_password("admin"),
                id_number="00000000",
                first_name="System",
                last_name="Administrator",
                role="admin",
                is_verified=True
            )
            db.add(admin)
            db.commit()
            print("Admin account created: username=admin, password=admin")
        else:
            print("Admin account already exists.")
    except Exception as e:
        print(f"Error creating admin account: {e}")
    finally:
        db.close()

create_admin_account()
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(rooms.router, prefix="/rooms", tags=["Rooms"])
app.include_router(attendance.router, prefix="/attendance", tags=["Attendance"])
app.include_router(geofence.router, prefix="/geofence", tags=["Geofence"])
app.include_router(admin_users.router, prefix="/admin-users", tags=["Users"])
app.include_router(admin_rooms.router, prefix="/admin-rooms", tags=["Rooms"])
app.include_router(profile.router, prefix="/profile", tags=["Profile"])
app.include_router(admin_logs.router, prefix="/admin-logs", tags=["Admin Rooms"])
app.include_router(notification.router, prefix="/notifications", tags=["Notifications"])
app.include_router(calendar.router, prefix="/calendar", tags=["Calendar"])
app.include_router(face_auth.router, prefix="/face-auth", tags=["Face Authentication"])
app.include_router(generate_report.router, prefix="/reports", tags=["Generate Report"])


excuse_attachments_path = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "excuse_attachments")
)
app.mount(
    "/excuse_attachments",
    StaticFiles(directory=excuse_attachments_path),
    name="excuse_attachments"
)

from apscheduler.schedulers.background import BackgroundScheduler

scheduler = BackgroundScheduler()

# Add the job to the scheduler (runs every 10 minutes)
scheduler.add_job(lambda: mark_pending_as_absent(SessionLocal()), "interval", minutes=5)

# Start the scheduler
scheduler.start()

# Ensure the scheduler shuts down gracefully on app termination
import atexit
atexit.register(lambda: scheduler.shutdown())

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(
        "backend.main:app",
        reload=True,
        host="0.0.0.0",
        port=8000,
        ssl_keyfile="certs/cert.key",
        ssl_certfile="certs/cert.crt",
        workers=4,
    )