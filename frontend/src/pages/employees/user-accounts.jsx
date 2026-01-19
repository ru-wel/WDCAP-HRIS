import React, { useEffect, useMemo, useState } from 'react'
import { del, get, put, post } from "../../services/api.js";
import ReactPaginate from 'react-paginate';
import ConfirmModal from "../../components/confirm-modal.jsx";
import { compareDate, compareText } from '../../utils/sort.js';
import { exportRowsToCsv } from '../../utils/csv.js';
import { exportRowsToXlsx } from '../../utils/excel.js';
import ReportModal from '../../components/report-modal.jsx';
import { filterRowsByDateRange } from '../../utils/reporting.js';
import { exportReportToPdf } from '../../utils/pdf.js';

function ChipButton({ active, children, onClick, title }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={[
        "px-3 py-1 rounded-full text-xs font-semibold border transition cursor-pointer",
        active
          ? "bg-[#990100] text-white border-[#990100]"
          : "bg-white text-[#990100] border-[#990100] hover:bg-[#990100]/10",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function ModalAccounts ({isOpen, onClose, employeeAcc, onSave, onDelete}){

    const [data, setData] = useState(employeeAcc);
    const [editData, setEditData] = useState(false);
    const [loading, setLoading] = useState(false);
    const [resetMode, setResetMode] = useState(false);
    const [resetPassword, setResetPassword] = useState('');
    const [resetConfirmPassword, setResetConfirmPassword] = useState('');
    const [confirmState, setConfirmState] = useState({
        open: false,
        title: 'Confirmation',
        message: '',
        confirmText: 'OK',
        cancelText: 'Cancel',
        onConfirm: null,
    });

    const [confirmBusy, setConfirmBusy] = useState(false);

    const openConfirm = ({ title, message, confirmText, cancelText, onConfirm }) => {
        setConfirmState({
            open: true,
            title: title || 'Confirmation',
            message: message || '',
            confirmText: confirmText || 'OK',
            cancelText: cancelText ?? 'Cancel',
            onConfirm: onConfirm || null,
        });
    };

    const closeConfirm = () => {
        setConfirmState((prev) => ({ ...prev, open: false, onConfirm: null }));
    };

    const handleConfirm = async () => {
        const fn = confirmState.onConfirm;
        if (!fn) {
            closeConfirm();
            return;
        }

        try {
            closeConfirm();
            setConfirmBusy(true);
            await fn?.();
        } catch (e) {
            setConfirmState({
                open: true,
                title: 'Error',
                message: e?.message || 'Action failed.',
                confirmText: 'OK',
                cancelText: null,
                onConfirm: null,
            });
        } finally {
            setConfirmBusy(false);
        }
    };

    const handleChange = (a) => {
        const { name, value } = a.target;
        setData(prev => ({...(prev ?? employeeAcc ?? {}), [name]:value}));
    };

    const [initialData, setInitialData] = useState(employeeAcc);

    useEffect(() => {
        if (!isOpen || !employeeAcc) return;
        setData(employeeAcc);
        setInitialData(employeeAcc);
        setEditData(false);
        setResetMode(false);
        setResetPassword('');
        setResetConfirmPassword('');
        setConfirmBusy(false);
        setConfirmState({
            open: false,
            title: 'Confirmation',
            message: '',
            confirmText: 'OK',
            cancelText: 'Cancel',
            onConfirm: null,
        });
    }, [isOpen, employeeAcc]);

    if (!isOpen || !employeeAcc) return null;

    const currentData = data ?? employeeAcc;
    const originalData = initialData ?? employeeAcc;
    const unsavedChanges = JSON.stringify(currentData) !== JSON.stringify(originalData);

    return (
            <div className="fixed inset-0 flex items-center justify-center z-1000 bg-[#EDEDED]/50 p-4">
             <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 lg:w-160 md:w-120 w-80  overflow-y-auto border border-gray-300" data-lenis-prevent>
                <div className="rounded-lg bg-[#990100] flex items-center justify-between lg:py-[10px] py-[6px] md:px-4 px-3">
                    <h1 className='text-white text-lg font-medium lg:text-lg text-sm'>Account of {currentData.id}</h1>
                    <button className="text-white text-2xl font-bold hover:scale-110 transition cursor-pointer"
                    onClick={() => {
                        if (unsavedChanges){
                            openConfirm({
                                message: 'You have unsaved changes. Do you want to close it without saving?',
                                confirmText: 'OK',
                                cancelText: 'Cancel',
                                onConfirm: () => onClose()
                            });
                            return;
                        }
                        onClose();
                    }}> ✕ </button>
                </div>

                <div className="pt-5 px-4 sm:px-10 md:px-14">

                    <p className='lg:text-sm text-xs'><b>Employee ID:</b> {currentData.id}</p>
                    <div className="lg:pt-3 pt-2">
                        <p className='lg:text-sm text-xs pb-2 font-semibold'>Role:</p>
                        <select name="role" className='input-field disabled:text-gray-600 lg:py-1.5 lg:px-2 p-1 lg:text-sm text-xs cursor-pointer disabled:cursor-default' value={currentData.role || ""} disabled = {!editData || loading} onChange={handleChange} required>
                            <option value="">Select Role</option>
                            <option value="Admin">Admin</option>
                            <option value="HR">HR</option>
                            <option value="Employee">Employee</option>
                        </select>
                    </div>

                    <div className="lg:pt-3 pt-2">
                        <p className='lg:text-sm text-xs pb-2 font-semibold'>Email:</p>
                        <input type="email" name="email" className="input-field disabled:text-gray-600 lg:py-1.5 lg:px-2 p-1 lg:text-sm text-xs disabled:cursor-default" value={currentData.email || ""} disabled />
                    </div>

                    <div className="lg:pt-3 pt-2">
                        <p className='lg:text-sm text-xs pb-2 font-semibold'>Status:</p>
                        <select name="status" className='input-field disabled:text-gray-600 lg:py-1.5 lg:px-2 p-1 lg:text-sm text-xs cursor-pointer disabled:cursor-default' value={currentData.status || ""} disabled = {!editData || loading} onChange={handleChange} required>
                            <option value="">Select Status</option>
                            <option value="ACTIVE">ACTIVE</option>
                            <option value="INACTIVE">INACTIVE</option>
                        </select>
                    </div>
                </div>

                 <div className="pt-7">
                    {!editData ? (
                        <div className="flex justify-center gap-4">
                            <button
                                onClick={() => setEditData(true)}
                                disabled={loading}
                                className='bg-[#198C19] lg:px-5 py-[7px] px-4 lg:text-[15px] text-xs rounded-md text-white hover:bg-[#46a346] hover:scale-105 transition duration-300 ease-in-out disabled:opacity-50 cursor-pointer'
                            >
                                Update Account
                            </button>

                            <button
                                onClick={() => setResetMode((p) => !p)}
                                disabled={loading}
                                className='bg-[#FFA500] lg:px-5 py-[7px] px-4 lg:text-[15px] text-xs rounded-md text-white hover:bg-[#ffb732] hover:scale-105 transition duration-300 ease-in-out disabled:opacity-50 cursor-pointer'
                            >
                                {resetMode ? 'Cancel Reset' : 'Reset Password'}
                            </button>

                            <button
                                onClick={async () => {
                                    openConfirm({
                                        title: 'Delete account',
                                        message: 'Delete this account?\n\n• This permanently removes the user login and cannot be undone.\n• If this user is linked to an employee profile, deletion will be blocked to protect records and uploaded files. Archive the employee instead.',
                                        confirmText: 'OK',
                                        cancelText: 'Cancel',
                                        onConfirm: async () => {
                                            setLoading(true);
                                            try {
                                                await onDelete(currentData.id);
                                                onClose();
                                            } catch (e) {
                                                openConfirm({
                                                    title: 'Delete failed',
                                                    message: e?.message || 'Failed to delete user',
                                                    confirmText: 'OK',
                                                    cancelText: null,
                                                    onConfirm: null,
                                                });
                                            } finally {
                                                setLoading(false);
                                            }
                                        }
                                    });
                                }}
                                disabled={loading}
                                className='bg-[#C60000] lg:px-5 py-[7px] px-4 lg:text-[15px] text-xs rounded-md text-white hover:bg-[#d13232] hover:scale-105 transition duration-300 ease-in-out disabled:opacity-50 cursor-pointer'
                            >
                                {loading ? "Deleting..." : "Delete Account"}
                            </button>
                        </div>
                    ):(
                        <div className="flex justify-end gap-4">
                            <button className='bg-[#C60000] lg:px-5 py-[7px] px-4 py lg:text-[15px] text-xs rounded-md text-white hover:bg-[#d13232] hover:scale-105 transition duration-300 ease-in-out cursor-pointer'
                                    onClick = {() => {
                                        if (unsavedChanges){
                                            openConfirm({
                                                message: 'You have unsaved changes. Do you want to close it without saving?',
                                                confirmText: 'OK',
                                                cancelText: 'Cancel',
                                                onConfirm: () => {
                                                    setData(initialData);
                                                    setEditData(false);
                                                }
                                            });
                                            return;
                                        }
                                        setData(initialData);
                                        setEditData(false);
                                    }}
                                >Cancel Changes</button>
                            <button
                                onClick={async () => {
                                    if (!currentData.role || !currentData.status) {
                                        openConfirm({
                                            title: 'Missing fields',
                                            message: 'Please fill out all fields and do not leave any of them blank.',
                                            confirmText: 'OK',
                                            cancelText: null,
                                            onConfirm: null,
                                        });
                                        return;
                                    }

                                    openConfirm({
                                        message: 'Are you sure you want to save these changes?',
                                        confirmText: 'OK',
                                        cancelText: 'Cancel',
                                        onConfirm: async () => {
                                            setLoading(true);
                                            try {
                                                await onSave(currentData);
                                                setEditData(false);
                                                openConfirm({
                                                    title: 'Success',
                                                    message: `Successfully updated the record of ${currentData.id}!`,
                                                    confirmText: 'OK',
                                                    cancelText: null,
                                                    onConfirm: () => onClose(),
                                                });
                                            } catch (e) {
                                                openConfirm({
                                                    title: 'Update failed',
                                                    message: e?.message || 'Failed to update user',
                                                    confirmText: 'OK',
                                                    cancelText: null,
                                                    onConfirm: null,
                                                });
                                            } finally {
                                                setLoading(false);
                                            }
                                        }
                                    });
                                }}
                                disabled={loading}
                                className='bg-[#FFA500] lg:px-5 md:py-[7px] px-4 py-[7px] lg:text-[15px] text-xs rounded-md text-white hover:bg-[#ffb732] hover:scale-105 transition duration-300 ease-in-out disabled:opacity-50 cursor-pointer'
                            >
                                {loading ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    )}

                    {resetMode && !editData ? (
                        <div className="pt-5 px-4 sm:px-10 md:px-14">
                            <p className='lg:text-sm text-xs pb-2 font-medium'>New Password</p>
                            <input
                                type="password"
                                className="input-field disabled:text-gray-600 lg:py-1.5 lg:px-2 p-1 lg:text-sm text-xs"
                                value={resetPassword}
                                onChange={(e) => setResetPassword(e.target.value)}
                                disabled={loading}
                                placeholder="Enter new password"
                            />

                            <div className="pt-3">
                                <p className='lg:text-sm text-xs pb-2 font-medium'>Confirm Password</p>
                                <input
                                    type="password"
                                    className="input-field disabled:text-gray-600 lg:py-1.5 lg:px-2 p-1 lg:text-sm text-xs"
                                    value={resetConfirmPassword}
                                    onChange={(e) => setResetConfirmPassword(e.target.value)}
                                    disabled={loading}
                                    placeholder="Confirm new password"
                                />
                            </div>

                            <div className="pt-5 flex justify-center">
                                <button
                                    type="button"
                                    disabled={loading}
                                    className='bg-[#990100] lg:px-5 py-[7px] px-4 lg:text-[15px] text-xs rounded-md text-white hover:bg-[#ad3332] hover:scale-105 transition duration-300 ease-in-out disabled:opacity-50 cursor-pointer'
                                    onClick={() => {
                                        if (!resetPassword || !resetConfirmPassword) {
                                            openConfirm({
                                                title: 'Missing fields',
                                                message: 'Please enter and confirm the new password.',
                                                confirmText: 'OK',
                                                cancelText: null,
                                                onConfirm: null,
                                            });
                                            return;
                                        }

                                        openConfirm({
                                            title: 'Reset password',
                                            message: 'Reset this user\'s password now?',
                                            confirmText: 'OK',
                                            cancelText: 'Cancel',
                                            onConfirm: async () => {
                                                setLoading(true);
                                                try {
                                                    const res = await post('/auth/admin-reset-password', {
                                                        employeeId: currentData.id,
                                                        new_password: resetPassword,
                                                        confirm_password: resetConfirmPassword,
                                                    });

                                                    if (res?.success) {
                                                        openConfirm({
                                                            title: 'Success',
                                                            message: 'Password reset successfully.',
                                                            confirmText: 'OK',
                                                            cancelText: null,
                                                            onConfirm: () => {
                                                                setResetMode(false);
                                                                setResetPassword('');
                                                                setResetConfirmPassword('');
                                                            },
                                                        });
                                                    }
                                                } catch (e) {
                                                    openConfirm({
                                                        title: 'Reset failed',
                                                        message: e?.message || 'Failed to reset password',
                                                        confirmText: 'OK',
                                                        cancelText: null,
                                                        onConfirm: null,
                                                    });
                                                } finally {
                                                    setLoading(false);
                                                }
                                            }
                                        });
                                    }}
                                >
                                    {loading ? 'Resetting…' : 'Confirm Reset'}
                                </button>
                            </div>
                        </div>
                    ) : null}
                 </div>
             </div>

             <ConfirmModal
                 open={confirmState.open}
                 title={confirmState.title}
                 message={confirmState.message}
                 confirmText={confirmBusy ? 'Processing…' : confirmState.confirmText}
                 cancelText={confirmState.cancelText}
                 onConfirm={handleConfirm}
                 onCancel={confirmBusy ? undefined : closeConfirm}
                 confirmDisabled={loading || confirmBusy}
             />
        </div>
    )

}

function UserAccounts (){

    const [isModalOpen, setModalOpen] = useState(false);
    const [viewEmployeeAcc, setViewEmployeeAcc] = useState(null);
    const [employeesAcc, setEmployeesAcc] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [sortOrder, setSortOrder] = useState('email_az');
    const [roleFilter, setRoleFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');

    const [reportOpen, setReportOpen] = useState(false);

    const sortOptions = useMemo(() => ([
      { value: 'employee_id_asc', label: 'Employee ID: Asc' },
      { value: 'employee_id_desc', label: 'Employee ID: Desc' },
      { value: 'email_az', label: 'Email: A–Z' },
      { value: 'email_za', label: 'Email: Z–A' },
      { value: 'role_az', label: 'Role: A–Z' },
      { value: 'role_za', label: 'Role: Z–A' },
      { value: 'created_at_newest', label: 'Created: Newest' },
      { value: 'created_at_oldest', label: 'Created: Oldest' },
      { value: 'status_az', label: 'Status: A–Z' },
      { value: 'status_za', label: 'Status: Z–A' },
    ]), []);

    const activeFilterCount = useMemo(() => {
      let n = 0;
      if (roleFilter !== 'all') n += 1;
      if (statusFilter !== 'all') n += 1;
      if (sortOrder !== 'email_az') n += 1;
      return n;
    }, [roleFilter, statusFilter, sortOrder]);

    useEffect(() => {
      if (!filtersOpen) return;
      const onDown = (e) => {
        const t = e.target;
        if (!(t instanceof HTMLElement)) return;
        if (t.closest?.('[data-filters-root="true"]')) return;
        setFiltersOpen(false);
      };
      window.addEventListener('mousedown', onDown);
      return () => window.removeEventListener('mousedown', onDown);
    }, [filtersOpen]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await get("/users");
            if (!res?.success) {
                throw new Error(res?.message || "Failed to fetch user accounts");
            }

            const rows = (res.data || []).map((u) => ({
                id: u.employee_id || u.id,
                email: u.email,
                role: u.role,
                createdAtRaw: u.created_at || "",
                createdAt: u.created_at
                    ? new Date(u.created_at).toLocaleDateString("en-US", {
                        month: "2-digit",
                        day: "2-digit",
                        year: "2-digit",
                    })
                    : "",
                status: u.status || "ACTIVE",
            }));
            setEmployeesAcc(rows);
            setError("");
        } catch (e) {
            console.error(e);
            setEmployeesAcc([]);
            setError(e?.message || "Failed to load user accounts");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleOpen = (employeeAcc) => {
        setViewEmployeeAcc(employeeAcc);
        setModalOpen(true)
    };

    const handleClose = () => setModalOpen(false);

    const updateEmployeeAcc = async (updated) => {
        setEmployeesAcc(prev => prev.map(emp => emp.id === updated.id ? updated : emp));
        try {
            const res = await put(`/users/${updated.id}`, {
                role: updated.role,
                status: updated.status,
            });

            const u = res.data;
            const normalized = {
                id: u.employee_id || u.id,
                email: u.email,
                role: u.role,
                createdAtRaw: u.created_at || "",
                createdAt: u.created_at
                    ? new Date(u.created_at).toLocaleDateString("en-US", {
                        month: "2-digit",
                        day: "2-digit",
                        year: "2-digit",
                    })
                    : "",
                status: u.status || "ACTIVE",
            };

            setEmployeesAcc(prev => prev.map(emp => emp.id === normalized.id ? normalized : emp));
        } catch (e) {
            await fetchUsers();
            throw e;
        }
    };

    const deleteEmployeeAcc = async (employeeId) => {
        const target = employeesAcc.find((u) => u.id === employeeId);
        if (target?.status && String(target.status).toUpperCase() !== 'INACTIVE') {
            throw new Error('Archive the employee first (Employees page), then delete the user account.');
        }
        setEmployeesAcc(prev => prev.filter(emp => emp.id !== employeeId));
        try {
            await del(`/users/${employeeId}`);
        } catch (e) {
            await fetchUsers();
            throw e;
        }
    }

    const filteredEmployeesAcc = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();

        const filtered = employeesAcc
          .filter((row) => {
            if (!q) return true;
            const haystack = `${row.id} ${row.email} ${row.role} ${row.createdAt} ${row.status}`.toLowerCase();
            return haystack.includes(q);
          })
          .filter((row) => {
            const role = String(row?.role || '').trim().toLowerCase();
            const status = String(row?.status || '').trim().toLowerCase();

            if (roleFilter !== 'all' && role !== roleFilter) return false;
            if (statusFilter !== 'all' && status !== statusFilter) return false;

            return true;
          });

        const sorted = [...filtered].sort((a, b) => {
            switch (sortOrder) {
                case 'employee_id_asc':
                    return compareText(a?.id, b?.id);
                case 'employee_id_desc':
                    return compareText(b?.id, a?.id);
                case 'email_az':
                    return compareText(a?.email, b?.email);
                case 'email_za':
                    return compareText(b?.email, a?.email);
                case 'role_az':
                    return compareText(a?.role, b?.role);
                case 'role_za':
                    return compareText(b?.role, a?.role);
                case 'created_at_newest':
                    return compareDate(b?.createdAtRaw, a?.createdAtRaw);
                case 'created_at_oldest':
                    return compareDate(a?.createdAtRaw, b?.createdAtRaw);
                case 'status_az':
                    return compareText(a?.status, b?.status);
                case 'status_za':
                    return compareText(b?.status, a?.status);
                default:
                    return compareText(a?.email, b?.email);
            }
        });

        return sorted;
    }, [employeesAcc, searchTerm, sortOrder, roleFilter, statusFilter]);

    //REACT-PAGINATE
    const [itemOffset, setItemOffset] = useState(0);
    const itemsPerPage = 15;
    const endOffset = itemOffset + itemsPerPage;
    const currentUserAcc = filteredEmployeesAcc.slice(itemOffset, endOffset);
    const pageCount = Math.ceil(filteredEmployeesAcc.length / itemsPerPage);
    const multiPages = pageCount > 1;
    const currentPage = pageCount ? Math.floor(itemOffset / itemsPerPage) + 1 : 0;

    const handlePageClick = (event) => {
        const newOffset = (event.selected * itemsPerPage);
        setItemOffset(newOffset);
    };

    useEffect(() => {
        setItemOffset(0);
    }, [searchTerm, sortOrder, roleFilter, statusFilter, employeesAcc.length]);

    const handleGenerateReport = ({ startDate, endDate, fileType, category } = {}) => {
        const base = (startDate || endDate)
            ? filterRowsByDateRange(filteredEmployeesAcc, (r) => r?.createdAtRaw || r?.createdAt, startDate, endDate)
            : filteredEmployeesAcc;

        const cat = category || 'all';
        const rowsForExport = base.filter((r) => {
            const role = String(r?.role || '').toLowerCase();
            const status = String(r?.status || '').toLowerCase();

            if (cat === 'admins') return role === 'admin';
            if (cat === 'hr') return role === 'hr';
            if (cat === 'employees') return role === 'employee';
            if (cat === 'active') return status === 'active';
            if (cat === 'inactive') return status === 'inactive';
            return true;
        });

        const stamp = new Date().toISOString().slice(0, 10);
        const upperType = String(fileType || 'XLSX').toUpperCase();
        const isCsv = upperType === 'CSV';
        const isPdf = upperType === 'PDF';
        const ext = isPdf ? 'pdf' : isCsv ? 'csv' : 'xlsx';
        const filename = `user-accounts-report-${cat}-${stamp}.${ext}`;

        post('/audit-logs/reports', {
            report_name: 'User Accounts Report',
            filename,
            start_date: startDate || null,
            end_date: endDate || null,
            row_count: rowsForExport.length,
            source: 'user-accounts',
        }).catch(() => {});

        const columns = [
            { header: 'Employee ID', value: (r) => r.id },
            { header: 'Email', value: (r) => r.email },
            { header: 'Role', value: (r) => r.role },
            { header: 'Created At', value: (r) => r.createdAt },
            { header: 'Status', value: (r) => r.status },
        ];

        if (isPdf) {
            exportReportToPdf({
                filename,
                title: 'User Accounts Report',
                summaryLines: [
                    `Category: ${cat}`,
                    startDate || endDate ? `Range: ${startDate || '…'} to ${endDate || '…'}` : 'Range: All time',
                ],
                columns,
                rows: rowsForExport,
            }).catch(() => {});
        } else if (isCsv) {
            exportRowsToCsv({ filename, columns, rows: rowsForExport });
        } else {
            exportRowsToXlsx({ filename, sheetName: 'User Accounts', columns, rows: rowsForExport });
        }

        setReportOpen(false);
    };

    const clearFilters = () => {
      setSortOrder('email_az');
      setRoleFilter('all');
      setStatusFilter('all');
    };

    return(
        <div className="">
            <div className="p-7 lg:mx-[4.5rem] md:mx-10">
                {/* HEADER */}
                <div className="md:flex justify-between items-center w-full">

                    <div className="">
                        <h1 className='lg:text-3xl text-2xl text-[#990100] font-bold md:mb-0 mb-5'>User Accounts</h1>
                    </div>

                    <div className="flex items-center justify-end md:gap-4 gap-3">
                        <div className="relative" data-filters-root="true">
                            <button
                                type="button"
                                onClick={() => setFiltersOpen((p) => !p)}
                                className="bg-white lg:h-10 md:h-9 h-8 px-3 rounded-lg text-sm border border-[#990100] text-[#990100] hover:bg-[#990100]/10 transition cursor-pointer inline-flex items-center gap-2"
                                aria-haspopup="dialog"
                                aria-expanded={filtersOpen}
                            >
                                <span className="font-medium">Filters</span>
                                {activeFilterCount ? (
                                    <span className="ml-1 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-[#990100] text-white text-xs">
                                        {activeFilterCount}
                                    </span>
                                ) : null}
                                <span className="text-xs">▾</span>
                            </button>

                          {filtersOpen ? (
                            <div className="absolute right-0 mt-2 w-[320px] bg-white border border-gray-200 rounded-xl shadow-lg p-4 z-50">
                              <div className="flex items-center justify-between mb-3">
                                <p className="text-sm font-semibold text-[#111827]">Filters</p>
                                <button
                                  type="button"
                                  onClick={() => setFiltersOpen(false)}
                                  className="text-xs text-gray-600 hover:text-gray-900 cursor-pointer"
                                >
                                  Close
                                </button>
                              </div>

                              <div className="space-y-4">
                                {/* SORT */}
                                <div>
                                  <p className="text-xs font-semibold text-gray-700 mb-2">Sort</p>
                                  <div className="flex flex-wrap gap-2">
                                    {sortOptions.map((opt) => (
                                      <ChipButton
                                        key={opt.value}
                                        active={sortOrder === opt.value}
                                        onClick={() => setSortOrder(opt.value)}
                                        title={opt.label}
                                      >
                                        {opt.label}
                                      </ChipButton>
                                    ))}
                                  </div>
                                </div>

                                {/* ROLE */}
                                <div>
                                  <p className="text-xs font-semibold text-gray-700 mb-2">Role</p>
                                  <div className="flex flex-wrap gap-2">
                                    <ChipButton active={roleFilter === 'all'} onClick={() => setRoleFilter('all')}>All</ChipButton>
                                    <ChipButton active={roleFilter === 'admin'} onClick={() => setRoleFilter('admin')}>Admin</ChipButton>
                                    <ChipButton active={roleFilter === 'hr'} onClick={() => setRoleFilter('hr')}>HR</ChipButton>
                                    <ChipButton active={roleFilter === 'employee'} onClick={() => setRoleFilter('employee')}>Employee</ChipButton>
                                  </div>
                                </div>

                                {/* STATUS */}
                                <div>
                                  <p className="text-xs font-semibold text-gray-700 mb-2">Status</p>
                                  <div className="flex flex-wrap gap-2">
                                    <ChipButton active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>All</ChipButton>
                                    <ChipButton active={statusFilter === 'active'} onClick={() => setStatusFilter('active')}>Active</ChipButton>
                                    <ChipButton active={statusFilter === 'inactive'} onClick={() => setStatusFilter('inactive')}>Inactive</ChipButton>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between pt-2">
                                  <button
                                    type="button"
                                    onClick={clearFilters}
                                    className="text-xs font-semibold text-[#990100] hover:underline cursor-pointer"
                                  >
                                    Clear all
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setFiltersOpen(false)}
                                    className="bg-[#990100] text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-[#ad3332] transition cursor-pointer"
                                  >
                                    Apply
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : null}
                        </div>

                        {/* SEARCH */}
                        <div className="relative text-gray-600 border border-[#990100] rounded-lg ">
                            <input
                                type="search"
                                name="search"
                                placeholder="Search"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-white lg:h-10 md:h-9 h-8 px-2 lg:pr-10 md:pr-5 pr-5 md:w-auto w-35 rounded-lg text-sm focus:outline-none"
                            />
                            <button
                                type="submit"
                                className="absolute right-0 top-0 md:mt-3 mt-2 lg:mr-3 mr-2 items-center cursor-pointer"
                            >
                                <img
                                src="/icons/red-search.png"
                                className="lg:w-5 lg:h-5 w-4 h-4 items-center"
                                alt="search"
                                />
                            </button>
                        </div>
                    </div>
                </div>

                <hr className='text-[#990100] mt-6 '/>

                <ReportModal
                    open={reportOpen}
                    title="Generate Report - User Accounts"
                    onClose={() => setReportOpen(false)}
                    onGenerate={handleGenerateReport}
                    enableDateRange={true}
                    fileTypes={['XLSX', 'CSV', 'PDF']}
                    categoryOptions={[
                        { value: 'all', label: 'All Accounts' },
                        { value: 'admins', label: 'Admins' },
                        { value: 'hr', label: 'HR' },
                        { value: 'employees', label: 'Employees' },
                        { value: 'active', label: 'Active' },
                        { value: 'inactive', label: 'Inactive' },
                    ]}
                    defaultCategory="all"
                />

                <div className="div-table">
                    <table className="table-style">
                        <thead className="thead-style">
                            <tr>
                                <th className="th-style rounded-tl-lg rounded-bl-lg">Employee ID</th>
                                <th className="th-style">Email</th>
                                <th className="th-style">Role</th>
                                <th className="th-style">Created At</th>
                                <th className="th-style">Status</th>
                                <th className="th-style rounded-tr-lg rounded-br-lg">Actions</th>
                            </tr>
                        </thead>
                        <tbody className='tbody-style'>
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                        Loading...
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                        <p className="mb-3">{error}</p>
                                        <button
                                            onClick={fetchUsers}
                                            className="bg-[#990100] text-white px-4 py-2 rounded hover:bg-[#ad3332] cursor-pointer"
                                        >
                                            Retry
                                        </button>
                                    </td>
                                </tr>
                            ) : filteredEmployeesAcc.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                        No employees found
                                    </td>
                                </tr>
                            ) : (
                               currentUserAcc.map((row) => (
                                    <tr key={row.id} className="tr-style">
                                        <td className="td-style-nobtn font-medium">
                                            {row.id}
                                        </td>
                                        <td className="td-style">
                                            {row.email}
                                        </td>
                                        <td className="td-style">
                                            {row.role}
                                        </td>
                                        <td className="td-style">
                                            {row.createdAt}
                                        </td>
                                        <td className="td-style">
                                            {(() => {
                                                const normalized = String(row.status || '').toUpperCase();
                                                const label = normalized || '—';
                                                const isActive = normalized === 'ACTIVE';
                                                return (
                                                    <span
                                                        className={`inline-flex max-w-full items-center justify-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${
                                                            isActive
                                                                ? 'text-[#198C19] bg-[#198C19]/25'
                                                                : 'text-[#C60000] bg-[#C60000]/25'
                                                        }`}
                                                    >
                                                        <span className="truncate">{label}</span>
                                                    </span>
                                                );
                                            })()}
                                        </td>
                                        <td className="td-style">
                                            <button className="bg-[#990100] text-white lg:text-sm text-xs px-4 py-[5px] rounded-lg hover:bg-[#ad3332] hover:scale-105 transition duration-300 ease-in-out cursor-pointer" onClick={() => handleOpen(row)}>
                                                View Details
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    <ModalAccounts
                        isOpen={isModalOpen}
                        onClose={handleClose}
                        employeeAcc = {viewEmployeeAcc}
                        onSave={updateEmployeeAcc}
                        onDelete={deleteEmployeeAcc}
                    />
                    <br />

                    <div className="lg:flex items-center lg:justify-between">
                        <p className="lg:text-md text-sm">
                            Showing <b>{currentUserAcc.length}</b> of <b>{filteredEmployeesAcc.length}</b> employee{filteredEmployeesAcc.length !== 1 ? 's' : ''}
                            {pageCount ? <> | Page <b>{currentPage}</b> of <b>{pageCount}</b></> : null}
                        </p>

                        <div className=" ">
                            {pageCount > 0 && (
                                <ReactPaginate
                                    breakLabel="..."
                                    nextLabel=">"
                                    onPageChange={handlePageClick}
                                    pageRangeDisplayed={2}
                                    pageCount={pageCount}
                                    forcePage={Math.floor(itemOffset / itemsPerPage)}
                                    previousLabel="<"
                                    renderOnZeroPageCount={null}
                                    marginPagesDisplayed={2}
                                    pageClassName=""
                                    pageLinkClassName="cursor-pointer hover:text-gray-500 hover:underline"
                                    previousClassName={multiPages ? "cursor-pointer hover:text-gray-500 hover:underline" : "text-gray-400 cursor-not-allowed pointer-events-none"}
                                    previousLinkClassName="page-link"
                                    nextClassName={multiPages ? "cursor-pointer hover:text-gray-500 hover:underline" : "text-gray-400 cursor-not-allowed pointer-events-none"}
                                    nextLinkClassName="page-link"
                                    breakClassName="page-item"
                                    breakLinkClassName="page-link"
                                    containerClassName="flex items-center space-x-2 lg:pt-0 pt-4 text-[#990100]"
                                    activeClassName="underline font-medium"
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default UserAccounts;