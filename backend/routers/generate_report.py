import io
import os
import zipfile
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Dict, List, Optional # Import List
from datetime import date, time, datetime

# Import your models and schemas correctly
from backend import models, schemas # Adjust import path if necessary
from backend.database import get_db
from backend.generate_report_word import create_attendance_docx
from backend.utils import get_current_user # Assuming this verifies user role/permissions

router = APIRouter()

# Changed endpoint path, function name, response_model, and return type hint
@router.get("/room_schedules/{room_id}", response_model=List[schemas.ScheduleInfo])
def get_room_schedules(
    room_id: int,
    current_user: dict = Depends(get_current_user), # Ensure this checks if user owns the room or has permission
    db: Session = Depends(get_db),
) -> List[schemas.ScheduleInfo]:
    """
    Fetches a list of all attendance schedules with their details for a given room.
    """
    try:
        # 1. Verify Room Existence and Ownership/Permissions
        room = db.query(models.RoomsModel).filter(models.RoomsModel.room_id == room_id).first()
        if not room:
            raise HTTPException(status_code=404, detail="Room not found")

        # Add permission check: Ensure the current_user (teacher) owns this room
        if room.user_id != current_user['user_id']:
             raise HTTPException(status_code=403, detail="Not authorized to access this room's schedules")

        # 2. Query the full AttendanceScheduleModel objects for the Room
        schedules = db.query(models.AttendanceScheduleModel).filter(
            models.AttendanceScheduleModel.room_id == room_id,
            models.AttendanceScheduleModel.is_archived == False # Optionally filter out archived schedules
        ).order_by(models.AttendanceScheduleModel.date.desc(), models.AttendanceScheduleModel.start_time.desc()).all() # Order newest first

        # 3. Return the list of schedule objects
        # Pydantic will automatically handle serialization based on the response_model
        return schedules

    except HTTPException as http_exc:
        # Re-raise HTTPExceptions to let FastAPI handle them
        raise http_exc
    except Exception as e:
        # Log the error for debugging
        print(f"Error fetching schedules for room {room_id}: {e}") # Replace with proper logging
        raise HTTPException(status_code=500, detail="Internal Server Error fetching schedules")

@router.post("/generate_word_report")
def generate_word_report(
    schedule_id_list: List[int],  # List of schedule IDs to generate reports for
    db: Session = Depends(get_db)
):
    """
    Generate Word reports for the given schedule IDs. If there are more than 16 dates,
    split the report into multiple files.
    """
    try:
        # Fetch the relevant schedules
        attendance_date_list = db.query(models.AttendanceScheduleModel).filter(
            models.AttendanceScheduleModel.schedule_id.in_(schedule_id_list)
        ).order_by(models.AttendanceScheduleModel.date.asc(), models.AttendanceScheduleModel.start_time.asc()).all()

        if not attendance_date_list:
            raise HTTPException(status_code=404, detail="No schedules found for the given IDs.")

        # Fetch the room name (assuming all schedules belong to the same room)
        room_id = attendance_date_list[0].room_id  # Get the room ID from the first schedule
        room = db.query(models.RoomsModel).filter(models.RoomsModel.room_id == room_id).first()
        if not room:
            raise HTTPException(status_code=404, detail="Room not found")
        room_name = room.class_name.replace(" ", "_")  # Replace spaces with underscores for the filename

        # Fetch the users related to the schedules with an "accepted" status
        user_list = db.query(models.UserModel).join(
            models.RoomUsersModel,
            models.UserModel.user_id == models.RoomUsersModel.user_id
        ).join(
            models.AttendanceRecordModel,
            models.UserModel.user_id == models.AttendanceRecordModel.user_id
        ).filter(
            models.RoomUsersModel.room_id == room_id,
            models.RoomUsersModel.status == schemas.JoinStatus.accepted,  # Only include students with accepted status
            models.AttendanceRecordModel.schedule_id.in_(schedule_id_list)
        ).distinct().order_by(models.UserModel.last_name.asc(), models.UserModel.first_name.asc()).all()

        if not user_list:
            raise HTTPException(status_code=404, detail="No accepted users found for the given schedules.")

        # Fetch the attendance records for the schedules
        attendance_records = db.query(models.AttendanceRecordModel).filter(
            models.AttendanceRecordModel.schedule_id.in_(schedule_id_list)
        ).all()

        # Prepare the data for the create_attendance_docx function
        user_list_for_docx = [
            {
                "no": idx + 1,
                "name": f"{user.last_name}, {user.first_name}",
                "id_number": user.id_number,
            }
            for idx, user in enumerate(user_list)
        ]

        # Format the dates as MM/DD/YY and include the time
        attendance_date_list_for_docx = [
            {
                "date": schedule.date.strftime("%m/%d/%y"),
                "time": f"{schedule.start_time.strftime('%I:%M %p')} - {schedule.end_time.strftime('%I:%M %p')}"
            }
            for schedule in attendance_date_list
        ]

        # Get the oldest selected month
        oldest_date = attendance_date_list[0].date  # The first date in the sorted list
        oldest_month = oldest_date.strftime("%B_%Y")  # Format as "Month_Year" (e.g., "April_2025")

        # Split the dates into chunks of 16
        chunks = [
            attendance_date_list_for_docx[i:i + 16]
            for i in range(0, len(attendance_date_list_for_docx), 16)
        ]

        # Prepare user status for each chunk
        user_status_list_for_docx = []
        for user in user_list:
            user_name = f"{user.last_name}, {user.first_name}"
            statuses = {}
            for record in attendance_records:
                if record.user_id == user.user_id:
                    schedule_entry = next(
                        (
                            {
                                "date": schedule.date.strftime("%m/%d/%y"),
                                "time": f"{schedule.start_time.strftime('%I:%M %p')} - {schedule.end_time.strftime('%I:%M %p')}"
                            }
                            for schedule in attendance_date_list if schedule.schedule_id == record.schedule_id
                        ),
                        None
                    )
                    if schedule_entry:
                        key = f"{schedule_entry['date']} {schedule_entry['time']}"  # Combine date and time as the key
                        statuses[key] = record.status
            user_status_list_for_docx.append({user_name: statuses})

        # Generate multiple reports if needed
        output_files = []
        for idx, chunk in enumerate(chunks):
            output_stream = io.BytesIO()

            # Use an absolute path for the template
            template_path = os.path.join(os.path.dirname(__file__), "../report_templates/attendance-template.docx")

            if not os.path.exists(template_path):
                raise HTTPException(status_code=500, detail=f"Template file not found at {template_path}")

            success = create_attendance_docx(
                template_path=template_path,
                output_target=output_stream,
                student_list=user_list_for_docx,
                attendance_date_list=chunk,
                student_status_list=user_status_list_for_docx,
                max_dates=16
            )

            if not success:
                raise HTTPException(status_code=500, detail="Failed to generate the report.")

            # Save the generated file to the list
            output_files.append({
                "filename": f"{room_name}_attendance_report_{oldest_month}_part_{idx + 1}.docx",
                "content": output_stream.getvalue()
            })

        # If only one file, return it directly
        if len(output_files) == 1:
            output_stream = io.BytesIO(output_files[0]["content"])
            return StreamingResponse(
                output_stream,
                media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                headers={
                    "Content-Disposition": f"attachment; filename={output_files[0]['filename']}",
                    "Access-Control-Expose-Headers": "Content-Disposition",  # Expose the header to the frontend
                }
            )

        # If multiple files, zip them and return
        zip_stream = io.BytesIO()
        with zipfile.ZipFile(zip_stream, "w") as zip_file:
            for file in output_files:
                zip_file.writestr(file["filename"], file["content"])
        zip_stream.seek(0)

        return StreamingResponse(
            zip_stream,
            media_type="application/zip",
            headers={
                "Content-Disposition": f"attachment; filename={room_name}_attendance_reports_{oldest_month}.zip",
                "Access-Control-Expose-Headers": "Content-Disposition",  # Expose the header to the frontend
            }
        )

    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        print(f"Error generating report: {e}")
        raise HTTPException(status_code=500, detail="An error occurred while generating the report.")