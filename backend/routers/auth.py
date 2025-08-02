from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordRequestForm
import jwt
from sqlalchemy.orm import Session
from backend import models, schemas
from backend.database import get_db
from backend.utils import ALGORITHM, SECRET_KEY, generate_mfa_code, get_current_user, hash_password, log_action, send_email_mfa, verify_password, create_access_token

router = APIRouter()

# In-memory store for MFA codes (user_id -> {code, expires})


# ------------------------------
# User Registration
# ------------------------------
@router.post("/register")
def register_user(user: schemas.User, db: Session = Depends(get_db), request: Request = None):
    # Check if the username, email, or ID number already exists
    existing_user = db.query(models.UserModel).filter(
        (models.UserModel.username == user.username) |
        (models.UserModel.email == user.email) |
        (models.UserModel.id_number == user.id_number)
    ).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username, email, or ID number already exists")

    # Check if the email and code are valid in verification_codes table
    now = datetime.utcnow()
    code_entry = db.query(models.VerificationCodeModel).filter(
        models.VerificationCodeModel.code_type == "register",
        models.VerificationCodeModel.email == user.email,
        models.VerificationCodeModel.code == user.verification_code,
        models.VerificationCodeModel.expires_at >= now
    ).order_by(models.VerificationCodeModel.created_at.desc()).first()

    if not code_entry:
        raise HTTPException(status_code=400, detail="Invalid or expired verification code.")

    # Proceed with registration and mark as verified
    new_user = models.UserModel(
        username=user.username,
        email=user.email,
        hashed_password=hash_password(user.password),
        id_number=user.id_number,
        first_name=user.first_name,
        last_name=user.last_name,
        role=user.role,
        is_verified=True  # Mark user as verified
    )
    db.add(new_user)
    db.delete(code_entry)  # Remove the code after use
    db.commit()
    db.refresh(new_user)

    log_action(
        db=db,
        user_id=new_user.user_id,
        action="User registered",
        level="INFO",
        details=f"User {new_user.username} registered with email {new_user.email}",
        action_type="CREATE",
        request=request,
    )

    return {"message": "User registered successfully", "user": new_user.username}

# ------------------------------
# User Login
# ------------------------------
@router.post("/login")
def login_user(user: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db), request: Request = None):
    # Check if the user exists
    db_user = db.query(models.UserModel).filter(models.UserModel.username == user.username).first()
    if not db_user or not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=400, detail="Invalid username or password")

    # Check if the user is deleted
    if getattr(db_user, "is_deleted", False):
        raise HTTPException(status_code=403, detail="This account has been disabled.")

    # Create a JWT token with additional user data
    access_token = create_access_token(data={
        "sub": db_user.username,
        "role": db_user.role,
        "user_id": db_user.user_id,
        "exp": 3600  # Token expiration time in seconds (1 hour)
    })

    # Log the login action
    log_action(
        db=db,
        user_id=db_user.user_id,
        action="User logged in",
        level="INFO",
        details=f"User {db_user.user_id} logged in successfully",
        action_type="LOGIN",
        request=request,
    )

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


# ------------------------------
# Refresh Token
# ------------------------------
@router.post("/refresh-token")
def refresh_token(
    data: dict,  # Expect a JSON payload with a "token" field
    db: Session = Depends(get_db),
    request: Request = None
):
    try:
        token = data.get("token")  # Extract the token from the JSON payload
        if not token:
            raise HTTPException(status_code=400, detail="Token is required")

        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        expiration = payload.get("exp")
        if not expiration or datetime.utcfromtimestamp(expiration) < datetime.utcnow():
            raise HTTPException(status_code=401, detail="Token expired")

        # Generate a new token
        new_payload = {
            "sub": payload.get("sub"),
            "role": payload.get("role"),
            "user_id": payload.get("user_id"),
            "exp": datetime.utcnow() + timedelta(minutes=30),  # Extend expiration
        }
        new_token = jwt.encode(new_payload, SECRET_KEY, algorithm=ALGORITHM)

        return {"access_token": new_token}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ------------------------------
# Backend Logout Endpoint
# ------------------------------
@router.post("/logout")
async def logout(request: Request, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    # Log the logout action
    log_action(
        db=db,
        user_id=current_user["user_id"],  # Access user_id as a dictionary key
        action="User logged out",
        level="INFO",
        details=f"User {current_user['user_id']} logged out successfully",
        action_type="LOGOUT",
        request=request,
    )

    return {"message": "User logged out successfully"}


@router.post("/login/request")
def login_request(data: dict, db: Session = Depends(get_db)):
    username = data.get("username")
    password = data.get("password")
    db_user = db.query(models.UserModel).filter(models.UserModel.username == username).first()
    if not db_user or not verify_password(password, db_user.hashed_password):
        raise HTTPException(status_code=400, detail="Invalid username or password")
    if getattr(db_user, "is_deleted", False):
        raise HTTPException(status_code=403, detail="This account has been disabled.")

    # Remove any existing login codes for this user
    db.query(models.VerificationCodeModel).filter(
        models.VerificationCodeModel.user_id == db_user.user_id,
        models.VerificationCodeModel.code_type == "login"
    ).delete()

    # Generate and store MFA code in VerificationCodeModel
    code = generate_mfa_code()
    expires_at = datetime.utcnow() + timedelta(minutes=1)
    new_code = models.VerificationCodeModel(
        user_id=db_user.user_id,
        code=code,
        code_type="login",
        created_at=datetime.utcnow(),
        expires_at=expires_at
    )
    db.add(new_code)
    db.commit()

    send_email_mfa(db_user.email, code, code_type="login")
    return {"message": "A verification code has been sent to your email."}

# ------------------------------
# User Login (Step 2: Verify MFA)
# ------------------------------
@router.post("/login/verify")
def login_verify(data: dict, db: Session = Depends(get_db), request: Request = None):
    username = data.get("username")
    code = data.get("code")
    db_user = db.query(models.UserModel).filter(models.UserModel.username == username).first()
    if not db_user:
        raise HTTPException(status_code=400, detail="Invalid username or code")

    # Find the latest, unexpired login code for this user
    now = datetime.utcnow()
    code_entry = db.query(models.VerificationCodeModel).filter(
        models.VerificationCodeModel.user_id == db_user.user_id,
        models.VerificationCodeModel.code_type == "login",
        models.VerificationCodeModel.code == code,
        models.VerificationCodeModel.expires_at >= now
    ).order_by(models.VerificationCodeModel.created_at.desc()).first()

    if not code_entry:
        raise HTTPException(status_code=400, detail="Invalid or expired verification code")

    # Delete the code after successful verification
    db.delete(code_entry)
    db.commit()

    # Create JWT token
    access_token = create_access_token(data={
        "sub": db_user.username,
        "role": db_user.role,
        "user_id": db_user.user_id,
        "exp": 3600
    })

    log_action(
        db=db,
        user_id=db_user.user_id,
        action="User logged in (MFA)",
        level="INFO",
        details=f"User {db_user.user_id} logged in with MFA",
        action_type="LOGIN",
        request=request,
    )

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }
    
    
@router.post("/verify-email-code")
def verify_email_code(
    data: dict,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
    request: Request = None
):
    # Accepts: { "code": "..." }
    code = data.get("code")
    if not code:
        raise HTTPException(status_code=400, detail="Code is required.")

    user = db.query(models.UserModel).filter(models.UserModel.user_id == current_user["user_id"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if user.is_verified:
        return {"message": "Email is already verified."}

    now = datetime.utcnow()
    code_entry = db.query(models.VerificationCodeModel).filter(
        models.VerificationCodeModel.email == user.email,
        models.VerificationCodeModel.code_type == "email",
        models.VerificationCodeModel.code == code,
        models.VerificationCodeModel.expires_at >= now
    ).order_by(models.VerificationCodeModel.created_at.desc()).first()

    if not code_entry:
        raise HTTPException(status_code=400, detail="Invalid or expired verification code.")

    user.is_verified = True
    db.delete(code_entry)
    db.commit()

    log_action(
        db=db,
        user_id=user.user_id,
        action="Verify email code",
        level="INFO",
        details=f"User {user.user_id} verified their email.",
        action_type="UPDATE",
        request=request,
    )

    return {"message": "Email verified successfully."}


@router.post("/register/request-email-code")
def request_email_code(data: dict, db: Session = Depends(get_db)):
    email = data.get("email")
    username = data.get("username")
    id_number = data.get("id_number")

    # Check if email, username, or id_number already exists
    existing_user = db.query(models.UserModel).filter(
        (models.UserModel.username == username) |
        (models.UserModel.email == email) |
        (models.UserModel.id_number == id_number)
    ).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username, email, or ID number already exists")

    # Remove any previous unused codes for this email
    db.query(models.VerificationCodeModel).filter(
        models.VerificationCodeModel.code_type == "register",
        models.VerificationCodeModel.email == email
    ).delete()

    # Generate and store code
    code = generate_mfa_code()
    expires_at = datetime.utcnow() + timedelta(minutes=10)
    new_code = models.VerificationCodeModel(
        user_id=None,
        email=email,
        code=code,
        code_type="register",
        created_at=datetime.utcnow(),
        expires_at=expires_at
    )
    db.add(new_code)
    db.commit()

    send_email_mfa(email, code, code_type="register")
    return {"message": "A verification code has been sent to your email."}

@router.post("/register/verify-email-code")
def verify_registration_email_code(data: dict, db: Session = Depends(get_db)):
    email = data.get("email")
    code = data.get("code")
    now = datetime.utcnow()
    code_entry = db.query(models.VerificationCodeModel).filter(
        models.VerificationCodeModel.code_type == "register",
        models.VerificationCodeModel.email == email,  # <-- use email
        models.VerificationCodeModel.code == code,
        models.VerificationCodeModel.expires_at >= now
    ).order_by(models.VerificationCodeModel.created_at.desc()).first()

    if not code_entry:
        raise HTTPException(status_code=400, detail="Invalid or expired verification code.")

    db.delete(code_entry)
    db.commit()
    return {"message": "Email verified for registration."}