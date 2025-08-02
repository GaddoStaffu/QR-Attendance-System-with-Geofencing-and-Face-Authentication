from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from backend import schemas
from backend import models
from backend.utils import generate_verification_code, get_current_user, hash_password, log_action, send_email_verification, verify_password
from backend.database import SessionLocal, get_db
from backend.models import UserModel

router = APIRouter()

@router.post("/change-password")
def change_password(
    data: schemas.ChangePassword,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
    request: Request = None
):
    # Fetch the user from the database
    user = db.query(UserModel).filter(UserModel.user_id == current_user["user_id"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    # Verify the old password
    if not verify_password(data.oldPassword, user.hashed_password):
        raise HTTPException(status_code=400, detail="Old password is incorrect.")

    # Hash the new password
    newPassword_hashed = hash_password(data.newPassword)

    # Validate the new password
    if user.hashed_password == newPassword_hashed:
        raise HTTPException(status_code=400, detail="New password cannot be the same as the old password.")
    
    if data.newPassword != data.confirmPassword:
        raise HTTPException(status_code=400, detail="New password and confirmation do not match.")

    # Update the password in the database
    user.hashed_password = newPassword_hashed
    db.commit()
    
    log_action(
        db=db,
        user_id=user.user_id,
        action="Change password",
        level="INFO",
        details=f"User {user.user_id} changed their password.",
        action_type="UPDATE",
        request=request,)

    return {"message": "Password changed successfully."}
    
    
from backend.schemas import ChangeProfileDetails

@router.put("/update-profile")
def update_profile(
    data: schemas.ChangeProfileDetails,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    request: Request = None
):
    print("Received data:", data.dict())  # Log the incoming data

    # Fetch the user from the database
    user = db.query(UserModel).filter(UserModel.user_id == current_user["user_id"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    # Update fields only if they are provided and not empty
    if data.firstName and data.firstName.strip():
        user.first_name = data.firstName
    if data.lastName and data.lastName.strip():
        user.last_name = data.lastName
    if data.username and data.username.strip():
        user.username = data.username
    if data.id_number is not None:  # Check if id_number is provided
        user.id_number = data.id_number

    # Commit the changes to the database
    db.commit()
    
    log_action(
        db=db,
        user_id=user.user_id,
        action="Update profile",
        level="INFO",
        details=f"User {user.user_id} updated their profile.",
        action_type="UPDATE",
        request=request,)

    return {"message": "Profile updated successfully."}


@router.get("/get-profile")
def get_user_profile(
    current_user: dict = Depends(get_current_user),  # Extract user info from token
    db: Session = Depends(get_db)  # Use get_db for session management
):
    # Fetch the user from the database using the user_id from the token
    user = db.query(UserModel).filter(UserModel.user_id == current_user["user_id"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    # Return the user profile
    return {
        "user_id": user.user_id,
        "firstName": user.first_name,
        "lastName": user.last_name,
        "email": user.email,
        "username": user.username,
        "id_number": user.id_number,
        "role": user.role,
        "is_verified": user.is_verified,
    }
    

@router.post("/send-verification-code")
def send_verification_code(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
    request: Request = None
):
    user = db.query(UserModel).filter(UserModel.user_id == current_user["user_id"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if user.is_verified:
        raise HTTPException(status_code=400, detail="Email is already verified.")

    # Generate a verification code
    verification_code = generate_verification_code()
    expires_at = datetime.utcnow() + timedelta(minutes=10)

    # Remove any previous unused codes for this email and code_type
    db.query(models.VerificationCodeModel).filter(
        models.VerificationCodeModel.email == user.email,
        models.VerificationCodeModel.code_type == "email"
    ).delete()

    # Save the code to the verification_codes table
    new_code = models.VerificationCodeModel(
        user_id=user.user_id,
        email=user.email,
        code=verification_code,
        code_type="email",
        created_at=datetime.utcnow(),
        expires_at=expires_at
    )
    db.add(new_code)
    db.commit()
    
    log_action(
        db=db,
        user_id=current_user['user_id'],
        action="Request verification code",
        level="INFO",
        details=f"User {current_user['user_id']} requested a verification code.",
        action_type="CREATE",
        request=request,
    )

    # Send the verification code to the user's email
    send_email_verification(user.email, verification_code)

    return {"message": "Verification code sent successfully."}






@router.post("/send-reset-code")
def send_reset_code(
    data: schemas.SendResetCode,  # Schema for email input
    db: Session = Depends(get_db),
    request: Request = None,  # Optional: to log the request details
):
    # Fetch the user by email
    user = db.query(UserModel).filter(UserModel.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User with this email not found.")

    # Generate a reset code
    reset_code = generate_verification_code()  # Implement this utility function
    user.verification_code = reset_code
    db.commit()

    # Send the reset code to the user's email
    send_email_verification(user.email, reset_code)  # Implement this utility function

    # Log the login action
    client_ip = request.headers.get("X-Forwarded-For", request.client.host)
    user_agent = request.headers.get("User-Agent", "Unknown")  # Get the User-Agent header
    log_entry = models.Logs(
        user_id=user.user_id,
        action="Sent reset code",
        level="INFO",
        timestamp=datetime.now(),
        ip_address=client_ip,
        user_agent=user_agent,
        details=f"User {user.username} sent a reset code.",
        action_type="LOGIN"
    )
    db.add(log_entry)
    db.commit()

    return {"message": "Reset code sent successfully."}


@router.post("/verify-reset-code")
def verify_reset_code(
    data: schemas.VerifyResetCode,  # Schema for email and code input
    db: Session = Depends(get_db),
    request: Request = None,  # Optional: to log the request details
):
    # Fetch the user by email
    user = db.query(UserModel).filter(UserModel.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User with this email not found.")

    # Check if the reset code matches
    if user.verification_code != data.code:
        raise HTTPException(status_code=400, detail="Invalid reset code.")

    # Clear the reset code after verification
    user.verification_code = None
    db.commit()
    
        # Log the login action
    client_ip = request.headers.get("X-Forwarded-For", request.client.host)
    user_agent = request.headers.get("User-Agent", "Unknown")  # Get the User-Agent header
    log_entry = models.Logs(
        user_id=user.user_id,
        action="Verify reset code",
        level="INFO",
        timestamp=datetime.now(),
        ip_address=client_ip,
        user_agent=user_agent,
        details=f"User {user.username} verified their reset code.",
        action_type="LOGIN"
    )
    db.add(log_entry)
    db.commit()

    return {"message": "Reset code verified successfully."}


@router.post("/reset-password")
def reset_password(
    data: schemas.ResetPassword,  # Schema for email, new password, and confirm password
    db: Session = Depends(get_db),
    request: Request = None,  # Optional: to log the request details
):
    # Fetch the user by email
    user = db.query(UserModel).filter(UserModel.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User with this email not found.")

    # Check if the new password and confirm password match
    if data.newPassword != data.confirmPassword:
        raise HTTPException(status_code=400, detail="Passwords do not match.")

    # Hash the new password
    hashed_password = hash_password(data.newPassword)

    # Update the user's password
    user.hashed_password = hashed_password
    db.commit()
    
    client_ip = request.headers.get("X-Forwarded-For", request.client.host)
    user_agent = request.headers.get("User-Agent", "Unknown")
    log_entry = models.Logs(
        user_id=user.user_id,
        action="Password reset",
        level="INFO",
        timestamp=datetime.now(),
        ip_address=client_ip,
        user_agent=user_agent,
        details=f"User {user.username} reset their password.",
        action_type="UPDATE"
    )
    db.add(log_entry)
    db.commit()

    return {"message": "Password reset successfully."}