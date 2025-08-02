import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";


interface Student {
  user_id: number;
  first_name: string;
  last_name: string;
  id_number: string;
  joined_at: string;
}

const API_URL = import.meta.env.VITE_API_URL;

const TeacherManageStudents: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>(); // Extract roomId from the URL
  const navigate = useNavigate(); // For navigation
  const [acceptedStudents, setAcceptedStudents] = useState<Student[]>([]);
  const [rejectedStudents, setRejectedStudents] = useState<Student[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);

        // Fetch accepted students
        const acceptedResponse = await axios.get(
          `${API_URL}/rooms/${roomId}/accepted_students`
        );
        setAcceptedStudents(acceptedResponse.data);

        // Fetch rejected students
        const rejectedResponse = await axios.get(
          `${API_URL}/rooms/${roomId}/rejected_join_request`
        );
        setRejectedStudents(rejectedResponse.data);
      } catch (err: any) {
        console.error("Error fetching students:", err);
        setError(err.response?.data?.detail || "Failed to fetch students.");
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [roomId]);


const handleAcceptStudent = (userId: number) => {
  const token = localStorage.getItem("access_token"); // Retrieve the token from localStorage
  if (!token) {
    alert("You are not logged in. Please log in to accept students.");
    return;
  }

  axios
    .put(
      `${API_URL}/rooms/${roomId}/accept_rejected_join_request?user_id=${userId}&token=${token}`
    )
    .then((response) => {
      console.log("Student accepted successfully:", response.data);

      // Update the state to reflect the change
      setRejectedStudents((prev) =>
        prev.filter((student) => student.user_id !== userId)
      );
      setAcceptedStudents((prev) => [
        ...prev,
        rejectedStudents.find((student) => student.user_id === userId)!,
      ]);
    })
    .catch((error) => {
      console.error("Error accepting student:", error);
      alert("Failed to accept the student. Please try again.");
    });
};

  const handleKickStudent = (userId: number) => {
  const token = localStorage.getItem("access_token"); // Retrieve the token from localStorage
  if (!token) {
    alert("You are not logged in. Please log in to manage students.");
    return;
  }

  axios
    .put(
      `${API_URL}/rooms/${roomId}/kick_student?user_id=${userId}&token=${token}`
    )
    .then((response) => {
      console.log("Student kicked successfully:", response.data);

      // Update the state to reflect the change
      setAcceptedStudents((prev) =>
        prev.filter((student) => student.user_id !== userId)
      );
      setRejectedStudents((prev) => [
        ...prev,
        acceptedStudents.find((student) => student.user_id === userId)!,
      ]);
    })
    .catch((error) => {
      console.error("Error kicking student:", error);
      alert("Failed to kick the student. Please try again.");
    });
};

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500 text-lg">Loading students...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-500 text-lg">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-100 min-h-screen">
      {/* Back Button */}
      <div className="mb-4 flex justify-end">
        <button
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          onClick={() => navigate(-1)} // Navigate back to the previous page
        >
          Back
        </button>
      </div>

      <h2 className="text-lg font-semibold text-gray-800 mb-4">
        Manage Students
      </h2>

      {/* Accepted Students Table */}
      <h3 className="text-md font-semibold text-gray-700 mb-2">
        Accepted Students
      </h3>
      {acceptedStudents.length === 0 ? (
        <p className="text-gray-600">No accepted students found.</p>
      ) : (
        <table className="w-full border-collapse border border-gray-300 mb-6">
          <thead>
            <tr className="bg-gray-200">
              <th className="border border-gray-300 px-4 py-2">ID Number</th>
              <th className="border border-gray-300 px-4 py-2">First Name</th>
              <th className="border border-gray-300 px-4 py-2">Last Name</th>
              <th className="border border-gray-300 px-4 py-2">Joined At</th>
              <th className="border border-gray-300 px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {acceptedStudents.map((student) => (
              <tr key={student.user_id} className="hover:bg-gray-100">
                <td className="border border-gray-300 px-4 py-2">
                  {student.id_number}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {student.first_name}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {student.last_name}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {new Date(student.joined_at).toLocaleString()}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  <button
                    className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                    onClick={() => handleKickStudent(student.user_id)}
                  >
                    Kick
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Rejected Students Table */}
      <h3 className="text-md font-semibold text-gray-700 mb-2">
        Rejected Students
      </h3>
      {rejectedStudents.length === 0 ? (
        <p className="text-gray-600">No rejected students found.</p>
      ) : (
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-200">
              <th className="border border-gray-300 px-4 py-2">ID Number</th>
              <th className="border border-gray-300 px-4 py-2">First Name</th>
              <th className="border border-gray-300 px-4 py-2">Last Name</th>
              <th className="border border-gray-300 px-4 py-2">Requested At</th>
              <th className="border border-gray-300 px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rejectedStudents.map((student) => (
              <tr key={student.user_id} className="hover:bg-gray-100">
                <td className="border border-gray-300 px-4 py-2">
                  {student.id_number}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {student.first_name}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {student.last_name}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {new Date(student.joined_at).toLocaleString()}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  <button
                    className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                    onClick={() => handleAcceptStudent(student.user_id)}
                  >
                    Accept
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default TeacherManageStudents;
