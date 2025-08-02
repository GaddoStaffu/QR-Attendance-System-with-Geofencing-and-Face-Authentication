import React, { useState } from "react";
import axios from "axios";

interface EditAttendanceScheduleModalProps {
  scheduleId: number;
  scheduleInfo: {
    schedule_name: string;
    schedule_description: string;
    date: string;
    start_time: string;
    end_time: string;
  };
  onClose: () => void;
  onUpdate: () => void; // Callback to refresh the schedules list after update
}

const API_URL = import.meta.env.VITE_API_URL;

const TeacherEditAttendanceScheduleModal: React.FC<EditAttendanceScheduleModalProps> = ({
  scheduleId,
  scheduleInfo,
  onClose,
  onUpdate,
}) => {
  const [scheduleName, setScheduleName] = useState(scheduleInfo.schedule_name);
  const [scheduleDescription, setScheduleDescription] = useState(
    scheduleInfo.schedule_description
  );
  const [date, setDate] = useState(scheduleInfo.date);
  const [startTime, setStartTime] = useState(scheduleInfo.start_time);
  const [endTime, setEndTime] = useState(scheduleInfo.end_time);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSave = async () => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        setErrorMessage("You are not logged in.");
        return;
      }

      if (!scheduleName.trim()) {
        setErrorMessage("Schedule name cannot be empty.");
        return;
      }

      if (startTime >= endTime) {
        setErrorMessage("Start time must be earlier than end time.");
        return;
      }

      await axios.put(
        `${API_URL}/attendance/${scheduleId}/update_attendance_schedule`,
        {
          schedule_name: scheduleName,
          schedule_description: scheduleDescription,
          date,
          start_time: startTime,
          end_time: endTime,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      alert("Attendance schedule updated successfully!");
      onUpdate(); // Refresh the schedules list
      onClose(); // Close the modal
    } catch (error: any) {
      console.error("Error updating attendance schedule:", error);
      setErrorMessage(
        error.response?.data?.detail || "Failed to update attendance schedule."
      );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96">
        <h2 className="text-xl font-bold mb-4">Edit Attendance Schedule</h2>
        {errorMessage && (
          <p className="text-red-500 text-sm mb-4">{errorMessage}</p>
        )}
        <div className="mb-4">
          <label className="block text-gray-700">Schedule Name</label>
          <input
            type="text"
            className="w-full border rounded p-2"
            value={scheduleName}
            onChange={(e) => setScheduleName(e.target.value)}
            placeholder="Enter schedule name"
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700">Schedule Description</label>
          <textarea
            className="w-full border rounded p-2"
            value={scheduleDescription}
            onChange={(e) => setScheduleDescription(e.target.value)}
            placeholder="Enter schedule description"
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700">Date</label>
          <input
            type="date"
            className="w-full border rounded p-2"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700">Start Time</label>
          <input
            type="time"
            className="w-full border rounded p-2"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700">End Time</label>
          <input
            type="time"
            className="w-full border rounded p-2"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>
        <div className="flex justify-end space-x-2">
          <button
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-700"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-700"
            onClick={handleSave}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default TeacherEditAttendanceScheduleModal;