import React from "react";

interface RoomCardProps {
  className: string;
  section: string;
  description: string;
  geofencing: boolean;
  faceAuthentication: boolean;
  onClick: () => void; // Add onClick prop
}

const TeacherRoomCard: React.FC<RoomCardProps> = ({
  className,
  section,
  description,
  geofencing,
  faceAuthentication,
  onClick,
}) => {
  return (
    <div
      className="rounded-lg p-4 shadow-sm bg-white cursor-pointer hover:shadow-md transition-shadow hover:scale-105 transform transition-transform"
      onClick={onClick} // Make the card clickable
    >
      {/* Class Name */}
      <h3 className="text-lg font-semibold text-gray-800 mb-1">{className}</h3>

      {/* Section */}
      <p className="text-sm text-gray-600 mb-1">
        <strong>Section:</strong> {section}
      </p>

      {/* Description */}
      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
        <strong>Description:</strong> {description || "No Description"}
      </p>

      {/* Features */}
      <div className="flex items-center space-x-2">
        {geofencing && (
          <span className="bg-blue-100 text-blue-600 text-xs px-2 py-1 rounded-full">
            Geofencing
          </span>
        )}
        {faceAuthentication && (
          <span className="bg-purple-100 text-purple-600 text-xs px-2 py-1 rounded-full">
            Face Auth
          </span>
        )}
      </div>
    </div>
  );
};

export default TeacherRoomCard;
