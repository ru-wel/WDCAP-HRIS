import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ConfirmModal from '../../components/confirm-modal.jsx';
import { post } from '../../services/api.js';

const REMEMBERED_EMAIL_KEY = 'rememberedLoginEmail';

function parseHashParams(hash) {
  const raw = String(hash || '').replace(/^#/, '');
  const params = new URLSearchParams(raw);
  return {
    accessToken: params.get('access_token') || '',
    type: params.get('type') || '',
    error: params.get('error') || '',
    errorDescription: params.get('error_description') || ''
  };
}

export default function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();

  const hashInfo = useMemo(() => parseHashParams(location.hash), [location.hash]);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [confirmState, setConfirmState] = useState({
    open: false,
    title: 'Confirmation',
    message: '',
    confirmText: 'OK',
    cancelText: null,
    onConfirm: null,
    onCancel: null,
  });

  const openConfirm = ({ title, message, confirmText = 'OK', cancelText = null, onConfirm = null, onCancel = null }) => {
    setConfirmState({ open: true, title, message, confirmText, cancelText, onConfirm, onCancel });
  };

  const closeConfirm = () => setConfirmState((p) => ({ ...p, open: false }));

  const tokenError = hashInfo?.error
    ? `${hashInfo.error}${hashInfo.errorDescription ? `: ${hashInfo.errorDescription}` : ''}`
    : '';

  const hasToken = Boolean(hashInfo?.accessToken);

  const todayLabel = useMemo(() => {
    const d = new Date();
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', {
      timeZone: 'Asia/Manila',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!hasToken) {
      setError('Invalid or expired reset link. Please request a new one.');
      return;
    }

    if (!newPassword || !confirmPassword) {
      setError('Please enter and confirm your new password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Confirm password must match the new password.');
      return;
    }

    try {
      setSaving(true);
      const res = await post('/auth/reset-password', {
        access_token: hashInfo.accessToken,
        new_password: newPassword,
        confirm_password: confirmPassword
      }, false);

      if (!res?.success) throw new Error(res?.message || 'Failed to reset password');

      try {
        const normalized = String(res?.data?.email || '').trim();
        if (normalized) {
          window.localStorage.setItem(REMEMBERED_EMAIL_KEY, normalized);
        }
      } catch {
        // ignore storage errors
      }

      openConfirm({
        title: 'Success',
        message: 'Password reset successfully. You can now login with your new password.',
        confirmText: 'Go to Login',
        cancelText: null,
        onConfirm: () => {
          closeConfirm();
          navigate('/login');
        }
      });

      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err?.message || 'Failed to reset password. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#990100] px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        <div className="px-8 pt-8 pb-2 flex justify-center bg-white">
          <img
            src="/arise-logo-login.png"
            alt="ARISE"
            className="h-12 w-auto"
          />
        </div>

        <div className="px-8 pb-8 pt-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-[#990100] text-2xl font-bold tracking-wide uppercase">Reset Password</h1>
              {todayLabel ? <div className="text-xs text-gray-500 mt-1">{todayLabel}</div> : null}
            </div>

            <div className="shrink-0">
              <div className="inline-block bg-[#F59E0B] text-white font-bold text-[11px] tracking-wider rounded-full px-3 py-1">
                ACTION REQUIRED
              </div>
            </div>
          </div>

          <div className="h-px bg-gray-100 my-4" />

          <p className="text-sm text-gray-900 mb-5">Set a new password for your account.</p>

          {tokenError ? (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">
              {tokenError}
            </div>
          ) : null}

          {error ? (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">
              {error}
            </div>
          ) : null}

          {!hasToken ? (
            <div className="text-sm text-gray-700">
              Reset link is missing or expired. Please go back to the login page and request a new reset link.
              <div className="mt-4">
                <button
                  type="button"
                  className="bg-[#990100] hover:bg-[#ad3332] text-white px-4 py-2 rounded-full text-sm"
                  onClick={() => navigate('/login')}
                >
                  Back to Login
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <p className="text-xs font-bold text-[#483D3D] pb-1">NEW PASSWORD</p>
                <input
                  type="password"
                  className="bg-[#ffffff] rounded-lg border border-black focus:border-gray-300 focus:bg-white focus:ring-2 focus:ring-gray-200 h-10 w-full text-base outline-none text-gray-900 py-1 px-3 shadow-lg"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={saving}
                  autoComplete="new-password"
                  required
                />
              </div>

              <div className="mb-5">
                <p className="text-xs font-bold text-[#483D3D] pb-1">CONFIRM NEW PASSWORD</p>
                <input
                  type="password"
                  className="bg-[#ffffff] rounded-lg border border-black focus:border-gray-300 focus:bg-white focus:ring-2 focus:ring-gray-200 h-10 w-full text-base outline-none text-gray-900 py-1 px-3 shadow-lg"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={saving}
                  autoComplete="new-password"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className={`w-full text-white font-bold py-2 rounded-full transition ${
                  saving ? 'bg-[#ad3332]/60 cursor-not-allowed' : 'bg-[#990100] hover:bg-[#ad3332]'
                }`}
              >
                {saving ? 'Saving…' : 'Reset Password'}
              </button>
            </form>
          )}
        </div>
      </div>

      <ConfirmModal
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        onConfirm={confirmState.onConfirm}
        onCancel={confirmState.onCancel}
      />
    </div>
  );
}
