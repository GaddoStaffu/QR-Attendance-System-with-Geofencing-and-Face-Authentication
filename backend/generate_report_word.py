# (Consider creating a new file like report_utils.py for helper functions)

from docxtpl import DocxTemplate
from datetime import datetime
import io # Needed for in-memory streams

def create_attendance_docx(
    template_path: str,
    output_target: io.BytesIO,  # Target to save the docx (in-memory stream)
    student_list: list,         # List of student dicts, e.g., [{"no": 1, "name": "Jane Doe", ...}]
    attendance_date_list: list, # List of date dicts, e.g., [{"date": "YYYY-MM-DD", "time": "HH:MM AM/PM"}]
    student_status_list: list,  # List of dicts like [{"Jane Doe": {"YYYY-MM-DD HH:MM AM/PM": "Present", ...}}, ...]
    max_dates: int = 16,        # Max columns for dates
    context_extras: dict = None # Optional extra context variables for the template
) -> bool:
    """
    Generates an attendance report DOCX file using docxtpl.

    Args:
        template_path: Path to the .docx template file.
        output_target: An in-memory BytesIO stream to save the generated document.
        student_list: List containing student information dictionaries.
        attendance_date_list: List of dictionaries, each with a "date" and "time" key.
        student_status_list: List of dictionaries mapping student names to their attendance status per date and time.
        max_dates: The exact number of date columns required in the template.
        context_extras: Optional dictionary with additional context for rendering.

    Returns:
        True if document generation was successful, False otherwise.
    """
    try:
        # Debug: Print the received data
        print("Template Path:", template_path)
        print("Student List:", student_list)
        print("Attendance Date List:", attendance_date_list)
        print("Student Status List:", student_status_list)
        print("Max Dates:", max_dates)
        print("Context Extras:", context_extras)

        # Load the Word template
        doc = DocxTemplate(template_path)

        # --- Data Processing ---
        # Pad or truncate the attendance dates
        padded_attendance_dates = attendance_date_list[:max_dates]
        padding_needed = max_dates - len(padded_attendance_dates)
        for _ in range(padding_needed):
            padded_attendance_dates.append({"date": "", "time": ""})  # Use empty strings for padding display

        # Create a lookup for faster student status access
        status_lookup = {}
        for record in student_status_list:
            status_lookup.update(record)  # Assumes student names are unique keys across the list

        # Process student list to embed attendance status
        processed_student_list = []
        for student in student_list:
            processed_student = student.copy()  # Avoid modifying original list
            student_name = processed_student.get("name")
            attendance = status_lookup.get(student_name, {})  # Get status dict for the student

            # Generate the status list for the padded dates
            # Generate the status list for the padded dates
            processed_student["attendance_status"] = [
                "✔" if attendance.get(f"{date_entry.get('date')} {date_entry.get('time')}", "") == "present" else
                "L" if attendance.get(f"{date_entry.get('date')} {date_entry.get('time')}", "") == "late" else
                "✘" if attendance.get(f"{date_entry.get('date')} {date_entry.get('time')}", "") == "absent" else
                "E" if attendance.get(f"{date_entry.get('date')} {date_entry.get('time')}", "") == "excused" else
                ""  # Default to blank
                for date_entry in padded_attendance_dates  # Iterate through padded dates
            ]
            processed_student_list.append(processed_student)
        # --- End Data Processing ---

        # Prepare the final context for the template
        context = {
            "attendance_dates": padded_attendance_dates,
            "students": processed_student_list,
            # Add default values that can be overridden by context_extras
            "report_title": "Class Attendance Report",
            "date": datetime.now().strftime("%B %d, %Y"),
        }

        # Merge optional extra context
        if context_extras:
            context.update(context_extras)

        # Render the template
        doc.render(context)

        # Save the rendered document to the provided output target (BytesIO stream)
        doc.save(output_target)
        output_target.seek(0)  # Rewind the stream to the beginning for reading

        return True

    except Exception as e:
        print(f"Error generating DOCX: {e}")  # Replace with proper logging
        return False