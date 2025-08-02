import React, { useState } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

const StudentVerifyEmail: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendCode = async () => {
    setIsLoading(true);
    setMessage(null);
    setError(null);

    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        setError("No token found. Please log in again.");
        setIsLoading(false);
        return;
      }

      const response = await axios.post(
        `${API_URL}/profile/send-verification-code`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      setMessage(
        response.data.message || "Verification code sent to your email."
      );
      setIsCodeSent(true);
    } catch (err: any) {
      console.error("Error sending verification code:", err);
      setError(
        err.response?.data?.detail || "Failed to send verification code."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    setIsLoading(true);
    setMessage(null);
    setError(null);

    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        setError("No token found. Please log in again.");
        setIsLoading(false);
        return;
      }

      const response = await axios.post(
        `${API_URL}/profile/verify-email-code`,
        { code: verificationCode }, // Send the code in the request body
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      setMessage(response.data.message || "Email verified successfully.");
      setIsCodeSent(false);
      setVerificationCode("");
    } catch (err: any) {
      console.error("Error verifying code:", err);
      setError(err.response?.data?.detail || "Failed to verify email.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {/* Trigger Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
      >
        Verify Email
      </button>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md relative">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Verify Your Email
            </h2>
            {!isCodeSent ? (
              <>
                <p className="text-gray-600 mb-4">
                  Click the button below to send a verification code to your
                  registered email address.
                </p>
                {message && <p className="text-green-500 mb-4">{message}</p>}
                {error && <p className="text-red-500 mb-4">{error}</p>}
                <button
                  onClick={handleSendCode}
                  disabled={isLoading}
                  className={`px-4 py-2 rounded-lg text-white ${
                    isLoading
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-blue-500 hover:bg-blue-600"
                  }`}
                >
                  {isLoading ? "Sending..." : "Send Verification Code"}
                </button>
              </>
            ) : (
              <>
                <p className="text-gray-600 mb-4">
                  Enter the verification code sent to your email to verify your
                  account.
                </p>
                {message && <p className="text-green-500 mb-4">{message}</p>}
                {error && <p className="text-red-500 mb-4">{error}</p>}
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                  placeholder="Enter verification code"
                />
                <div className="flex space-x-4">
                  <button
                    onClick={handleVerifyCode}
                    disabled={isLoading}
                    className={`px-4 py-2 rounded-lg text-white ${
                      isLoading
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-green-500 hover:bg-green-600"
                    }`}
                  >
                    {isLoading ? "Verifying..." : "Verify Code"}
                  </button>
                </div>
              </>
            )}
            {/* Cancel Button */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-gray-300 text-gray-800 hover:bg-gray-400"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentVerifyEmail;
