import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import axios from "axios";
import CreateAttendanceScheduleModal from "./TeacherCreateAttendanceScheduleModal";
import TeacherAttendanceSchedules from "./TeacherAttendanceSchedules";
import TeacherQRCodePreview from "./TeacherQRCodePreview";
import TeacherStudentList from "./TeacherStudentList";

const TeacherRoomDetails: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [roomData, setRoomData] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isScheduleModalOpen, setIsScheduleModalOpen] =
    useState<boolean>(false);
  const [scheduleUpdated, setScheduleUpdated] = useState<boolean>(false); // State to track updates

  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const fetchRoomDetails = async () => {
      try {
        const token = localStorage.getItem("access_token");
        if (!token) {
          setErrorMessage("You are not logged in.");
          setIsLoading(false);
          return;
        }

        const response = await axios.get(`${API_URL}/rooms/get_room_details`, {
          params: { room_id: roomId },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setRoomData(response.data);
        setErrorMessage(null); // Clear any previous error messages
      } catch (error: any) {
        setErrorMessage(
          error.response?.data?.detail || "Failed to fetch room details."
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoomDetails();
  }, [roomId]);

  if (isLoading) {
    return <p>Loading room details...</p>;
  }

  if (errorMessage) {
    return (
      <div className="p-4">
        <p className="text-red-500 text-sm mb-4">{errorMessage}</p>
        <Button
          className="bg-blue-500 text-white hover:bg-blue-700"
          onClick={() => navigate("/teacher-dashboard/rooms")}
        >
          Back to Room List
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-100 min-h-screen overflow-y-auto">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6">
        <Button
          className="bg-blue-500 text-white hover:bg-blue-700"
          onClick={() => navigate("/teacher-dashboard/rooms")}
        >
          Back to Room List
        </Button>
        <Button
          className="bg-gray-500 text-white hover:bg-gray-700"
          onClick={() =>
            navigate(`/teacher-dashboard/rooms/${roomId}/settings`)
          }
        >
          Room Settings
        </Button>
      </div>

      {/* Main Content Section */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left Column (1/3 width) */}
        <div className="col-span-1 space-y-6">
          {/* Room Details */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-bold mb-4">
              <strong>Class Name:</strong> {roomData.class_name}
            </h3>
            <TeacherQRCodePreview />
            <p className="text-gray-700">
              <strong>Room Join Code:</strong> {roomData.room_code}
            </p>
            <p className="text-gray-700">
              <strong>Section:</strong> {roomData.section}
            </p>
            <p className="text-gray-700">
              <strong>Description:</strong>{" "}
              {roomData.description || "No Description"}
            </p>
            <button
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700 w-full"
              onClick={() =>
                navigate(
                  `/teacher-dashboard/rooms/${roomId}/attendance_summary`
                )
              }
            >
              Attendance Summary
            </button>
          </div>

          {/* Students List */}
          <TeacherStudentList roomId={roomId || ""} />
        </div>

        {/* Right Column (2/3 width) */}
        <div className="col-span-2 bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold mb-4">Attendance Schedules</h3>
            <Button
              className="bg-green-500 text-white hover:bg-green-700"
              onClick={() => setIsScheduleModalOpen(true)}
            >
              Create Attendance Schedule
            </Button>
          </div>

          {/* Attendance Schedules Section */}
          <TeacherAttendanceSchedules
            roomId={roomId || ""}
            scheduleUpdated={scheduleUpdated} // Pass the state to the child
          />
        </div>
      </div>

      {/* Create Attendance Schedule Modal */}
      {isScheduleModalOpen && (
        <CreateAttendanceScheduleModal
          roomId={roomId || ""}
          onClose={() => setIsScheduleModalOpen(false)}
          onScheduleCreated={() => {
            setScheduleUpdated((prev) => !prev); // Toggle the state to trigger re-fetch
            setIsScheduleModalOpen(false); // Close the modal
          }}
        />
      )}
    </div>
  );
};

export default TeacherRoomDetails;
