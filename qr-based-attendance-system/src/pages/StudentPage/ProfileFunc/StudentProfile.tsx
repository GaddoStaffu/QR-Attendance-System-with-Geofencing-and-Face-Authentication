import React, { useEffect, useState } from "react";
import axios from "axios";
import StudentEditProfileModal from "./StudentEditProfileModal";
import StudentChangePassword from "./StudentChangePassword";
import StudentVerifyEmail from "./StudentVerifyEmail";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL;

const StudentProfile: React.FC = () => {
  const [profileData, setProfileData] = useState<{
    firstName: string;
    lastName: string;
    studentId: string;
    email: string;
    username: string;
    isVerified: boolean;
    isFaceRegistered: boolean;
  } | null>(null);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [showOverwriteDialog, setShowOverwriteDialog] =
    useState<boolean>(false); // State for overwrite confirmation
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("access_token");
        if (!token) {
          console.error("No token found");
          return;
        }

        // Fetch the user profile from the backend
        const profileResponse = await axios.get(
          `${API_URL}/profile/get-profile`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        // Fetch the face registration status
        const faceResponse = await axios.get(
          `${API_URL}/face-auth/is_face_registered`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            params: { token }, // Pass the token as a query parameter
          }
        );

        // Update the profileData state with the response
        const profileData = profileResponse.data;
        const isFaceRegistered = Boolean(faceResponse.data.is_registered); // Ensure it's a boolean

        setProfileData({
          firstName: profileData.firstName,
          lastName: profileData.lastName,
          studentId: profileData.id_number,
          email: profileData.email,
          username: profileData.username,
          isVerified: profileData.is_verified,
          isFaceRegistered, // Use the boolean from the face registration endpoint
        });
      } catch (error) {
        console.error(
          "Error fetching profile or face registration status:",
          error
        );
        setProfileData(null); // Clear profile data if fetching fails
      }
    };

    fetchProfile();
  }, []);

  const handleSaveChanges = (data: {
    firstName: string;
    lastName: string;
    username: string;
    id_number: string;
  }) => {
    setProfileData((prev) => ({
      ...prev!,
      firstName: data.firstName,
      lastName: data.lastName,
      username: data.username,
      studentId: data.id_number,
    }));
  };

  const handleRegisterFaceClick = () => {
    if (profileData?.isFaceRegistered) {
      // If face data is already registered, show overwrite confirmation dialog
      setShowOverwriteDialog(true);
    } else {
      // If no face data is registered, navigate directly to the registration page
      navigate("/student-dashboard/profile/register-face");
    }
  };

  const handleOverwriteConfirm = () => {
    setShowOverwriteDialog(false); // Close the dialog
    navigate("/student-dashboard/profile/register-face"); // Navigate to the registration page
  };

  const handleOverwriteCancel = () => {
    setShowOverwriteDialog(false); // Close the dialog
  };

  if (!profileData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <p className="text-gray-500 text-lg">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 p-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white">Student Profile</h1>
          <button
            className="bg-white text-blue-600 px-4 py-2 rounded-lg hover:bg-gray-100 transition font-semibold"
            onClick={() => setIsModalOpen(true)}
          >
            Edit Profile
          </button>
        </div>

        {/* Profile Details */}
        <div className="p-6 space-y-8">
          {/* Personal Information */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-gray-500 text-sm">First Name</p>
              <p className="text-lg font-semibold text-gray-800">
                {profileData.firstName}
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Last Name</p>
              <p className="text-lg font-semibold text-gray-800">
                {profileData.lastName}
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Student ID</p>
              <p className="text-lg font-semibold text-gray-800">
                {profileData.studentId}
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Username</p>
              <p className="text-lg font-semibold text-gray-800">
                {profileData.username}
              </p>
            </div>
          </div>

          {/* Email and Verification */}
          <div>
            <p className="text-gray-500 text-sm">Email</p>
            <p className="text-lg font-semibold text-gray-800">
              {profileData.email}
            </p>
            <p
              className={`text-sm mt-1 ${
                profileData.isVerified ? "text-green-500" : "text-red-500"
              }`}
            >
              {profileData.isVerified ? "Verified" : "Not Verified"}
            </p>
          </div>

          {/* Face Registration Status */}
          <div>
            <p className="text-gray-500 text-sm">Face Registration</p>
            <p
              className={`text-lg font-semibold ${
                profileData.isFaceRegistered ? "text-green-500" : "text-red-500"
              }`}
            >
              {profileData.isFaceRegistered
                ? "Face Data Registered"
                : "Face Data Not Registered"}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-gray-200 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Actions</h2>
          <StudentChangePassword />

          <button
            onClick={handleRegisterFaceClick}
            className={`px-4 py-2 rounded-lg transition text-white ${
              profileData.isVerified
                ? "bg-blue-500 hover:bg-blue-600"
                : "bg-gray-400 cursor-not-allowed"
            }`}
            disabled={!profileData.isVerified}
            title={
              profileData.isVerified
                ? "Register your face data"
                : "You must verify your email before registering face data"
            }
          >
            Register Face Data
          </button>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <StudentEditProfileModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialData={{
          firstName: profileData.firstName,
          lastName: profileData.lastName,
          id_number: profileData.studentId,
          username: profileData.username,
        }}
        onSave={handleSaveChanges}
      />

      {/* Overwrite Confirmation Dialog */}
      {showOverwriteDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
            <h2 className="text-xl font-bold text-center mb-4 text-gray-800">
              Overwrite Face Data
            </h2>
            <p className="text-center text-gray-600 mb-4">
              Face data is already registered. Do you want to overwrite the
              existing face data?
            </p>
            <div className="flex justify-center space-x-4">
              <button
                className="bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600 transition"
                onClick={handleOverwriteCancel}
              >
                Cancel
              </button>
              <button
                className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition"
                onClick={handleOverwriteConfirm}
              >
                Overwrite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentProfile;
