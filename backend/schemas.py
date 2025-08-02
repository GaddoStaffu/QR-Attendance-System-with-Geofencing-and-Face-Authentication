from datetime import datetime, time, date
from enum import Enum
from pydantic import BaseModel, EmailStr
from typing import Dict, Optional, List

# Schema are used for data validation

class RoleEnum(str, Enum):
    student = "student"
    teacher = "teacher"
    admin = "admin"

class JoinStatus(str, Enum):
    pending = "pending"
    accepted = "accepted"
    rejected = "rejected"

class AttendanceStatus(str, Enum):
    present = "present"
    absent = "absent"
    late = "late"
    excused = "excused"
    pending = "pending"  # Add 'pending' to the enum

class User(BaseModel):
    id_number: int
    first_name: str
    last_name: str
    username: str
    email: EmailStr
    password: str
    role: RoleEnum
    is_verified: Optional[bool] = False
    created_at: Optional[str] = None
    verification_code: Optional[str] = None  # <-- Add this line

class Room(BaseModel):
    user_id: int
    class_name: str
    section: str
    description: Optional[str] = None
    isGeofence: bool
    geofence_id: Optional[int] = None
    isFaceAuth: bool
    created_at: str
    room_code: str
    is_archived: bool = False

class UpdateRoom(BaseModel):
    class_name: Optional[str] = None
    section: Optional[str] = None
    description: Optional[str] = None

class RoomUsers(BaseModel):
    room_id: int
    user_id: int
    joined_at: str
    status: JoinStatus

class RoomResponse(BaseModel):
    room_id: int
    class_name: str
    section: str
    description: Optional[str]
    created_at: str
    isGeofence: bool
    isFaceAuth: bool
    room_code: str
    is_archived: bool = False

class RoomDetails(BaseModel):
    room_id: int
    owner: dict
    class_name: str
    section: str
    description: Optional[str]
    isGeofence: bool
    isFaceAuth: bool
    room_code: str


class JoinRoom(BaseModel):
    room_code: str
    user_id: int
    status: JoinStatus
    
    

class JoinRequestResponse(BaseModel):
    room_id: int
    user_id: int
    first_name: str
    last_name: str
    joined_at: Optional[datetime]
    status: JoinStatus
    
class UpdateJoinRequestStatus(BaseModel):
    status: JoinStatus  # Expecting "accepted" or "rejected"


class StudentResponse(BaseModel):
    user_id: int
    first_name: str
    last_name: str
    id_number: int
    joined_at: Optional[datetime]

class AttendanceSchedule(BaseModel):
    schedule_name: str
    schedule_description: Optional[str] = None
    date: date
    start_time: time
    end_time: time
    is_archived: Optional[bool] = False  # Default to False if not provided

    

class AttendanceScheduleResponse(BaseModel):
    schedule_id: int
    room_id: int
    schedule_name: str
    schedule_description: Optional[str] = None
    date: date
    start_time: time
    end_time: time
    created_at: datetime

    class Config:
        from_attributes = True
    
class GenerateQR(BaseModel):
    qr_id: int
    room_id: int
    created_at: datetime
    qr_image_path: str

    class Config:
        from_attributes = True
    
class AttendanceRecord(BaseModel):
    attendance_id: int
    room_id: int
    user_id: int
    schedule_id: int
    taken_at: datetime
    status: AttendanceStatus
    qr_id: Optional[int] = None  # Foreign key to GeneratedQRModel

    class Config:
        from_attributes = True
        

class ScanQR(BaseModel):
    room_id: int
    token: str



class TakeAttendance(BaseModel):
    room_id: int
    token: str    
    base64_image: Optional[str] = None # Base64-encoded facial landmark data    face_auth_data: Optional[List[FaceAuthData]] = None  # Accept an array of objects
    geofence_location: Optional[dict] = None

class  GeofenceLocation(BaseModel):
    location: str
    longitude: float
    latitude: float
    radius: float

class UpdateAttendanceSettings(BaseModel):
    isGeofence: bool
    isFaceAuth: bool


class SetGeofence(BaseModel):
    geofence_id: int
    

class AttendanceStatusRequest(BaseModel):
    room_id: int
    user_id: int
    

class ChangePassword(BaseModel):
    oldPassword: str
    newPassword: str
    confirmPassword: str
    


class ChangeProfileDetails(BaseModel):
    username: Optional[str] = None
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    id_number: Optional[int] = None  # Change id_number to an integer
    
    

from pydantic import BaseModel

class VerifyEmailCode(BaseModel):
    code: str



class SendResetCode(BaseModel):
    email: EmailStr

class VerifyResetCode(BaseModel):
    email: EmailStr
    code: str

class ResetPassword(BaseModel):
    email: EmailStr
    newPassword: str
    confirmPassword: str
    

class NotificationResponse(BaseModel):
    id: int
    user_id: int
    title: str
    message: str
    is_read: bool
    created_at: datetime

    class Config:
        orm_mode = True
    

from pydantic import BaseModel

class NotificationCreate(BaseModel):
    user_id: int
    title: str
    message: str
    

class GetNotificationToken(BaseModel):
    token: str
    

from pydantic import BaseModel

class RegisterFace(BaseModel):
    token: str
    images: List[str]  # Array of base64-encoded images
    

class ScheduleInfo(BaseModel):
    schedule_id: int
    room_id: int
    schedule_name: str
    schedule_description: Optional[str] = None
    date: date
    start_time: time
    end_time: time
    created_at: datetime
    is_archived: bool

    class Config:
        orm_mode = True # or from_attributes = True for Pydantic v2

class UserEdit(BaseModel):
    username: str
    id_number: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    is_verified: Optional[bool] = None
    is_deleted: Optional[bool] = None
    password: Optional[str] = None