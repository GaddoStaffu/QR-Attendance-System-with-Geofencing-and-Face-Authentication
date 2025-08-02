import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Eye, EyeOff } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL;

const ForgotPassword: React.FC = () => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStrength, setPasswordStrength] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();

  const handleSendCode = async () => {
    setErrorMessage("");
    setSuccessMessage("");
    setIsLoading(true);

    try {
      const response = await axios.post(`${API_URL}/profile/send-reset-code`, {
        email,
      });
      setSuccessMessage(response.data.message || "Verification code sent.");
      setStep(2);
    } catch (error: any) {
      if (error.response?.status === 422) {
        setStep(1);
        setEmail("");
        setVerificationCode("");
        setNewPassword("");
        setConfirmPassword("");
        setErrorMessage("Invalid email address. Please try again.");
      } else {
        setErrorMessage(
          error.response?.data?.detail || "Failed to send verification code."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    setErrorMessage("");
    setSuccessMessage("");
    setIsLoading(true);

    try {
      const response = await axios.post(
        `${API_URL}/profile/verify-reset-code`,
        {
          email,
          code: verificationCode,
        }
      );
      setSuccessMessage(response.data.message || "Code verified successfully.");
      setStep(3);
    } catch (error: any) {
      setErrorMessage(
        error.response?.data?.detail || "Invalid verification code."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setErrorMessage("");
    setSuccessMessage("");
    setIsLoading(true);

    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/profile/reset-password`, {
        email,
        newPassword,
        confirmPassword,
      });
      setSuccessMessage(
        response.data.message || "Password reset successfully."
      );
      setStep(1);
      setEmail("");
      setVerificationCode("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      setErrorMessage(
        error.response?.data?.detail || "Failed to reset password."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gray-100 p-4 relative bg-cover bg-center"
      style={{ backgroundImage: "url(/images/front-logo.jpg)" }}
    >
      <div className="border text-card-foreground w-full max-w-md shadow-lg rounded-2xl bg-white z-10 p-6">
        {/* School Logo */}
        <div className="flex justify-center mb-4">
          <img
            src="/images/ustp_logo.jpg"
            alt="School Logo"
            className="h-32 w-32 object-contain rounded-full"
          />
        </div>

        <h2 className="text-2xl font-bold text-center mb-6">Forgot Password</h2>

        {errorMessage && (
          <p className="text-red-500 text-sm mb-4 text-center">
            {errorMessage}
          </p>
        )}
        {successMessage && (
          <p className="text-green-500 text-sm mb-4 text-center">
            {successMessage}
          </p>
        )}

        {step === 1 && (
          <>
            <label className="block text-gray-600 text-sm mb-1">
              Registered Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              placeholder="Enter your registered email"
            />
            <button
              onClick={handleSendCode}
              disabled={isLoading}
              className={`w-full px-4 py-2 rounded-lg text-white ${
                isLoading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-500 hover:bg-blue-600"
              }`}
            >
              {isLoading ? "Sending..." : "Send Verification Code"}
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <label className="block text-gray-600 text-sm mb-1">
              Verification Code
            </label>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              placeholder="Enter the verification code"
            />
            <button
              onClick={handleVerifyCode}
              disabled={isLoading}
              className={`w-full px-4 py-2 rounded-lg text-white ${
                isLoading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-500 hover:bg-blue-600"
              }`}
            >
              {isLoading ? "Verifying..." : "Verify Code"}
            </button>
          </>
        )}

        {step === 3 && (
          <>
            <label className="block text-gray-600 text-sm mb-1">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                placeholder="Enter your new password"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-2 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <label className="block text-gray-600 text-sm mb-1">
              Confirm Password
            </label>
            <input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              placeholder="Confirm your new password"
            />
            <button
              onClick={handleResetPassword}
              disabled={isLoading}
              className={`w-full px-4 py-2 rounded-lg text-white ${
                isLoading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-green-500 hover:bg-green-600"
              }`}
            >
              {isLoading ? "Resetting..." : "Reset Password"}
            </button>
          </>
        )}

        <div className="mt-4">
          <button
            onClick={() => navigate("/login")}
            className="w-full px-4 py-2 rounded-lg bg-gray-300 text-gray-800 hover:bg-gray-400"
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
