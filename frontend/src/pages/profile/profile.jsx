import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { get, post } from '../../services/api.js';
import ConfirmModal from '../../components/confirm-modal.jsx';

export default function Profile() {
  const { user } = useAuth();

  const [profile, setProfile] = useState(user);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [employeeDetails, setEmployeeDetails] = useState(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [photoPreviewUrl, setPhotoPreviewUrl] = useState('');
  const [photoLoading, setPhotoLoading] = useState(false);

  const [confirmState, setConfirmState] = useState({
    open: false,
    title: 'Success',
    message: '',
    confirmText: 'OK',
    cancelText: null,
  });

  const openConfirm = ({ title = 'Success', message = '' } = {}) => {
    setConfirmState({
      open: true,
      title,
      message,
      confirmText: 'OK',
      cancelText: null,
    });
  };

  const closeConfirm = () => {
    setConfirmState((prev) => ({ ...prev, open: false }));
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingProfile(true);
        const [meRes, empRes] = await Promise.all([get('/auth/me'), get('/employees/me')]);
        if (meRes?.success && meRes?.data) setProfile(meRes.data);
        if (empRes?.success && empRes?.data) setEmployeeDetails(empRes.data);
      } catch {
        // fallback to cached user
      } finally {
        setLoadingProfile(false);
      }
    };

    load();
  }, []);

  useEffect(() => {
    if (!employeeDetails?.id) return;

    let cancelled = false;
    let objectUrl = '';

    const loadPhoto = async () => {
      try {
        setPhotoLoading(true);
        setPhotoPreviewUrl('');

        // fetch documents using the 'me' endpoint for own documents
        const res = await get(`/employees/me/documents`);
        const docs = Array.isArray(res?.data) ? res.data : [];
        const photoDoc = docs.find(
          (d) => String(d?.document_name || '') === 'Employee Photo'
        ) || null;

        if (!photoDoc?.id) return;
        if (cancelled) return;

        const base = (
          import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
        ).replace(/\/$/, '');
        const apiBase = base.endsWith('/api') ? base : `${base}/api`;
        const token = localStorage.getItem('access_token');
        const downloadUrl = `${apiBase}/employees/me/documents/${photoDoc.id}/download?disposition=inline`;

        const fileRes = await fetch(downloadUrl, {
          method: 'GET',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!fileRes.ok) {
          const msg = await fileRes.text();
          throw new Error(msg || 'Failed to load photo');
        }

        const ct = String(
          fileRes.headers.get('content-type') || ''
        ).toLowerCase();
        let blob;

        if (ct.includes('application/json')) {
          const json = await fileRes.json();
          const signedUrl = json?.data?.signedUrl;
          if (!signedUrl) throw new Error('Failed to load photo');
          const signedRes = await fetch(signedUrl);
          if (!signedRes.ok) throw new Error('Failed to load photo');
          blob = await signedRes.blob();
        } else {
          blob = await fileRes.blob();
        }

        objectUrl = URL.createObjectURL(blob);
        if (cancelled) return;
        setPhotoPreviewUrl(objectUrl);
      } catch {

      } finally {
        if (!cancelled) setPhotoLoading(false);
      }
    };

    loadPhoto();

    return () => {
      cancelled = true;
      if (objectUrl) {
        try {
          URL.revokeObjectURL(objectUrl);
        } catch {}
      }
    };
  }, [employeeDetails?.id]);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Please fill out all password fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Confirm password must match the new password.');
      return;
    }

    try {
      setSaving(true);
      const res = await post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword
      });

      if (!res?.success) {
        throw new Error(res?.message || 'Failed to update password');
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMessage('Password updated successfully.');
      openConfirm({ title: 'Success', message: 'Password updated successfully.' });
    } catch (err) {
      setError(err?.message || 'Failed to update password');
    } finally {
      setSaving(false);
    }
  };

  const displayName = profile?.name || [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || '';

  const formatShortDate = (value) => {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
  };

  const empName = employeeDetails
    ? [employeeDetails.first_name, employeeDetails.middle_name, employeeDetails.last_name].filter(Boolean).join(' ')
    : '';

    if (loadingProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#990100] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading My Profile...</p>
        </div>
      </div>
    );
  }
  return (
    <div className=''>
      <div className="p-7 lg:mx-[4.5rem] md:mx-10">
        <div className="md:flex justify-between items-center w-full">
          <div>
            <h1 className="lg:text-3xl text-2xl text-[#990100] font-bold md:mb-0 mb-5">My Profile</h1>
            {loadingProfile && <p className="text-sm text-gray-600">Loading profile…</p>}
          </div>
        </div>

        <hr className="text-[#990100] mt-6" />

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5 mt-6 max-w-3xl mx-auto">
          <h2 className="text-[#990100] font-bold text-lg mb-4">User Details</h2>

          <div className="flex justify-center items-center gap-5 pb-6">
              <div className="w-22 h-22 rounded-md border border-gray-300 bg-gray-50 overflow-hidden flex items-center justify-center">
                {photoLoading ? (
                  <div className="text-xs text-gray-500">Loading…</div>
                ) : photoPreviewUrl ? (
                  <img
                    src={photoPreviewUrl}
                    alt="Employee Photo"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img src="/tab-logo.png" alt="No Photo" className="w-full h-full object-contain p-2" />
                )}
              </div>

              <div className="">
                <p className='text-md text-[#483D3D] pb-1'><span className='font-bold'>EMPLOYEE ID:</span> {employeeDetails?.employee_id || profile?.employee_id || '—'}</p>
                <p className='text-md text-[#483D3D] pb-1'><span className='font-bold'>NAME:</span> {empName || displayName || '—'}</p>
              </div>
          </div>

          <div className="grid md:grid-cols-2 grid-cols-1 gap-4">
              
            {/*<div>
              <p className="text-xs font-bold text-[#483D3D] pb-1">USER PHOTO:</p>
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-md border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center">
                  <div className="text-[10px] text-gray-500 text-center px-1">No Photo</div>
                  <img src = "/tab-logo.png"/>                   
                </div>
              </div>
              
            </div>*/}
            
            <div>
              <p className="text-xs font-bold text-[#483D3D] pb-1">EMPLOYEE ID:</p>
              <div className="bg-[#ffffff] rounded-lg border border-gray-300 md:h-11 h-10 flex items-center px-3 text-sm text-gray-900">
                {employeeDetails?.employee_id || profile?.employee_id || '—'}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-[#483D3D] pb-1">NAME:</p>
              <div className="bg-[#ffffff] rounded-lg border border-gray-300 md:h-11 h-10 flex items-center px-3 text-sm text-gray-900">
                {empName || displayName || '—'}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-[#483D3D] pb-1">EMAIL:</p>
              <div className="bg-[#ffffff] rounded-lg border border-gray-300 md:h-11 h-10 flex items-center px-3 text-sm text-gray-900">
                {profile?.email || '—'}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-[#483D3D] pb-1">ROLE:</p>
              <div className="bg-[#ffffff] rounded-lg border border-gray-300 md:h-11 h-10 flex items-center px-3 text-sm text-gray-900">
                {profile?.role || '—'}
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-[#483D3D] pb-1">DEPARTMENT:</p>
              <div className="bg-[#ffffff] rounded-lg border border-gray-300 md:h-11 h-10 flex items-center px-3 text-sm text-gray-900">
                {employeeDetails?.departments?.department_name || '—'}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-[#483D3D] pb-1">POSITION:</p>
              <div className="bg-[#ffffff] rounded-lg border border-gray-300 md:h-11 h-10 flex items-center px-3 text-sm text-gray-900">
                {employeeDetails?.positions?.position_title || '—'}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-[#483D3D] pb-1">HIRE DATE:</p>
              <div className="bg-[#ffffff] rounded-lg border border-gray-300 md:h-11 h-10 flex items-center px-3 text-sm text-gray-900">
                {formatShortDate(employeeDetails?.hire_date)}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-[#483D3D] pb-1">BIRTH DATE:</p>
              <div className="bg-[#ffffff] rounded-lg border border-gray-300 md:h-11 h-10 flex items-center px-3 text-sm text-gray-900">
                {formatShortDate(employeeDetails?.birth_date)}
              </div>
            </div>
            {/* PLS UNCOMMENT - FOR SEX
            <div>
              <p className="text-xs font-bold text-[#483D3D] pb-1">SEX:</p>
              <div className="bg-[#ffffff] rounded-lg border border-gray-300 md:h-11 h-10 flex items-center px-3 text-sm text-gray-900">
                {formatShortDate(employeeDetails?.sex)}
              </div>
            </div>*/}
            <div>
              <p className="text-xs font-bold text-[#483D3D] pb-1">PHONE NUMBER:</p>
              <div className="bg-[#ffffff] rounded-lg border border-gray-300 md:h-11 h-10 flex items-center px-3 text-sm text-gray-900">
                {employeeDetails?.phone_number || '—'}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-[#483D3D] pb-1">EMPLOYMENT STATUS:</p>
              <div className="bg-[#ffffff] rounded-lg border border-gray-300 md:h-11 h-10 flex items-center px-3 text-sm text-gray-900">
                {employeeDetails?.employment_status || '—'}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-[#483D3D] pb-1">PERSONNEL TYPE:</p>
              <div className="bg-[#ffffff] rounded-lg border border-gray-300 md:h-11 h-10 flex items-center px-3 text-sm text-gray-900">
                {employeeDetails?.personnel_type || '—'}
              </div>
            </div>
            <div className="md:col-span-2">
              <p className="text-xs font-bold text-[#483D3D] pb-1">ADDRESS:</p>
              <div className="bg-[#ffffff] rounded-lg border border-gray-300 min-h-11 flex items-center px-3 text-sm text-gray-900">
                {employeeDetails?.address || '—'}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-[#483D3D] pb-1">EMERGENCY CONTACT NAME:</p>
              <div className="bg-[#ffffff] rounded-lg border border-gray-300 md:h-11 h-10 flex items-center px-3 text-sm text-gray-900">
                {employeeDetails?.emergency_contact_name || '—'}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-[#483D3D] pb-1">EMERGENCY CONTACT NUMBER:</p>
              <div className="bg-[#ffffff] rounded-lg border border-gray-300 md:h-11 h-10 flex items-center px-3 text-sm text-gray-900">
                {employeeDetails?.emergency_contact_number || '—'}
              </div>
            </div>
          </div>

          <hr className="my-6" />

          <h2 className="text-[#990100] font-bold text-lg mb-4">Change Password</h2>

          {message && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">{message}</div>
          )}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>
          )}

          <form onSubmit={handleChangePassword}>
            <div className="grid md:grid-cols-2 grid-cols-1 gap-4">
              <div>
                <p className="text-xs font-bold text-[#483D3D] pb-1">CURRENT PASSWORD:</p>
                <input
                  type="password"
                  className="bg-[#ffffff] rounded-lg border border-[#990100] focus:border-gray-300 focus:bg-white focus:ring-2 focus:ring-gray-200 md:h-11 h-10 w-full text-base outline-none text-gray-900 py-1 px-3 resize-none leading-6 shadow-lg"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={saving}
                  autoComplete="current-password"
                />
              </div>
              <div>
                <p className="text-xs font-bold text-[#483D3D] pb-1">NEW PASSWORD:</p>
                <input
                  type="password"
                  className="bg-[#ffffff] rounded-lg border border-[#990100] focus:border-gray-300 focus:bg-white focus:ring-2 focus:ring-gray-200 md:h-11 h-10 w-full text-base outline-none text-gray-900 py-1 px-3 resize-none leading-6 shadow-lg"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={saving}
                  autoComplete="new-password"
                />
              </div>
              <div>
                <p className="text-xs font-bold text-[#483D3D] pb-1">CONFIRM NEW PASSWORD:</p>
                <input
                  type="password"
                  className="bg-[#ffffff] rounded-lg border border-[#990100] focus:border-gray-300 focus:bg-white focus:ring-2 focus:ring-gray-200 md:h-11 h-10 w-full text-base outline-none text-gray-900 py-1 px-3 resize-none leading-6 shadow-lg"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={saving}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div className="pt-6 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="text-white lg:text-sm text-xs bg-[#990100] border-0 py-[8px] px-5 focus:outline-none hover:bg-[#ad3332] rounded-lg font-semibold cursor-pointer disabled:opacity-60 hover:scale-110 transition"
              >
                {saving ? 'Updating…' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <ConfirmModal
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        onConfirm={closeConfirm}
        onCancel={closeConfirm}
        confirmDisabled={saving}
      />
    </div>
  );
}
