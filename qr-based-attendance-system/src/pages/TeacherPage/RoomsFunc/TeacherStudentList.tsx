import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import axios from "axios";
import DataTable, { TableColumn } from "react-data-table-component";

interface TeacherStudentListProps {
  roomId: string; // Room ID passed as a prop
}

interface Student {
  user_id: string;
  first_name: string;
  last_name: string;
  id_number: string;
}

interface JoinRequest extends Student {}

const TeacherStudentList: React.FC<TeacherStudentListProps> = ({ roomId }) => {
  const API_URL = import.meta.env.VITE_API_URL;
  const [students, setStudents] = useState<Student[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchStudentsAndRequests = async () => {
      try {
        const token = localStorage.getItem("access_token");
        if (!token) {
          setErrorMessage("You are not logged in.");
          setIsLoading(false);
          return;
        }

        // Fetch accepted students
        const studentsResponse = await axios.get(
          `${API_URL}/rooms/${roomId}/accepted_students`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        // Fetch join requests
        const joinRequestsResponse = await axios.get(
          `${API_URL}/rooms/${roomId}/join_requests`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setStudents(studentsResponse.data);
        setJoinRequests(joinRequestsResponse.data);
        setErrorMessage(null); // Clear any previous error messages
      } catch (error: any) {
        setErrorMessage("Failed to fetch students or join requests.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudentsAndRequests();
  }, [roomId]);

  const handleJoinRequest = async (
    userId: string,
    status: "accepted" | "rejected"
  ) => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        setErrorMessage("You are not logged in.");
        return;
      }

      await axios.post(
        `${API_URL}/rooms/${roomId}/join_requests/${userId}`,
        { status },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (status === "accepted") {
        // Move the accepted request to the students list
        const acceptedUser = joinRequests.find(
          (request) => request.user_id === userId
        );
        if (acceptedUser) {
          setStudents((prev) => [...prev, acceptedUser]);
        }
      }

      // Remove the processed request from the joinRequests list
      setJoinRequests((prev) =>
        prev.filter((request) => request.user_id !== userId)
      );
    } catch (error: any) {
      setErrorMessage(`Failed to ${status} join request.`);
    }
  };

  // Define columns for join requests
  const joinRequestColumns: TableColumn<JoinRequest>[] = [
    {
      name: "Name",
      cell: (row) => `${row.last_name}, ${row.first_name}`,
      sortable: true,
    },
    {
      name: "Student ID",
      selector: (row) => row.id_number,
      sortable: true,
    },
    {
      name: "Actions",
      cell: (row) => (
        <div className="flex space-x-2">
          <Button
            className="bg-green-500 text-white hover:bg-green-700 px-4 py-1 rounded"
            onClick={() => handleJoinRequest(row.user_id, "accepted")}
          >
            Accept
          </Button>
          <Button
            className="bg-red-500 text-white hover:bg-red-700 px-4 py-1 rounded"
            onClick={() => handleJoinRequest(row.user_id, "rejected")}
          >
            Reject
          </Button>
        </div>
      ),
    },
  ];

  // Define columns for accepted students
  const studentColumns: TableColumn<Student>[] = [
    {
      name: "Name",
      cell: (row) => `${row.last_name}, ${row.first_name}`,
      sortable: true,
    },
    {
      name: "Student ID",
      selector: (row) => row.id_number,
      sortable: true,
    },
  ];

  if (isLoading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-md">
        <p className="text-gray-500">Loading students and join requests...</p>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-md">
        <p className="text-red-500">{errorMessage}</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h3 className="text-xl font-bold mb-4">Student List</h3>

      {/* Join Requests Section */}
      {joinRequests.length > 0 && (
        <div className="mb-6">
          <h4 className="text-lg font-semibold mb-2">Join Requests</h4>
          <DataTable
            columns={joinRequestColumns}
            data={joinRequests}
            pagination
            highlightOnHover
            striped
            responsive
            className="bg-white shadow rounded-lg"
          />
        </div>
      )}

      {/* Accepted Students Section */}
      <div>
        <h4 className="text-lg font-semibold mb-2">Accepted Students</h4>
        {students.length === 0 ? (
          <p className="text-gray-500">No accepted students in this room.</p>
        ) : (
          <DataTable
            columns={studentColumns}
            data={students}
            pagination
            highlightOnHover
            striped
            responsive
            className="bg-white shadow rounded-lg"
          />
        )}
      </div>
    </div>
  );
};

export default TeacherStudentList;