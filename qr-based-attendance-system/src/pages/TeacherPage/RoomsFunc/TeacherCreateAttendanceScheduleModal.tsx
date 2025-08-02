import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import axios from "axios"; // Import axios

interface CreateAttendanceScheduleModalProps {
  roomId: string;
  onClose: () => void;
  onScheduleCreated: () => void; // Callback to notify parent
}

const CreateAttendanceScheduleModal: React.FC<
  CreateAttendanceScheduleModalProps
> = ({ roomId, onClose, onScheduleCreated }) => {
  const [scheduleName, setScheduleName] = useState("");
  const [scheduleDescription, setScheduleDescription] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!scheduleName.trim()) {
      setErrorMessage("Schedule name cannot be empty.");
      return;
    }

    if (startTime >= endTime) {
      setErrorMessage("Start time must be earlier than end time.");
      return;
    }

    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        setErrorMessage("You are not logged in.");
        return;
      }

      const response = await axios.post(
        `${
          import.meta.env.VITE_API_URL
        }/attendance/${roomId}/create_attendance_schedule`,
        {
          schedule_name: scheduleName,
          schedule_description: scheduleDescription,
          date,
          start_time: startTime,
          end_time: endTime,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 200 || response.status === 201) {
        onScheduleCreated(); // Notify parent to refresh data
        onClose(); // Close the modal
      }
    } catch (error: any) {
      console.error("Error creating attendance schedule:", error);
      if (error.response && error.response.data) {
        setErrorMessage(
          error.response.data.detail || "Failed to create attendance schedule."
        );
      } else {
        setErrorMessage("An error occurred while creating the schedule.");
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96">
        <h2 className="text-xl font-bold mb-4">Create Attendance Schedule</h2>
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
          <Button
            className="bg-gray-500 text-white hover:bg-gray-700"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            className="bg-green-500 text-white hover:bg-green-700"
            onClick={handleSubmit}
          >
            Create
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateAttendanceScheduleModal;
