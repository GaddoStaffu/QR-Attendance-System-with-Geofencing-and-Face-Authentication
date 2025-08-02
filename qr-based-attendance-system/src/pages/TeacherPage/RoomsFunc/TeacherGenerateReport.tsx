import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
// Removed: import { saveAs } from "file-saver";

const API_URL = import.meta.env.VITE_API_URL;

interface ScheduleInfo {
  schedule_id: number;
  room_id: number;
  schedule_name: string;
  schedule_description?: string | null;
  date: string;
  start_time: string;
  end_time: string;
  created_at: string;
  is_archived: boolean;
}

const getYear = (dateString: string): string => {
  return dateString.substring(0, 4); // Extracts "YYYY"
};

const getMonthYear = (dateString: string): string => {
  return dateString.substring(0, 7); // Extracts "YYYY-MM"
};

const TeacherGenerateReport: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  const [allSchedules, setAllSchedules] = useState<ScheduleInfo[]>([]);
  const [selectedScheduleIds, setSelectedScheduleIds] = useState<Set<number>>(
    new Set()
  );
  const [loadingSchedules, setLoadingSchedules] = useState<boolean>(true);
  const [loadingReport, setLoadingReport] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [selectedYear, setSelectedYear] = useState<string>("all"); // "all" or "YYYY"
  const [selectedMonth, setSelectedMonth] = useState<string>("all"); // "all" or "YYYY-MM"
  const [selectedDay, setSelectedDay] = useState<string>(""); // "" or "YYYY-MM-DD"

  // Fetch all schedules on component mount
  useEffect(() => {
    const fetchSchedules = async () => {
      setLoadingSchedules(true);
      setError(null);
      try {
        const token = localStorage.getItem("access_token");
        if (!token) throw new Error("Authentication token not found.");
        const response = await axios.get<ScheduleInfo[]>(
          `${API_URL}/reports/room_schedules/${roomId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setAllSchedules(response.data);
      } catch (err: any) {
        console.error("Error fetching schedules:", err);
        setError(
          err.response?.data?.detail ||
            err.message ||
            "Failed to load schedules."
        );
      } finally {
        setLoadingSchedules(false);
      }
    };
    fetchSchedules();
  }, [roomId]);

  // --- Filtering Logic ---
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    allSchedules.forEach((schedule) => years.add(getYear(schedule.date)));
    return Array.from(years).sort().reverse(); // Sort newest year first
  }, [allSchedules]);

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    allSchedules.forEach((schedule) => {
      // Only include months from the selected year (if a year is selected)
      if (selectedYear === "all" || getYear(schedule.date) === selectedYear) {
        months.add(getMonthYear(schedule.date));
      }
    });
    return Array.from(months).sort().reverse(); // Sort newest month first
  }, [allSchedules, selectedYear]); // Depends on selectedYear now

  const filteredSchedules = useMemo(() => {
    return allSchedules.filter((schedule) => {
      const scheduleYear = getYear(schedule.date);
      const scheduleMonth = getMonthYear(schedule.date);
      const scheduleDate = schedule.date;

      const yearMatch = selectedYear === "all" || scheduleYear === selectedYear;
      const monthMatch =
        selectedMonth === "all" || scheduleMonth === selectedMonth;
      const dayMatch = selectedDay === "" || scheduleDate === selectedDay;

      // Ensure day filter only applies if relevant year/month also match
      if (selectedDay !== "") {
        return yearMatch && monthMatch && dayMatch;
      }
      // Ensure month filter only applies if relevant year also matches
      if (selectedMonth !== "all") {
        return yearMatch && monthMatch;
      }
      // Apply only year filter if others are "all"/""
      return yearMatch;
    });
  }, [allSchedules, selectedYear, selectedMonth, selectedDay]);
  // --- End Filtering Logic ---

  // --- Check All Logic ---
  const filteredScheduleIds = useMemo(() => {
    return new Set(filteredSchedules.map((s) => s.schedule_id));
  }, [filteredSchedules]);

  const areAllFilteredSelected = useMemo(() => {
    if (filteredScheduleIds.size === 0) return false;
    return Array.from(filteredScheduleIds).every((id) =>
      selectedScheduleIds.has(id)
    );
  }, [filteredScheduleIds, selectedScheduleIds]);

  const handleSelectAllFiltered = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const isChecked = event.target.checked;
    setSelectedScheduleIds((prevSelected) => {
      const newSelected = new Set(prevSelected);
      if (isChecked) {
        filteredScheduleIds.forEach((id) => newSelected.add(id));
      } else {
        filteredScheduleIds.forEach((id) => newSelected.delete(id));
      }
      return newSelected;
    });
    setError(null);
  };
  // --- End Check All Logic ---

  const handleCheckboxChange = (scheduleId: number) => {
    setSelectedScheduleIds((prevSelected) => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(scheduleId)) {
        newSelected.delete(scheduleId);
      } else {
        newSelected.add(scheduleId);
      }
      return newSelected;
    });
    setError(null);
  };

  // --- Updated Report Generation ---
  const handleGenerateReport = async () => {
    if (selectedScheduleIds.size === 0) {
      setError("Please select at least one schedule to generate a report.");
      return;
    }

    setLoadingReport(true);
    setError(null);

    try {
      const token = localStorage.getItem("access_token");
      if (!token) throw new Error("Authentication token not found.");

      const reportUrl = `${API_URL}/reports/generate_word_report`;
      const requestData = Array.from(selectedScheduleIds);

      const response = await axios.post(reportUrl, requestData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        responseType: "blob",
      });

      // Log headers for debugging
      console.log("Response Headers:", response.headers);

      // Extract filename from Content-Disposition header
      const contentDisposition =
        response.headers["content-disposition"] ||
        response.headers["Content-Disposition"];
      if (!contentDisposition) {
        throw new Error("Content-Disposition header is missing.");
      }

      const match = contentDisposition.match(/filename="?(.+)"?/);
      if (!match || !match[1]) {
        throw new Error(
          "Filename could not be extracted from Content-Disposition header."
        );
      }

      const filename = match[1];

      // Create a blob and trigger download
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      window.URL.revokeObjectURL(link.href);
    } catch (err: any) {
      console.error("Error generating report:", err);
      setError(
        err.response?.data?.detail ||
          err.message ||
          "Failed to generate report."
      );
    } finally {
      setLoadingReport(false);
    }
  };
  // --- End Updated Report Generation ---

  const formatScheduleDisplay = (schedule: ScheduleInfo): string => {
    const datePart = new Date(schedule.date + "T00:00:00").toLocaleDateString(
      undefined,
      {
        year: "numeric",
        month: "short",
        day: "numeric",
      }
    );
    const timePart = `${schedule.start_time.substring(
      0,
      5
    )} - ${schedule.end_time.substring(0, 5)}`;
    return `${schedule.schedule_name} - ${datePart} (${timePart})`;
  };

  const formatMonthDisplay = (monthYear: string): string => {
    const [year, month] = monthYear.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleString("default", { month: "long", year: "numeric" });
  };

  return (
    <div className="p-4 md:p-6 bg-gray-100 min-h-screen">
      <div className="max-w-5xl mx-auto bg-white p-5 md:p-8 rounded-xl shadow-lg">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b border-gray-200 pb-4">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2 sm:mb-0">
            Generate Attendance Report
          </h1>
          <button
            onClick={() =>
              navigate(`/teacher-dashboard/rooms/${roomId}/settings`)
            }
            className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-md transition duration-200 text-sm"
          >
            Back to Settings
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div
            className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-md shadow-sm"
            role="alert"
          >
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        )}

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          {/* Year Filter */}
          <div>
            <label
              htmlFor="year-filter"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Filter by Year
            </label>
            <select
              id="year-filter"
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(e.target.value);
                setSelectedMonth("all"); // Reset month filter
                setSelectedDay(""); // Reset day filter
              }}
              disabled={loadingSchedules}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm disabled:bg-gray-200"
            >
              <option value="all">All Years</option>
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          {/* Month Filter */}
          <div>
            <label
              htmlFor="month-filter"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Filter by Month
            </label>
            <select
              id="month-filter"
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setSelectedDay(""); // Reset day filter
              }}
              disabled={loadingSchedules || selectedYear === "all"} // Disable if no year selected
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm disabled:bg-gray-200"
            >
              <option value="all">All Months</option>
              {availableMonths.map((month) => (
                <option key={month} value={month}>
                  {formatMonthDisplay(month)}
                </option>
              ))}
            </select>
          </div>
          {/* Day Filter */}
          <div>
            <label
              htmlFor="day-filter"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Filter by Day
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="date"
                id="day-filter"
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                disabled={loadingSchedules}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm disabled:bg-gray-200"
              />
              {selectedDay && (
                <button
                  onClick={() => setSelectedDay("")}
                  className="text-gray-500 hover:text-red-600 p-1"
                  title="Clear date filter"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Schedule List */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xl font-semibold text-gray-800">
              Select Schedules:
            </h2>
            {!loadingSchedules && filteredSchedules.length > 0 && (
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="select-all-filtered"
                  checked={areAllFilteredSelected}
                  onChange={handleSelectAllFiltered}
                  className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                />
                <label
                  htmlFor="select-all-filtered"
                  className="text-sm font-medium text-gray-700 cursor-pointer"
                >
                  Select All (Filtered)
                </label>
              </div>
            )}
          </div>

          {loadingSchedules ? (
            <div className="text-center py-10">
              <p className="text-gray-500">Loading schedules...</p>
            </div>
          ) : filteredSchedules.length === 0 ? (
            <div className="text-center py-10 bg-gray-50 rounded-md border border-dashed border-gray-300">
              <p className="text-gray-500 italic">
                No schedules found matching your filters.
              </p>
            </div>
          ) : (
            <div className="max-h-[50vh] overflow-y-auto border border-gray-200 rounded-md shadow-sm bg-white divide-y divide-gray-200">
              {filteredSchedules.map((schedule) => (
                <div
                  key={schedule.schedule_id}
                  className="flex items-center space-x-4 p-3 hover:bg-blue-50 transition duration-150"
                >
                  <input
                    type="checkbox"
                    id={`schedule-${schedule.schedule_id}`}
                    checked={selectedScheduleIds.has(schedule.schedule_id)}
                    onChange={() => handleCheckboxChange(schedule.schedule_id)}
                    className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                  />
                  <label
                    htmlFor={`schedule-${schedule.schedule_id}`}
                    className="text-sm text-gray-900 cursor-pointer flex-1 min-w-0"
                  >
                    {formatScheduleDisplay(schedule)}
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Generate Button Area */}
        {!loadingSchedules && allSchedules.length > 0 && (
          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <p className="text-base text-gray-700 mb-4">
              Selected:{" "}
              <span className="font-semibold">{selectedScheduleIds.size}</span>{" "}
              schedule(s)
            </p>
            <button
              onClick={handleGenerateReport}
              disabled={loadingReport || selectedScheduleIds.size === 0}
              className={`bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg shadow-md transition duration-200 text-base disabled:opacity-50 disabled:cursor-not-allowed ${
                loadingReport ? "animate-pulse" : ""
              }`}
            >
              {loadingReport ? "Generating Report..." : "Generate Word Report"}
            </button>
          </div>
        )}
        {!loadingSchedules && allSchedules.length === 0 && (
          <div className="text-center py-10">
            <p className="text-gray-500 italic">
              No schedules have been created for this room yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherGenerateReport;
