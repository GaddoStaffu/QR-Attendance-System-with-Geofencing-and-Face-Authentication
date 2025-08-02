import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import "../App.css";

const API_URL = import.meta.env.VITE_API_URL;

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState("");
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    id_number: "",
    first_name: "",
    last_name: "",
    role: "student",
  });
  const [error, setError] = useState("");
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [pendingRegisterData, setPendingRegisterData] = useState<any>(null);

  const evaluatePasswordStrength = (password: string) => {
    if (
      password.length > 8 &&
      /[A-Z]/.test(password) &&
      /\d/.test(password) &&
      /[!@#$%^&*]/.test(password)
    ) {
      return "Strong";
    } else if (password.length >= 6) {
      return "Moderate";
    } else {
      return "Weak";
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData({ ...formData, [id]: value });

    if (id === "password") {
      setPasswordStrength(evaluatePasswordStrength(value));
    }
  };

  // Step 1: Register button triggers sending code and opens modal
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setVerifyError("");
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setSendingCode(true);
    try {
      // Send verification code to email
      await axios.post(`${API_URL}/auth/register/request-email-code`, {
        email: formData.email,
        username: formData.username,
        id_number: formData.id_number,
      });
      setPendingRegisterData({ ...formData }); // Save form data for later
      setVerifyModalOpen(true);
    } catch (error: any) {
      if (error.response && error.response.data) {
        setError(error.response.data.detail || "Failed to send code.");
      } else {
        setError("An error occurred. Please try again.");
      }
    }
    setSendingCode(false);
  };

  // Step 2: Verify code and complete registration
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyError("");
    if (!pendingRegisterData) return;
    try {
      // Register user with code
      const response = await axios.post(
        `${API_URL}/auth/register`,
        { ...pendingRegisterData, verification_code: codeInput },
        { headers: { "Content-Type": "application/json" } }
      );
      if (response.status === 200 || response.status === 201) {
        alert("Registration successful! Please log in.");
        setVerifyModalOpen(false);
        navigate("/login");
      }
    } catch (error: any) {
      if (error.response && error.response.data) {
        setVerifyError(error.response.data.detail || "Invalid code.");
      } else {
        setVerifyError("An error occurred. Please try again.");
      }
    }
  };

  return (
    <div
      className="relative min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat overflow-y-auto"
      style={{
        backgroundImage: "url(/images/front-logo.jpg)",
        backgroundSize: "cover",
      }}
    >
      <Card className="w-full max-w-md shadow-lg rounded-2xl bg-white z-10 min-h-[650px]">
        <CardContent className="p-6">
          {/* School Logo */}
          <div className="flex justify-center mb-4">
            <img
              src="/images/ustp_logo.jpg"
              alt="School Logo"
              className="h-32 w-32 object-contain rounded-full"
            />
          </div>

          <h2 className="text-2xl font-bold text-center mb-6">
            Create your Account
          </h2>

          <form className="space-y-4" onSubmit={handleRegister}>
            {/* Username */}
            <div>
              <Label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700"
              >
                Username
              </Label>
              <Input
                type="text"
                id="username"
                placeholder="Enter your username"
                required
                className="input-field"
                onChange={handleChange}
                value={formData.username}
              />
            </div>

            {/* Email */}
            <div>
              <Label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email
              </Label>
              <Input
                type="email"
                id="email"
                placeholder="Enter your email"
                required
                className="input-field"
                onChange={handleChange}
                value={formData.email}
              />
            </div>

            {/* ID Number */}
            <div>
              <Label
                htmlFor="id_number"
                className="block text-sm font-medium text-gray-700"
              >
                ID Number
              </Label>
              <Input
                type="number"
                id="id_number"
                placeholder="Enter your ID Number"
                required
                className="input-field"
                onChange={handleChange}
                value={formData.id_number}
              />
            </div>

            {/* First Name */}
            <div>
              <Label
                htmlFor="first_name"
                className="block text-sm font-medium text-gray-700"
              >
                First Name
              </Label>
              <Input
                type="text"
                id="first_name"
                placeholder="Enter your first name"
                required
                className="input-field"
                onChange={handleChange}
                value={formData.first_name}
              />
            </div>

            {/* Last Name */}
            <div>
              <Label
                htmlFor="last_name"
                className="block text-sm font-medium text-gray-700"
              >
                Last Name
              </Label>
              <Input
                type="text"
                id="last_name"
                placeholder="Enter your last name"
                required
                className="input-field"
                onChange={handleChange}
                value={formData.last_name}
              />
            </div>

            {/* Password */}
            <div>
              <Label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Password
              </Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  placeholder="Enter your password"
                  required
                  className="input-field"
                  onChange={handleChange}
                  value={formData.password}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-2"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <p
                className={`mt-1 text-sm ${
                  passwordStrength === "Strong"
                    ? "text-green-500"
                    : passwordStrength === "Moderate"
                    ? "text-yellow-500"
                    : "text-red-500"
                }`}
              >
                {passwordStrength && `Password Strength: ${passwordStrength}`}
              </p>
            </div>

            {/* Confirm Password */}
            <div>
              <Label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700"
              >
                Confirm Password
              </Label>
              <Input
                type="password"
                id="confirmPassword"
                placeholder="Confirm your password"
                required
                className="input-field"
                onChange={handleChange}
                value={formData.confirmPassword}
              />
              <p
                className={`mt-1 text-sm ${
                  formData.confirmPassword &&
                  (formData.confirmPassword === formData.password
                    ? "text-green-500"
                    : "text-red-500")
                }`}
              >
                {formData.confirmPassword &&
                  (formData.confirmPassword === formData.password
                    ? "Passwords match"
                    : "Passwords do not match")}
              </p>
            </div>

            {/* Register Button */}
            <Button
              type="submit"
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 rounded-md"
              disabled={sendingCode}
            >
              Register
            </Button>

            {/* Error Message */}
            {error && (
              <p className="text-red-500 text-sm mt-2 text-center">{error}</p>
            )}
          </form>

          <p className="text-sm text-center text-gray-600 mt-4">
            Already have an account?{" "}
            <Link to="/login" className="text-blue-500 hover:underline ml-1">
              Login
            </Link>
          </p>
        </CardContent>
      </Card>

      {/* Email Verification Modal */}
      {verifyModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-sm">
            <h3 className="text-xl font-semibold mb-4 text-center">
              Verify Your Email
            </h3>
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <Input
                type="text"
                placeholder="Enter verification code"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                required
                maxLength={6}
                className="text-center tracking-widest text-lg"
              />
              <Button
                type="submit"
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 rounded-md"
              >
                Verify & Register
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full mt-2"
                onClick={() => setVerifyModalOpen(false)}
              >
                Cancel
              </Button>
              {verifyError && (
                <p className="text-sm text-center text-red-500 mt-2">
                  {verifyError}
                </p>
              )}
            </form>
            <p className="text-xs text-gray-500 mt-4 text-center">
              A verification code has been sent to your email.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Register;
