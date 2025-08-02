import React, { useEffect, useState } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import axios from "axios";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "./StudentCalendar.css"; // Custom styles for the calendar

const localizer = momentLocalizer(moment);

interface Event {
  title: string;
  start: Date;
  end: Date;
  class_name: string;
}

interface Room {
  room_id: number;
  class_name: string;
}

const StudentCalendar: React.FC = () => {
  const API_URL = import.meta.env.VITE_API_URL;
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("All");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        const token = localStorage.getItem("access_token");
        if (!token) {
          throw new Error("User is not authenticated");
        }

        const response = await axios.get(`${API_URL}/calendar/get-schedules`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const schedules = response.data.schedules.map((schedule: any) => ({
          title: schedule.schedule_name,
          start: new Date(`${schedule.date}T${schedule.start_time}`),
          end: new Date(`${schedule.date}T${schedule.end_time}`),
          class_name: schedule.class_name,
        }));

        setEvents(schedules);
        setFilteredEvents(schedules);

        // Extract unique class names
        const uniqueClasses = Array.from(
          new Set(schedules.map((s: any) => s.class_name))
        ) as string[];
        setClasses(["All", ...uniqueClasses]); // Add "All" option for filtering
      } catch (err: any) {
        console.error("Error fetching schedules:", err);
        setError("Failed to load schedules. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchSchedules();
  }, []);

  const handleClassFilterChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const selected = event.target.value;
    setSelectedClass(selected);

    if (selected === "All") {
      setFilteredEvents(events);
    } else {
      setFilteredEvents(events.filter((e) => e.class_name === selected));
    }
  };

  if (loading) {
    return <div className="loading">Loading schedules...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="calendar-container">
      <h2 className="calendar-title">Attendance Schedule</h2>

      {/* Class Filter Dropdown */}
      <div className="filter-container">
        <label htmlFor="class-filter">Filter by Class:</label>
        <select
          id="class-filter"
          value={selectedClass}
          onChange={handleClassFilterChange}
          className="class-filter-dropdown"
        >
          {classes.map((className) => (
            <option key={className} value={className}>
              {className}
            </option>
          ))}
        </select>
      </div>

      <div className="calendar-wrapper">
        <Calendar
          localizer={localizer}
          events={filteredEvents}
          startAccessor="start"
          endAccessor="end"
          style={{ height: "100%" }}
          views={["month", "week", "day", "agenda"]}
          defaultView="month"
          popup
          onSelectEvent={(event) =>
            alert(`Event: ${event.title}\nRoom: ${event.class_name}`)
          }
        />
      </div>
    </div>
  );
};

export default StudentCalendar;
