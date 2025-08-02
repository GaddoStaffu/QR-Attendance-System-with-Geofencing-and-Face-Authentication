import asyncio
from datetime import datetime
import json
import os
from typing import List
from uuid import uuid4
from fastapi import APIRouter, Depends, File, Form, HTTPException, Header, Request, UploadFile
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import base64
from backend import models, schemas
from backend.database import get_db
from backend.routers import notification
from backend.utils import check_pending_attendance, decode_base64_image, get_current_user, initialize_attendance_records, log_action, validate_face_authentication, validate_geofence
import numpy as np
from backend.ArcFaceModel import ArcFaceModel
from fastapi import Body


router = APIRouter()

## TODO: Fix the error response


@router.get("/{room_id}/attendance_schedule", response_model=List[schemas.AttendanceScheduleResponse])
def attendance_schedule(room_id: int, db: Session = Depends(get_db)):
    """
    Fetch all attendance schedules for a specific room.
    """
    try:
        # Query the AttendanceSchedule table for schedules associated with the given room_id
        schedules = db.query(models.AttendanceScheduleModel).filter(
            models.AttendanceScheduleModel.room_id == room_id
        ).all()

        # Return a message if no schedules are found
        if not schedules:
            raise HTTPException(status_code=404, detail="No attendance schedule available for this room")

        # Return the list of schedules
        return schedules
    except HTTPException as http_exc:
        # Re-raise HTTP exceptions with meaningful details
        raise http_exc
    except Exception as e:
        # Log unexpected errors and return a generic error message
        print(f"Error fetching attendance schedules: {e}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred while fetching attendance schedules")   

@router.post("/{room_id}/create_attendance_schedule")
def create_attendance_schedule(
    room_id: int,
    schedule: schemas.AttendanceSchedule,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    request: Request = None
):
    """
    Create an attendance schedule for a specific room and notify all students in the room.
    """
    try:
        print(f"Creating schedule for room_id: {room_id}, schedule: {schedule}")

        # Validate that the schedule_name is not null or empty
        if not schedule.schedule_name or schedule.schedule_name.strip() == "":
            print("Schedule name cannot be null or empty")
            raise HTTPException(status_code=400, detail="Schedule name cannot be null or empty")

        if not schedule.date:
            print("Date cannot be empty")
            raise HTTPException(status_code=400, detail="Date cannot be empty")

        if schedule.date < datetime.now().date():
            print("Date cannot be in the past")
            raise HTTPException(status_code=400, detail="Date cannot be in the past")

        # Verify that the current user is the owner of the room
        room = db.query(models.RoomsModel).filter(models.RoomsModel.room_id == room_id).first()
        if not room:
            print("Room not found")
            raise HTTPException(status_code=404, detail="Room not found")

        if room.user_id != current_user["user_id"]:
            print("User not authorized to create a schedule for this room")
            raise HTTPException(status_code=403, detail="You are not authorized to create a schedule for this room")

        # Validate that start_time is earlier than end_time
        if schedule.start_time >= schedule.end_time:
            print("Start time must be earlier than end time")
            raise HTTPException(status_code=400, detail="Start time must be earlier than end time")

        # Check for overlapping schedules for the same room on the same date
        overlapping_schedule = db.query(models.AttendanceScheduleModel).filter(
            models.AttendanceScheduleModel.room_id == room_id,
            models.AttendanceScheduleModel.date == schedule.date,
            models.AttendanceScheduleModel.start_time < schedule.end_time,
            models.AttendanceScheduleModel.end_time > schedule.start_time
            ).first()


        if overlapping_schedule:
            print("Overlapping schedule found")
            raise HTTPException(
                status_code=400,
                detail="An overlapping attendance schedule already exists for this date and time in this room"
            )

        # Create a new attendance schedule
        new_schedule = models.AttendanceScheduleModel(
            room_id=room_id,
            schedule_name=schedule.schedule_name,
            schedule_description=schedule.schedule_description,
            date=schedule.date,
            start_time=schedule.start_time,
            end_time=schedule.end_time,
            created_at=datetime.now(),  # Add created_at timestamp
            is_archived=False  # Default to not archived
        )
        db.add(new_schedule)
        db.commit()
        db.refresh(new_schedule)

        # Fetch all students in the room
        students = db.query(models.RoomUsersModel).filter(
            models.RoomUsersModel.room_id == room_id
        ).all()

        # Create notifications for all students
        notifications = []
        for student in students:
            notification = models.Notification(
                user_id=student.user_id,
                title=f"{room.class_name}: New Attendance Schedule",
                message=f"Schedule '{schedule.schedule_name}' has been created for {schedule.date}.",
                is_read=False,
                created_at=datetime.utcnow(),
                room_id=room_id,  # Correctly reference the room_id
            )
            notifications.append(notification)

        # Add all notifications to the database
        db.bulk_save_objects(notifications)
        db.commit()
        
        log_action(
        db=db,
        user_id=current_user["user_id"],
        action="Create Attendance Schedule",
        level="INFO",
        details=f"User {current_user['username']} created schedule {new_schedule.schedule_id}",
        action_type="CREATE",
        request=request,)

        print(f"Attendance schedule created successfully: {new_schedule.schedule_name}")
        return {"message": "Attendance schedule created successfully", "schedule_id": new_schedule.schedule_id}

    except HTTPException as http_exc:
        # Re-raise HTTP exceptions with meaningful details
        print(f"HTTPException: {http_exc.detail}")
        raise http_exc
    except Exception as e:
        # Log unexpected errors and return a generic error message
        print(f"Unexpected error in create_attendance_schedule: {e}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred while creating the attendance schedule.")

@router.get("/scan_qr")
def scan_qr(
    room_id: int,  # Room ID extracted from the QR code
    token: str,  # Token for authentication
    db: Session = Depends(get_db),
    request: Request = None
):
    """
    Fetch the room settings using the room_id extracted from the QR code.
    Requires a valid token for authentication.
    """
    try:
        # Verify the user token and extract user details
        user = get_current_user(token)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid or expired token")

        # Verify that the room exists
        room = db.query(models.RoomsModel).filter(models.RoomsModel.room_id == room_id).first()
        if not room:
            raise HTTPException(status_code=404, detail="Room not found")

        log_action(
        db=db,
        user_id=user["user_id"],
        action="Scan QR",
        level="INFO",
        details=f"User {user['user_id']} scanned QR code for room {room_id}",
        action_type="CREATE",
        request=request,)
        # Return the room settings
        return {
            "room_id": room.room_id,
            "class_name": room.class_name,
            "section": room.section,
            "description": room.description,
            "isGeofence": room.isGeofence,
            "isFaceAuth": room.isFaceAuth,
            "is_archived": room.is_archived,
        }
    except HTTPException as http_exc:
        # Re-raise HTTP exceptions with meaningful details
        raise http_exc
    except Exception as e:
        print(f"Error fetching room settings: {e}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred while fetching room settings.")

from backend.utils import validate_face_auth_with_arcface
from backend.ArcFaceModel import ArcFaceModel
from concurrent.futures import ThreadPoolExecutor
from backend.ArcFaceModel import ArcFaceModel

# Create a ThreadPoolExecutor instance
executor = ThreadPoolExecutor()

@router.post("/take_attendance")
async def take_attendance(
    data: schemas.TakeAttendance,
    db: Session = Depends(get_db),
    request: Request = None
):
    """
    Dynamically take attendance for a user in a specific room.
    If geofence or face authentication is enabled, validate the corresponding data.
    """
    try:
        # Extract room_id and token from the request
        room_id = data.room_id
        token = data.token

        # Verify the user token and extract user details
        user = get_current_user(token)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid or expired token")

        # Verify that the room exists
        room = db.query(models.RoomsModel).filter(models.RoomsModel.room_id == room_id).first()
        if not room:
            raise HTTPException(status_code=404, detail="Room not found")
        
        if room.is_archived:
            raise HTTPException(status_code=400, detail="Attendance cannot be marked. The room is archived.")

        # Verify that the user is part of the room
        user_in_room = db.query(models.RoomUsersModel).filter(
            models.RoomUsersModel.room_id == room_id,
            models.RoomUsersModel.user_id == user["user_id"]
        ).first()
        if not user_in_room:
            raise HTTPException(status_code=403, detail="You are not a member of this room")

        # Ensure the user's status is "accepted"
        if user_in_room.status != "accepted":
            raise HTTPException(status_code=403, detail="You are not allowed to mark attendance in this room")

        # Initialize validation flags
        geofence_valid = True
        face_auth_valid = True

        # Validate geofence if enabled
        if room.isGeofence:
            if not data.geofence_location:
                raise HTTPException(status_code=400, detail="Geofence location is required for this room")

            # Retrieve geofence details using the geofence_id foreign key
            geofence = db.query(models.GeofenceLocationModel).filter(
                models.GeofenceLocationModel.geofence_id == room.geofence_id
            ).first()
            if not geofence:
                raise HTTPException(status_code=404, detail="Geofence data not found for this room")

            # Validate geofence location
            user_latitude = data.geofence_location["latitude"]
            user_longitude = data.geofence_location["longitude"]
            geofence_valid, distance = validate_geofence(
                user_longitude=user_longitude,
                user_latitude=user_latitude,
                geofence_longitude=geofence.longitude,
                geofence_latitude=geofence.latitude,
                radius=geofence.radius
            )

            # Log the geofence validation result and distance
            log_action(
                db=db,
                user_id=user['user_id'],
                action="Geofence Validation",
                level="INFO",
                details=(f"User {user['user_id']} attempted geofence validation. "
                         f"Result: {geofence_valid}, Distance: {distance:.2f} meters"),
                action_type="GEOFENCE",
                request=request,
            )

            if not geofence_valid:
                raise HTTPException(
                    status_code=400,
                    detail=f"You are outside the geofence area. You are {distance:.2f} meters away from the geofence center."
                )

        # Validate face authentication if enabled
        confidence = None
        if room.isFaceAuth:
            arcface_model = ArcFaceModel()
            confidence = await validate_face_authentication(data, user, db, arcface_model, threshold=0.80)

            # Log the face authentication result
            log_action(
                db=db,
                user_id=user['user_id'],
                action="Face Authentication",
                level="INFO",
                details=f"User {user['user_id']} attempted face authentication with result: {confidence}",
                action_type="FACEAUTH",
                request=request,
            )

            if confidence < 0.80:
                face_auth_valid = False

        # Ensure both validations pass if both are enabled
        if room.isGeofence and room.isFaceAuth:
            if not (geofence_valid and face_auth_valid):
                raise HTTPException(
                    status_code=400,
                    detail="Attendance cannot be marked. Both geofence and face authentication must be valid."
                )
        elif room.isGeofence and not geofence_valid:
            raise HTTPException(
                status_code=400,
                detail="Attendance cannot be marked. Geofence validation failed."
            )
        elif room.isFaceAuth and not face_auth_valid:
            raise HTTPException(
                status_code=400,
                detail="Attendance cannot be marked. Face authentication failed."
            )

        # Check if there is an active attendance schedule for the room
        current_time = datetime.now().time()
        current_date = datetime.now().date()
        active_schedule = db.query(models.AttendanceScheduleModel).filter(
            models.AttendanceScheduleModel.room_id == room_id,
            models.AttendanceScheduleModel.date == current_date,
            models.AttendanceScheduleModel.start_time <= current_time,
            models.AttendanceScheduleModel.end_time >= current_time
        ).first()
        if not active_schedule:
            raise HTTPException(status_code=400, detail="No active attendance schedule for this room at this time")

        # Check if the user has a pending attendance record
        pending_attendance = db.query(models.AttendanceRecordModel).filter(
            models.AttendanceRecordModel.room_id == room_id,
            models.AttendanceRecordModel.user_id == user["user_id"],
            models.AttendanceRecordModel.schedule_id == active_schedule.schedule_id,
            models.AttendanceRecordModel.status == "pending"
        ).first()

        # Determine if the student is late or present
        schedule_start = datetime.combine(active_schedule.date, active_schedule.start_time)
        current_datetime = datetime.now()
        time_difference = (current_datetime - schedule_start).total_seconds() / 60  # Difference in minutes

        status = None
        if pending_attendance:
            # Update the pending record
            if time_difference > 15:
                pending_attendance.status = "late"
                status = "late"
            else:
                pending_attendance.status = "present"
                status = "present"
            pending_attendance.taken_at = current_datetime
            db.commit()
            db.refresh(pending_attendance)
        else:
            # Check if the user has already marked attendance
            existing_attendance = db.query(models.AttendanceRecordModel).filter(
                models.AttendanceRecordModel.room_id == room_id,
                models.AttendanceRecordModel.user_id == user["user_id"],
                models.AttendanceRecordModel.schedule_id == active_schedule.schedule_id
            ).first()
            if existing_attendance:
                raise HTTPException(status_code=400, detail="You have already marked attendance for the current schedule")

            # Create a new attendance record
            status = "late" if time_difference > 15 else "present"
            new_attendance = models.AttendanceRecordModel(
                room_id=room_id,
                user_id=user["user_id"],
                schedule_id=active_schedule.schedule_id,
                status=status,
                taken_at=current_datetime,
                qr_id=None
            )
            db.add(new_attendance)
            db.commit()
            db.refresh(new_attendance)

        # Notify the teacher
        notification = models.Notification(
            user_id=room.user_id,
            title="Student Attendance Marked",
            message=f"Student {user['user_id']} has marked {status} attendance for schedule '{active_schedule.schedule_name}'.",
            created_at=datetime.utcnow()
        )
        db.add(notification)
        db.commit()

        log_action(
            db=db,
            user_id=user["user_id"],
            action="Take Attendance",
            level="INFO",
            details=f"User {user['user_id']} marked attendance for schedule {active_schedule.schedule_id}",
            action_type="CREATE",
            request=request,
        )
        # ...after determining status and before sending notification...

        # Fetch student details from the database
        student = db.query(models.UserModel).filter(models.UserModel.user_id == user["user_id"]).first()

        # Notify the teacher
        notification = models.Notification(
            user_id=room.user_id,  # Teacher's user_id (owner of the room)
            title="Student Attendance Marked",
            message=(
                f"Student {student.first_name} {student.last_name} (ID: {student.user_id}) "
                f"has marked '{status}' attendance for schedule '{active_schedule.schedule_name}' "
                f"in room '{room.class_name}'."
            ),
            is_read=False,
            created_at=datetime.utcnow(),
            room_id=room.room_id
        )
        db.add(notification)
        db.commit()

        return {
            "message": "Attendance marked successfully",
            "attendance_id": pending_attendance.attendance_id if pending_attendance else new_attendance.attendance_id,
            "status": status,
            "confidence": confidence
        }

    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        print(f"Unexpected error in take_attendance: {e}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred. Please try again later.")
    
@router.put("/{schedule_id}/update_attendance_schedule")
def update_attendance_schedule(
    schedule_id: int,
    schedule: schemas.AttendanceSchedule,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    request: Request = None
):
    """
    Update an existing attendance schedule.
    """
    try:
        print(f"Updating attendance schedule with ID: {schedule_id}")
        print(f"Received payload: {schedule}")

        # Fetch the schedule from the database
        existing_schedule = db.query(models.AttendanceScheduleModel).filter(
            models.AttendanceScheduleModel.schedule_id == schedule_id
        ).first()

        if not existing_schedule:
            print(f"Schedule with ID {schedule_id} not found")
            raise HTTPException(status_code=404, detail="Schedule not found")

        # Verify that the current user is authorized to update the schedule
        room = db.query(models.RoomsModel).filter(
            models.RoomsModel.room_id == existing_schedule.room_id
        ).first()
        if not room or room.user_id != current_user["user_id"]:
            print("User not authorized to update this schedule")
            raise HTTPException(status_code=403, detail="You are not authorized to update this schedule")

        # Validate that start_time is earlier than end_time
        if schedule.start_time and schedule.end_time and schedule.start_time >= schedule.end_time:
            print("Start time must be earlier than end time")
            raise HTTPException(status_code=400, detail="Start time must be earlier than end time")

        # Check for overlapping schedules
        if schedule.date and schedule.start_time and schedule.end_time:
            overlapping_schedule = db.query(models.AttendanceScheduleModel).filter(
                models.AttendanceScheduleModel.room_id == existing_schedule.room_id,
                models.AttendanceScheduleModel.date == (schedule.date or existing_schedule.date),
                models.AttendanceScheduleModel.start_time < (schedule.end_time or existing_schedule.end_time),
                models.AttendanceScheduleModel.end_time > (schedule.start_time or existing_schedule.start_time),
                models.AttendanceScheduleModel.schedule_id != schedule_id
            ).first()
            if overlapping_schedule:
                print("Overlapping schedule found")
                raise HTTPException(
                    status_code=400,
                    detail="An overlapping attendance schedule already exists for this date and time"
                )

        # Update only the fields that are provided
        if schedule.schedule_name is not None:
            print(f"Updating schedule_name to: {schedule.schedule_name}")
            existing_schedule.schedule_name = schedule.schedule_name
        if schedule.schedule_description is not None:
            print(f"Updating schedule_description to: {schedule.schedule_description}")
            existing_schedule.schedule_description = schedule.schedule_description
        if schedule.date is not None:
            print(f"Updating date to: {schedule.date}")
            existing_schedule.date = schedule.date
        if schedule.start_time is not None:
            print(f"Updating start_time to: {schedule.start_time}")
            existing_schedule.start_time = schedule.start_time
        if schedule.end_time is not None:
            print(f"Updating end_time to: {schedule.end_time}")
            existing_schedule.end_time = schedule.end_time

        user = current_user["user_id"]
        log_action(
        db=db,
        user_id=user,
        action="Update attendance schedule",
        level="INFO",
        details=f"User {user} updated schedule {schedule_id}",
        action_type="UPDATE",
        request=request,)
        
        
        # Commit changes to the database
        db.commit()
        print("Database commit successful")
        db.refresh(existing_schedule)

        return {"message": "Attendance schedule updated successfully", "schedule": existing_schedule}
    except HTTPException as http_exc:
        # Re-raise HTTP exceptions with meaningful details
        print(f"HTTPException: {http_exc.detail}")
        raise http_exc
    except Exception as e:
        # Log unexpected errors and return a generic error message
        print(f"Unexpected error in update_attendance_schedule: {e}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred. Please try again later.")


@router.get("/{roomId}/{scheduleId}/attendance_records")
def attendance_records(
    roomId: int,
    scheduleId: int,
    db: Session = Depends(get_db),
):
    """
    Fetch all students enrolled in the room associated with the given roomId
    and their attendance records for the given scheduleId.
    """
    try:
        initialize_attendance_records(scheduleId, roomId, db)

        # Fetch the schedule to ensure it belongs to the specified room
        schedule = db.query(models.AttendanceScheduleModel).filter(
            models.AttendanceScheduleModel.schedule_id == scheduleId,
            models.AttendanceScheduleModel.room_id == roomId
        ).first()

        if not schedule:
            raise HTTPException(status_code=404, detail="Schedule not found for the specified room")

        # Fetch all students with an "accepted" join status in the room
        enrolled_students = db.query(models.UserModel).join(
            models.RoomUsersModel,
            models.UserModel.user_id == models.RoomUsersModel.user_id
        ).filter(
            models.RoomUsersModel.room_id == roomId,
            models.RoomUsersModel.status == "accepted"  # Only include students with accepted status
        ).all()

        # Fetch attendance records for the given scheduleId
        attendance_records = db.query(models.AttendanceRecordModel).filter(
            models.AttendanceRecordModel.schedule_id == scheduleId
        ).all()

        # Get the current time
        current_time = datetime.now()

        # Map attendance records to students
        student_attendance = []
        for student in enrolled_students:
            # Use user_id to find the corresponding attendance record
            record = next(
                (attendance for attendance in attendance_records if attendance.user_id == student.user_id),
                None
            )

            # Determine attendance status
            if record:
                # If a record exists, use its status
                status = record.status
                taken_at = record.taken_at
            else:
                # If no record exists, determine status based on schedule timing
                schedule_start = datetime.combine(schedule.date, schedule.start_time)
                schedule_end = datetime.combine(schedule.date, schedule.end_time)

                if schedule_start <= current_time <= schedule_end:
                    # Schedule is still open, mark as pending
                    status = "pending"
                    taken_at = None
                else:
                    # Schedule has ended, mark as absent
                    status = "absent"
                    taken_at = None

            student_attendance.append({
                "student_id": student.user_id,
                "student_name": f"{student.first_name} {student.last_name}",
                "attendance_status": status,
                "taken_at": taken_at,
            })

        return {"schedule_id": scheduleId, "room_id": roomId, "students": student_attendance}

    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        print(f"Unexpected error in attendance_records: {e}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred. Please try again later.")
    

@router.get("/{room_id}/student_attendance_status")
def get_student_attendance_status(
    room_id: int,
    authorization: str = Header(...),  # Extract token from Authorization header
    db: Session = Depends(get_db)
):
    """
    Fetch the attendance status of a student for all schedules in a specific room.
    """
    try:
        # Extract the token from the Authorization header
        token = authorization.split(" ")[1]  # "Bearer <token>"
        user = get_current_user(token)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid or expired token")

        user_id = user["user_id"]

        # Verify that the room exists
        room = db.query(models.RoomsModel).filter(models.RoomsModel.room_id == room_id).first()
        if not room:
            raise HTTPException(status_code=404, detail="Room not found")

        # Verify that the user is part of the room
        user_in_room = db.query(models.RoomUsersModel).filter(
            models.RoomUsersModel.room_id == room_id,
            models.RoomUsersModel.user_id == user_id
        ).first()
        if not user_in_room:
            raise HTTPException(status_code=403, detail="You are not a member of this room")

        # Fetch all attendance schedules for the room
        schedules = db.query(models.AttendanceScheduleModel).filter(
            models.AttendanceScheduleModel.room_id == room_id
        ).all()

        if not schedules:
            raise HTTPException(status_code=404, detail="No attendance schedules found for this room.")

        # Fetch attendance records for the user in this room
        attendance_records = db.query(models.AttendanceRecordModel).filter(
            models.AttendanceRecordModel.room_id == room_id,
            models.AttendanceRecordModel.user_id == user_id
        ).all()

        # Map attendance records by schedule_id for quick lookup
        attendance_status_map = {record.schedule_id: record for record in attendance_records}

        # Get the current time
        current_time = datetime.now()

        # Build the response
        response = []
        for schedule in schedules:
            schedule_start = datetime.combine(schedule.date, schedule.start_time)
            schedule_end = datetime.combine(schedule.date, schedule.end_time)

            if schedule.schedule_id in attendance_status_map:
                # If a record exists, use its status
                record = attendance_status_map[schedule.schedule_id]
                status = record.status
                taken_at = record.taken_at.strftime("%Y-%m-%d %H:%M:%S") if record.taken_at else None
            else:
                # If no record exists, determine status based on schedule timing
                if current_time < schedule_start:
                    # Schedule hasn't started yet, mark as pending
                    status = "pending"
                    taken_at = None
                elif schedule_start <= current_time <= schedule_end:
                    # Schedule is still open, mark as pending
                    status = "pending"
                    taken_at = None
                else:
                    # Schedule has ended, mark as absent
                    status = "absent"
                    taken_at = None

            response.append({
                "schedule_id": schedule.schedule_id,
                "schedule_name": schedule.schedule_name,
                "schedule_description": schedule.schedule_description,
                "date": schedule.date.strftime("%Y-%m-%d"),
                "start_time": schedule.start_time.strftime("%H:%M:%S"),
                "end_time": schedule.end_time.strftime("%H:%M:%S"),
                "status": status,
                "taken_at": taken_at,
            })

        return {"room_id": room_id, "user_id": user_id, "attendance_status": response}

    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        print(f"Error fetching student attendance status: {e}")
        raise HTTPException(status_code=500, detail="An error occurred while fetching attendance status.")


# Get overall attendance percentage for a class
@router.get("/{room_id}/attendance_summary")
def attendance_summary(room_id: int, db: Session = Depends(get_db)):
    total_sessions = db.query(models.AttendanceScheduleModel).filter(
        models.AttendanceScheduleModel.room_id == room_id
    ).count()
    total_students = db.query(models.RoomUsersModel).filter(
        models.RoomUsersModel.room_id == room_id,
        models.RoomUsersModel.status == "accepted"
    ).count()
    total_attendance = db.query(models.AttendanceRecordModel).filter(
        models.AttendanceRecordModel.room_id == room_id,
        models.AttendanceRecordModel.status == "present"
    ).count()
    overall_percentage = (total_attendance / (total_sessions * total_students)) * 100 if total_sessions and total_students else 0
    return {"overall_percentage": overall_percentage}

# Get individual student attendance rates
@router.get("/{room_id}/student_attendance_rates")
def student_attendance_rates(room_id: int, db: Session = Depends(get_db)):
    students = db.query(models.RoomUsersModel).filter(
        models.RoomUsersModel.room_id == room_id,
        models.RoomUsersModel.status == "accepted"
    ).all()
    sessions = db.query(models.AttendanceScheduleModel).filter(
        models.AttendanceScheduleModel.room_id == room_id
    ).count()
    rates = []
    for student in students:
        present_count = db.query(models.AttendanceRecordModel).filter(
            models.AttendanceRecordModel.room_id == room_id,
            models.AttendanceRecordModel.user_id == student.user_id,
            models.AttendanceRecordModel.status == "present"
        ).count()
        rate = (present_count / sessions) * 100 if sessions else 0
        rates.append({
            "user_id": student.user_id,
            "first_name": student.user.first_name,
            "last_name": student.user.last_name,
            "attendance_rate": rate
        })
    return {"rates": rates}

# Get attendance trend over time
@router.get("/{room_id}/attendance_trend")
def attendance_trend(room_id: int, db: Session = Depends(get_db)):
    from sqlalchemy import func
    trend = db.query(
        func.date(models.AttendanceRecordModel.taken_at),
        func.count(models.AttendanceRecordModel.user_id)
    ).filter(
        models.AttendanceRecordModel.room_id == room_id,
        models.AttendanceRecordModel.status == "present"
    ).group_by(func.date(models.AttendanceRecordModel.taken_at)).all()
    return [{"date": str(t[0]), "present_count": t[1]} for t in trend]




EXCUSE_UPLOAD_DIR = "excuse_attachments"

# Make sure the directory exists
os.makedirs(EXCUSE_UPLOAD_DIR, exist_ok=True)

@router.post("/{room_id}/{schedule_id}/mark_excused")
async def mark_excused(
    room_id: int,
    schedule_id: int,
    user_id: int = Form(...),
    reason: str = Form(""),
    attachment: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    request: Request = None
):
    """
    Mark a student as excused for a specific attendance schedule, with optional attachment.
    Only the teacher (room owner) can perform this action.
    """
    # Verify room exists and current user is the owner
    room = db.query(models.RoomsModel).filter(models.RoomsModel.room_id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if room.user_id != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Only the room owner can mark students as excused")

    # Verify schedule exists and belongs to the room
    schedule = db.query(models.AttendanceScheduleModel).filter(
        models.AttendanceScheduleModel.schedule_id == schedule_id,
        models.AttendanceScheduleModel.room_id == room_id
    ).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found for this room")

    # Verify student exists and is part of the room
    student = db.query(models.UserModel).filter(models.UserModel.user_id == user_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    room_user = db.query(models.RoomUsersModel).filter(
        models.RoomUsersModel.room_id == room_id,
        models.RoomUsersModel.user_id == user_id,
        models.RoomUsersModel.status == "accepted"
    ).first()
    if not room_user:
        raise HTTPException(status_code=400, detail="Student is not a member of this room")

    # Check if already excused
    already_excused = db.query(models.ExcusedModel).filter(
        models.ExcusedModel.user_id == user_id,
        models.ExcusedModel.schedule_id == schedule_id
    ).first()
    if already_excused:
        raise HTTPException(status_code=400, detail="Student is already marked as excused for this schedule")

    # Handle attachment upload
    attachment_path = None
    if attachment:
        ext = os.path.splitext(attachment.filename)[1]
        filename = f"{uuid4().hex}{ext}"
        file_location = os.path.join(EXCUSE_UPLOAD_DIR, filename)
        with open(file_location, "wb") as f:
            f.write(await attachment.read())
        attachment_path = file_location

    # Mark as excused
    excused = models.ExcusedModel(
        user_id=user_id,
        schedule_id=schedule_id,
        reason=reason,
        attachment_path=attachment_path,
    )
    db.add(excused)
    db.commit()
    db.refresh(excused)

    # Optionally, update attendance record status to "excused"
    attendance_record = db.query(models.AttendanceRecordModel).filter(
        models.AttendanceRecordModel.room_id == room_id,
        models.AttendanceRecordModel.user_id == user_id,
        models.AttendanceRecordModel.schedule_id == schedule_id
    ).first()
    if attendance_record:
        attendance_record.status = "excused"
        db.commit()

    # Log action
    log_action(
        db=db,
        user_id=current_user["user_id"],
        action="Mark Excused",
        level="INFO",
        details=f"Teacher marked user {user_id} as excused for schedule {schedule_id} in room {room_id}",
        action_type="UPDATE",
        request=request,
    )

    return {"message": "Student marked as excused successfully."}


@router.get("/{room_id}/{schedule_id}/{user_id}/excuse_reason")
def get_excuse_reason(
    room_id: int,
    schedule_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Get the excuse reason and attachment for a student for a specific attendance schedule.
    """
    excuse = db.query(models.ExcusedModel).filter(
        models.ExcusedModel.user_id == user_id,
        models.ExcusedModel.schedule_id == schedule_id
    ).first()
    if not excuse:
        raise HTTPException(status_code=404, detail="Excuse not found for this student and schedule.")
    return {
        "user_id": user_id,
        "schedule_id": schedule_id,
        "reason": excuse.reason,
        "created_at": excuse.created_at,
        "attachment_path": excuse.attachment_path
    }