import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import DataTable from "react-data-table-component";
import TeacherMarkExcuse from "./TeacherMarkExcuse";
import TeacherViewExcuseReasonModal from "./TeacherViewExcuseReason";

interface StudentAttendance {
  student_id: number;
  student_name: string;
  attendance_status: string;
  taken_at: string | null;
}

const API_URL = import.meta.env.VITE_API_URL;

const TeacherAttendanceDetails: React.FC = () => {
  const { roomId, scheduleId } = useParams<{
    roomId: string;
    scheduleId: string;
  }>();
  const navigate = useNavigate();
  const [students, setStudents] = useState<StudentAttendance[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [scheduleDetails, setScheduleDetails] = useState<{
    date: string | null;
    start_time: string | null;
    end_time: string | null;
  }>({ date: null, start_time: null, end_time: null });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modal state
  const [excuseModalOpen, setExcuseModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(
    null
  );

  // View Reason Modal state
  const [viewReasonModalOpen, setViewReasonModalOpen] = useState(false);
  const [viewReason, setViewReason] = useState<string | null>(null);
  const [viewReasonStudent, setViewReasonStudent] = useState<string>("");
  const [viewAttachment, setViewAttachment] = useState<string | null>(null);

  useEffect(() => {
    const fetchAttendanceRecords = async () => {
      try {
        const token = localStorage.getItem("access_token");
        if (!token) {
          setErrorMessage("You are not logged in.");
          return;
        }

        const response = await axios.get(
          `${API_URL}/attendance/${roomId}/${scheduleId}/attendance_records`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setStudents(response.data.students || []);
        setScheduleDetails({
          date: response.data.schedule_date || null,
          start_time: response.data.schedule_start_time || null,
          end_time: response.data.schedule_end_time || null,
        });
        setErrorMessage(null);
      } catch (error: any) {
        console.error("Error fetching attendance records:", error);
        setErrorMessage(
          error.response?.data?.detail || "Failed to fetch attendance records."
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchAttendanceRecords();
  }, [roomId, scheduleId]);

  // Filtered students for search
  const filteredStudents = students.filter((student) =>
    student.student_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenExcuseModal = (studentId: number) => {
    setSelectedStudentId(studentId);
    setExcuseModalOpen(true);
  };

  const handleExcuseSuccess = () => {
    setExcuseModalOpen(false);
    setSelectedStudentId(null);
    window.location.reload();
  };

  const handleViewReason = async (student: StudentAttendance) => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await axios.get(
        `${API_URL}/attendance/${roomId}/${scheduleId}/${student.student_id}/excuse_reason`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setViewReason(res.data.reason || "No reason provided.");
      setViewAttachment(res.data.attachment_path || null);
      setViewReasonStudent(student.student_name);
      setViewReasonModalOpen(true);
    } catch (err: any) {
      setViewReason("No reason found or error fetching reason.");
      setViewAttachment(null);
      setViewReasonStudent(student.student_name);
      setViewReasonModalOpen(true);
    }
  };

  const columns = [
    {
      name: "Student Name",
      selector: (row: StudentAttendance) => row.student_name,
      sortable: true,
    },
    {
      name: "Status",
      selector: (row: StudentAttendance) => row.attendance_status,
      sortable: true,
      cell: (row: StudentAttendance) => (
        <span
          className={`${
            row.attendance_status === "present"
              ? "text-green-600"
              : row.attendance_status === "late"
              ? "text-yellow-600"
              : row.attendance_status === "absent"
              ? "text-red-600"
              : row.attendance_status === "excused"
              ? "text-blue-600"
              : "text-gray-600"
          }`}
        >
          {row.attendance_status}
        </span>
      ),
    },
    {
      name: "Taken At",
      selector: (row: StudentAttendance) =>
        row.attendance_status === "pending" || !row.taken_at
          ? "N/A"
          : new Date(row.taken_at).toLocaleString(),
      sortable: true,
    },
    {
      name: "Actions",
      cell: (row: StudentAttendance) => (
        <>
          {row.attendance_status !== "excused" &&
            row.attendance_status !== "present" && (
              <button
                className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 text-xs mr-2"
                onClick={() => handleOpenExcuseModal(row.student_id)}
              >
                Mark Excused
              </button>
            )}
          {row.attendance_status === "excused" && (
            <button
              className="bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600 text-xs"
              onClick={() => handleViewReason(row)}
            >
              View Reason
            </button>
          )}
        </>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-500 text-lg">Loading attendance records...</p>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-red-500 text-lg">{errorMessage}</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <button
        className="mb-4 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
        onClick={() => navigate(-1)}
      >
        Back
      </button>
      <h1 className="text-2xl font-bold mb-4 text-gray-800">
        Attendance Details
      </h1>
      {scheduleDetails.date &&
        scheduleDetails.start_time &&
        scheduleDetails.end_time && (
          <p className="text-gray-600 mb-4">
            <strong>Date:</strong> {scheduleDetails.date} |{" "}
            <strong>Start Time:</strong> {scheduleDetails.start_time} |{" "}
            <strong>End Time:</strong> {scheduleDetails.end_time}
          </p>
        )}
      <div className="mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by student name..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <DataTable
        columns={columns}
        data={filteredStudents}
        pagination
        highlightOnHover
        striped
        responsive
        defaultSortFieldId={1}
      />

      {/* Excuse Modal */}
      {excuseModalOpen && selectedStudentId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg">
            <TeacherMarkExcuse
              roomId={Number(roomId)}
              scheduleId={Number(scheduleId)}
              studentId={selectedStudentId}
              studentName={
                students.find((s) => s.student_id === selectedStudentId)
                  ?.student_name || ""
              }
              onSuccess={handleExcuseSuccess}
            />
            <button
              className="mt-4 bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded w-full"
              onClick={() => setExcuseModalOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* View Reason Modal */}
      <TeacherViewExcuseReasonModal
        open={viewReasonModalOpen}
        onClose={() => setViewReasonModalOpen(false)}
        studentName={viewReasonStudent}
        reason={viewReason}
        attachmentPath={viewAttachment}
        apiUrl={API_URL}
      />
    </div>
  );
};

export default TeacherAttendanceDetails;
