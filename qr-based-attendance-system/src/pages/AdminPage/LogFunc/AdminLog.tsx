import React, { useEffect, useState } from "react";
import axios from "axios";
import DataTable from "react-data-table-component";
import AdminExportLogsButton from "./AdminExportLogsButton";

const API_URL = import.meta.env.VITE_API_URL;

interface Log {
  log_id: number;
  user_id: number;
  action: string;
  level: string;
  timestamp: string;
  details: string;
  ip_address: string;
  user_agent: string;
  action_type: string;
}

const LogPage: React.FC = () => {
  const [logs, setLogs] = useState<Log[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>(""); // For dynamic search
  const [filterLevel, setFilterLevel] = useState<string>(""); // For filtering by level
  const [filterActionType, setFilterActionType] = useState<string>(""); // For filtering by action type

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const token = localStorage.getItem("access_token");
        const response = await axios.get(`${API_URL}/admin-logs/get_logs`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        // Sort logs by descending Log ID
        const sortedLogs = response.data.sort(
          (a: Log, b: Log) => b.log_id - a.log_id
        );

        setLogs(sortedLogs);
        setFilteredLogs(sortedLogs); // Initialize filtered logs with sorted data
      } catch (err: any) {
        console.error("Error fetching logs:", err);
        setError("Failed to fetch logs. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  useEffect(() => {
    const filtered = logs.filter((log) => {
      // Check if the search term matches specific fields
      const matchesLogId = log.log_id.toString().includes(searchTerm);
      const matchesUserId = log.user_id.toString().includes(searchTerm);
      const matchesAction = log.action
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesDetails = log.details
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesActionType = log.action_type
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      // Only match specific fields, not the entire concatenated string
      return (
        matchesLogId ||
        matchesUserId ||
        matchesAction ||
        matchesDetails ||
        matchesActionType
      );
    });

    // Apply level and action type filters
    const finalFiltered = filtered.filter((log) => {
      const matchesLevel = filterLevel ? log.level === filterLevel : true;
      const matchesActionType = filterActionType
        ? log.action_type === filterActionType
        : true;
      return matchesLevel && matchesActionType;
    });

    setFilteredLogs(finalFiltered);
  }, [searchTerm, filterLevel, filterActionType, logs]);

  const columns = [
    {
      name: "Log ID",
      selector: (row: Log) => row.log_id,
      sortable: true,
    },
    {
      name: "User ID",
      selector: (row: Log) => row.user_id,
      sortable: true,
    },
    {
      name: "Action",
      selector: (row: Log) => row.action,
      sortable: true,
    },
    {
      name: "Level",
      selector: (row: Log) => row.level,
      sortable: true,
    },
    {
      name: "Timestamp",
      selector: (row: Log) => new Date(row.timestamp).toLocaleString(),
      sortable: true,
    },
    {
      name: "Details",
      selector: (row: Log) => row.details,
      wrap: true,
    },
    {
      name: "IP Address",
      selector: (row: Log) => row.ip_address,
    },
    {
      name: "User Agent",
      selector: (row: Log) => row.user_agent,
      wrap: true,
    },
    {
      name: "Action Type",
      selector: (row: Log) => row.action_type,
      sortable: true,
    },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Admin Logs</h1>
        <AdminExportLogsButton />
      </div>

      {/* Search Input */}
      <div className="mb-4 flex flex-col md:flex-row gap-4">
        <input
          type="text"
          placeholder="Search logs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {/* Filter by Level */}
        <select
          value={filterLevel}
          onChange={(e) => setFilterLevel(e.target.value)}
          className="p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Levels</option>
          <option value="INFO">INFO</option>
          <option value="WARNING">WARNING</option>
          <option value="ERROR">ERROR</option>
        </select>

        {/* Filter by Action Type */}
        <select
          value={filterActionType}
          onChange={(e) => setFilterActionType(e.target.value)}
          className="p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Action Types</option>
          <option value="LOGIN">LOGIN</option>
          <option value="LOGOUT">LOGOUT</option>
          <option value="CREATE">CREATE</option>
          <option value="UPDATE">UPDATE</option>
          <option value="DELETE">DELETE</option>
          <option value="GEOFENCE">GEOFENCE</option>
          <option value="FACEAUTH">FACEAUTH</option>
        </select>
      </div>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      <DataTable
        title="System Logs"
        columns={columns}
        data={filteredLogs}
        progressPending={loading}
        pagination
        highlightOnHover
        responsive
        striped
      />
    </div>
  );
};

export default LogPage;
