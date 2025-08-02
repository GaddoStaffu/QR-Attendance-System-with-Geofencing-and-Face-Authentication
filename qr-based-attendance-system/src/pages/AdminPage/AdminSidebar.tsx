import React from "react";
import {
  Calendar,
  User,
  LogOut,
  DoorClosedIcon,
  FenceIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

interface SidebarProps {
  isSidebarCollapsed: boolean;
}

const AdminSidebar: React.FC<SidebarProps> = ({ isSidebarCollapsed }) => {
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL;

  const handleLogout = async () => {
    let response;
    try {
      const token = localStorage.getItem("access_token");
      response = await axios.post(
        `${API_URL}/auth/logout`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      localStorage.removeItem("access_token");
      alert(response?.data?.message || "Logged out successfully.");
      navigate("/login");
    }
  };

  return (
    <div
      className={`bg-[#364150] p-4 transition-transform duration-300 ${
        isSidebarCollapsed ? "-translate-x-full" : "translate-x-0"
      } fixed top-16 left-0 h-[calc(100vh-4rem)] w-64 z-10 shadow-lg overflow-y-auto`}
    >
      {!isSidebarCollapsed && (
        <ul className="space-y-4">
          <li className="border-b border-white">
            <a
              onClick={() => navigate("/admin-dashboard/users")}
              className="flex items-center gap-2 p-2 rounded hover:bg-gray-700 text-white cursor-pointer"
            >
              <User className="w-5 h-5 text-white" />
              User Management
            </a>
          </li>
          <li className="border-b border-white">
            <a
              onClick={() => navigate("/admin-dashboard/geofences")}
              className="flex items-center gap-2 p-2 rounded hover:bg-gray-700 text-white cursor-pointer"
            >
              <FenceIcon className="w-5 h-5 text-white" />
              Geofence
            </a>
          </li>
          <li className="border-b border-white">
            <a
              onClick={() => navigate("/admin-dashboard/rooms")}
              className="flex items-center gap-2 p-2 rounded hover:bg-gray-700 text-white cursor-pointer"
            >
              <DoorClosedIcon className="w-5 h-5 text-white" />
              Rooms
            </a>
          </li>
          <li className="border-b border-white">
            <a
              onClick={() => navigate("/admin-dashboard/logs")}
              className="flex items-center gap-2 p-2 rounded hover:bg-gray-700 text-white cursor-pointer"
            >
              <Calendar className="w-5 h-5 text-white" />
              Logs
            </a>
          </li>
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

export default AdminSidebar;
