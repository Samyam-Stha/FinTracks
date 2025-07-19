import { useState, useEffect } from "react";
import api from "@/api/axios";
import { toast } from "react-toastify";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { User, Mail, Lock, Trash2 } from "lucide-react";

export default function SettingsPage() {
  const [form, setForm] = useState({
    username: "",
    email: "",
    currentPassword: "",
    newPassword: "",
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
 

  const token = localStorage.getItem("token");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const updateField = async (field) => {
    try {
      await api.put(
        "/auth/update",
        { field, value: form[field], currentPassword: form.currentPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`${field} updated successfully`);
    } catch (err) {
      toast.error(err.response?.data?.error || "Update failed");
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete("/auth/delete", {
        headers: { Authorization: `Bearer ${token}` },
        data: { password: deletePassword },
      });

      // Clear all local storage data
      localStorage.clear();
      
      // Clear any session storage data
      sessionStorage.clear();

      toast.success("✅ Your account has been deleted successfully.");

      setShowDeleteModal(false);

      // Redirect to home page after a short delay
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    } catch (err) {
      toast.error(err.response?.data?.error || "Account deletion failed");
      setDeletePassword(""); // Clear password field on error
    }
  };

  useEffect(() => {
    window.history.pushState(null, "", window.location.href);
    window.onpopstate = function () {
      window.history.go(1);
    };
    return () => {
      window.onpopstate = null;
    };
  }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-8 p-4">
      <h1 className="text-3xl font-bold text-center mb-6">⚙️ Account Settings</h1>

      

      {/* Username Card */}
      <Card>
        <CardHeader className="flex items-center gap-2 pb-2">
          <User className="h-5 w-5 text-gray-500" />
          <CardTitle className="text-base font-semibold">Username</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <input
            type="text"
            name="username"
            value={form.username}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
            placeholder="Enter new username"
          />
          <button
            onClick={() => updateField("username")}
            className="bg-blue-600 text-white px-4 py-2 rounded w-full hover:bg-blue-700 transition"
          >
            Update Username
          </button>
        </CardContent>
      </Card>

      {/* Email Card */}
      <Card>
        <CardHeader className="flex items-center gap-2 pb-2">
          <Mail className="h-5 w-5 text-gray-500" />
          <CardTitle className="text-base font-semibold">Email</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
            placeholder="Enter new email"
          />
          <button
            onClick={() => updateField("email")}
            className="bg-blue-600 text-white px-4 py-2 rounded w-full hover:bg-blue-700 transition"
          >
            Update Email
          </button>
        </CardContent>
      </Card>

      {/* Password Card */}
      <Card>
        <CardHeader className="flex items-center gap-2 pb-2">
          <Lock className="h-5 w-5 text-gray-500" />
          <CardTitle className="text-base font-semibold">Change Password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <label className="text-sm">Current Password</label>
          <input
            type="password"
            name="currentPassword"
            value={form.currentPassword}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
            placeholder="Enter current password"
          />
          <label className="text-sm">New Password</label>
          <input
            type="password"
            name="newPassword"
            value={form.newPassword}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
            placeholder="Enter new password"
          />
          <button
            onClick={() => updateField("newPassword")}
            className="bg-blue-600 text-white px-4 py-2 rounded w-full hover:bg-blue-700 transition"
          >
            Change Password
          </button>
        </CardContent>
      </Card>

      {/* Delete Account Card */}
      <Card>
        <CardHeader className="flex items-center gap-2 pb-2">
          <Trash2 className="h-5 w-5 text-red-500" />
          <CardTitle className="text-base font-semibold text-red-600">Delete Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <button
            onClick={() => setShowDeleteModal(true)}
            className="bg-red-600 text-white px-4 py-2 rounded w-full hover:bg-red-700 transition"
          >
            Delete Account
          </button>
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-lg w-full max-w-sm">
            <h2 className="text-xl font-semibold mb-4 text-center text-red-600">
              Confirm Account Deletion
            </h2>
            <p className="text-sm mb-4 text-center">
              Please enter your password to confirm.
            </p>
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full border px-3 py-2 mb-4 rounded"
            />
            <div className="flex justify-between">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
