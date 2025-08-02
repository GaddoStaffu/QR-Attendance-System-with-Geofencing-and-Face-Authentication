from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy.orm import Session
from backend import models, schemas
from backend.database import get_db
from backend.utils import hash_password

router = APIRouter()



@router.get("/get_rooms")
def get_rooms(
    db: Session = Depends(get_db)
):
    """
    Retrieve all rooms from the database, including the owner's name and other details.
    """
    try:
        # Query the RoomsModel and join with UserModel to get owner details
        rooms = db.query(
            models.RoomsModel.room_id,
            models.RoomsModel.class_name,
            models.RoomsModel.section,
            models.RoomsModel.description,
            models.RoomsModel.isGeofence,
            models.RoomsModel.geofence_id,
            models.RoomsModel.isFaceAuth,
            models.RoomsModel.is_archived,
            models.UserModel.first_name.label("owner_first_name"),
            models.UserModel.last_name.label("owner_last_name"),
            models.UserModel.email.label("owner_email")
        ).join(
            models.UserModel, models.RoomsModel.user_id == models.UserModel.user_id
        ).all()

        # Format the response as a list of dictionaries
        formatted_rooms = [
            {
                "room_id": room.room_id,
                "classname": room.class_name,
                "section": room.section,
                "description": room.description,
                "isGeofence": room.isGeofence,
                "geofence_id": room.geofence_id,
                "isFaceAuth": room.isFaceAuth,
                "is_archived": room.is_archived,
                "owner_first_name": room.owner_first_name,
                "owner_last_name": room.owner_last_name,
                "owner_email": room.owner_email,
            }
            for room in rooms
        ]

        return formatted_rooms

    except Exception as e:
        print(f"Error retrieving rooms: {e}")
        raise HTTPException(status_code=500, detail="An error occurred while retrieving rooms.")
@router.get("/get_room/{room_id}")
def get_room(
    room_id: int,
    db: Session = Depends(get_db)
):
    """
    Retrieve a single room's details by room_id, including the owner's name and other details.
    """
    try:
        room = db.query(
            models.RoomsModel.room_id,
            models.RoomsModel.class_name,
            models.RoomsModel.section,
            models.RoomsModel.description,
            models.UserModel.first_name.label("owner_first_name"),
            models.UserModel.last_name.label("owner_last_name"),
            models.UserModel.email.label("owner_email")
        ).join(
            models.UserModel, models.RoomsModel.user_id == models.UserModel.user_id
        ).filter(
            models.RoomsModel.room_id == room_id
        ).first()

        if not room:
            raise HTTPException(status_code=404, detail="Room not found.")

        return {
            "room_id": room.room_id,
            "classname": room.class_name,
            "section": room.section,
            "description": room.description,
            "owner_first_name": room.owner_first_name,
            "owner_last_name": room.owner_last_name,
            "owner_email": room.owner_email,
        }

    except Exception as e:
        print(f"Error retrieving room: {e}")
        raise HTTPException(status_code=500, detail="An error occurred while retrieving the room.")
    

@router.get("/get_room_participants/{room_id}")
def get_room_participants(
    room_id: int,
    db: Session = Depends(get_db)
):
    """
    Retrieve all participants for a given room from room_users table.
    """
    participants = (
        db.query(
            models.UserModel.user_id,
            models.UserModel.first_name,
            models.UserModel.last_name,
            models.UserModel.email,
            models.UserModel.role,
            models.RoomUsersModel.status
        )
        .join(models.RoomUsersModel, models.RoomUsersModel.user_id == models.UserModel.user_id)
        .filter(models.RoomUsersModel.room_id == room_id)
        .all()
    )

    if not participants:
        return []

    return [
        {
            "user_id": p.user_id,
            "first_name": p.first_name,
            "last_name": p.last_name,
            "email": p.email,
            "role": p.role,
            "status": p.status.name if hasattr(p.status, "name") else str(p.status),
        }
        for p in participants
    ]
    
    

@router.put("/edit_room/{room_id}")
def edit_room(
    room_id: int,
    data: dict = Body(...),
    db: Session = Depends(get_db)
):
    """
    Edit a room's details. Editable fields:
    class_name, section, description, isGeofence, geofence_id, isFaceAuth, is_archived
    """
    room = db.query(models.RoomsModel).filter(models.RoomsModel.room_id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found.")

    # Update editable fields if present in request
    if "class_name" in data:
        room.class_name = data["class_name"]
    if "section" in data:
        room.section = data["section"]
    if "description" in data:
        room.description = data["description"]
    if "isGeofence" in data:
        room.isGeofence = data["isGeofence"]
    if "geofence_id" in data:
        room.geofence_id = data["geofence_id"]
    if "isFaceAuth" in data:
        room.isFaceAuth = data["isFaceAuth"]
    if "is_archived" in data:
        room.is_archived = data["is_archived"]

    db.commit()
    db.refresh(room)

    return {
        "room_id": room.room_id,
        "class_name": room.class_name,
        "section": room.section,
        "description": room.description,
        "isGeofence": room.isGeofence,
        "geofence_id": room.geofence_id,
        "isFaceAuth": room.isFaceAuth,
        "is_archived": room.is_archived,
    }
    


@router.put("/edit_attendance_settings/{room_id}")
def edit_attendance_settings(
    room_id: int,
    data: dict = Body(...),
    db: Session = Depends(get_db)
):
    """
    Admin: Update attendance settings (isGeofence, isFaceAuth) for a room.
    """
    room = db.query(models.RoomsModel).filter(models.RoomsModel.room_id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found.")

    if "isGeofence" in data:
        room.isGeofence = data["isGeofence"]
    if "isFaceAuth" in data:
        room.isFaceAuth = data["isFaceAuth"]

    db.commit()
    db.refresh(room)

    return {
        "room_id": room.room_id,
        "isGeofence": room.isGeofence,
        "isFaceAuth": room.isFaceAuth,
    }