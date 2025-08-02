import React, { useState } from "react";
import axios from "axios";
import { Eye, EyeOff } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL;

const StudentChangePassword: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordStrength, setPasswordStrength] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [passwordsMatch, setPasswordsMatch] = useState(true);
  const [showNewPassword, setShowNewPassword] = useState(false); // Single toggle for new and confirm password

  const evaluatePasswordStrength = (password: string) => {
    if (
      password.length > 8 &&
      /[A-Z]/.test(password) &&
      /\d/.test(password) &&
      /[!@#$%^&*]/.test(password)
    ) {
      return "Strong";
    } else if (password.length >= 6) {
      return "Moderate";
    } else {
      return "Weak";
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Check password strength for the new password
    if (name === "newPassword") {
      setPasswordStrength(evaluatePasswordStrength(value));
    }

    // Check if new password and confirm password match
    if (name === "newPassword" || name === "confirmPassword") {
      setPasswordsMatch(
        name === "newPassword"
          ? value === formData.confirmPassword
          : value === formData.newPassword
      );
    }
  };

  const handleSubmit = async () => {
    setErrorMessage(""); // Clear previous error messages

    if (!passwordsMatch) {
      setErrorMessage("New password and confirm password do not match.");
      return;
    }

    try {
      const token = localStorage.getItem("access_token");
      const response = await axios.post(
        `${API_URL}/profile/change-password`,
        {
          oldPassword: formData.oldPassword,
          newPassword: formData.newPassword,
          confirmPassword: formData.confirmPassword,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      alert(response.data.message || "Password changed successfully.");
      setIsModalOpen(false);
      setFormData({ oldPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordStrength("");
      setErrorMessage("");
    } catch (error: any) {
      console.error("Error changing password:", error);
      setErrorMessage(
        error.response?.data?.detail || "Failed to change password."
      );
    }
  };

  return (
    <div>
      {/* Change Password Button */}
      <button
        className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
        onClick={() => setIsModalOpen(true)}
      >
        Change Password
      </button>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Change Password
            </h2>

            {/* Old Password */}
            <div className="mb-4 relative">
              <label className="block text-gray-600 text-sm mb-1">
                Old Password
              </label>
              <input
                type="password"
                name="oldPassword"
                value={formData.oldPassword}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* New Password */}
            <div className="mb-4 relative">
              <label className="block text-gray-600 text-sm mb-1">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-2 flex items-center"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <p
                className={`mt-1 text-sm ${
                  passwordStrength === "Strong"
                    ? "text-green-500"
                    : passwordStrength === "Moderate"
                    ? "text-yellow-500"
                    : "text-red-500"
                }`}
              >
                {passwordStrength && `Password Strength: ${passwordStrength}`}
              </p>
            </div>

            {/* Confirm Password */}
            <div className="mb-4 relative">
              <label className="block text-gray-600 text-sm mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={`w-full p-2 border ${
                    passwordsMatch ? "border-gray-300" : "border-red-500"
                  } rounded-lg focus:outline-none focus:ring-2 ${
                    passwordsMatch
                      ? "focus:ring-blue-500"
                      : "focus:ring-red-500"
                  }`}
                />
              </div>
              {!passwordsMatch && (
                <p className="text-red-500 text-sm mt-1">
                  Passwords do not match.
                </p>
              )}
            </div>

            {/* Error Message */}
            {errorMessage && (
              <p className="text-red-500 text-sm mb-4">{errorMessage}</p>
            )}

            {/* Buttons */}
            <div className="flex justify-end space-x-4">
              <button
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                onClick={handleSubmit}
              >
                Change Password
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentChangePassword;
