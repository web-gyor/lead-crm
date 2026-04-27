import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiPost } from '../utils/api';

const ResetPassword = () => {
  const { token } = useParams(); // Gets the token from the URL
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (password !== confirmPassword) return alert("Passwords do not match");

  setLoading(true);
  try {
    await apiPost("/api/users/reset-password", { token, password });

    // Clear old auth data completely
    localStorage.removeItem('token');
    localStorage.removeItem('user');        // if you store user data
    sessionStorage.clear();                 // extra safety

    alert("Password reset successfully! Please login with your new password.");
    navigate('/login');
  } catch (err) {
    alert("Link expired or invalid.");
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-lg w-96 space-y-4">
        <h2 className="text-xl font-bold">Set New Password</h2>
        <input 
          type="password" 
          placeholder="New Password" 
          className="w-full p-3 border rounded-xl"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <input 
          type="password" 
          placeholder="Confirm Password" 
          className="w-full p-3 border rounded-xl"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
        <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold">
          {loading ? "Updating..." : "Update Password"}
        </button>
      </form>
    </div>
  );
};

export default ResetPassword;