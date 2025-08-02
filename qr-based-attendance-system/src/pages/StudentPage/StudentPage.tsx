import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@radix-ui/react-avatar";
import { PanelRight, PanelLeft } from "lucide-react";
import Sidebar from "./StudentSidebar";
import { Outlet } from "react-router-dom";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

const StudentPage: React.FC = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    // Retrieve the initial state from sessionStorage or default to true
    const savedState = sessionStorage.getItem("isSidebarCollapsed");
    return savedState === "true"; // Convert string to boolean
  });

  const toggleSidebar = () => {
    const newState = !isSidebarCollapsed;
    setIsSidebarCollapsed(newState);
    sessionStorage.setItem("isSidebarCollapsed", String(newState)); // Save to sessionStorage
  };

  const [userInfo, setUserInfo] = useState<{
    username: string;
    role: string;
  } | null>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const token = localStorage.getItem("access_token");
        if (!token) {
          console.error("No token found");
          return;
        }

        // Fetch the user profile from the backend
        const response = await axios.get(`${API_URL}/profile/get-profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        // Update the userInfo state with the username and role
        const data = response.data;
        setUserInfo({
          username: data.username,
          role: data.role,
        });
      } catch (error) {
        console.error("Error fetching user profile:", error);
        setUserInfo(null); // Clear userInfo if fetching fails
      }
    };

    fetchUserProfile();
  }, []); // Empty dependency array ensures this runs only once

  return (
    <div className="flex flex-col h-screen">
      {/* Navigation Bar */}
      <div>
        <nav className="bg-[#060e57] text-white p-4 flex justify-between items-center shadow-md h-16">
          <div className="mr-4">
            <button onClick={toggleSidebar} className="mb-4">
              {isSidebarCollapsed ? (
                <PanelRight className="w-8 h-8" />
              ) : (
                <PanelLeft className="w-8 h-8" />
              )}
            </button>
          </div>

          <div className="ml-auto mr-4 text-xl font-bold">
            <h1>Welcome, {userInfo?.username || "Loading..."}!</h1>
          </div>
          <div>
            <Avatar className="rounded-full w-12 h-12">
              <AvatarImage
                src="/images/student.jpg"
                alt="Student"
                className="rounded-full w-12 h-12"
              />
              <AvatarFallback className="rounded-full w-12 h-12">
                CN
              </AvatarFallback>
            </Avatar>
          </div>
        </nav>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar isSidebarCollapsed={isSidebarCollapsed} />

        {/* Main Content */}
        <div
          className={`flex-1 p-4 transition-all duration-300 ${
            isSidebarCollapsed ? "ml-0" : "ml-64"
          } overflow-y-auto`}
        >
          <Outlet /> {/* Render nested routes here */}
        </div>
      </div>
    </div>
  );
};

export default StudentPage;
