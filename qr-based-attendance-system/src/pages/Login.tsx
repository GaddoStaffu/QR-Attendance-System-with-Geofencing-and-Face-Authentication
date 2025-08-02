import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import "../App.css";

const API_URL = import.meta.env.VITE_API_URL;

const Login: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [mfaModalOpen, setMfaModalOpen] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [pendingUsername, setPendingUsername] = useState("");
  const [mfaError, setMfaError] = useState("");

  // In Login.tsx
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMfaError("");
    try {
      await axios.post(`${API_URL}/auth/login/request`, {
        username: formData.username,
        password: formData.password,
      });
      setPendingUsername(formData.username);
      setMfaModalOpen(true);
    } catch (error: any) {
      if (
        error.response &&
        error.response.data &&
        error.response.data.detail === "Email not verified"
      ) {
        // Redirect to verify email page, or open a modal
        navigate("/verify-email", { state: { email: formData.username } });
        return;
      }
      if (error.response && error.response.data) {
        setError(
          error.response.data.detail || "Login failed. Please try again."
        );
      } else {
        setError(
          "An error occurred. Please check your connection and try again."
        );
      }
    }
  };

  const handleVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setMfaError("");
    try {
      const response = await axios.post(`${API_URL}/auth/login/verify`, {
        username: pendingUsername,
        code: mfaCode,
      });
      const data = response.data;
      localStorage.setItem("access_token", data.access_token);
      const payload = JSON.parse(atob(data.access_token.split(".")[1]));
      const role = payload.role;
      if (role === "student") navigate("/student-dashboard");
      else if (role === "teacher") navigate("/teacher-dashboard");
      else if (role === "admin") navigate("/admin-dashboard");
    } catch (error: any) {
      if (error.response && error.response.data) {
        setMfaError(
          error.response.data.detail || "Invalid code. Please try again."
        );
      } else {
        setMfaError("An error occurred. Please try again.");
      }
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gray-100 p-4 relative bg-cover bg-center"
      style={{ backgroundImage: "url(/images/front-logo.jpg)" }}
    >
      <Card className="w-full max-w-md shadow-lg rounded-2xl bg-white z-10">
        <CardContent className="p-6">
          {/* School Logo */}
          <div className="flex justify-center mb-4">
            <img
              src="/images/ustp_logo.jpg"
              alt="School Logo"
              className="h-32 w-32 object-contain rounded-full"
            />
          </div>

          <h2 className="text-2xl font-bold text-center mb-6">
            Login to Your Account
          </h2>

          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <Label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700"
              >
                Username
              </Label>
              <Input
                type="text"
                id="username"
                placeholder="Enter your username"
                className="input-field"
                required
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
              />
            </div>

            <div>
              <Label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Password
              </Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  placeholder="Enter your password"
                  className="input-field"
                  required
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-2 flex items-center text-gray-500"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-4">
              <Link
                to="/forget-password"
                className="text-blue-500 hover:underline ml-1"
              >
                Forget Password?
              </Link>
            </p>
            <Button
              type="submit"
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 rounded-md"
            >
              Login
            </Button>
          </form>

          {error && (
            <p className="text-sm text-center text-red-500 mt-4">{error}</p>
          )}

          <p className="text-sm text-center text-gray-600 mt-4">
            Don't have an account?{" "}
            <Link to="/register" className="text-blue-500 hover:underline ml-1">
              Sign Up
            </Link>
          </p>
        </CardContent>
      </Card>

      {/* MFA Modal */}
      {mfaModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-sm">
            <h3 className="text-xl font-semibold mb-4 text-center">
              Multi-Factor Authentication
            </h3>
            <form onSubmit={handleVerifyMfa} className="space-y-4">
              <Input
                type="text"
                placeholder="Enter verification code"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                required
                maxLength={6}
                className="text-center tracking-widest text-lg"
              />
              <Button
                type="submit"
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 rounded-md"
              >
                Verify Code
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full mt-2"
                onClick={() => setMfaModalOpen(false)}
              >
                Cancel
              </Button>
              {mfaError && (
                <p className="text-sm text-center text-red-500 mt-2">
                  {mfaError}
                </p>
              )}
            </form>
            <p className="text-xs text-gray-500 mt-4 text-center">
              A verification code has been sent to your email.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
