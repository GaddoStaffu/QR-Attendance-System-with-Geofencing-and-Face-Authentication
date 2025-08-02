import React from "react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL;

const StudentJoinRoom: React.FC = () => {
  const navigate = useNavigate();
  const [roomcode, setRoomCode] = React.useState<string>("");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = React.useState<boolean>(true); // Modal state

  const handleClose = () => {
    setIsModalOpen(false); // Close the modal
    navigate("/student-dashboard/home"); // Navigate back to the home route
  };
  const handleJoinRoom = async () => {
  setIsLoading(true); // Set loading to true
  setErrorMessage(null); // Clear any previous error messages

  try {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setErrorMessage("You are not logged in. Please log in to join a room.");
      setIsLoading(false);
      return;
    }

    const userId = JSON.parse(atob(token.split(".")[1])).user_id; // Extract user_id from the JWT token

    const payload = {
      room_code: roomcode,
      user_id: userId,
      status: "pending",
    };

    const response = await fetch(`${API_URL}/rooms/join_room_by_code`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const data = await response.json();
      alert(data.message); // Show success message
      handleClose(); // Navigate back to the home route only on success
    } else {
      const errorData = await response.json();
      if (errorData.detail) {
        setErrorMessage(errorData.detail); // Display the error message from the backend
      } else {
        setErrorMessage("Failed to join the room.");
      }
    }
  } catch (error) {
    console.error("Error joining room:", error);
    setErrorMessage("An error occurred while trying to join the room.");
  } finally {
    setIsLoading(false); // Set loading to false after the request completes
  }
};

  return (
    <>
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg shadow-lg w-96 p-6">
            <h2 className="text-lg font-bold mb-4">Join a Room</h2>
            <p className="text-sm text-gray-500 mb-4">
              Please enter the Room code to join the room.
            </p>
            <div className="mb-4">
              <label
                htmlFor="room-id"
                className="block text-sm font-medium text-gray-700"
              >
                Room Code
              </label>
              <input
                type="text"
                id="room-id"
                name="room-id"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Enter Room code"
                value={roomcode}
                onChange={(e) => setRoomCode(e.target.value)}
              />
              {errorMessage && (
                <p className="text-red-500 text-sm mt-2">{errorMessage}</p>
              )}
            </div>
            <div className="flex justify-end space-x-2">
              <button
                className="bg-gray-200 text-black py-2 px-4 rounded"
                onClick={handleClose}
              >
                Cancel
              </button>
              <button
                className={`bg-blue-500 text-white py-2 px-4 rounded ${
                  isLoading ? "opacity-50 cursor-not-allowed" : ""
                }`}
                onClick={isLoading ? undefined : handleJoinRoom} // Disable button while loading
              >
                {isLoading ? "Joining..." : "Join"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default StudentJoinRoom;
