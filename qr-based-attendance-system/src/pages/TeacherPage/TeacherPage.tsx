import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import TeacherSidebar from "./TeacherSidebar";
import { PanelRight, PanelLeft } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@radix-ui/react-avatar";

const TeacherPage: React.FC = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    // Retrieve the initial state from localStorage or default to true
    const savedState = sessionStorage.getItem("isSidebarCollapsed");
    return savedState === "true"; // Convert string to boolean
  });

  const toggleSidebar = () => {
    const newState = !isSidebarCollapsed;
    setIsSidebarCollapsed(newState);
    sessionStorage.setItem("isSidebarCollapsed", String(newState)); // Save to localStorage
  };

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
            <h1>Welcome, Teacher!</h1>
          </div>
          <div>
            <Avatar className="rounded-full w-12 h-12">
              <AvatarImage
                src="/images/teacher.jpg"
                alt="Teacher"
                className="rounded-full w-12 h-12"
              />
              <AvatarFallback className="rounded-full w-12 h-12">
                T
              </AvatarFallback>
            </Avatar>
          </div>
        </nav>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <TeacherSidebar isSidebarCollapsed={isSidebarCollapsed} />

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

export default TeacherPage;
