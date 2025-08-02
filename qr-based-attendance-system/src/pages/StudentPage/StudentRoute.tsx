import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import StudentPage from "./StudentPage";
import StudentHome from "./HomeFunc/StudentHome";
import StudentSettings from "./SettingsFunc/StudentSettings";
import StudentProfile from "./ProfileFunc/StudentProfile";
import StudentNotification from "./NotificationFunc/StudentNotification";
import StudentCalendar from "./CalendarFunc/StudentCalendar";
import StudentJoinRoom from "./HomeFunc/StudentJoinRoom";
import StudentScanQR from "./HomeFunc/StudentScanQR";
import StudentRoomManagement from "./RoomsFunc/StudentRoomManagement";
import StudentRoomDetails from "./RoomsFunc/StudentRoomDetails"; // Correct import
import StudentRegisterFace from "./ProfileFunc/StudentRegisterFace";

const StudentRoute: React.FC = () => {
  return (
    <Routes>
      {/* Main Student Page */}
      <Route path="/" element={<StudentPage />}>
        {/* Redirect /student-dashboard to /student-dashboard/home */}
        <Route index element={<Navigate to="home" replace />} />
        {/* Nested Routes */}
        <Route path="home" element={<StudentHome />}>
          {/* Nested route for Join Room Modal */}
          <Route path="join-room" element={<StudentJoinRoom />} />
          <Route path="scan-qr" element={<StudentScanQR />} />
        </Route>
        <Route path="rooms" element={<StudentRoomManagement />} />
        <Route path="rooms/:roomId" element={<StudentRoomDetails />} />{" "}
        {/* Fixed */}
        <Route path="settings" element={<StudentSettings />} />
        <Route path="profile" element={<StudentProfile />} />
        <Route path="profile/register-face" element={<StudentRegisterFace />} />
        <Route path="notifications" element={<StudentNotification />} />
        <Route path="calendar" element={<StudentCalendar />} />
      </Route>
    </Routes>
  );
};

export default StudentRoute;
