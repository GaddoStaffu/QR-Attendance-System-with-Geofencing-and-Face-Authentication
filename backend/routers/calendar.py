from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordRequestForm
import jwt
from sqlalchemy.orm import Session
from backend import models, schemas
from backend.database import get_db
from backend.utils import ALGORITHM, SECRET_KEY, get_current_user, hash_password, verify_password, create_access_token

router = APIRouter()


@router.get("/get-schedules")
def get_schedules(
    token: dict = Depends(get_current_user),  # Decode the token to get user info
    db: Session = Depends(get_db)
):
    """
    Retrieve attendance schedules for rooms the student is part of, including room names.
    """
    try:
        # Extract user_id from the token
        user_id = token.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")

        # Query rooms the student is part of
        student_rooms = db.query(models.RoomUsersModel.room_id).filter(
            models.RoomUsersModel.user_id == user_id
        ).subquery()

        # Query schedules for those rooms and join with room names
        schedules = db.query(
            models.AttendanceScheduleModel.schedule_id,
            models.AttendanceScheduleModel.schedule_name,
            models.AttendanceScheduleModel.schedule_description,
            models.AttendanceScheduleModel.date,
            models.AttendanceScheduleModel.start_time,
            models.AttendanceScheduleModel.end_time,
            models.AttendanceScheduleModel.room_id,
            models.RoomsModel.class_name  # Include the room name
        ).join(
            models.RoomsModel, models.AttendanceScheduleModel.room_id == models.RoomsModel.room_id
        ).filter(
            models.AttendanceScheduleModel.room_id.in_(student_rooms)
        ).order_by(
            models.AttendanceScheduleModel.date, models.AttendanceScheduleModel.start_time
        ).all()

        # Transform the data into a list of schedules with room names
        schedule_list = [
            {
                "schedule_id": schedule.schedule_id,
                "schedule_name": schedule.schedule_name,
                "schedule_description": schedule.schedule_description,
                "date": schedule.date,
                "start_time": schedule.start_time,
                "end_time": schedule.end_time,
                "room_id": schedule.room_id,
                "class_name": schedule.class_name,  # Include the room name
            }
            for schedule in schedules
        ]

        return {"schedules": schedule_list}

    except Exception as e:
        print(f"Error retrieving schedules: {e}")
        raise HTTPException(status_code=500, detail="An error occurred while retrieving schedules.")
    
    
@router.get("/get-teacher-schedules")
def get_teacher_schedules(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Fetch all schedules created by the logged-in teacher.
    """
    try:
        teacher_id = current_user.get("user_id")
        if not teacher_id:
            raise HTTPException(status_code=401, detail="Invalid token")

        # Query schedules created by the teacher
        schedules = db.query(
            models.AttendanceScheduleModel.schedule_id,
            models.AttendanceScheduleModel.schedule_name,
            models.AttendanceScheduleModel.date,
            models.AttendanceScheduleModel.start_time,
            models.AttendanceScheduleModel.end_time,
            models.RoomsModel.class_name.label("room_name")  # Fetch room name
        ).join(
            models.RoomsModel, models.AttendanceScheduleModel.room_id == models.RoomsModel.room_id
        ).filter(
            models.RoomsModel.user_id == teacher_id  # Ensure the room belongs to the teacher
        ).order_by(
            models.AttendanceScheduleModel.date, models.AttendanceScheduleModel.start_time
        ).all()

        # Transform the data into a list of schedules with room names
        schedule_list = [
            {
                "schedule_id": schedule.schedule_id,
                "schedule_name": schedule.schedule_name,
                "date": schedule.date,
                "start_time": schedule.start_time,
                "end_time": schedule.end_time,
                "room_name": schedule.room_name,  # Use the alias for room name
            }
            for schedule in schedules
        ]

        return {"schedules": schedule_list}

    except Exception as e:
        print(f"Error fetching teacher schedules: {e}")
        raise HTTPException(status_code=500, detail="An error occurred while fetching schedules")