import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import TeacherPage from "./TeacherPage";
import TeacherRoomManagement from "./RoomsFunc/TeacherRoomManagement";
import TeacherCreateRoom from "./RoomsFunc/TeacherCreateRoom";
import TeacherRoomDetails from "./RoomsFunc/TeacherRoomDetails";
import TeacherRoomSettingsPage from "./RoomsFunc/TeacherRoomSettingsPage"; // Updated import
import TeacherProfile from "./ProfileFunc/TeacherProfile";
import TeacherCalendar from "./CalendarFunc/TeacherCalendar";
import TeacherNotification from "./NotificationFunc/TeacherNotification";
import TeacherAttendanceDetails from "./RoomsFunc/TeacherAttendanceDetails";
import TeacherSettings from "./SettingsFunc/TeacherSettings";
import TeacherGenerateReport from "./RoomsFunc/TeacherGenerateReport";
import TeacherManageStudents from "./RoomsFunc/TeacherManageStudents";
import TeacherRoomsAttendanceSummary from "./RoomsFunc/TeacherRoomsAttendanceSummary";

const TeacherRoute: React.FC = () => {
  return (
    <Routes>
      {/* Main Teacher Page */}
      <Route path="/" element={<TeacherPage />}>
        {/* Redirect /teacher-dashboard to /teacher-dashboard/rooms */}
        <Route index element={<Navigate to="rooms" replace />} />

        {/* Room Management */}
        <Route path="rooms" element={<TeacherRoomManagement />} />
        <Route path="rooms/create" element={<TeacherCreateRoom />} />
        <Route path="rooms/:roomId" element={<TeacherRoomDetails />} />
        <Route
          path="rooms/:roomId/:scheduleId"
          element={<TeacherAttendanceDetails />}
        />

        {/* Room Settings Page */}
        <Route
          path="rooms/:roomId/settings"
          element={<TeacherRoomSettingsPage />}
        />

        {/* Generate Report Page (Now a sibling, not nested) */}
        <Route
          path="rooms/:roomId/settings/generate_report" // Full path from the parent layout
          element={<TeacherGenerateReport />}
        />
        <Route
          path="rooms/:roomId/settings/manage_students" // Full path from the parent layout
          element={<TeacherManageStudents />}
        />
        <Route
          path="rooms/:roomId/attendance_summary"
          element={<TeacherRoomsAttendanceSummary />}
        />

        {/* Other Features */}
        <Route path="profile" element={<TeacherProfile />} />
        <Route path="calendar" element={<TeacherCalendar />} />
        <Route path="settings" element={<TeacherSettings />} />
        <Route path="notifications" element={<TeacherNotification />} />
      </Route>
    </Routes>
  );
};

export default TeacherRoute;
