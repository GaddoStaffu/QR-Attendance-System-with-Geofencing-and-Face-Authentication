import cv2
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from backend import models, schemas
from backend.ArcFaceModel import ArcFaceModel
from backend.database import get_db

from backend.utils import decode_base64_image, get_current_user, log_action
import base64
import numpy as np
from backend.ArcFaceModel import ArcFaceModel


router = APIRouter()

# Initialize the ArcFace model
arcface_model = ArcFaceModel()

@router.post("/register_face")
async def register_face(
    data: schemas.RegisterFace,
    db: Session = Depends(get_db),
    request: Request = None
):
    """
    Register new face embeddings for authentication.
    """
    try:
        # Decode the token and get the user
        user = get_current_user(data.token)
        db_user = db.query(models.UserModel).filter(models.UserModel.user_id == user["user_id"]).first()
        if not db_user or not db_user.is_verified:
            raise HTTPException(status_code=403, detail="Face registration is only allowed for verified users.")

        # Validate the images
        if not data.images or not isinstance(data.images, list):
            raise HTTPException(status_code=400, detail="Invalid images data provided.")

        # Process each image and generate embeddings
        embeddings = []
        for base64_image in data.images:
            decoded_image = decode_base64_image(base64_image)
            embedding = arcface_model.process_image_with_arcface(decoded_image)
            embeddings.append(embedding.tolist())

        # Check if the user already has a face record
        existing_face = db.query(models.FaceDataModel).filter_by(user_id=user["user_id"]).first()

        if existing_face:
            raise HTTPException(status_code=400, detail="Face data already exists. Use the /overwrite_face endpoint to update.")

        # Create a new face authentication record
        new_face = models.FaceDataModel(
            user_id=user["user_id"],
            face_data=embeddings,  # Store the array of embeddings
        )
        db.add(new_face)
        db.commit()
        db.refresh(new_face)
        print(f"New face record created with face_id: {new_face.face_id}")

        # Log the action
        log_action(
            db=db,
            user_id=user['user_id'],
            action="User registered face data",
            level="INFO",
            details=f"User {user['user_id']} registered face data.",
            action_type="FACEAUTH",
            request=request,
        )

        return {"message": "Face registered successfully", "face_id": new_face.face_id}

    except Exception as e:
        print(f"Error registering face: {e}")
        raise HTTPException(status_code=500, detail="An error occurred while registering the face.")
    


@router.post("/overwrite_face")
async def overwrite_face(
    data: schemas.RegisterFace,
    db: Session = Depends(get_db),
    request: Request = None
):
    """
    Overwrite existing face embeddings for authentication.
    """
    try:
        # Decode the token and get the user
        user = get_current_user(data.token)
        
        # Only allow face registration for verified users
        db_user = db.query(models.UserModel).filter(models.UserModel.user_id == user["user_id"]).first()
        if not db_user or not db_user.is_verified:
            raise HTTPException(status_code=403, detail="Face registration is only allowed for verified users.")

        # Validate the images
        if not data.images or not isinstance(data.images, list):
            raise HTTPException(status_code=400, detail="Invalid images data provided.")

        # Process each image and generate embeddings
        embeddings = []
        for base64_image in data.images:
            decoded_image = decode_base64_image(base64_image)
            embedding = arcface_model.process_image_with_arcface(decoded_image)
            embeddings.append(embedding.tolist())

        # Check if the user already has a face record
        existing_face = db.query(models.FaceDataModel).filter_by(user_id=user["user_id"]).first()

        if not existing_face:
            raise HTTPException(status_code=404, detail="No existing face data found for the user.")

        # Overwrite the existing face data
        existing_face.face_data = embeddings  # Update the embeddings
        db.commit()
        db.refresh(existing_face)
        print(f"Existing face record updated with face_id: {existing_face.face_id}")

        # Log the action
        log_action(
            db=db,
            user_id=user['user_id'],
            action="User Updated face data",
            level="INFO",
            details=f"User {user['user_id']} updated their face data.",
            action_type="FACEAUTH",
            request=request,
        )

        return {"message": "Face data updated successfully", "face_id": existing_face.face_id}

    except Exception as e:
        print(f"Error overwriting face data: {e}")
        raise HTTPException(status_code=500, detail="An error occurred while overwriting the face data.")

@router.get("/is_face_registered")
def is_face_registered(
    token: str,
    db: Session = Depends(get_db)
):
    """
    Check if the user's face data is already registered.
    """
    try:
        # Decode the token and get the user
        user = get_current_user(token)
        

        # Check if the user already has a face record
        existing_face = db.query(models.FaceDataModel).filter_by(user_id=user["user_id"]).first()

        if existing_face:
            return {"is_registered": True, "face_id": existing_face.face_id}

        return {"is_registered": False}

    except Exception as e:
        print(f"Error checking face registration: {e}")
        raise HTTPException(status_code=500, detail="An error occurred while checking face registration.")