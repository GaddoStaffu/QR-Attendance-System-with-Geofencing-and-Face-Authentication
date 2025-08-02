import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import TeacherRoute from "./pages/TeacherPage/TeacherRoute";
import ProtectedRoute from "./components/ProtectedRoute";
import StudentRoute from "./pages/StudentPage/StudentRoute";
import AdminRoute from "./pages/AdminPage/AdminRoute";
import ForgetPassword from "./pages/ForgetPassword";

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forget-password" element={<ForgetPassword />} />

        {/* Protected Routes */}
        <Route
          path="/student-dashboard/*"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <StudentRoute />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher-dashboard/*"
          element={
            <ProtectedRoute allowedRoles={["teacher"]}>
              <TeacherRoute />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-dashboard/*"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminRoute />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
};

export default App;
