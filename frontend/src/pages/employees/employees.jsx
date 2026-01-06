import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Navbar from '../../components/navbar';
import DropDownFilter from '../../components/dropdownfilter';
import { get, put, del, post } from '../../services/api.js';
import { EMPLOYMENT_STATUSES, PERSONNEL_TYPES } from '../../constants/config.js';
import ReactPaginate from 'react-paginate';
import ConfirmModal from '../../components/confirm-modal.jsx';
import { compareDate, compareText } from '../../utils/sort.js';
import { exportRowsToCsv } from '../../utils/csv.js';
import { exportRowsToXlsx } from '../../utils/excel.js';
import ReportModal from '../../components/report-modal.jsx';
import { filterRowsByDateRange } from '../../utils/reporting.js';


function ModalEmployees({isOpen, onClose, employee, onSave, onDelete, departments, positions}){
    const [data, setData] = useState(employee || {});
    const [editData, setEditData] = useState(false);
    const [initialData, setInitialData] = useState(employee || {});
    const [loading, setLoading] = useState(false);
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

        const snapshot = {
            title: confirmState.title,
            message: confirmState.message,
            confirmText: confirmState.confirmText,
            cancelText: confirmState.cancelText,
            onConfirm: confirmState.onConfirm,
        };

        try {
            setConfirmBusy(true);
            await fn?.();

            setConfirmState((prev) => {
                const isSameDialog =
                    prev.open &&
                    prev.onConfirm === snapshot.onConfirm &&
                    prev.title === snapshot.title &&
                    prev.message === snapshot.message &&
                    prev.confirmText === snapshot.confirmText &&
                    prev.cancelText === snapshot.cancelText;

                if (!isSameDialog) return prev;

                const wasConfirmation = snapshot.cancelText != null && snapshot.cancelText !== '';
                if (!wasConfirmation) {
                    return { ...prev, open: false, onConfirm: null };
                }

                return {
                    open: true,
                    title: 'Success',
                    message: 'Action completed successfully.',
                    confirmText: 'OK',
                    cancelText: null,
                    onConfirm: null,
                };
            });
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

    useEffect(() => {
        if (!employee) return;
        setData(employee);
        setInitialData(employee);
        setEditData(false);
    }, [employee]);

    {/* WHEN EDITING THE VALUE */}
    const handleChange = (a) => {
        const { name, value } = a.target;

        // reset position when department changes
        if (name === 'department_id') {
            setData(prev => ({...prev, [name]: value, position_id: ''}));
        } else {
            setData(prev => ({...prev, [name]: value}));
        }
    };

    const handleSave = async () => {
        if (!data.first_name || !data.last_name || !data.position_title || !data.hire_date || !data.personnel_type || !data.employment_status || !data.department_name || !data.birth_date || !data.phone_number || !data.address || !data.emergency_contact_name || !data.emergency_contact_number) {
            openConfirm({
                title: 'Missing fields',
                message: 'Please fill out all the fields and do not leave any of them blank.',
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
                try {
                    setLoading(true);

                    const response = await put(`/employees/${employee.id}`, {
                        first_name: data.first_name,
                        last_name: data.last_name,
                        department_id: data.department_id,
                        position_id: data.position_id,
                        hire_date: data.hire_date,
                        personnel_type: data.personnel_type,
                        employment_status: data.employment_status,
                        birth_date: data.birth_date,
                        phone_number: data.phone_number,
                        address: data.address,
                        emergency_contact_name: data.emergency_contact_name,
                        emergency_contact_number: data.emergency_contact_number
                    });

                    if (response.success) {
                        onSave(response.data);
                        setEditData(false);
                        openConfirm({
                            title: 'Success',
                            message: `Successfully updated the record of ${data.employee_id}!`,
                            confirmText: 'OK',
                            cancelText: null,
                            onConfirm: () => onClose(),
                        });
                    }
                } catch (error) {
                    console.error('Update error:', error);
                    openConfirm({
                        title: 'Update failed',
                        message: error?.message || 'Failed to update employee',
                        confirmText: 'OK',
                        cancelText: null,
                        onConfirm: null,
                    });
                } finally { setLoading(false); }
            }
        });
    };

    const handleDelete = async () => {
        openConfirm({
            title: 'Archive employee',
            message: `Are you sure you want to archive ${data.employee_id} - ${data.first_name} ${data.last_name}? Their records and uploaded 201 files will be retained, but they will be removed from the Active employees list.`,
            confirmText: 'OK',
            cancelText: 'Cancel',
            onConfirm: async () => {
                try {
                    setLoading(true);
                    const response = await del(`/employees/${employee.id}`);

                    if (response.success) {
                        onDelete(employee.id);
                        openConfirm({
                            title: 'Success',
                            message: `Successfully archived ${data.employee_id}.`,
                            confirmText: 'OK',
                            cancelText: null,
                            onConfirm: () => onClose(),
                        });
                    }
                } catch (error) {
                    console.error('Delete error:', error);
                    openConfirm({
                        title: 'Archive failed',
                        message: error?.message || 'Failed to archive employee',
                        confirmText: 'OK',
                        cancelText: null,
                        onConfirm: null,
                    });
                } finally { setLoading(false) }
            }
        });
    };

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const maxDate = `${yyyy}-${mm}-${dd}`;

    const unsavedChanges = JSON.stringify(data) !== JSON.stringify(initialData);

    if (!isOpen || !employee) return null;

    return(
        
        <div className="fixed inset-0 flex items-center justify-center z-1000 bg-[#EDEDED]/50">

            <div className="bg-white rounded-lg shadow-lg md:p-6 px-3 py-6 lg:w-150 md:w-130 w-80 md:h-auto h-100 overflow-y-auto border border-gray-300">
                <div className="rounded-lg bg-[#990100] flex items-center justify-between lg:py-[10px] py-[6px] md:px-4 px-3">
                    <h1 className='text-white text-lg font-medium lg:text-lg text-sm'>Information of {data.first_name} {data.last_name}</h1>
                    <button className="text-white text-2xl font-bold hover:scale-110 transition" onClick={() => {
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
                    }} disabled={loading}> ✕ </button>
                </div>

                <div className="px-3">
                    <div className="md:grid md:grid-cols-2 items-center lg:pt-5 pt-3 text-left">
                        <div className="pr-2 md:pb-0 pb-3">
                            <p className='lg:text-sm text-xs'><b>Employee ID:</b> {data.employee_id}</p>
                        </div>
                        
                        <div className="flex items-center md:pl-2">
                            <p className='lg:text-sm text-xs pr-2'><b>Employment Status:</b></p>
                            <select name="employment_status" value = {data.employment_status} disabled = {!editData || loading} onChange={handleChange} className='shadow-sm lg:text-sm text-xs border border-[#990100] p-1 text-[#990100] focus:outline-gray-400 rounded-md lg:w-25 md:w-20 w-35 disabled:text-gray-600'>
                                <option value={EMPLOYMENT_STATUSES.ACTIVE}>{EMPLOYMENT_STATUSES.ACTIVE}</option>
                                <option value={EMPLOYMENT_STATUSES.INACTIVE}>{EMPLOYMENT_STATUSES.INACTIVE}</option>
                            </select>
                        </div>
                    </div>

                    <div className="md:grid md:grid-cols-2 items-center lg:pt-5 pt-3 text-left"> 
                        <div className="flex items-center md:justify-between pr-2 md:pb-0 pb-3">
                            <p className='lg:text-sm text-xs md:pr-0 pr-3'><b>First Name:</b></p>
                            <input type="text" name="first_name" value = {data.first_name} disabled = {!editData || loading} onChange={handleChange} className="bg-white rounded-md lg:text-sm text-xs focus:outline-gray-400 border border-[#990100] shadow-sm p-1 text-[#990100] text-sm lg:w-39 md:w-32 w-46 disabled:text-gray-600" />
                        </div>
                        
                        <div className="flex items-center md:justify-between md:pl-2">
                            <p className='lg:text-sm text-xs md:pr-0 pr-4'><b>Last Name:</b></p>
                            <input type="text" name="last_name" value = {data.last_name} disabled = {!editData || loading} onChange={handleChange} className="bg-white rounded-md lg:text-sm text-xs focus:outline-gray-400 border border-[#990100] shadow-sm p-1 text-[#990100] text-sm lg:w-40 md:w-35 w-46 disabled:text-gray-600" />
                        </div>
                    </div>

                    <div className="md:grid md:grid-cols-2 items-center lg:pt-5 pt-3 text-left"> 
                        <div className="flex items-center md:justify-between pr-2 md:pb-0 pb-3">
                            <p className='lg:text-sm text-xs md:pr-0 pr-2'><b>Department:</b></p>
                            <div className="flex items-center gap-2">
                                <select name="department_id" value = {data.department_id} disabled = {!editData || loading} onChange={handleChange} className='shadow-sm lg:text-sm text-xs border border-[#990100] p-1 text-[#990100] focus:outline-gray-400 rounded-md lg:w-39 md:w-32 w-46 disabled:text-gray-600'>
                                    <option value="">Select Department</option>
                                    {departments.map((dept) => (
                                        <option key={dept.id} value={dept.id}>
                                            {dept.department_name}
                                        </option>
                                    ))}
                                </select>

                                {editData && (
                                    <button
                                        type="button"
                                        onClick={handleSave}
                                        disabled={loading || !unsavedChanges || !data.department_id || !data.position_id}
                                        className='bg-[#FFA500] px-4 py-[6px] lg:text-[13px] text-xs rounded-md text-white hover:bg-[#ffb732] hover:scale-105 transition duration-300 ease-in-out disabled:opacity-50'
                                    >
                                        {loading ? 'Saving...' : 'Save'}
                                    </button>
                                )}
                            </div>
                        </div>
                        
                        <div className="flex items-center md:justify-between md:pl-2">
                            <p className='lg:text-sm text-xs md:pr-0 pr-8'><b>Position:</b></p>
                            <select name="position_id" value = {data.position_id} disabled = {!editData || loading || !data.department_id} onChange={handleChange} className='shadow-sm border border-[#990100] lg:text-sm text-xs p-1 text-[#990100] focus:outline-gray-400 rounded-md lg:w-40 md:w-35 w-45 disabled:text-gray-600'>
                                <option value="">Select Position</option>
                                    {positions
                                        .filter((pos) => {
                                            // always include current position, or positions matching selected department
                                            return pos.id === employee.position_id || pos.departments?.id === data.department_id;
                                        })
                                        .map((pos) => (
                                            <option key={pos.id} value={pos.id}>
                                                {pos.position_title}
                                            </option>
                                        ))}
                            </select>
                        </div>
                    </div>

                    <div className="md:grid md:grid-cols-2 items-center lg:pt-5 pt-3 text-left"> 
                        <div className="flex items-center md:justify-between pr-2 md:pb-0 pb-3">
                            <p className='lg:text-sm text-xs md:pr-0 pr-2'><b>Personnel Type:</b></p>
                            <select name="personnel_type" className='shadow-sm border border-[#990100] p-1 text-[#990100] focus:outline-gray-400 rounded-md lg:w-33 md:w-28 w-41 lg:text-sm text-xs disabled:text-gray-600' value = {data.personnel_type} disabled = {!editData || loading} onChange={handleChange}>
                                <option value={PERSONNEL_TYPES.PROBATIONARY}>{PERSONNEL_TYPES.PROBATIONARY}</option>
                                <option value={PERSONNEL_TYPES.REGULAR}>{PERSONNEL_TYPES.REGULAR}</option>
                                <option value={PERSONNEL_TYPES.PROJECT_BASED}>Project-{PERSONNEL_TYPES.PROJECT_BASED}</option>
                            </select>
                        </div>
                        
                        <div className="flex items-center md:justify-between md:pl-2">
                            <p className='lg:text-sm text-xs md:pr-0 pr-7'><b>Hire Date:</b></p>
                            <input type="date" name="hire_date" value = {data.hire_date} disabled = {!editData || loading} onChange={handleChange} className="block lg:w-40 md:w-35 w-44 rounded-md border border-[#990100] shadow-sm focus:outline-gray-400 p-1 lg:text-sm text-xs text-[#990100] disabled:text-gray-600" min = "2019-01-01" max = {maxDate} />
                        </div>
                    </div>

                    <div className="lg:py-5 pt-5 pb-3">
                        <hr className='text-[#990100]'/>
                    </div>

                    <h2 className='lg:text-md text:sm text-left pb-4'><b>Personal Information</b></h2>

                    <div className="md:grid md:grid-cols-2 items-center text-left"> 
                        
                        <div className="flex items-center md:justify-between pr-2 md:pb-0 pb-3">
                            <p className='lg:text-sm text-xs md:pr-0 pr-5'><b>Birth Date:</b></p>
                            <input type="date" name="birth_date" value={data.birth_date} disabled = {!editData || loading} onChange={handleChange} className="block lg:w-40 md:w-35 w-45 rounded-md border border-[#990100] shadow-sm focus:outline-gray-400 p-1 lg:text-sm text-xs text-[#990100] disabled:text-gray-600" max = {maxDate} />
                        </div>

                        <div className="flex items-center md:justify-between md:pl-2">
                            <p className='lg:text-sm text-xs md:pr-0 pr-5'><b>Phone No.:</b></p>
                            <input type="tel" name="phone_number" value = {data.phone_number} disabled = {!editData || loading} onChange={handleChange} className="bg-white rounded-md text-sm focus:outline-gray-400 border border-[#990100] shadow-sm p-1 text-[#990100] lg:text-sm text-xs lg:w-40 md:w-35 w-45 disabled:text-gray-600" maxLength="11" onInput={(e) => {e.target.value = e.target.value.replace(/[^0-9]/g, ''); }}/>
                        </div>
                    </div>

                    <div className="md:flex md:justify-between items-center text-left lg:pt-5 pt-3">
                        <p className='lg:text-sm text-xs md:pr-0 pr-2'><b>Home Address:</b></p>
                        <input type="text" name="address" value = {data.address} disabled = {!editData || loading} onChange={handleChange} className="bg-white rounded-md text-sm focus:outline-gray-400 border border-[#990100] shadow-sm p-1 text-[#990100] lg:text-sm text-xs lg:w-100 md:w-85 w-66 disabled:text-gray-600 mt-2 md:mt-0" />
                    </div>

                    <div className="md:flex md:justify-between items-center text-left lg:pt-5 md:pt-3 pt-2">
                        <p className='lg:text-sm text-xs'><b>Emergency Contact Name:</b></p>
                        <input type="text" name="emergency_contact_name" value = {data.emergency_contact_name} disabled = {!editData || loading} onChange={handleChange} className="bg-white rounded-md text-sm focus:outline-gray-400 border border-[#990100] shadow-sm p-1 text-[#990100] lg:text-sm text-xs lg:w-80 md:w-70 w-66 disabled:text-gray-600 mt-2 md:mt-0" />
                    </div>

                    <div className="md:flex justify-between items-center text-left lg:pt-5 md:pt-3 pt-2">
                        <p className='lg:text-sm text-xs'><b>Emergency Contact No.:</b></p>
                        <input type="tel" name="emergency_contact_number" value = {data.emergency_contact_number} disabled = {!editData || loading} onChange={handleChange} className="bg-white rounded-md text-sm focus:outline-gray-400 border border-[#990100] shadow-sm p-1 text-[#990100] lg:text-sm text-xs lg:w-80 md:w-70 w-66 disabled:text-gray-600 mt-2 md:mt-0" maxLength="11" onInput={(e) => {e.target.value = e.target.value.replace(/[^0-9]/g, ''); }} />
                    </div>
                    

                    {/* BUTTONS FOR CREATING AND SAVING CHANGES AS WELL AS DELETING THE RECORD */}

                    <div className="pt-7">

                        {!editData ? (
                            <div className="flex justify-end gap-4">
                                <button onClick = {() => setEditData(true)} disabled={loading} className='bg-[#198C19] lg:px-5 py-[7px] px-4 lg:text-[15px] text-xs rounded-md text-white hover:bg-[#46a346] hover:scale-105 transition duration-300 ease-in-out'>Update Record</button>
                                <button onClick={handleDelete} disabled={loading} className='bg-[#C60000] lg:px-5 py-[7px] px-4 lg:text-[15px] text-xs rounded-md text-white hover:bg-[#d13232] hover:scale-105 transition duration-300 ease-in-out'>{loading ? 'Archiving ...' : 'Archive Employee'}</button>
                            </div>
                        ) : (
                            <div className="flex justify-end gap-4">
                                <button className='bg-[#C60000] lg:px-5 py-[7px] px-4 py lg:text-[15px] text-xs rounded-md text-white hover:bg-[#d13232] hover:scale-105 transition duration-300 ease-in-out'
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
                                    }} disabled = {loading}>
                                    Cancel Changes
                                </button>

                                <button onClick={handleSave} disabled={loading} className='bg-[#FFA500] lg:px-5 md:py-[7px] px-4 py-[7px] lg:text-[15px] text-xs rounded-md text-white hover:bg-[#ffb732] hover:scale-105 transition duration-300 ease-in-out disabled:opacity-50'>
                                    {loading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        )}
                    </div>
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

function Employees(){
    
    const [isModalOpen, setModalOpen] = useState(false);
    const [viewEmployee, setViewEmployee] = useState(null);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOrder, setSortOrder] = useState('name_az');
    const [reportOpen, setReportOpen] = useState(false);

    const [departments, setDepartments] = useState([]);
    const [positions, setPositions] = useState([]);

    const filteredEmployees = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        const filtered = !q
            ? employees
            : employees.filter((e) => {
                const fullName = `${e.first_name || ''} ${e.last_name || ''}`.toLowerCase();
                return (
                    String(e.employee_id || '').toLowerCase().includes(q) ||
                    fullName.includes(q) ||
                    String(e.position_title || '').toLowerCase().includes(q) ||
                    String(e.department_name || '').toLowerCase().includes(q) ||
                    String(e.personnel_type || '').toLowerCase().includes(q)
                );
            });

        const sorted = [...filtered].sort((a, b) => {
            const aName = `${a?.last_name || ''} ${a?.first_name || ''}`.trim();
            const bName = `${b?.last_name || ''} ${b?.first_name || ''}`.trim();

            switch (sortOrder) {
                case 'employee_id_asc':
                    return compareText(a?.employee_id, b?.employee_id);
                case 'employee_id_desc':
                    return compareText(b?.employee_id, a?.employee_id);
                case 'name_az':
                    return compareText(aName, bName);
                case 'name_za':
                    return compareText(bName, aName);
                case 'position_az':
                    return compareText(a?.position_title, b?.position_title);
                case 'position_za':
                    return compareText(b?.position_title, a?.position_title);
                case 'hire_date_oldest':
                    return compareDate(a?.hire_date, b?.hire_date);
                case 'hire_date_newest':
                    return compareDate(b?.hire_date, a?.hire_date);
                case 'personnel_type_az':
                    return compareText(a?.personnel_type, b?.personnel_type);
                case 'personnel_type_za':
                    return compareText(b?.personnel_type, a?.personnel_type);
                default:
                    return compareText(aName, bName);
            }
        });

        return sorted;
    }, [employees, searchTerm, sortOrder]);

    //REACT-PAGINATE

    const [itemOffset, setItemOffset] = useState(0);
    const itemsPerPage = 15;
    const endOffset = itemOffset + itemsPerPage;
    const currentEmp = filteredEmployees.slice(itemOffset, endOffset);
    const pageCount = Math.ceil(filteredEmployees.length / itemsPerPage);
    const multiPages = pageCount > 1;
    const currentPage = pageCount ? Math.floor(itemOffset / itemsPerPage) + 1 : 0;

    const handlePageClick = (event) => {
        const newOffset = (event.selected * itemsPerPage);
        setItemOffset(newOffset);
    };

    useEffect(() => {
        setItemOffset(0);
    }, [searchTerm, sortOrder, employees.length]);
    

    const fetchEmployees = useCallback(async () => {
        try {
            setLoading(true);
            setError('');

            const [empResponse, deptResponse, posResponse] = await Promise.all([
                get('/employees'),
                get('/departments'),
                get('/positions')
            ]);

            if (empResponse.success) {
                const mappedEmployees = empResponse.data.map(emp => ({
                    ...emp,
                    department_name: emp.departments?.department_name || 'N/A',
                    position_title: emp.positions?.position_title || 'N/A',
                    department_id: emp.departments?.id,
                    position_id: emp.positions?.id
                }));
                setEmployees(mappedEmployees);
            }

            if (deptResponse.success) {
                setDepartments(deptResponse.data);
            }

            if (posResponse.success) {
                setPositions(posResponse.data);
            }
        } catch (error) {
            console.error('Failed to fetch data:', error);
            setError(error.message || 'Failed to load data');
        } finally {
            setLoading(false);
        }
    }, []);

    // fetch employees from backend
    useEffect(() => {
        fetchEmployees();
    }, [fetchEmployees]);

    const handleOpen = (employee) => {
        setViewEmployee(employee);
        setModalOpen(true)
    };

    const handleClose = () => setModalOpen(false);

    const updateEmployeeData = (updated) => {
        setEmployees(prev =>
            prev.map(emp => emp.id === updated.id ? {
                ...updated,
                department_name: updated.departments?.department_name || 'N/A',
                position_title: updated.positions?.position_title || 'N/A',
                department_id: updated.departments?.id,
                position_id: updated.positions?.id
            } : emp)
        );
    };

    const deleteEmployee = (employeeId) => {
        setEmployees(prev => prev.filter(emp => emp.id !== employeeId));
    };

    if (loading) {
        return (
            <div>
                <Navbar />
                <div className="flex items-center justify-center min-h-screen">
                    <p className="text-gray-600">Loading employees...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div>
                <Navbar />
                <div className="flex items-center justify-center min-h-screen">
                    <div className="text-center">
                        <p className="text-red-600 mb-4">{error}</p>
                        <button
                            onClick={fetchEmployees}
                            className="bg-[#990100] text-white px-4 py-2 rounded"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const handleGenerateReport = ({ startDate, endDate, fileType } = {}) => {
        const rowsForExport = (startDate || endDate)
            ? filterRowsByDateRange(filteredEmployees, (r) => r?.hire_date, startDate, endDate)
            : filteredEmployees;

        const stamp = new Date().toISOString().slice(0, 10);
        const isCsv = fileType === 'CSV';
        const filename = `employees-report-${stamp}.${isCsv ? 'csv' : 'xlsx'}`;

        // Export first to keep it a direct user gesture (avoids browser download blocking).
        // Audit logging is best-effort and should not block the download.
        post('/audit-logs/reports', {
            report_name: 'Employees Report',
            filename,
            start_date: startDate || null,
            end_date: endDate || null,
            row_count: rowsForExport.length,
            source: 'employees',
        }).catch(() => {
            // best-effort only
        });

        const columns = [
            { header: 'Employee ID', value: (r) => r.employee_id },
            { header: 'Name', value: (r) => `${r.first_name || ''} ${r.last_name || ''}`.trim() },
            { header: 'Position', value: (r) => r.position_title },
            { header: 'Hire Date', value: (r) => r.hire_date },
            { header: 'Personnel Type', value: (r) => r.personnel_type },
        ];

        if (isCsv) {
            exportRowsToCsv({ filename, columns, rows: rowsForExport });
        } else {
            exportRowsToXlsx({ filename, sheetName: 'Employees', columns, rows: rowsForExport });
        }

        setReportOpen(false);
    };
    
    return(
        <div className="">
            <Navbar />

            <div className="p-7 lg:mx-18 md:mx-10">

                {/* HEADER */}
                <div className="md:flex justify-between items-center w-full">

                    <div className="">
                        <h1 className='lg:text-3xl text-2xl text-[#990100] font-bold md:mb-0 mb-5'>Employees</h1>
                    </div>
                    
                    <div className="flex items-center justify-end md:gap-4 gap-3"> 

                        <DropDownFilter
                            value={sortOrder}
                            onChange={setSortOrder}
                            options={[
                                { value: 'employee_id_asc', label: 'Employee ID: Ascending' },
                                { value: 'employee_id_desc', label: 'Employee ID: Descending' },
                                { value: 'name_az', label: 'Name: A - Z' },
                                { value: 'name_za', label: 'Name: Z - A' },
                                { value: 'position_az', label: 'Position: A - Z' },
                                { value: 'position_za', label: 'Position: Z - A' },
                                { value: 'hire_date_newest', label: 'Hire Date: Newest' },
                                { value: 'hire_date_oldest', label: 'Hire Date: Oldest' },
                                { value: 'personnel_type_az', label: 'Personnel Type: A - Z' },
                                { value: 'personnel_type_za', label: 'Personnel Type: Z - A' },
                            ]}
                        />

                        <div className="relative text-gray-600 border border-[#990100] rounded-lg ">
                            <input
                                type="search"
                                name="search"
                                placeholder="Search"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-white lg:h-10 md:h-9 h-8 px-2 lg:pr-10 md:pr-5 pr-5 md:w-auto w-35 rounded-lg text-sm focus:outline-none"
                            />
                            <button type="submit" className="absolute right-0 top-0 md:mt-3 mt-2 lg:mr-3 mr-2 items-center cursor-pointer">
                               <img src = "icons/red-search.png" className="lg:w-5 lg:h-5 w-4 h-4 items-center" type="submit" />
                            </button>
                        </div>

                    </div> 
                </div>
                <hr className='text-[#990100] mt-6 '/>

                <div className="flex justify-end mt-5">
                    <button className='generate-report-button' onClick={() => setReportOpen(true)}>Generate Report</button>
                </div>

                {/* TABLE */}
                

                <div className="div-table">
                    <table className="table-style">
                        <thead className="thead-style">
                            <tr>
                                <th className="th-style rounded-tl-lg rounded-bl-lg">Employee ID</th>
                                <th className="th-style">Name</th>
                                <th className="th-style">Position</th>
                                <th className="th-style hidden sm:table-cell">Hire Date</th>
                                <th className="th-style hidden sm:table-cell">Personnel Type</th>
                                <th className="th-style rounded-tr-lg rounded-br-lg">Actions</th>
                            </tr>
                        </thead>
                        <tbody className='tbody-style'>
                            {filteredEmployees.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                        No employees found
                                    </td>
                                </tr>
                            ) : (
                                currentEmp.map((row) => (
                                    <tr key={row.id} className="tr-style">
                                        <td className="td-style font-medium">
                                            {row.employee_id}
                                        </td>
                                        <td className="td-style">
                                            {row.first_name} {row.last_name}
                                        </td>
                                        <td className="td-style">
                                            {row.position_title}
                                        </td>
                                        <td className="td-style hidden sm:table-cell">
                                            {row.hire_date}
                                        </td>
                                        <td className="td-style hidden sm:table-cell">
                                            {row.personnel_type}
                                        </td>
                                        <td className="td-style">
                                            <button
                                                className="bg-[#990100] text-white lg:text-sm text-xs px-4 py-[5px] rounded-lg hover:bg-[#ad3332] hover:scale-105 transition duration-300 ease-in-out "
                                                onClick={() => handleOpen(row)}
                                            >
                                                View Details
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                    <ModalEmployees
                        isOpen={isModalOpen}
                        onClose={handleClose}
                        employee={viewEmployee}
                        onSave={updateEmployeeData}
                        onDelete={deleteEmployee}
                        departments={departments}
                        positions={positions}
                    />

                    <ReportModal
                        open={reportOpen}
                        title="Generate Report - Employees"
                        onClose={() => setReportOpen(false)}
                        onGenerate={handleGenerateReport}
                        enableDateRange={true}
                    />
                    <br />

                    <div className="lg:flex items-center lg:justify-between">
                        <p className="lg:text-md text-sm">
                            Showing <b>{currentEmp.length}</b> of <b>{filteredEmployees.length}</b> employee{filteredEmployees.length !== 1 ? 's' : ''}
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

export default Employees;