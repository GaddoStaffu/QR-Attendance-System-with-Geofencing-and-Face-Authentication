import base64
import uuid
import cv2
import os
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
import numpy as np
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
import os
import qrcode
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime
from sqlalchemy.orm import Session
from backend.database import SessionLocal
from backend import models



SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash a plain-text password."""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain-text password against a hashed password."""
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        # Decode the JWT token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        user_id: int = payload.get("user_id")
        if username is None or user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        # Return the decoded user information
        return {"username": username, "user_id": user_id}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


def generate_qr_code(room_id: str) -> str:
    """Generate a QR code for the given room ID."""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(room_id)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Ensure the 'qr_codes' directory exists
    qr_codes_dir = "qr_codes"
    if not os.path.exists(qr_codes_dir):
        os.makedirs(qr_codes_dir)  # Create the directory if it doesn't exist

    # Ensure a unique file name
    while True:
        random_filename = f"{room_id}_{uuid.uuid4().hex}.png"
        img_path = os.path.join(qr_codes_dir, random_filename)
        if not os.path.exists(img_path):  # Check if the file already exists
            break

    # Save the QR code image to the unique file path
    img.save(img_path)
    
    return img_path
    
    

def check_pending_attendance():
    
    """
    Check if students have scanned the QR code for schedules that have ended.
    If not, record their attendance with a 'pending' status.
    """
    db: Session = SessionLocal()
    try:
        print(f"Running check_pending_attendance at {datetime.now()}")
        # Get the current time
        current_time = datetime.now()

        # Find schedules that have ended but are still active for attendance
        ended_schedules = db.query(models.AttendanceScheduleModel).filter(
            models.AttendanceScheduleModel.end_time < current_time.time(),
            models.AttendanceScheduleModel.date <= current_time.date()
        ).all()

        for schedule in ended_schedules:
            # Get all students in the room
            students_in_room = db.query(models.RoomUsersModel).filter(
                models.RoomUsersModel.room_id == schedule.room_id,
                models.RoomUsersModel.status == "accepted"  # Ensure they are active members
            ).all()

            for student in students_in_room:
                # Check if the student already has an attendance record for this schedule
                existing_record = db.query(models.AttendanceRecordModel).filter(
                    models.AttendanceRecordModel.schedule_id == schedule.schedule_id,
                    models.AttendanceRecordModel.user_id == student.user_id
                ).first()

                if not existing_record:
                    # Create a new attendance record with 'pending' status
                    new_record = models.AttendanceRecordModel(
                        room_id=schedule.room_id,
                        user_id=student.user_id,
                        schedule_id=schedule.schedule_id,
                        taken_at=current_time,
                        status="pending",
                        qr_id=None  # Assuming QR ID is not applicable for pending records
                    )
                    db.add(new_record)

        db.commit()
        print(f"Checked and updated pending attendance for schedules at {current_time}")
    except Exception as e:
        print(f"Error checking pending attendance: {e}")
    finally:
        db.close()



def validate_geofence(
    user_longitude: float,
    user_latitude: float,
    geofence_longitude: float,
    geofence_latitude: float,
    radius: float
) -> tuple[bool, float]:
    """
    Check if a user is within a specified geofence radius and return the distance.
    """
    from geopy.distance import geodesic

    # Calculate the distance between the user's location and the geofence center
    user_location = (user_latitude, user_longitude)
    geofence_location = (geofence_latitude, geofence_longitude)
    distance = geodesic(user_location, geofence_location).meters

    # Check if the distance is within the specified radius
    is_within_geofence = distance <= radius
    return is_within_geofence, distance


import random

def generate_verification_code(length: int = 6) -> str:
    """Generate a random numeric verification code."""
    return ''.join(random.choices('0123456789', k=length))



import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from fastapi import HTTPException

SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
SMTP_USERNAME = "SMTP USERNAME HERE"  # Replace with your Gmail address
SMTP_PASSWORD = "SMTP PASSWORD HERE"  # Replace with your Gmail app password

def send_email_verification(recipient_email: str, verification_code: str):
    """Send a verification code to the user's email using Gmail."""
    try:
        # Create the email content
        subject = "QR Attendance System Verification Code"
        body = f"""
        Hello,

        Your verification code is: {verification_code}

        Please enter this code to verify your email address.

        Thank you!
        """

        # Create the email message
        msg = MIMEMultipart()
        msg["From"] = SMTP_USERNAME
        msg["To"] = recipient_email
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "plain"))

        # Connect to the Gmail SMTP server and send the email
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()  # Upgrade the connection to secure
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.sendmail(SMTP_USERNAME, recipient_email, msg.as_string())

        print(f"Verification email sent to {recipient_email}")
    except Exception as e:
        print(f"Failed to send verification email: {e}")
        raise HTTPException(status_code=500, detail="Failed to send verification email.")
    
def generate_mfa_code(length: int = 6) -> str:
    """Generate a random numeric MFA code."""
    return ''.join(random.choices('0123456789', k=length))

def send_email_mfa(email: str, code: str, code_type: str = "login"):
    try:
        if code_type == "register":
            subject = "Your Registration Verification Code"
            body = (
                f"Thank you for registering!\n\n"
                f"Your registration verification code is: {code}\n\n"
                f"Please enter this code to complete your registration."
            )
        elif code_type == "login":
            subject = "Your Login Verification Code"
            body = (
                f"Hello, You have tried to login.\n\n"
                f"Your login verification code is: {code}\n\n"
                f"Please enter this code to login to your account."
            )
        else:
            subject = "Your Verification Code"
            body = f"Your verification code is: {code}"

        msg = MIMEMultipart()
        msg["From"] = SMTP_USERNAME
        msg["To"] = email
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "plain"))

        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.sendmail(SMTP_USERNAME, email, msg.as_string())

        print(f"MFA code sent to {email}")
    except Exception as e:
        print(f"Failed to send MFA code: {e}")
        raise HTTPException(status_code=500, detail="Failed to send MFA code.")

from backend.ArcFaceModel import ArcFaceModel

import json
import json

def validate_face_auth_with_arcface(
    face_auth_data: str,
    registered_face_data: str,
    arcface_model,
    confidence_threshold: float = 0.9  # Stricter confidence threshold (90%)
):
    """
    Validate face authentication using the ArcFace model with a confidence threshold.
    Only accepts faces with a confidence score of 90% or higher.
    """
    try:
        # Convert JSON strings if needed
        face_landmarks = json.loads(face_auth_data) if isinstance(face_auth_data, str) else face_auth_data
        registered_landmarks = json.loads(registered_face_data) if isinstance(registered_face_data, str) else registered_face_data

        # Log the data for debugging
        print(f"Incoming face landmarks: {face_landmarks}")
        print(f"Registered face landmarks: {registered_landmarks}")

        # Perform face authentication using the ArcFace model
        confidence_score = arcface_model.validate(face_landmarks, registered_landmarks)

        # Log the confidence score
        print(f"Confidence score: {confidence_score * 100:.2f}%")  # Print as a percentage
        
        print("Comparing embeddings:")
        print("Auth data:", face_auth_data)
        print("Registered data:", registered_face_data)

        # Check if the confidence score meets the threshold
        if confidence_score >= confidence_threshold:
            print("✅ Face authentication successful.")
            return True
        else:
            print(f"❌ Authentication failed: Confidence score {confidence_score * 100:.2f}% is below the threshold {confidence_threshold * 100:.2f}%")
            return False
    except json.JSONDecodeError as e:
        print(f"❌ Error decoding face authentication data: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error in face authentication: {e}")
        return False


from datetime import datetime
from backend.models import Logs
from sqlalchemy.orm import Session
from fastapi import Request

def log_action(
    db: Session,
    user_id: int,
    action: str,
    level: str,
    details: str,
    action_type: str,
    request: Request
):
    client_ip = request.headers.get("X-Forwarded-For", request.client.host)
    user_agent = request.headers.get("User-Agent", "Unknown")
    log_entry = Logs(
        user_id=user_id,
        action=action,
        level=level,
        timestamp=datetime.now(),
        ip_address=client_ip,
        user_agent=user_agent,
        details=details,
        action_type=action_type,
    )
    db.add(log_entry)
    db.commit()
    
    
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from backend.models import AttendanceRecordModel, AttendanceScheduleModel, RoomUsersModel



def initialize_attendance_records(schedule_id: int, room_id: int, db: Session):
    """
    Initialize attendance records for all students in the room.
    Mark them as 'pending' if the schedule is ongoing, or 'absent' if the schedule has already ended.
    Update existing 'pending' records to 'absent' if the schedule has ended.
    """
    try:
        # Query the schedule to check its status
        schedule = db.query(AttendanceScheduleModel).filter(
            AttendanceScheduleModel.schedule_id == schedule_id
        ).first()

        if not schedule:
            print(f"Schedule {schedule_id} not found.")
            return

        # Determine if the schedule has ended
        now = datetime.now()
        schedule_end_time = datetime.combine(schedule.date, schedule.end_time)
        is_schedule_ended = now > schedule_end_time

        # Query all students in the room
        students_in_room = db.query(RoomUsersModel).filter(
            RoomUsersModel.room_id == room_id,
            RoomUsersModel.status == "accepted"  # Ensure they are active members
        ).all()

        # Create or update attendance records
        new_records = []
        for student in students_in_room:
            # Check if the student already has an attendance record for this schedule
            existing_record = db.query(AttendanceRecordModel).filter(
                AttendanceRecordModel.schedule_id == schedule_id,
                AttendanceRecordModel.user_id == student.user_id
            ).first()

            if existing_record:
                # Update 'pending' records to 'absent' if the schedule has ended
                if existing_record.status == "pending" and is_schedule_ended:
                    print(f"Updating record for User {student.user_id} in Schedule {schedule_id} to 'absent'")
                    existing_record.status = "absent"
            else:
                # Create a new record if no record exists
                status = "absent" if is_schedule_ended else "pending"
                new_record = AttendanceRecordModel(
                    room_id=room_id,
                    user_id=student.user_id,
                    schedule_id=schedule_id,
                    status=status,
                    taken_at=None,  # No scan yet
                    qr_id=None  # Assuming QR ID is not applicable initially
                )
                new_records.append(new_record)

        # Bulk insert new attendance records
        if new_records:
            db.bulk_save_objects(new_records)

        # Commit changes to the database
        db.commit()
        print(f"Attendance records initialized or updated for schedule {schedule_id}")
    except Exception as e:
        print(f"Error initializing attendance records: {e}")
        db.rollback()


def mark_pending_as_absent(db: Session, batch_size=1000):
    try:
        now = datetime.now()
        ended_schedules = db.query(AttendanceScheduleModel).filter(
            AttendanceScheduleModel.end_time < now.time(),
            AttendanceScheduleModel.date <= now.date()
        ).all()

        if not ended_schedules:
            print("No schedules have ended.")
            return

        schedule_ids = [schedule.schedule_id for schedule in ended_schedules]

        # Process attendance records in batches
        offset = 0
        while True:
            pending_records = db.query(AttendanceRecordModel).filter(
                AttendanceRecordModel.schedule_id.in_(schedule_ids),
                AttendanceRecordModel.status == "pending"
            ).limit(batch_size).offset(offset).all()

            if not pending_records:
                break

            for record in pending_records:
                # Update status to absent if still pending
                record.status = "absent"

                # Fetch related data for notifications
                student = db.query(models.UserModel).filter(models.UserModel.user_id == record.user_id).first()
                schedule = db.query(AttendanceScheduleModel).filter(
                    AttendanceScheduleModel.schedule_id == record.schedule_id
                ).first()
                room = db.query(models.RoomsModel).filter(models.RoomsModel.room_id == record.room_id).first()

                if not (student and schedule and room):
                    continue

                # --- Notify Student if not already notified for this status ---
                existing_student_notification = db.query(models.Notification).filter(
                    models.Notification.user_id == student.user_id,
                    models.Notification.room_id == room.room_id,
                    models.Notification.title == "Marked Absent",
                    models.Notification.message.like(f"%schedule '{schedule.schedule_name}'%"),
                    models.Notification.is_read == False
                ).first()
                if not existing_student_notification:
                    student_notification = models.Notification(
                        user_id=student.user_id,
                        title="Marked Absent",
                        message=(
                            f"You have been marked as 'absent' for schedule '{schedule.schedule_name}' "
                            f"in room '{room.class_name}'."
                        ),
                        is_read=False,
                        created_at=datetime.utcnow(),
                        room_id=room.room_id
                    )
                    db.add(student_notification)

            # Commit student notifications before teacher notifications
            db.commit()

            for record in pending_records:
                # Fetch related data again (could be optimized)
                student = db.query(models.UserModel).filter(models.UserModel.user_id == record.user_id).first()
                schedule = db.query(AttendanceScheduleModel).filter(
                    AttendanceScheduleModel.schedule_id == record.schedule_id
                ).first()
                room = db.query(models.RoomsModel).filter(models.RoomsModel.room_id == record.room_id).first()

                if not (student and schedule and room):
                    continue

                # --- Notify Teacher if not already notified for this student/status ---
                existing_teacher_notification = db.query(models.Notification).filter(
                    models.Notification.user_id == room.user_id,
                    models.Notification.room_id == room.room_id,
                    models.Notification.title == "Student Marked Absent",
                    models.Notification.message.like(f"%Student {student.first_name} {student.last_name} (ID: {student.user_id})%"),
                    models.Notification.message.like(f"%schedule '{schedule.schedule_name}'%"),
                    models.Notification.is_read == False
                ).first()
                if not existing_teacher_notification:
                    teacher_notification = models.Notification(
                        user_id=room.user_id,
                        title="Student Marked Absent",
                        message=(
                            f"Student {student.first_name} {student.last_name} (ID: {student.user_id}) "
                            f"was marked 'absent' for schedule '{schedule.schedule_name}' "
                            f"in room '{room.class_name}'."
                        ),
                        is_read=False,
                        created_at=datetime.utcnow(),
                        room_id=room.room_id
                    )
                    db.add(teacher_notification)

            db.commit()
            offset += batch_size

        print(f"Processed pending records for schedules: {schedule_ids}")
    except Exception as e:
        print(f"Error marking pending as absent: {e}")
        db.rollback()

from concurrent.futures import ProcessPoolExecutor
import asyncio
import numpy as np
from fastapi import HTTPException

executor = ProcessPoolExecutor()

# Helper function to convert embeddings to NumPy arrays
def convert_embeddings(face_data):
    """
    Convert all registered embeddings to np.ndarray format.
    """
    return [
        np.array(embedding) if not isinstance(embedding, np.ndarray) else embedding
        for embedding in face_data
    ]

# Helper function to compare embeddings
def compare_embeddings(registered_embeddings, face_embedding, arcface_model, threshold):
    """
    Compare the provided face embedding with registered embeddings and return confidence scores.
    """
    return [
        arcface_model.compare_faces(registered_face=embedding, provided_face=face_embedding, threshold=threshold)
        for embedding in registered_embeddings
    ]

# Helper function to decode base64 images
def decode_base64_image(base64_image: str) -> np.ndarray:
    """
    Decode a base64-encoded image into an OpenCV image.
    """
    import base64
    import cv2

    if not base64_image:
        raise ValueError("No image data provided.")

    # Handle base64 string with or without the prefix
    header, encoded = base64_image.split(",", 1) if "," in base64_image else ("", base64_image)
    image_data = base64.b64decode(encoded)
    if not image_data:
        raise ValueError("Failed to decode base64 image data.")

    # Convert binary data to a NumPy array
    image_array = np.frombuffer(image_data, dtype=np.uint8)
    if image_array.size == 0:
        raise ValueError("Decoded image data is empty.")

    # Decode the NumPy array into an OpenCV image
    decoded_image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
    if decoded_image is None:
        raise ValueError("Failed to decode image. Ensure the base64 string is valid.")

    return decoded_image


async def validate_face_authentication(data, user, db, arcface_model, threshold=0.80):
    """
    Validate face authentication using multiple registered embeddings.
    Returns the highest confidence score if authentication is successful.
    """
    if not data.base64_image:
        raise HTTPException(status_code=400, detail="Face authentication data is required.")

    # Decode image (offloaded to a process)
    image = await asyncio.get_event_loop().run_in_executor(
        executor, decode_base64_image, data.base64_image
    )

    # Generate face embedding for the provided image (offloaded to a process)
    face_embedding = await asyncio.get_event_loop().run_in_executor(
        executor, arcface_model.process_image_with_arcface, image
    )

    # Perform the database query in the main process
    user_face_data = db.query(models.FaceDataModel).filter_by(user_id=user["user_id"]).first()
    if not user_face_data or not isinstance(user_face_data.face_data, list) or len(user_face_data.face_data) == 0:
        raise HTTPException(status_code=404, detail="No registered face data found.")

    # Convert all registered embeddings to np.ndarray format (offloaded to a process)
    registered_embeddings = await asyncio.get_event_loop().run_in_executor(
        executor, convert_embeddings, user_face_data.face_data
    )

    # Compare with each stored embedding and get the confidence scores (offloaded to a process)
    confidence_scores = await asyncio.get_event_loop().run_in_executor(
        executor, compare_embeddings, registered_embeddings, face_embedding, arcface_model, threshold
    )

    # Find the highest confidence score and calculate the average of the top-k scores (Top-3 by default)
    highest_confidence = max(confidence_scores)
    top_k = min(3, len(confidence_scores))  # Ensure we don't go over the available number of embeddings
    average_top_k = sum(sorted(confidence_scores, reverse=True)[:top_k]) / top_k

    # Use highest score (or top-k avg) as basis for authentication
    if highest_confidence < threshold and average_top_k < threshold:
        raise HTTPException(
            status_code=400,
            detail=f"Face authentication failed. Please face the camera directly and ensure good lighting."
        )

    return highest_confidence
      
def decode_base64_image(base64_image: str) -> np.ndarray:
    """
    Decode a base64-encoded image into an OpenCV image.
    Args:
        base64_image (str): The base64-encoded image string.
    Returns:
        np.ndarray: The decoded OpenCV image.
    Raises:
        ValueError: If the decoding fails or the image is invalid.
    """
    if not base64_image:
        raise ValueError("No image data provided.")
    
    # Handle base64 string with or without the prefix
    header, encoded = base64_image.split(",", 1) if "," in base64_image else ("", base64_image)
    image_data = base64.b64decode(encoded)
    if not image_data:
        raise ValueError("Failed to decode base64 image data.")
    
    # Convert binary data to a NumPy array
    image_array = np.frombuffer(image_data, dtype=np.uint8)
    if image_array.size == 0:
        raise ValueError("Decoded image data is empty.")

    # Decode the NumPy array into an OpenCV image
    decoded_image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
    if decoded_image is None:
        raise ValueError("Failed to decode image. Ensure the base64 string is valid.")
    
    return decoded_image