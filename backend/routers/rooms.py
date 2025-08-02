import os
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from backend import models, schemas
from backend.database import get_db
from datetime import datetime

from backend.utils import check_pending_attendance, generate_qr_code, get_current_user, log_action

router = APIRouter()


# ------------------------------
# Create Room
# ------------------------------
import secrets
import string

@router.post("/create_room")
def create_room(room: schemas.Room, db: Session = Depends(get_db), request: Request = None):
    # Check if the user exists
    user = db.query(models.UserModel).filter(models.UserModel.user_id == room.user_id).first()
    if not user:
        raise HTTPException(status_code=400, detail="User with the given ID does not exist")

    # Generate a unique random room code
    def generate_room_code(length=8):
        characters = string.ascii_letters + string.digits  # Letters and numbers
        return ''.join(secrets.choice(characters) for _ in range(length))

    room_code = generate_room_code()

    # Ensure the room code is unique
    while db.query(models.RoomsModel).filter(models.RoomsModel.room_code == room_code).first():
        room_code = generate_room_code()

    # Create a new room
    new_room = models.RoomsModel(
        user_id=room.user_id,
        class_name=room.class_name,
        section=room.section,
        description=room.description,
        isGeofence=room.isGeofence,
        geofence_id=room.geofence_id,
        isFaceAuth=room.isFaceAuth,
        created_at=room.created_at,
        room_code=room_code,  # Use the generated room code
        is_archived=False  # Default to not archived
    )
    db.add(new_room)
    db.commit()
    db.refresh(new_room)
    
    # Generate a QR code for the room
    try:
        qr_code_path = generate_qr_code(new_room.room_id)  # Assuming `generate_qr_code` is a utility function
        new_qr = models.GeneratedQRModel(
            room_id=new_room.room_id,
            qr_image_path=qr_code_path
        )
        db.add(new_qr)
        db.commit()
        db.refresh(new_qr)
    except Exception as e:
        print(f"Error generating QR code for room {new_room.room_id}: {e}")
        
    log_action(
        db=db,
        user_id=user.user_id,
        action="User registered",
        level="INFO",
        details=f"User {user.username} has created the room {new_room.room_id}",
        action_type="CREATE",
        request=request,
    )
    

    return {"message": "Room created successfully", "room": new_room.class_name, "room_code": new_room.room_code}

# ------------------------------
# Get Rooms
# ------------------------------
@router.get("/get_rooms")
def get_rooms(user_id: int, db: Session = Depends(get_db)):
    # Fetch all rooms associated with the given user_id
    rooms = db.query(models.RoomsModel).filter(models.RoomsModel.user_id == user_id).all()
    
    # Check if no rooms are found
    if not rooms:
        return {"message": "No rooms found for the given user ID", "rooms": []}

    # Return the rooms as a list of RoomResponse
    return {"rooms": [schemas.RoomResponse(
        room_id=room.room_id,
        class_name=room.class_name,
        section=room.section,
        description=room.description,
        isGeofence=room.isGeofence,
        isFaceAuth=room.isFaceAuth,
        room_code=room.room_code,
        created_at=room.created_at,
        is_archived=room.is_archived  # Include archived status
    ) for room in rooms]}

# ------------------------------
# Get Room Details
# ------------------------------
@router.get("/get_room_details")
def get_room_details(room_id: int, db: Session = Depends(get_db)):
    # Fetch the room and join with the user table to get the owner's details
    room = db.query(models.RoomsModel).filter(models.RoomsModel.room_id == room_id).first()

    # Check if the room exists
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    # Fetch the owner
    owner = db.query(models.UserModel).filter(models.UserModel.user_id == room.user_id).first()

    # Return the room details along with the owner's first and last name
    return schemas.RoomDetails(
        room_id=room.room_id,
        owner={
            "first_name": owner.first_name,
            "last_name": owner.last_name,
        },
        class_name=room.class_name,
        section=room.section,
        description=room.description,
        isGeofence=room.isGeofence,
        isFaceAuth=room.isFaceAuth,
        room_code=room.room_code,
        
    )

# ------------------------------
# Join Room
# ------------------------------
@router.post("/join_room_by_code")
def join_room_by_code(room_user: schemas.JoinRoom, db: Session = Depends(get_db), request: Request = None):
    # Check if the room exists by room_code
    room = db.query(models.RoomsModel).filter(models.RoomsModel.room_code == room_user.room_code).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    # Prevent joining archived rooms
    if room.is_archived:
        raise HTTPException(
            status_code=400,
            detail=f"Room '{room.class_name}' is archived and cannot be joined."
        )

    # Check if the user exists
    user = db.query(models.UserModel).filter(models.UserModel.user_id == room_user.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check if the user is already in the room
    existing_membership = db.query(models.RoomUsersModel).filter(
        models.RoomUsersModel.room_id == room.room_id,
        models.RoomUsersModel.user_id == room_user.user_id
    ).first()
    if existing_membership:
        if existing_membership.status == schemas.JoinStatus.accepted:
            raise HTTPException(status_code=400, detail="User is already in the room")
        if existing_membership.status == schemas.JoinStatus.pending:
            raise HTTPException(status_code=400, detail="User has already requested to join the room")

    # Add the user to the room
    new_membership = models.RoomUsersModel(
        room_id=room.room_id,
        user_id=room_user.user_id,
        joined_at=datetime.now(),
        status="pending"  # Set initial status to pending
    )
    db.add(new_membership)
    db.commit()

    # Notify the room owner
    notification = models.Notification(
        user_id=room.user_id,
        title="Join Request",
        message=f"{user.first_name} {user.last_name} has requested to join your room.",
        is_read=False,
        created_at=datetime.now(),
        room_id=room.room_id
    )
    db.add(notification)
    db.commit()

    log_action(
        db=db,
        user_id=user.user_id,
        action="Join Request",
        level="INFO",
        details=f"User {user.username} has requested to join the room: {room.class_name}",
        action_type="CREATE",
        request=request,
    )

    return {"message": "Join Request sent to the room owner"}



@router.get("/joined_rooms", response_model=List[schemas.RoomResponse])
def joined_rooms(user_id: int, db: Session = Depends(get_db)):
    """
    Fetch all rooms that a student has joined with an 'accepted' status.
    """
    # Query the RoomUsersModel to find all room IDs the student has joined with 'accepted' status
    room_user_entries = db.query(models.RoomUsersModel).filter(
        models.RoomUsersModel.user_id == user_id,
        models.RoomUsersModel.status == schemas.JoinStatus.accepted  # Only include accepted rooms
    ).all()

    if not room_user_entries:
        return []

    # Extract room IDs from the RoomUsersModel entries
    room_ids = [entry.room_id for entry in room_user_entries]

    # Query the RoomsModel to fetch details of the rooms
    rooms = db.query(models.RoomsModel).filter(models.RoomsModel.room_id.in_(room_ids)).all()

    # Return the room details as a list of RoomResponse
    return [
        schemas.RoomResponse(
            room_id=room.room_id,
            class_name=room.class_name,
            section=room.section,
            description=room.description,
            created_at=room.created_at,
            isGeofence=room.isGeofence,
            isFaceAuth=room.isFaceAuth,
            room_code=room.room_code,
            is_archived=room.is_archived  # Include archived status
        )
        for room in rooms
    ]
    
    

@router.get("/{room_id}/join_requests", response_model=List[schemas.JoinRequestResponse])
def get_join_requests(room_id: int, db: Session = Depends(get_db)):
    """
    Fetch all pending join requests for a specific room, including user details.
    """
    try:
        # Query RoomUsersModel for pending requests and join with UserModel for user details
        join_requests = db.query(
            models.RoomUsersModel,
            models.UserModel.first_name,
            models.UserModel.last_name,
            models.UserModel.id_number  # Include id_number
        ).join(
            models.UserModel, models.RoomUsersModel.user_id == models.UserModel.user_id
        ).filter(
            models.RoomUsersModel.room_id == room_id,
            models.RoomUsersModel.status == schemas.JoinStatus.pending
        ).all()

        if not join_requests:
            return []

        # Format the response
        return [
            schemas.JoinRequestResponse(
                room_id=request.RoomUsersModel.room_id,
                user_id=request.RoomUsersModel.user_id,
                first_name=request.first_name,
                last_name=request.last_name,
                id_number=request.id_number,  # Include id_number in the response
                joined_at=request.RoomUsersModel.joined_at,
                status=request.RoomUsersModel.status
            )
            for request in join_requests
        ]
    except Exception as e:
        print(f"Error fetching join requests: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
    

@router.post("/{room_id}/join_requests/{user_id}")
def update_join_request_status(
    room_id: int,
    user_id: int,
    request: schemas.UpdateJoinRequestStatus,
    db: Session = Depends(get_db),
    request2: Request = None
):
    """
    Accept or reject a join request for a specific room.
    """
    print(f"Received request: room_id={room_id}, user_id={user_id}, status={request.status}")
    try:
        join_request = db.query(models.RoomUsersModel).filter(
            models.RoomUsersModel.room_id == room_id,
            models.RoomUsersModel.user_id == user_id
        ).first()

        if not join_request:
            print("Join request not found")
            raise HTTPException(status_code=404, detail="Join request not found")

        if join_request.status != schemas.JoinStatus.pending:
            print("Join request has already been processed")
            raise HTTPException(status_code=400, detail="Join request has already been processed")

        join_request.status = request.status
        
        log_action(
        db=db,
        user_id=user_id,
        action="Request Status",
        level="INFO",
        details=f"User {user_id} has updated the join request status to {request.status}",
        action_type="UPDATE",
        request=request2,)
        
        db.commit()

        print(f"Join request updated to {request.status}")
        return {"message": f"Join request has been {request.status}"}
    except Exception as e:
        print(f"Error updating join request status: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.get("/{room_id}/accepted_students", response_model=List[schemas.StudentResponse])
def get_accepted_students(room_id: int, db: Session = Depends(get_db)):
    """
    Fetch all students who have been accepted into a specific room.
    """
    try:
        # Query RoomUsersModel for students with 'accepted' status in the specified room
        accepted_students = db.query(
            models.RoomUsersModel,
            models.UserModel.first_name,
            models.UserModel.last_name,
            models.UserModel.id_number  # Include id_number
        ).join(
            models.UserModel, models.RoomUsersModel.user_id == models.UserModel.user_id
        ).filter(
            models.RoomUsersModel.room_id == room_id,
            models.RoomUsersModel.status == schemas.JoinStatus.accepted
        ).all()

        if not accepted_students:
            return []

        # Format the response
        return [
            schemas.StudentResponse(
                user_id=student.RoomUsersModel.user_id,
                first_name=student.first_name,
                last_name=student.last_name,
                id_number=student.id_number,  # Include id_number in the response
                joined_at=student.RoomUsersModel.joined_at.isoformat()  # Format joined_at as ISO 8601
            )
            for student in accepted_students
        ]
    except Exception as e:
        print(f"Error fetching accepted students: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.post("/{room_id}/settings/generate_qr_code")
def create_qr(
    room_id: int,
    db: Session = Depends(get_db),
    request: Request = None,
):
    """
    Generate a QR code for a specific room.
    """
    try:
        # Verify that the room exists
        room = db.query(models.RoomsModel).filter(models.RoomsModel.room_id == room_id).first()
        if not room:
            raise HTTPException(status_code=404, detail="Room not found")

        # Check if a QR code already exists for this room
        existing_qr = db.query(models.GeneratedQRModel).filter(models.GeneratedQRModel.room_id == room_id).first()
        if existing_qr:
            return {
                "message": "QR code already exists for this room",
                "qr_code_path": existing_qr.qr_image_path
            }

        # Generate the QR code (assuming you have a function for this)
        qr_code_path = generate_qr_code(room.room_id)

        # Save the generated QR code path to the database
        new_qr = models.GeneratedQRModel(
            room_id=room_id,
            qr_image_path=qr_code_path
        )
        db.add(new_qr)
        db.commit()
        db.refresh(new_qr)
        
        log_action(
        db=db,
        user_id=room.user_id,
        action="Generated qr code",
        level="INFO",
        details=f"QR code generated for room ID {room_id}",
        action_type="CREATE",
        request=request,)

        return {"message": "QR code generated successfully", "qr_code_path": qr_code_path}
    except Exception as e:
        print(f"Error generating QR code: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
    

@router.get("/{room_id}/qr_code_preview")
def qr_code_preview(
    room_id: int,
    db: Session = Depends(get_db),
):
    """
    Preview the QR code for a specific room.
    If the QR code does not exist, regenerate it.
    """
    try:
        # Fetch the QR code path from the database
        qr_code = db.query(models.GeneratedQRModel).filter(models.GeneratedQRModel.room_id == room_id).first()
        if not qr_code or not os.path.exists(qr_code.qr_image_path):
            # Regenerate QR code if not found or file missing
            qr_code_path = generate_qr_code(room_id)
            if qr_code:
                qr_code.qr_image_path = qr_code_path
                db.commit()
            else:
                new_qr = models.GeneratedQRModel(
                    room_id=room_id,
                    qr_image_path=qr_code_path
                )
                db.add(new_qr)
                db.commit()
                qr_code = new_qr

        # Get the absolute path of the QR code file
        qr_code_path = qr_code.qr_image_path
        if not os.path.exists(qr_code_path):
            raise HTTPException(status_code=404, detail="QR code file not found")

        # Return the QR code file as a response
        return FileResponse(qr_code_path, media_type="image/png")
    except HTTPException as e:
        # Re-raise HTTP exceptions to avoid wrapping them in a 500 error
        raise e
    except Exception as e:
        print(f"Error fetching QR code preview: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@router.get("/{room_id}/settings/download_qr_code")
def download_qr_code(
    room_id: int,
    db: Session = Depends(get_db),
):
    """
    Download the QR code for a specific room.
    """
    try:
        # Fetch the QR code path from the database
        qr_code = db.query(models.GeneratedQRModel).filter(models.GeneratedQRModel.room_id == room_id).first()
        if not qr_code:
            raise HTTPException(status_code=404, detail="QR code not found")

        # Get the absolute path of the QR code file
        qr_code_path = qr_code.qr_image_path
        if not os.path.exists(qr_code_path):
            raise HTTPException(status_code=404, detail="QR code file not found")

        # Return the QR code file as a downloadable response
        return FileResponse(qr_code_path, media_type="image/png", filename=os.path.basename(qr_code_path))
    except Exception as e:
        print(f"Error downloading QR code: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
    


@router.get("/{room_id}/settings/attendance_settings")
def get_attendance_settings(room_id: int, db: Session = Depends(get_db)):
    """
    Fetch attendance settings for a specific room.
    """
    try:
        room = db.query(models.RoomsModel).filter(models.RoomsModel.room_id == room_id).first()
        if not room:
            raise HTTPException(status_code=404, detail="Room not found")

        return {
            "isGeofence": room.isGeofence,
            "isFaceAuth": room.isFaceAuth,
        }
    except Exception as e:
        print(f"Error fetching attendance settings: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.put("/{room_id}/settings/attendance_settings")
def update_attendance_settings(
    room_id: int,
    settings: schemas.UpdateAttendanceSettings,
    db: Session = Depends(get_db),
    request: Request = None
):
    """
    Update attendance settings for a specific room.
    """
    try:
        room = db.query(models.RoomsModel).filter(models.RoomsModel.room_id == room_id).first()
        if not room:
            raise HTTPException(status_code=404, detail="Room not found")

        # Update the settings
        room.isGeofence = settings.isGeofence
        room.isFaceAuth = settings.isFaceAuth
        db.commit()

        log_action(
        db=db,
        user_id=room.user_id,
        action="Update attendance settings",
        level="INFO",
        details=f"Room attendance settings updated for room ID {room_id}",
        action_type="UPDATE",
        request=request,)

        
        return {"message": "Attendance settings updated successfully"}
    except Exception as e:
        print(f"Error updating attendance settings: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.put("/{room_id}/set_geofence")
def set_geofence(room_id: int, geofence: schemas.SetGeofence, db: Session = Depends(get_db), request: Request = None):
    """
    Set the geofence location for a specific room.
    """
    room = db.query(models.RoomsModel).filter(models.RoomsModel.room_id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    room.geofence_id = geofence.geofence_id
    db.commit()
    
    log_action(
        db=db,
        user_id=room.user_id,
        action="Set room geofence",
        level="INFO",
        details=f"Room geofence updated for room ID {room_id}",
        action_type="UPDATE",
        request=request,)

    return {"message": "Geofence location updated successfully"}




@router.put("/{room_id}/update_room_details")
def update_room_details(room_id: int, room: schemas.UpdateRoom, db: Session = Depends(get_db), request: Request = None):
    """
    Update room details for a specific room.
    Only update fields that are provided in the request payload.
    """
    try:
        print(f"Updating room details for room_id: {room_id}")
        print(f"Received payload: {room}")

        # Fetch the room from the database
        existing_room = db.query(models.RoomsModel).filter(models.RoomsModel.room_id == room_id).first()
        if not existing_room:
            print(f"Room with ID {room_id} not found")
            raise HTTPException(status_code=404, detail="Room not found")

        # Update only the fields that are provided
        if room.class_name is not None and room.class_name.strip():
            print(f"Updating class_name to: {room.class_name.strip()}")
            existing_room.class_name = room.class_name.strip()
        if room.section is not None and room.section.strip():
            print(f"Updating section to: {room.section.strip()}")
            existing_room.section = room.section.strip()
        if room.description is not None and room.description.strip():
            print(f"Updating description to: {room.description.strip()}")
            existing_room.description = room.description.strip()

        # Commit changes to the database
        db.commit()
        print("Database commit successful")
        db.refresh(existing_room)
        
        log_action(
        db=db,
        user_id=existing_room.user_id,
        action="Update room details",
        level="INFO",
        details=f"Room details updated for room ID {room_id}",
        action_type="UPDATE",
        request=request,
    )

        return {"message": "Room details updated successfully", "room": existing_room}
    except Exception as e:
        print(f"Error updating room details: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
    

@router.get("/{room_id}/rejected_join_request")
def get_rejected_students(room_id: int, db: Session = Depends(get_db)):
    """
    Fetch all students who have been rejected from a specific room.
    """
    try:
        # Query RoomUsersModel for students with 'rejected' status in the specified room
        rejected_students = db.query(
            models.RoomUsersModel,
            models.UserModel.first_name,
            models.UserModel.last_name,
            models.UserModel.id_number,  # Include id_number
            models.RoomUsersModel.joined_at  # Include joined_at
        ).join(
            models.UserModel, models.RoomUsersModel.user_id == models.UserModel.user_id
        ).filter(
            models.RoomUsersModel.room_id == room_id,
            models.RoomUsersModel.status == schemas.JoinStatus.rejected
        ).all()

        if not rejected_students:
            return []

        # Format the response
        return [
            schemas.StudentResponse(
                user_id=student.RoomUsersModel.user_id,
                first_name=student.first_name,
                last_name=student.last_name,
                id_number=student.id_number,  # Include id_number in the response
                joined_at=student.RoomUsersModel.joined_at.isoformat()  # Format joined_at as ISO 8601
            )
            for student in rejected_students
        ]
    except Exception as e:
        print(f"Error fetching rejected students: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@router.put("/{room_id}/accept_rejected_join_request")
def accept_rejected_join_request(
    room_id: int,
    user_id: int,  # Expect user_id as a query parameter
    token: str,    # Expect token as a query parameter
    db: Session = Depends(get_db),
    request: Request = None
):
    """Accept a rejected join request for a specific room."""
    try:
        # Fetch the rejected join request
        join_request = db.query(models.RoomUsersModel).filter(
            models.RoomUsersModel.room_id == room_id,
            models.RoomUsersModel.user_id == user_id,
            models.RoomUsersModel.status == schemas.JoinStatus.rejected
        ).first()

        if not join_request:
            raise HTTPException(status_code=404, detail="Join request not found or already accepted")

        # Update the status to 'accepted'
        join_request.status = schemas.JoinStatus.accepted
        db.commit()

        log_action(
            db=db,
            user_id=user_id,
            action="Accept rejected join request",
            level="INFO",
            details=f"Join request accepted for room ID {room_id}",
            action_type="UPDATE",
            request=request,
        )

        return {"message": "Join request accepted successfully"}
    except Exception as e:
        print(f"Error accepting join request: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
    

@router.put("/{room_id}/kick_student")
def kick_student(
    room_id: int,
    user_id: int,  # Expect user_id as a query parameter
    token: str,    # Expect token as a query parameter
    db: Session = Depends(get_db),
    request: Request = None
):
    """Kick an accepted student from a specific room."""
    try:
        # Fetch the accepted student
        student = db.query(models.RoomUsersModel).filter(
            models.RoomUsersModel.room_id == room_id,
            models.RoomUsersModel.user_id == user_id,
            models.RoomUsersModel.status == schemas.JoinStatus.accepted
        ).first()

        if not student:
            raise HTTPException(status_code=404, detail="Student not found or already rejected")

        # Update the status to 'rejected'
        student.status = schemas.JoinStatus.rejected
        db.commit()

        log_action(
            db=db,
            user_id=user_id,
            action="Kick student",
            level="INFO",
            details=f"Student kicked from room ID {room_id}",
            action_type="UPDATE",
            request=request,
        )

        return {"message": "Student kicked successfully"}
    except Exception as e:
        print(f"Error kicking student: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
        
    

from fastapi import Header

@router.put("/{room_id}/archive")
def archive_room(
    room_id: int,
    db: Session = Depends(get_db),
    request: Request = None,
    authorization: str = Header(None)  # Extract the token from the Authorization header
):
    """
    Archive a specific room.
    """
    try:
        # Validate the token (if needed)
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Invalid or missing token")
        token = authorization.split(" ")[1]  # Extract the token from "Bearer <token>"

        # Fetch the room from the database
        room = db.query(models.RoomsModel).filter(models.RoomsModel.room_id == room_id).first()
        if not room:
            raise HTTPException(status_code=404, detail="Room not found")
        if room.is_archived:
            raise HTTPException(status_code=400, detail="Room is already archived")

        # Archive the room
        room.is_archived = True
        db.commit()

        log_action(
            db=db,
            user_id=room.user_id,
            action="Archive room",
            level="INFO",
            details=f"Room {room.class_name} archived successfully",
            action_type="UPDATE",
            request=request,
        )

        return {"message": "Room archived successfully"}
    except Exception as e:
        print(f"Error archiving room: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")