import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, CheckCircle2, AlertCircle, Lock } from 'lucide-react';
import Swal from 'sweetalert2';

interface PasswordChangeFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface PasswordRequirement {
  label: string;
  met: boolean;
}

export const PasswordChangeForm: React.FC<PasswordChangeFormProps> = ({ onSuccess, onCancel }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Password strength requirements
  const passwordRequirements: PasswordRequirement[] = [
    { label: 'At least 8 characters', met: newPassword.length >= 8 },
    { label: 'Contains uppercase letter', met: /[A-Z]/.test(newPassword) },
    { label: 'Contains lowercase letter', met: /[a-z]/.test(newPassword) },
    { label: 'Contains number', met: /[0-9]/.test(newPassword) },
    { label: 'Contains special character', met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword) },
  ];

  const allRequirementsMet = passwordRequirements.every(req => req.met);
  const passwordsMatch = newPassword === confirmPassword && newPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);

    // Validation
    if (!currentPassword) {
      setErrors(['Current password is required']);
      return;
    }

    if (!newPassword) {
      setErrors(['New password is required']);
      return;
    }

    if (!confirmPassword) {
      setErrors(['Password confirmation is required']);
      return;
    }

    if (!allRequirementsMet) {
      setErrors(['New password does not meet all security requirements']);
      return;
    }

    if (!passwordsMatch) {
      setErrors(['Passwords do not match']);
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.errors && Array.isArray(data.errors)) {
          setErrors(data.errors);
        } else {
          setErrors([data.message || 'Failed to change password']);
        }
        return;
      }

      // Success
      Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: 'Your password has been changed successfully.',
        timer: 2000,
        showConfirmButton: false,
      });

      // Reset form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Password change error:', error);
      setErrors(['An error occurred while changing your password. Please try again.']);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      <div className="flex justify-between items-end mb-10 border-b border-gray-100 pb-8">
        <div>
          <h3 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Change Password</h3>
          <p className="mono-label text-gray-400 mt-2">Update your account security credentials</p>
        </div>
        <Lock size={32} className="text-gray-100" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl">
        {/* Error Messages */}
        {errors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 bg-red-50 border border-red-100 rounded-lg space-y-2"
          >
            {errors.map((error, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            ))}
          </motion.div>
        )}

        {/* Current Password */}
        <div className="space-y-3">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
            Current Password
          </label>
          <div className="relative">
            <input
              type={showCurrentPassword ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter your current password"
              className="w-full px-6 py-4 bg-gray-50 border border-gray-100 text-sm font-medium outline-none focus:border-[#4F75E2] transition-colors"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              disabled={loading}
            >
              {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* New Password */}
        <div className="space-y-3">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
            New Password
          </label>
          <div className="relative">
            <input
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter your new password"
              className="w-full px-6 py-4 bg-gray-50 border border-gray-100 text-sm font-medium outline-none focus:border-[#4F75E2] transition-colors"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              disabled={loading}
            >
              {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Password Strength Indicator */}
          {newPassword && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 bg-gray-50 border border-gray-100 space-y-3"
            >
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Password Requirements</p>
              <div className="space-y-2">
                {passwordRequirements.map((req, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center transition-all ${
                        req.met ? 'bg-coop-green/20' : 'bg-gray-200'
                      }`}
                    >
                      {req.met && <CheckCircle2 size={14} className="text-coop-green" />}
                    </div>
                    <span
                      className={`text-[9px] font-medium uppercase tracking-widest ${
                        req.met ? 'text-coop-green' : 'text-gray-400'
                      }`}
                    >
                      {req.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Strength Bar */}
              <div className="mt-4 space-y-2">
                <div className="flex gap-1">
                  {[0, 1, 2, 3, 4].map((idx) => (
                    <div
                      key={idx}
                      className={`h-1 flex-1 transition-all ${
                        idx < passwordRequirements.filter(r => r.met).length
                          ? 'bg-coop-green'
                          : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-[8px] text-gray-400 uppercase tracking-widest">
                  {passwordRequirements.filter(r => r.met).length} of {passwordRequirements.length} requirements met
                </p>
              </div>
            </motion.div>
          )}
        </div>

        {/* Confirm Password */}
        <div className="space-y-3">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
            Confirm New Password
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your new password"
              className={`w-full px-6 py-4 bg-gray-50 border text-sm font-medium outline-none transition-colors ${
                confirmPassword && !passwordsMatch
                  ? 'border-red-200 focus:border-red-300'
                  : 'border-gray-100 focus:border-[#4F75E2]'
              }`}
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              disabled={loading}
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {confirmPassword && !passwordsMatch && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-red-600"
            >
              <AlertCircle size={14} />
              <span className="text-[9px] font-medium uppercase tracking-widest">Passwords do not match</span>
            </motion.div>
          )}

          {confirmPassword && passwordsMatch && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-coop-green"
            >
              <CheckCircle2 size={14} />
              <span className="text-[9px] font-medium uppercase tracking-widest">Passwords match</span>
            </motion.div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 pt-6">
          <button
            type="submit"
            disabled={loading || !allRequirementsMet || !passwordsMatch}
            className="flex-1 bg-[#4F75E2] text-white py-5 flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-black transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 border border-gray-200 text-gray-600 py-5 flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </motion.div>
  );
};
