import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const API_URL = import.meta.env.VITE_API_URL;

interface AttendanceTrend {
  date: string;
  present_count: number;
}

interface StudentRate {
  user_id: number;
  first_name: string;
  last_name: string;
  attendance_rate: number;
}

const COLORS = ["#82ca9d", "#ff7f7f"];

const TeacherRoomsAttendanceSummary: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [overall, setOverall] = useState<number>(0);
  const [studentRates, setStudentRates] = useState<StudentRate[]>([]);
  const [trend, setTrend] = useState<AttendanceTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId) return;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [overallRes, ratesRes, trendRes] = await Promise.all([
          axios.get(`${API_URL}/attendance/${roomId}/attendance_summary`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("access_token")}`,
            },
          }),
          axios.get(
            `${API_URL}/attendance/${roomId}/student_attendance_rates`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("access_token")}`,
              },
            }
          ),
          axios.get(`${API_URL}/attendance/${roomId}/attendance_trend`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("access_token")}`,
            },
          }),
        ]);
        setOverall(overallRes.data.overall_percentage);
        setStudentRates(ratesRes.data.rates);
        setTrend(trendRes.data);
      } catch (err: any) {
        setError("Failed to fetch attendance data.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [roomId]);

  return (
    <div className="p-6">
      <div className="flex items-center mb-4">
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700 mr-4"
          onClick={() => navigate(`/teacher-dashboard/rooms/${roomId}`)}
        >
          Back to Room Details
        </button>
        <h1 className="text-2xl font-bold">Attendance Summary</h1>
      </div>
      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Overall Attendance Pie Chart */}
          <div className="bg-white rounded shadow p-4">
            <h2 className="text-lg font-semibold mb-2">Overall Attendance</h2>
            <PieChart width={300} height={300}>
              <Pie
                data={[
                  { name: "Present", value: overall },
                  { name: "Absent", value: 100 - overall },
                ]}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label
              >
                <Cell fill={COLORS[0]} />
                <Cell fill={COLORS[1]} />
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
            <div className="text-center mt-2 font-bold">
              {overall.toFixed(2)}% Present
            </div>
          </div>

          {/* Attendance Trend Bar Chart */}
          <div className="bg-white rounded shadow p-4">
            <h2 className="text-lg font-semibold mb-2">
              Attendance Trend Over Time
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="present_count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Individual Student Attendance Rates */}
          <div className="bg-white rounded shadow p-4 col-span-1 md:col-span-2">
            <h2 className="text-lg font-semibold mb-2">
              Individual Student Attendance Rates
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full border">
                <thead>
                  <tr>
                    <th className="border px-4 py-2">Name</th>
                    <th className="border px-4 py-2">Attendance Rate (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {studentRates.map((student) => (
                    <tr key={student.user_id}>
                      <td className="border px-4 py-2">
                        {student.first_name} {student.last_name}
                      </td>
                      <td className="border px-4 py-2">
                        {student.attendance_rate.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherRoomsAttendanceSummary;
