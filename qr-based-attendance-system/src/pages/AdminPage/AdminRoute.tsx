import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AdminPage from "./AdminPage";
import AdminRoomManagement from "./RoomFunc/AdminRoomManagement";
import AdminUserManagement from "./UserManagementFunc/AdminUserManagement";
import AdminLog from "./LogFunc/AdminLog";
import AdminGeofencingManagement from "./GeofenceFunc/AdminGeofeonceManagement";
import AdminEditGeofenceLocation from "./GeofenceFunc/AdminEditGeofenceLocation";
import AdminAddUser from "./UserManagementFunc/AdminAddUser";

const AdminRoute: React.FC = () => {
  return (
    <Routes>
      {/* Main Admin Page */}
      <Route path="/" element={<AdminPage />}>
        {/* Redirect /admin-dashboard to /admin-dashboard/geofences */}
        <Route index element={<Navigate to="geofences" replace />} />

        {/* Nested Routes */}
        <Route path="rooms" element={<AdminRoomManagement />} />
        <Route path="users" element={<AdminUserManagement />} />
        <Route path="logs" element={<AdminLog />} />
        <Route path="geofences" element={<AdminGeofencingManagement />}>
          {/* Edit Geofence Popup */}
          <Route
            path="edit/:geofenceId"
            element={<AdminEditGeofenceLocation />}
          />
        </Route>
        <Route path="add-user" element={<AdminAddUser />} />
      </Route>
    </Routes>
  );
};

export default AdminRoute;
