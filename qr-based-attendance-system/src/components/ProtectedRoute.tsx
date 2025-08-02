import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import axios from "axios";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const API_URL = import.meta.env.VITE_API_URL;

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAndRefreshToken = async () => {
      const token = localStorage.getItem("access_token");

      if (!token) {
        console.error("No token found. Redirecting to login.");
        setIsAuthenticated(false);
        return;
      }

      try {
        // Decode the JWT payload
        const payload = JSON.parse(atob(token.split(".")[1]));
        const expiration = payload.exp * 1000; // Convert to milliseconds
        const now = Date.now();

        // If the token is expired, log the user out
        if (now >= expiration) {
          console.error("Token expired. Redirecting to login.");
          localStorage.removeItem("access_token");
          setIsAuthenticated(false);
          return;
        }

        // If the token is about to expire in less than 5 minutes, refresh it
        if (expiration - now < 5 * 60 * 1000) {
          const response = await axios.post(`${API_URL}/auth/refresh-token`, {
            token, // Send the token as a JSON payload
          });

          const newToken = response.data.access_token;
          localStorage.setItem("access_token", newToken);
          console.log("Token refreshed successfully.");
        }

        // Check if the user's role is allowed
        const userRole = payload.role;
        if (allowedRoles && !allowedRoles.includes(userRole)) {
          console.error("User role not authorized. Redirecting to login.");
          setIsAuthenticated(false);
          return;
        }

        setIsAuthenticated(true);
      } catch (error) {
        console.error("Error refreshing token or validating user:", error);
        localStorage.removeItem("access_token"); // Clear invalid token
        setIsAuthenticated(false);
      }
    };

    // Initial token check
    checkAndRefreshToken();

    // Set up a periodic token refresh every 5 minutes
    const interval = setInterval(() => {
      checkAndRefreshToken();
    }, 5 * 60 * 1000); // 5 minutes

    // Clear the interval on component unmount
    return () => clearInterval(interval);
  }, [allowedRoles]);

  if (isAuthenticated === null) {
    // Show a loading state while checking authentication
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
