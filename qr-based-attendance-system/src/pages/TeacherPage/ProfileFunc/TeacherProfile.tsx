import React, { useEffect, useState } from "react";
import axios from "axios";
import TeacherEditProfileModal from "./TeacherEditProfileModal";
import TeacherVerifyEmail from "./TeacherVerifyEmail";
import TeacherChangePassword from "./TeacherChangePassword";

const API_URL = import.meta.env.VITE_API_URL;

const TeacherProfile: React.FC = () => {
  const [profileData, setProfileData] = useState<{
    firstName: string;
    lastName: string;
    teacherId: string;
    email: string;
    username: string;
    isVerified: boolean;
  } | null>(null);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("access_token");
        if (!token) {
          console.error("No token found");
          return;
        }

        // Fetch the user profile from the backend
        const response = await axios.get(`${API_URL}/profile/get-profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        // Update the profileData state with the response
        const data = response.data;
        setProfileData({
          firstName: data.firstName,
          lastName: data.lastName,
          teacherId: data.id_number,

          email: data.email,
          username: data.username,
          isVerified: data.is_verified,
        });
      } catch (error) {
        console.error("Error fetching profile:", error);
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
      teacherID: data.id_number,
    }));
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
      <div className="max-w-3xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 p-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white">Teacher Profile</h1>
          <button
            className="bg-white text-blue-600 px-4 py-2 rounded-lg hover:bg-gray-100 transition font-semibold"
            onClick={() => setIsModalOpen(true)}
          >
            Edit Profile
          </button>
        </div>

        {/* Profile Details */}
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-600 text-sm">First Name</p>
              <p className="text-lg font-semibold text-gray-800">
                {profileData.firstName}
              </p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Last Name</p>
              <p className="text-lg font-semibold text-gray-800">
                {profileData.lastName}
              </p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Teacher ID</p>
              <p className="text-lg font-semibold text-gray-800">
                {profileData.teacherId}
              </p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Username</p>
              <p className="text-lg font-semibold text-gray-800">
                {profileData.username}
              </p>
            </div>
          </div>
          <div>
            <p className="text-gray-600 text-sm">Email</p>
            <p className="text-lg font-semibold text-gray-800">
              {profileData.email}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-gray-200 space-y-4">
          <TeacherChangePassword />
        </div>
      </div>

      {/* Edit Profile Modal */}
      <TeacherEditProfileModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialData={{
          firstName: profileData.firstName,
          lastName: profileData.lastName,
          id_number: profileData.teacherId,
          username: profileData.username,
        }}
        onSave={handleSaveChanges}
      />
    </div>
  );
};

export default TeacherProfile;
