import React, { useEffect, useState } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import axios from "axios";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "./TeacherCalendar.css"; // Custom styles for the calendar

const localizer = momentLocalizer(moment);

interface Event {
  title: string;
  start: Date;
  end: Date;
  room_name: string;
}

const TeacherCalendar: React.FC = () => {
  const API_URL = import.meta.env.VITE_API_URL;
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        const token = localStorage.getItem("access_token");
        if (!token) {
          throw new Error("User is not authenticated");
        }

        const response = await axios.get(
          `${API_URL}/calendar/get-teacher-schedules`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const schedules = response.data.schedules.map((schedule: any) => ({
          title: schedule.schedule_name,
          start: new Date(`${schedule.date}T${schedule.start_time}`),
          end: new Date(`${schedule.date}T${schedule.end_time}`),
          room_name: schedule.room_name,
        }));

        setEvents(schedules);
      } catch (err: any) {
        console.error("Error fetching schedules:", err);
        setError("Failed to load schedules. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchSchedules();
  }, []);

  if (loading) {
    return <div className="loading">Loading schedules...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="calendar-container">
      <h2 className="calendar-title">Teacher's Schedule</h2>

      <div className="calendar-wrapper">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: "100%" }}
          views={["month", "week", "day", "agenda"]}
          defaultView="month"
          popup
          onSelectEvent={(event) =>
            alert(`Event: ${event.title}\nRoom: ${event.room_name}`)
          }
        />
      </div>
    </div>
  );
};

export default TeacherCalendar;
