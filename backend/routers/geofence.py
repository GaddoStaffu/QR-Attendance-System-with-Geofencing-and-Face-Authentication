from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend import models, schemas
from backend.database import get_db
from backend.utils import log_action

router = APIRouter()

@router.post("/add_geofence")
def add_geofence(
    data: schemas.GeofenceLocation,  # Request body containing geofence details
    db: Session = Depends(get_db)
):
    """
    Add a geofence location to the database.
    """
    try:
        # Create a new geofence record
        new_geofence = models.GeofenceLocationModel(
            location=data.location,
            latitude=data.latitude,
            longitude=data.longitude,
            radius=data.radius,
        )
        db.add(new_geofence)
        db.commit()
        db.refresh(new_geofence)
    


        return {"message": "Geofence added successfully", "geofence_id": new_geofence.geofence_id}

    except Exception as e:
        print(f"Error adding geofence: {e}")
        raise HTTPException(status_code=500, detail="An error occurred while adding the geofence.")


@router.get("/get_geofences")
def get_geofences(
    db: Session = Depends(get_db)
):
    """
    Retrieve all geofence locations from the database.
    """
    try:
        geofences = db.query(models.GeofenceLocationModel).all()
        return geofences

    except Exception as e:
        print(f"Error retrieving geofences: {e}")
        raise HTTPException(status_code=500, detail="An error occurred while retrieving geofences.")


@router.get("/get_geofence/{geofence_id}")
def get_geofence(
    geofence_id: int,
    db: Session = Depends(get_db)
):
    """
    Retrieve a single geofence location by ID.
    """
    try:
        geofence = db.query(models.GeofenceLocationModel).filter(
            models.GeofenceLocationModel.geofence_id == geofence_id
        ).first()
        if not geofence:
            raise HTTPException(status_code=404, detail="Geofence not found")
        return geofence

    except Exception as e:
        print(f"Error retrieving geofence: {e}")
        raise HTTPException(status_code=500, detail="An error occurred while retrieving the geofence.")


@router.put("/update_geofence/{geofence_id}")
def update_geofence(
    geofence_id: int,
    data: schemas.GeofenceLocation,  # Request body containing updated geofence details
    db: Session = Depends(get_db)
):
    """
    Update a geofence location in the database.
    """
    try:
        geofence = db.query(models.GeofenceLocationModel).filter(
            models.GeofenceLocationModel.geofence_id == geofence_id
        ).first()
        if not geofence:
            raise HTTPException(status_code=404, detail="Geofence not found")

        # Update geofence details
        geofence.location = data.location
        geofence.latitude = data.latitude
        geofence.longitude = data.longitude
        geofence.radius = data.radius

        db.commit()
        db.refresh(geofence)

        return {"message": "Geofence updated successfully", "geofence_id": geofence.geofence_id}

    except Exception as e:
        print(f"Error updating geofence: {e}")
        raise HTTPException(status_code=500, detail="An error occurred while updating the geofence.")


@router.delete("/delete_geofence/{geofence_id}")
def delete_geofence(
    geofence_id: int,
    db: Session = Depends(get_db)
):
    """
    Delete a geofence location from the database.
    """
    try:
        geofence = db.query(models.GeofenceLocationModel).filter(
            models.GeofenceLocationModel.geofence_id == geofence_id
        ).first()
        if not geofence:
            raise HTTPException(status_code=404, detail="Geofence not found")

        db.delete(geofence)
        db.commit()

        return {"message": "Geofence deleted successfully"}

    except Exception as e:
        print(f"Error deleting geofence: {e}")
        raise HTTPException(status_code=500, detail="An error occurred while deleting the geofence.")


@router.get("/{roomId}/get_geofence_byroom")
def get_geofence_byroom(
    roomId: int,
    db: Session = Depends(get_db)
):
    """
    Retrieve the geofence name (location) associated with a specific room.
    If geofence is not set and isGeofence is enabled, alert the teacher.
    """
    try:
        # Query the room to get the geofence_id and attendance settings
        room = db.query(models.RoomsModel).filter(
            models.RoomsModel.room_id == roomId
        ).first()

        if not room:
            raise HTTPException(status_code=404, detail="Room not found")

        # Check if geofence is enabled but no geofence is set
        if room.isGeofence and not room.geofence_id:
            return {
                "alert": True,
                "message": "Geofence is enabled for this room, but no geofence location is set. Please set a geofence location."
            }

        # Query the geofence using the geofence_id from the room
        geofence = db.query(models.GeofenceLocationModel).filter(
            models.GeofenceLocationModel.geofence_id == room.geofence_id
        ).first()

        if not geofence:
            return {
                "alert": True,
                "message": "Geofence is enabled for this room, but the associated geofence location could not be found. Please set a valid geofence location."
            }

        # Return the geofence name (location)
        return {"geofence_name": geofence.location, "alert": False}

    except Exception as e:
        print(f"Error retrieving geofences by room: {e}")
        raise HTTPException(status_code=500, detail="An error occurred while retrieving geofences by room.")
    


@router.get("/get_all_geofences")
def get_all_geofences(db: Session = Depends(get_db)):
    """
    Retrieve all available geofence locations.
    """
    geofences = db.query(models.GeofenceLocationModel).all()
    return [{"geofence_id": g.geofence_id, "location": g.location} for g in geofences]


