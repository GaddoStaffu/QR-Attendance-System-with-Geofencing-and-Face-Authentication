import React from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

const AdminExportLogsButton: React.FC = () => {
  const handleExport = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const response = await axios.get(`${API_URL}/admin-logs/export_logs`, {
        responseType: "blob",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "logs.csv");
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert("Failed to export logs.");
      console.error(error);
    }
  };

  return (
    <button
      onClick={handleExport}
      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
    >
      Export Logs as CSV
    </button>
  );
};

export default AdminExportLogsButton;
