import React, { useState } from 'react';
import { KeyRound, X, CheckCircle2, AlertCircle, ShieldAlert } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function ChangePasswordModal({
  isOpen,
  onClose,
  primaryColor = '#059669',
  forceChange = false,
}) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus(null);

    if (newPassword.length < 6) {
      setStatus({ type: 'error', text: 'Password must be at least 6 characters long.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatus({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
        data: { must_change_password: false },
      });
      if (error) throw error;

      setStatus({ type: 'success', text: 'Your password has been saved!' });
      setNewPassword('');
      setConfirmPassword('');

      setTimeout(() => {
        setStatus(null);
        onClose();
      }, 1200);
    } catch (err) {
      setStatus({ type: 'error', text: err.message || 'Could not update password.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-bold text-slate-900">
              {forceChange ? 'Create Your Own Password' : 'Change Account Password'}
            </h3>
          </div>

          {!forceChange && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {forceChange && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed">
              <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <span>
                Welcome! You signed in using a temporary password. Please create your own personal password to unlock your bookkeeping portal.
              </span>
            </div>
          )}

          {status && (
            <div
              className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-medium ${
                status.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              {status.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              )}
              <span>{status.text}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              New Password *
            </label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="Minimum 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Confirm New Password *
            </label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            {!forceChange && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className={`${
                forceChange ? 'w-full' : ''
              } px-5 py-2.5 text-white text-xs font-semibold rounded-xl shadow-sm disabled:opacity-50`}
              style={{ backgroundColor: primaryColor }}
            >
              {saving ? 'Saving Password...' : 'Save Password & Continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
