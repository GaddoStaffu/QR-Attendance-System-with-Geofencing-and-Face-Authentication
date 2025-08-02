import React, { useState } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

interface Props {
  roomId: number;
  scheduleId: number;
  studentId: number;
  studentName: string;
  onSuccess?: () => void;
}

const TeacherMarkExcuse: React.FC<Props> = ({
  roomId,
  scheduleId,
  studentId,
  studentName,
  onSuccess,
}) => {
  const [reason, setReason] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setAttachment(e.target.files[0]);
    } else {
      setAttachment(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setMessage("Please provide a reason.");
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append("user_id", String(studentId));
      formData.append("reason", reason);
      if (attachment) {
        formData.append("attachment", attachment);
      }
      await axios.post(
        `${API_URL}/attendance/${roomId}/${scheduleId}/mark_excused`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );
      setMessage("Student marked as excused successfully.");
      setReason("");
      setAttachment(null);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setMessage(
        err.response?.data?.detail || "Failed to mark student as excused."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white shadow rounded-lg p-6 mt-8">
      <h2 className="text-xl font-bold mb-4">Mark {studentName} as Excused</h2>
      <form onSubmit={handleSubmit}>
        <label className="block mb-2 font-semibold">Reason for Excuse</label>
        <textarea
          className="w-full border rounded p-2 mb-4"
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Enter reason for excusing this student..."
        />
        <label className="block mb-2 font-semibold">
          Attachment (optional)
        </label>
        <input
          type="file"
          accept="image/*,application/pdf"
          className="mb-4"
          onChange={handleFileChange}
        />
        {message && (
          <div className="mb-2 text-sm text-center text-red-600">{message}</div>
        )}
        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded w-full"
          disabled={loading}
        >
          {loading ? "Marking..." : "Mark Excused"}
        </button>
      </form>
    </div>
  );
};

export default TeacherMarkExcuse;
