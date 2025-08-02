import React from "react";
import {
  Calendar,
  Bell,
  User,
  LogOut,
  DoorClosedIcon,
  HomeIcon,
} from "lucide-react"; // Importing Lucide icons
import { useNavigate } from "react-router-dom";

interface SidebarProps {
  isSidebarCollapsed: boolean;
}

const StudentSidebar: React.FC<SidebarProps> = ({ isSidebarCollapsed }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Clear the token from localStorage
    localStorage.removeItem("access_token");

    // Redirect to the login page
    navigate("/login");
  };

  return (
    <div
      className={`bg-[#364150] p-4 transition-transform duration-300 ${
        isSidebarCollapsed ? "-translate-x-full" : "translate-x-0"
      } fixed top-16 left-0 h-[calc(100vh-4rem)] w-64 z-10 shadow-lg overflow-y-auto`}
    >
      {!isSidebarCollapsed && (
        <ul className="space-y-4">
          {/* Rooms */}
          <li className="border-b border-white">
            <a
              onClick={() => navigate("/student-dashboard/home")}
              className="flex items-center gap-2 p-2 rounded hover:bg-gray-700 text-white cursor-pointer"
            >
              <HomeIcon className="w-5 h-5 text-white" />
              Home
            </a>
          </li>
          <li className="border-b border-white">
            <a
              onClick={() => navigate("/student-dashboard/rooms")}
              className="flex items-center gap-2 p-2 rounded hover:bg-gray-700 text-white cursor-pointer"
            >
              <DoorClosedIcon className="w-5 h-5 text-white" />
              Rooms
            </a>
          </li>

          {/* Notifications */}
          <li className="border-b border-white">
            <a
              onClick={() => navigate("/student-dashboard/notifications")}
              className="flex items-center gap-2 p-2 rounded hover:bg-gray-700 text-white cursor-pointer"
            >
              <Bell className="w-5 h-5 text-white" />
              Notifications
            </a>
          </li>

          {/* Calendar */}
          <li className="border-b border-white">
            <a
              onClick={() => navigate("/student-dashboard/calendar")}
              className="flex items-center gap-2 p-2 rounded hover:bg-gray-700 text-white cursor-pointer"
            >
              <Calendar className="w-5 h-5 text-white" />
              Calendar
            </a>
          </li>

          {/* Profile */}
          <li className="border-b border-white">
            <a
              onClick={() => navigate("/student-dashboard/profile")}
              className="flex items-center gap-2 p-2 rounded hover:bg-gray-700 text-white cursor-pointer"
            >
              <User className="w-5 h-5 text-white" />
              Profile
            </a>
          </li>

          {/* Logout */}
          <li className="border-b border-white">
            <a
              onClick={handleLogout}
              className="flex items-center gap-2 p-2 rounded hover:bg-gray-700 text-white cursor-pointer"
            >
              <LogOut className="w-5 h-5 text-white" />
              Log Out
            </a>
          </li>
        </ul>
      )}
    </div>
  );
};

export default StudentSidebar;
