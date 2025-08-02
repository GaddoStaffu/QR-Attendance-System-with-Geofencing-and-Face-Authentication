from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend import models, schemas
from backend.database import get_db
from backend.utils import hash_password

router = APIRouter()



@router.get("/get_users")
def get_users(
    db: Session = Depends(get_db)
):
    """
    Retrieve all users from the database.
    """
    try:
        users = db.query(models.UserModel).all()
        return users

    except Exception as e:
        print(f"Error retrieving users: {e}")
        raise HTTPException(status_code=500, detail="An error occurred while retrieving users.")


@router.post("reset_password")
def reset_password(
    user: schemas.User,
    db: Session = Depends(get_db)
):
    """
    Reset the password for a user.
    """
    try:
        # Check if the user exists
        db_user = db.query(models.UserModel).filter(models.UserModel.username == user.username).first()
        if not db_user:
            raise HTTPException(status_code=400, detail="User not found")

        # Update the user's password
        db_user.hashed_password = hash_password(user.password)  # Hash the new password
        db.commit()
        db.refresh(db_user)

        return {"message": "Password reset successfully"}

    except Exception as e:
        print(f"Error resetting password: {e}")
        raise HTTPException(status_code=500, detail="An error occurred while resetting the password.")


@router.post("/create_user")
def create_user(
    user: schemas.User,
    db: Session = Depends(get_db)
):
    """
    Create a new user in the database.
    """
    try:
        # Check if the username already exists
        db_user = db.query(models.UserModel).filter(models.UserModel.username == user.username).first()
        if db_user:
            raise HTTPException(status_code=400, detail="Username already exists")

        # Check if the email already exists
        if user.email:
            db_email = db.query(models.UserModel).filter(models.UserModel.email == user.email).first()
            if db_email:
                raise HTTPException(status_code=400, detail="Email already exists")

        # Check if the id_number already exists
        if user.id_number:
            db_id = db.query(models.UserModel).filter(models.UserModel.id_number == user.id_number).first()
            if db_id:
                raise HTTPException(status_code=400, detail="ID number already exists")

        # Create a new user
        new_user = models.UserModel(
            id_number=user.id_number,
            first_name=user.first_name,
            last_name=user.last_name,
            username=user.username,
            email=user.email,
            hashed_password=hash_password(user.password),
            role=user.role,
            is_verified=False,
            created_at=user.created_at,
                                                                                                                                                                        
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        return {"message": "User created successfully"}

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating user: {e}")
        raise HTTPException(status_code=500, detail="An error occurred while creating the user.")

@router.put("/edit_user")
def edit_user(
    user: schemas.UserEdit,
    db: Session = Depends(get_db)
):
    """
    Edit an existing user's details.
    """
    try:
        db_user = db.query(models.UserModel).filter(models.UserModel.username == user.username).first()
        if not db_user:
            raise HTTPException(status_code=404, detail="User not found")

        # Check for duplicate id_number (exclude current user)
        if user.id_number and user.id_number != db_user.id_number:
            existing_id = db.query(models.UserModel).filter(
                models.UserModel.id_number == user.id_number,
                models.UserModel.username != user.username
            ).first()
            if existing_id:
                raise HTTPException(status_code=400, detail="ID number already in use by another user.")

        # Check for duplicate email (exclude current user)
        if user.email and user.email != db_user.email:
            existing_email = db.query(models.UserModel).filter(
                models.UserModel.email == user.email,
                models.UserModel.username != user.username
            ).first()
            if existing_email:
                raise HTTPException(status_code=400, detail="Email already in use by another user.")

        # Check for duplicate username (exclude current user)
        if user.username and user.username != db_user.username:
            existing_username = db.query(models.UserModel).filter(
                models.UserModel.username == user.username,
                models.UserModel.user_id != db_user.user_id
            ).first()
            if existing_username:
                raise HTTPException(status_code=400, detail="Username already in use by another user.")

        # Update only provided fields
        if user.id_number is not None:
            db_user.id_number = user.id_number
        if user.first_name is not None:
            db_user.first_name = user.first_name
        if user.last_name is not None:
            db_user.last_name = user.last_name
        if user.email is not None:
            db_user.email = user.email
        if user.role is not None:
            db_user.role = user.role
        if user.is_verified is not None:
            db_user.is_verified = user.is_verified
        if user.is_deleted is not None:
            db_user.is_deleted = user.is_deleted
        if user.password:
            db_user.hashed_password = hash_password(user.password)

        db.commit()
        db.refresh(db_user)
        return {"message": "User updated successfully"}

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error editing user: {e}")
        raise HTTPException(status_code=500, detail="An error occurred while editing the user.")