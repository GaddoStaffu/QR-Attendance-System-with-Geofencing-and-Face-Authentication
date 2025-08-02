from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend import models, schemas
from backend.database import get_db
from backend.utils import get_current_user

router = APIRouter()


@router.post("/create-notifications")
def create_notification(
    notification: schemas.NotificationCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new notification for a user.
    """
    new_notification = models.Notification(
        user_id=notification.user_id,
        title=notification.title,
        message=notification.message,
        is_read=False,  # Default to unread
        created_at=datetime.utcnow()
    )
    db.add(new_notification)
    db.commit()
    db.refresh(new_notification)
    return {"message": "Notification created successfully", "notification": new_notification}




@router.post("/get-notifications/")
def get_notifications(
    data: schemas.GetNotificationToken,  # Schema to validate the token
    db: Session = Depends(get_db)
):
    """
    Retrieve notifications for a specific user based on the token.
    """
    try:
        # Decode the token and extract user information
        token_data = get_current_user(data.token)

        if not token_data.get("user_id"):
            raise HTTPException(status_code=401, detail="Invalid token")

        user_id = token_data["user_id"]

        # Query notifications for the user
        notifications = db.query(models.Notification).filter(
            models.Notification.user_id == user_id
        ).order_by(models.Notification.created_at.desc()).all()

        return notifications
    except HTTPException as http_exc:
        # Re-raise HTTP exceptions
        raise http_exc
    except Exception as e:
        print(f"Error retrieving notifications: {e}")
        raise HTTPException(status_code=500, detail="An error occurred while retrieving notifications")

@router.put("/mark_all_as_read")
def mark_all_as_read(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)  # Properly inject the current user
):
    """
    Mark all notifications as read for the user.
    """
    try:
        user_id = current_user.get("user_id")  # Extract user_id from the current user

        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")

        # Update all notifications for the user to mark them as read
        db.query(models.Notification).filter(
            models.Notification.user_id == user_id,
            models.Notification.is_read == False  # Only update unread notifications
        ).update({"is_read": True})
        db.commit()

        return {"message": "All notifications marked as read"}
    except Exception as e:
        print(f"Error marking all notifications as read: {e}")
        raise HTTPException(status_code=500, detail="An error occurred while marking notifications as read")

@router.put("/{notification_id}/mark_as_read")
def mark_notification_as_read(
    notification_id: int,
    db: Session = Depends(get_db)
):
    """
    Mark a notification as read.
    """
    try:
        # Query the notification by ID
        notification = db.query(models.Notification).filter(models.Notification.id == notification_id).first()
        if not notification:
            raise HTTPException(status_code=404, detail="Notification not found")

        # Update the notification's is_read status
        notification.is_read = True
        db.commit()
        db.refresh(notification)

        return {"message": "Notification marked as read", "notification": notification}
    except Exception as e:
        print(f"Error marking notification as read: {e}")
        raise HTTPException(status_code=500, detail="An error occurred while marking the notification as read")


@router.delete("/delete-notifications/{notification_id}")
def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db)
):
    """
    Delete a notification.
    """
    try:
        # Query the notification by ID
        notification = db.query(models.Notification).filter(models.Notification.id == notification_id).first()
        if not notification:
            raise HTTPException(status_code=404, detail="Notification not found")

        # Delete the notification
        db.delete(notification)
        db.commit()

        return {"message": "Notification deleted successfully"}
    except Exception as e:
        print(f"Error deleting notification: {e}")
        raise HTTPException(status_code=500, detail="An error occurred while deleting the notification")
    
    
    
@router.post("/get-teacher-notifications")
def get_teacher_notifications(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Retrieve room-based notifications for the logged-in teacher.
    """
    try:
        # Extract the user ID and role from the current user
        user_id = current_user.get("user_id")
        role = current_user.get("role")
        # Query rooms owned by the teacher
        owned_rooms = db.query(models.RoomsModel.room_id).filter(
            models.RoomsModel.user_id == user_id
        ).subquery()

        # Query notifications related to the teacher's rooms
        notifications = db.query(models.Notification).filter(
            models.Notification.room_id.in_(owned_rooms)
        ).order_by(models.Notification.created_at.desc()).all()

        # Transform the notifications into a list of dictionaries
        notification_list = [
            {
                "id": notification.id,
                "title": notification.title,
                "message": notification.message,
                "is_read": notification.is_read,
                "created_at": notification.created_at,
                "room_id": notification.room_id,
                "room_name": db.query(models.RoomsModel.class_name).filter(
                    models.RoomsModel.room_id == notification.room_id
                ).scalar(),  # Fetch the room name
            }
            for notification in notifications
        ]

        return notification_list

    except HTTPException as http_exc:
        # Re-raise HTTP exceptions
        raise http_exc
    except Exception as e:
        print(f"Error retrieving teacher notifications: {e}")
        raise HTTPException(status_code=500, detail="An error occurred while retrieving notifications")