import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./StudentNotification.css";

interface Notification {
  id: number;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  room_id?: number; // Optional field to navigate to a room
}

const API_URL = import.meta.env.VITE_API_URL;

const StudentNotification: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const token = localStorage.getItem("access_token");
        if (!token) {
          throw new Error("User is not authenticated");
        }

        const response = await axios.post(
          `${API_URL}/notifications/get-notifications/`,
          {
            token,
          }
        );

        setNotifications(response.data);
      } catch (err: any) {
        console.error("Error fetching notifications:", err);
        setError("Failed to load notifications. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        throw new Error("User is not authenticated");
      }

      await axios.put(
        `${API_URL}/notifications/mark_all_as_read`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Update the state to mark all notifications as read
      setNotifications((prev) =>
        prev.map((notification) => ({ ...notification, is_read: true }))
      );
    } catch (err) {
      console.error("Error marking all notifications as read:", err);
      alert("Failed to mark all notifications as read. Please try again.");
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        throw new Error("User is not authenticated");
      }

      // Mark the notification as read in the backend
      await axios.put(
        `${API_URL}/notifications/${notification.id}/mark_as_read`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Update the state to mark the notification as read
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id ? { ...n, is_read: true } : n
        )
      );

      // Navigate to the room if `room_id` exists
      if (notification.room_id) {
        navigate(`/student-dashboard/rooms/${notification.room_id}`);
      }
    } catch (err) {
      console.error("Error marking notification as read:", err);
      alert("Failed to mark the notification as read. Please try again.");
    }
  };

  if (loading) {
    return <div className="loading">Loading notifications...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="notification-container">
      <h1 className="notification-title">Notifications</h1>
      <button className="mark-all-button" onClick={markAllAsRead}>
        Mark All as Read
      </button>
      {notifications.length === 0 ? (
        <p className="no-notifications">No notifications available.</p>
      ) : (
        notifications.map((notification) => (
          <div
            key={notification.id}
            className={`notification-card ${
              notification.is_read ? "read" : "unread"
            }`}
            onClick={() => handleNotificationClick(notification)} // Handle click
          >
            <div className="notification-content">
              <strong className="notification-title">
                {notification.title}
              </strong>
              <p className="notification-message">{notification.message}</p>
              <small className="notification-timestamp">
                {new Date(notification.created_at).toLocaleString()}
              </small>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default StudentNotification;
