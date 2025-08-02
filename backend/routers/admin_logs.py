from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend import models, schemas
from backend.database import get_db
from backend.utils import get_current_user, hash_password
import csv
from fastapi.responses import StreamingResponse
from io import StringIO

router = APIRouter()


@router.get("/get_logs")
def get_logs(
    token: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve all logs from the database.
    """
    try:
        logs = db.query(models.Logs).all()
        return logs

    except Exception as e:
        print(f"Error retrieving logs: {e}")
        raise HTTPException(status_code=500, detail="An error occurred while retrieving logs.")
    
@router.get("/export_logs")
def export_logs(
    token: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Export all logs as a CSV file.
    """
    try:
        logs = db.query(models.Logs).all()
        if not logs:
            raise HTTPException(status_code=404, detail="No logs found.")

        # Prepare CSV in memory
        output = StringIO()
        writer = csv.writer(output)
        # Write header
        writer.writerow(["id", "user_id", "action", "level", "details", "action_type", "created_at"])
        # Write log rows
        for log in logs:
            writer.writerow([
                log.log_id,
                log.user_id,
                log.action,
                log.level,
                log.details,
                log.action_type,
                log.ip_address,
                log.user_agent,
                log.timestamp
            ])
        output.seek(0)
        return StreamingResponse(
            output,
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=logs.csv"}
        )
    except Exception as e:
        print(f"Error exporting logs: {e}")
        raise HTTPException(status_code=500, detail="An error occurred while exporting logs.")