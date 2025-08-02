import React from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

interface TeacherArchiveRoomButtonProps {
  roomId: any;
  token: string;
}

const API_URL = import.meta.env.VITE_API_URL;

const TeacherArchiveRoomButton: React.FC<TeacherArchiveRoomButtonProps> = ({
  roomId,
  token,
}) => {
  const navigate = useNavigate();

  const handleArchive = async () => {
    const confirmArchive = window.confirm(
      "Are you sure you want to archive this room? This action cannot be undone."
    );

    if (!confirmArchive) {
      return; // Exit if the user cancels the action
    }

    try {
      const response = await axios.put(
        `${API_URL}/rooms/${roomId}/archive`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log("Room archived successfully:", response.data);

      // Navigate to the teacher dashboard or another page after archiving
      navigate("/teacher-dashboard");
    } catch (error) {
      console.error("Error archiving room:", error);
      alert("Failed to archive the room. Please try again.");
    }
  };

  return (
    <button
      className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 w-full mt-3"
      onClick={handleArchive}
    >
      Archive Room
    </button>
  );
};

export default TeacherArchiveRoomButton;