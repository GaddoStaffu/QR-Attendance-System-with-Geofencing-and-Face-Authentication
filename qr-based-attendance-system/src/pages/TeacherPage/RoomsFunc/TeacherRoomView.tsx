import React, { useState } from "react";
import { Button } from "@/components/ui/button";

interface RoomViewProps {
  room: any;
  onClose: () => void;
  onDelete: (roomId: string) => void;
}

const TeacherRoomView: React.FC<RoomViewProps> = ({
  room,
  onClose,
  onDelete,
}) => {
  const [showDelete, setShowDelete] = useState(false);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md relative">
        <button
          className="absolute top-2 right-2 text-gray-600"
          onClick={onClose}
        >
          &times;
        </button>
        <h2 className="text-2xl font-bold mb-4">Room Details</h2>
        <p className="mb-4">Room Name: {room.roomName}</p>
        <p className="mb-4">Room ID: {room.roomId}</p>
        <p className="mb-4">Owner: {room.owner}</p>
        <p className="mb-4">Description: {room.description}</p>
        <h3 className="text-xl font-semibold mb-2">Students:</h3>
        <ul className="list-disc pl-5 mb-4">
          {room.students.map((student: string, index: number) => (
            <li key={index}>{student}</li>
          ))}
        </ul>
        <Button
          className="bg-gray-500 text-white"
          onClick={() => setShowDelete(!showDelete)}
        >
          :
        </Button>
        {showDelete && (
          <Button
            className="bg-red-500 text-white mt-2"
            onClick={() => onDelete(room.roomId)}
          >
            Delete Room
          </Button>
        )}
      </div>
    </div>
  );
};

export default TeacherRoomView;
