from datetime import datetime
from sqlalchemy import (
    JSON, VARCHAR, Column, Date, DateTime, Float, Integer, String, ForeignKey, Boolean, Enum, Time, UniqueConstraint
)
from sqlalchemy.orm import relationship, backref
from backend.database import Base
from backend.schemas import AttendanceStatus, JoinStatus, RoleEnum

class UserModel(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True, unique=True)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    id_number = Column(String(20), unique=True, nullable=False)
    first_name = Column(String(50), nullable=False)
    last_name = Column(String(50), nullable=False)
    role = Column(Enum(RoleEnum), nullable=False)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.now, nullable=False)
    is_deleted = Column(Boolean, default=False)

    owned_rooms = relationship("RoomsModel", back_populates="owner", cascade="all, delete-orphan")
    joined_rooms = relationship("RoomUsersModel", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    excused_attendances = relationship("ExcusedModel", back_populates="user", cascade="all, delete-orphan")
    attendance_records = relationship("AttendanceRecordModel", back_populates="user", cascade="all, delete-orphan")
    face_data = relationship("FaceDataModel", back_populates="user", cascade="all, delete-orphan")
    logs = relationship("Logs", back_populates="user", cascade="all, delete-orphan")

class VerificationCodeModel(Base):
    __tablename__ = "verification_codes"

    id = Column(Integer, primary_key=True, index=True, unique=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    email = Column(String(100), nullable=True)
    code = Column(String(10), nullable=False)
    code_type = Column(String(20), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False)

    user = relationship("UserModel")

class RoomsModel(Base):
    __tablename__ = "rooms"

    room_id = Column(Integer, primary_key=True, index=True, unique=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    class_name = Column(String(100), nullable=False)
    section = Column(String(50), nullable=False)
    description = Column(String(1000), nullable=True)
    isGeofence = Column(Boolean, nullable=False)
    geofence_id = Column(Integer, ForeignKey("geofence_location.geofence_id"), nullable=True)  # <-- Add ForeignKey here
    isFaceAuth = Column(Boolean, nullable=False)
    created_at = Column(String(50), nullable=False)
    room_code = Column(String(20), unique=True, nullable=False)
    is_archived = Column(Boolean, default=False)

    owner = relationship("UserModel", back_populates="owned_rooms")
    room_users = relationship("RoomUsersModel", back_populates="room", cascade="all, delete-orphan")
    schedules = relationship("AttendanceScheduleModel", back_populates="room", cascade="all, delete-orphan")
    generated_qrs = relationship("GeneratedQRModel", back_populates="room", cascade="all, delete-orphan")
    attendance_records = relationship("AttendanceRecordModel", back_populates="room", cascade="all, delete-orphan")
    geofence = relationship("GeofenceLocationModel")  # Optional: for ORM navigation

class RoomUsersModel(Base):
    __tablename__ = "room_users"

    roomuser_id = Column(Integer, primary_key=True, index=True, unique=True)
    room_id = Column(Integer, ForeignKey("rooms.room_id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    joined_at = Column(DateTime, default=datetime.now, nullable=False)
    status = Column(Enum(JoinStatus), nullable=False)

    __table_args__ = (UniqueConstraint("room_id", "user_id", name="unique_room_user"),)

    room = relationship("RoomsModel", back_populates="room_users")
    user = relationship("UserModel", back_populates="joined_rooms")

class AttendanceScheduleModel(Base):
    __tablename__ = "attendance_schedule"

    schedule_id = Column(Integer, primary_key=True, index=True, unique=True)
    room_id = Column(Integer, ForeignKey("rooms.room_id"), nullable=False)
    schedule_name = Column(String(100), nullable=False)
    schedule_description = Column(String(255), nullable=True)
    date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    created_at = Column(DateTime, default=datetime.now, nullable=False)
    is_archived = Column(Boolean, default=False)

    room = relationship("RoomsModel", back_populates="schedules")
    generated_qrs = relationship("GeneratedQRModel", back_populates="schedule", cascade="all, delete-orphan")
    attendance_records = relationship("AttendanceRecordModel", back_populates="schedule", cascade="all, delete-orphan")
    excused_attendances = relationship("ExcusedModel", back_populates="schedule", cascade="all, delete-orphan")

class GeneratedQRModel(Base):
    __tablename__ = "generated_qr"

    qr_id = Column(Integer, primary_key=True, index=True, unique=True)
    room_id = Column(Integer, ForeignKey("rooms.room_id"), nullable=False)
    schedule_id = Column(Integer, ForeignKey("attendance_schedule.schedule_id"), nullable=True)
    created_at = Column(DateTime, default=datetime.now, nullable=False)
    qr_image_path = Column(String(255), nullable=False)

    room = relationship("RoomsModel", back_populates="generated_qrs")
    schedule = relationship("AttendanceScheduleModel", back_populates="generated_qrs")

class AttendanceRecordModel(Base):
    __tablename__ = "attendance_record"
    __table_args__ = (UniqueConstraint("room_id", "user_id", "schedule_id", name="unique_attendance_record"),)

    attendance_id = Column(Integer, primary_key=True, index=True, unique=True)
    room_id = Column(Integer, ForeignKey("rooms.room_id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    schedule_id = Column(Integer, ForeignKey("attendance_schedule.schedule_id"), nullable=False)
    taken_at = Column(DateTime, default=datetime.now, nullable=False)
    status = Column(Enum(AttendanceStatus), nullable=False)
    qr_id = Column(Integer, ForeignKey("generated_qr.qr_id"), nullable=True)

    room = relationship("RoomsModel", back_populates="attendance_records")
    user = relationship("UserModel", back_populates="attendance_records")
    schedule = relationship("AttendanceScheduleModel", back_populates="attendance_records")

class GeofenceLocationModel(Base):
    __tablename__ = "geofence_location"

    geofence_id = Column(Integer, primary_key=True, index=True, unique=True)
    location = Column(String(100), nullable=False)
    longitude = Column(Float, nullable=False)
    latitude = Column(Float, nullable=False)
    radius = Column(Float, nullable=False)

class Logs(Base):
    __tablename__ = "logs"

    log_id = Column(Integer, primary_key=True, index=True, unique=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    action = Column(String(255), nullable=False)
    level = Column(Enum("INFO", "WARNING", "ERROR"), nullable=False)
    timestamp = Column(DateTime, default=datetime.now, nullable=False)
    details = Column(String(1000), nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(255), nullable=True)
    action_type = Column(Enum("LOGIN", "LOGOUT", "CREATE", "UPDATE", "DELETE", "FACEAUTH", "GEOFENCE"), nullable=True)
    error_details = Column(String(2000), nullable=True)

    user = relationship("UserModel", back_populates="logs")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True, unique=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(String(1000), nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    room_id = Column(String(255), nullable=True)

    user = relationship("UserModel", back_populates="notifications")

class FaceDataModel(Base):
    __tablename__ = "face_data"

    face_id = Column(Integer, primary_key=True, index=True, unique=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    face_data = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.now, nullable=False)

    user = relationship("UserModel", back_populates="face_data")

class ExcusedModel(Base):
    __tablename__ = "excused_attendance"

    id = Column(Integer, primary_key=True, index=True, unique=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    schedule_id = Column(Integer, ForeignKey("attendance_schedule.schedule_id"), nullable=False)
    reason = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.now, nullable=False)
    attachment_path = Column(String(255), nullable=True)

    user = relationship("UserModel", back_populates="excused_attendances")
    schedule = relationship("AttendanceScheduleModel", back_populates="excused_attendances")