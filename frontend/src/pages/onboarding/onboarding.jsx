import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { get, post } from "../../services/api.js";
import { ROLES, EMPLOYMENT_STATUSES, PERSONNEL_TYPES } from "../../constants/config.js";
import ConfirmModal from "../../components/confirm-modal.jsx";

function normalizePhMobile(input) {
    const digits = String(input || '').replace(/\D/g, '');
    if (!digits) return '';
    // Accept common PH formats and normalize to 11-digit local (09xxxxxxxxx)
    if (digits.startsWith('09') && digits.length === 11) return digits;
    if (digits.startsWith('9') && digits.length === 10) return `0${digits}`;
    if (digits.startsWith('63') && digits.length === 12 && digits[2] === '9') return `0${digits.slice(2)}`;
    return null;
}

function isValidPhMobile(input) {
    const normalized = normalizePhMobile(input);
    return typeof normalized === 'string' && /^09\d{9}$/.test(normalized);
}

function isValidPersonName(input) {
    const s = String(input || '').trim();
    if (!s) return false;
    // Letters + spaces + common punctuation for names
    return /^[\p{L}][\p{L} .'-]*$/u.test(s);
}

function parseIsoDateOnly(iso) {
    const s = String(iso || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    const d = new Date(s + 'T00:00:00');
    if (Number.isNaN(d.getTime())) return null;
    return d;
}

function yearsBetween(fromDate, toDate) {
    const fromY = fromDate.getFullYear();
    const toY = toDate.getFullYear();
    let years = toY - fromY;
    const m = toDate.getMonth() - fromDate.getMonth();
    if (m < 0 || (m === 0 && toDate.getDate() < fromDate.getDate())) years -= 1;
    return years;
}

function StepOne({ data, setData, departments, positions }) {

    const isNonEmpty = (v) => String(v || '').trim().length > 0;
    const isPhoneValid = (v) => isValidPhMobile(v);
    const isNameValid = (v) => isValidPersonName(String(v || '').trim());
    const isAddressValid = (v) => String(v || '').trim().length >= 5;
    const validFieldClass = (isValid) =>
        isValid ? ' !border-green-600 ring-2 ring-green-200 focus:!outline-green-600' : '';

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const maxDate = `${yyyy}-${mm}-${dd}`;

    const isBirthDateValid = (v) => {
        const d = parseIsoDateOnly(v);
        if (!d) return false;
        if (d.getTime() > today.getTime()) return false;
        const age = yearsBetween(d, today);
        return age >= 18;
    };

    const isHireDateValid = (v) => {
        const hire = parseIsoDateOnly(v);
        if (!hire) return false;
        if (hire.getTime() > today.getTime()) return false;

        const birth = parseIsoDateOnly(data.birthDate);
        if (!birth) return true; // can't fully validate hire vs birth yet
        if (hire.getTime() < birth.getTime()) return false;
        const ageAtHire = yearsBetween(birth, hire);
        return ageAtHire >= 18;
    };

    return (
        <div>
            <div className="rounded-lg bg-[#990100] py-2 px-3 mb-3">
                <h1 className="text-white font-medium lg:text-lg text-medium">Onboarding Form</h1>
            </div>

            <div className="px-2 md:px-3">

                <div className="grid md:grid-cols-2 gap-4 mt-3">
                    <div className="flex items-center">
                        <p className="text-sm"><b>Employee ID:</b> (auto-generated)</p>
                    </div>

                    <div>
                        <p className="md:text-sm pb-2"><b>Employment Status:</b></p>
                        <select name="status" className={`input-select${validFieldClass(isNonEmpty(data.status))} cursor-pointer`} value={data.status} onChange={(e) => setData({ ...data, status: e.target.value })}>
                            <option value="">Select Status</option>
                            <option value={EMPLOYMENT_STATUSES.ACTIVE}>{EMPLOYMENT_STATUSES.ACTIVE}</option>
                            <option value={EMPLOYMENT_STATUSES.INACTIVE}>{EMPLOYMENT_STATUSES.INACTIVE}</option>
                        </select>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mt-3">
                    <div>
                        <p className="text-sm pb-2"><b>First Name:</b></p>
                        <input type="text" className={`input-field${validFieldClass(isNameValid(data.fname))}`} placeholder="Employee's First Name" value={data.fname} onChange={(e) => setData({ ...data, fname: e.target.value })} required/>
                    </div>

                    <div>
                        <p className="text-sm pb-2"><b>Last Name:</b></p>
                        <input type="text" className={`input-field${validFieldClass(isNameValid(data.lname))}`} placeholder="Employee's Last Name" value={data.lname} onChange={(e) => setData({ ...data, lname: e.target.value })} required/>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mt-3">
                    <div>
                        <p className="text-sm pb-2"><b>Department:</b></p>
                        <select className={`input-select${validFieldClass(isNonEmpty(data.department_id))} cursor-pointer`} value={data.department_id} onChange={(e) => {
                            setData({ ...data, department_id: e.target.value, position_id: "" }); // reset position when department changes
                        }} required>
                            <option value="">Select Department</option>
                            {departments.map((dept) => (
                                <option key={dept.id} value={dept.id}>
                                    {dept.department_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <p className="text-sm pb-2"><b>Position:</b></p>
                        <select className={`input-select${validFieldClass(isNonEmpty(data.department_id) && isNonEmpty(data.position_id))} cursor-pointer`} value={data.position_id} onChange={(e) => setData({ ...data, position_id: e.target.value })} required disabled={!data.department_id}>
                            <option value="">Select Position</option>
                            {positions
                                .filter((pos) => pos.departments?.id === data.department_id)
                                .map((pos) =>  (
                                    <option key={pos.id} value={pos.id}>
                                        {pos.position_title}
                                    </option>
                                ))}
                        </select>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mt-3">
                    <div>
                        <p className="text-sm pb-2"><b>Personnel Type:</b></p>
                        <select className={`input-select${validFieldClass(isNonEmpty(data.personnelType))} cursor-pointer`} value={data.personnelType} onChange={(e) => setData({ ...data, personnelType: e.target.value })} required>
                            <option value="">Select Type</option>
                            <option value={PERSONNEL_TYPES.PROBATIONARY}>{PERSONNEL_TYPES.PROBATIONARY}</option>
                            <option value={PERSONNEL_TYPES.REGULAR}>{PERSONNEL_TYPES.REGULAR}</option>
                            <option value={PERSONNEL_TYPES.PROJECT_BASED}>{PERSONNEL_TYPES.PROJECT_BASED}</option>
                        </select>
                    </div>

                    <div>
                        <p className="text-sm pb-2"><b>Hire Date:</b></p>
                        <input type="date" className={`input-field${validFieldClass(isHireDateValid(data.hireDate))} cursor-pointer`} value={data.hireDate} onChange={(e) => setData({ ...data, hireDate: e.target.value })} min="2019-01-01" max={maxDate} required/>
                    </div>
                </div>

                <div className="py-5">
                    <hr className="border-[#990100]" />
                </div>

                <h2 className="text-md font-bold pb-4">Personal Information</h2>

                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <p className="text-sm pb-2"><b>Birth Date:</b></p>
                        <input type="date" className={`input-field${validFieldClass(isBirthDateValid(data.birthDate))} cursor-pointer`} value={data.birthDate} onChange={(e) => setData({ ...data, birthDate: e.target.value })} max={maxDate} required/>
                    </div>

                    <div>
                        <p className="text-sm pb-2"><b>Phone No.:</b></p>
                        <input type="tel" maxLength="12" className={`input-field${validFieldClass(isPhoneValid(data.phone))} `} value={data.phone} placeholder="09xxxxxxxxx / 9xxxxxxxxx / 639xxxxxxxxx" onInput={(e) => e.target.value = e.target.value.replace(/[^0-9]/g, '')} onChange={(e) => setData({ ...data, phone: e.target.value })} required/>
                    </div>
                </div>

                <div className="mt-4">
                    <p className="text-sm pb-2"><b>Home Address:</b></p>
                    <input type="text"  className={`input-field w-full${validFieldClass(isAddressValid(data.address))}`} placeholder="Employee's Address" value={data.address} onChange={(e) => setData({ ...data, address: e.target.value })} required/>
                </div>

                <div className="mt-4">
                    <p className="text-sm pb-2"><b>Emergency Contact Name:</b></p>
                    <input type="text" className={`input-field w-full${validFieldClass(isNameValid(data.emergencyName))}`} placeholder="Emergency Contact Name" value={data.emergencyName} onChange={(e) => setData({ ...data, emergencyName: e.target.value })} required/>
                </div>

                <div className="mt-4">
                    <p className="text-sm pb-2"><b>Emergency Contact No.:</b></p>
                    <input type="tel" maxLength="12" className={`input-field w-full${validFieldClass(isPhoneValid(data.emergencyPhone))}`} placeholder="09xxxxxxxxx / 9xxxxxxxxx / 639xxxxxxxxx" value={data.emergencyPhone} onInput={(e) => e.target.value = e.target.value.replace(/[^0-9]/g, '')} onChange={(e) => setData({ ...data, emergencyPhone: e.target.value })} required/>
                </div>

            </div>
        </div>
    );
}

function StepTwo({ data, setData }) {
    const isNonEmpty = (v) => String(v || '').trim().length > 0;
    const isEmailValid = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || ''));
    const validFieldClass = (isValid) =>
        isValid ? ' !border-green-600 ring-2 ring-green-200 focus:!outline-green-600' : '';

  return (
    <div>

        <div className="rounded-lg bg-[#990100] items-center lg:py-[10px] py-[6px] md:px-4 px-3 mb-3">
            <h1 className='text-white font-medium lg:text-lg text-medium'>Create New Account</h1>
        </div>

        <div className="px-2 sm:px-8 md:px-20">

            <div className="flex items-center justify-center lg:pt-5 pt-3">
                <div className="">
                    <p className='text-sm pb-2'><b>Role:</b></p>
                    <select name="role" className={`input-field ${validFieldClass(isNonEmpty(data.role))} cursor-pointer w-[250px]`} value={data.role} onChange={(e) => setData({...data, role: e.target.value})}>
                        <option value="">Select Role</option>
                        <option value={ROLES.ADMIN}>{ROLES.ADMIN}</option>
                        <option value={ROLES.HR}>{ROLES.HR}</option>
                        <option value={ROLES.EMPLOYEE}>{ROLES.EMPLOYEE}</option>
                    </select>
                </div>
                
            </div>

            <div className="flex justify-center items-center text-left lg:pt-5 md:pt-3 pt-2">
                <div className="">
                    <p className='text-sm pb-2'><b>Email:</b></p>
                    <input type="email" name="email" className={`input-field ${validFieldClass(isEmailValid(data.email))} w-[250px]`} placeholder="Enter Email" value={data.email} onChange={(e) => setData({...data, email: e.target.value})} required/>
                </div>
            </div>

            <div className="flex justify-center items-center text-left lg:pt-5 pt-3">
                <div className="w-full max-w-sm">
                    <p className='lg:text-sm text-xs pb-2'><b>Password:</b></p>
                    <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700">
                        The initial password is automatically set to the employee’s <b>Employee ID</b>.
                        The employee must log in and <b>change their password</b> after the first login.
                    </div>
                </div>
            </div>

        </div>
      
    </div>
  );
}

function Onboarding(){
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        fname: "",
        lname: "",
        position_id: "",
        hireDate: "",
        personnelType: "",
        status: "",
        department_id: "",
        birthDate: "",
        phone: "",
        address: "",
        emergencyName: "",
        emergencyPhone: "",
        role: "",
        email: "",
        password: "",
        rePassword: ""
    });

    const [steps, setSteps] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // data from backend
    const [departments, setDepartments] = useState([]);
    const [positions, setPositions] = useState([]);
    const [loadingData, setLoadingData] = useState(true);

    const [confirmState, setConfirmState] = useState({
        open: false,
        title: 'Confirmation',
        message: '',
        confirmText: 'OK',
        cancelText: null,
        onConfirm: null,
    });

    const [confirmBusy, setConfirmBusy] = useState(false);

    const openConfirm = ({ title, message, confirmText, cancelText, onConfirm }) => {
        setConfirmState({
            open: true,
            title: title || 'Confirmation',
            message: message || '',
            confirmText: confirmText || 'OK',
            cancelText: cancelText ?? null,
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

    // fetch departments and positions
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoadingData(true);

                const [deptResponse, posResponse] = await Promise.all([
                    get('/departments'),
                    get('/positions')
                ]);

                if (deptResponse.success) setDepartments(deptResponse.data);
                if (posResponse.success) setPositions(posResponse.data);

            } catch (error) {
                console.error('Failed to fetch data:', error);
                setError('Failed to load departments and positions');
            } finally { setLoadingData(false); }
        };

        fetchData();
    }, []);

    // validation of step 1 fields
    const validateStep1 = () => {
        const fname = String(formData.fname || '').trim();
        const lname = String(formData.lname || '').trim();
        const address = String(formData.address || '').trim();
        const emergencyName = String(formData.emergencyName || '').trim();

        if (!formData.status) return (setError('Employment status is required'), false);
        if (!fname) return (setError('First name is required'), false);
        if (!lname) return (setError('Last name is required'), false);
        if (!isValidPersonName(fname)) return (setError('First name contains invalid characters'), false);
        if (!isValidPersonName(lname)) return (setError('Last name contains invalid characters'), false);

        if (!formData.department_id) return (setError('Department is required'), false);
        if (!formData.position_id) return (setError('Position is required'), false);

        if (!formData.personnelType) return (setError('Personnel type is required'), false);
        if (!formData.hireDate) return (setError('Hire date is required'), false);
        if (!formData.birthDate) return (setError('Birth date is required'), false);

        const birth = parseIsoDateOnly(formData.birthDate);
        const hire = parseIsoDateOnly(formData.hireDate);
        const today = new Date();

        if (!birth) return (setError('Birth date must be a valid date'), false);
        if (!hire) return (setError('Hire date must be a valid date'), false);
        if (birth.getTime() > today.getTime()) return (setError('Birth date cannot be in the future'), false);
        if (hire.getTime() > today.getTime()) return (setError('Hire date cannot be in the future'), false);

        const age = yearsBetween(birth, today);
        if (age < 18) return (setError('Employee must be at least 18 years old'), false);
        if (hire.getTime() < birth.getTime()) return (setError('Hire date cannot be before birth date'), false);

        const ageAtHire = yearsBetween(birth, hire);
        if (ageAtHire < 18) return (setError('Hire date must be on/after the employee turns 18'), false);

        if (!formData.phone) return (setError('Phone number is required'), false);
        if (!isValidPhMobile(formData.phone)) {
            setError('Phone number must be a valid PH mobile (09xxxxxxxxx, 9xxxxxxxxx, or 639xxxxxxxxx)');
            return false;
        }

        if (!address) return (setError('Home address is required'), false);
        if (address.length < 5) return (setError('Home address is too short'), false);

        if (!emergencyName) return (setError('Emergency contact name is required'), false);
        if (!isValidPersonName(emergencyName)) return (setError('Emergency contact name contains invalid characters'), false);

        if (!formData.emergencyPhone) return (setError('Emergency contact number is required'), false);
        if (!isValidPhMobile(formData.emergencyPhone)) {
            setError('Emergency contact number must be a valid PH mobile (09xxxxxxxxx, 9xxxxxxxxx, or 639xxxxxxxxx)');
            return false;
        }

        return true;
    };

    // validation of step 2 fields
    const validateStep2 = () => {
        if (!formData.email || !formData.role) {
            setError("Please fill out all fields");
            return false;
        }
        return true;
    };

    // form submission
    const handleSubmit = async () => {
        setError("");

        // validate all fields from both steps
        if (!validateStep1()) {
            setSteps(1); // go back to Step 1 to show errors
            return;
        }

        if (!validateStep2()) return;

        try {
            setLoading(true);

            const normalizedPhone = normalizePhMobile(formData.phone);
            const normalizedEmergencyPhone = normalizePhMobile(formData.emergencyPhone);

            const response = await post('/onboarding/complete', {
                // account info
                email: formData.email,
                role: formData.role,
                // employee info
                first_name: formData.fname,
                last_name: formData.lname,
                department_id: formData.department_id,
                position_id: formData.position_id,
                hire_date: formData.hireDate,
                personnel_type: formData.personnelType,
                employment_status: formData.status,
                birth_date: formData.birthDate,
                phone_number: normalizedPhone,
                address: String(formData.address || '').trim(),
                emergency_contact_name: String(formData.emergencyName || '').trim(),
                emergency_contact_number: normalizedEmergencyPhone
            });

            if (!response.success) {
                throw new Error(response.message || 'Failed to onboard employee');
            }

            const emailStatus = (() => {
                const e = response?.data?.email;
                if (!e) return null;
                if (e.skipped) return 'Email: skipped (SMTP not configured)';
                if (e.error) return `Email: failed (${e.error})`;
                return 'Email: sent';
            })();

            openConfirm({
                title: 'Success',
                message: ['Employee onboarded successfully!', emailStatus].filter(Boolean).join('\n'),
                confirmText: 'OK',
                cancelText: null,
                onConfirm: () => navigate('/employees'),
            });

        } catch (err) {
            console.error('Onboarding error:', err);
            setError(err.message || 'Failed to onboard employee. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleNext = () => {
        setError("");
        if (validateStep1()) setSteps(2);
    };

    if (loadingData) {
        return (
            <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-md text-gray-600">Loading…</p>
            </div>
        );
    }

    return(

        <div className="">
            <div className="p-7 lg:mx-[4.5rem] md:mx-10">
                <div className="mb-10">
                    <h1 className='lg:text-3xl text-2xl text-[#990100] font-bold'>Onboarding</h1>
                </div>

                <div className="flex justify-center">
                    <div className="bg-white w-full max-w-4xl rounded-lg border border-gray-200 shadow-lg p-4 sm:p-6 lg:p-8">
                                                <div className="flex items-center justify-between gap-3 mb-6">
                                                    <button
                                                        type="button"
                                                        className={`flex-1 border rounded-lg px-4 py-2 text-sm font-medium transition cursor-pointer ${
                                                            steps === 1
                                                                ? "bg-[#990100] text-white border-[#990100]"
                                                                : "bg-white text-[#990100] border-[#990100]"
                                                        }`}
                                                        onClick={() => setSteps(1)}
                                                        disabled={loading}
                                                    >
                                                        Step 1: Employee Details
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className={`flex-1 border rounded-lg px-4 py-2 text-sm font-medium transition cursor-pointer ${
                                                            steps === 2
                                                                ? "bg-[#990100] text-white border-[#990100]"
                                                                : "bg-white text-[#990100] border-[#990100]"
                                                        }`}
                                                        onClick={() => {
                                                            setError("");
                                                            if (steps === 2) return;
                                                            if (validateStep1()) setSteps(2);
                                                        }}
                                                        disabled={loading}
                                                    >
                                                        Step 2: Account Details
                                                    </button>
                                                </div>

                        {/* Error message */}
                        { error && (
                            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                                {error}
                            </div>
                        )}
                        {steps === 1 && (<StepOne data={formData} setData={setFormData} departments={departments} positions={positions}/> )}
                        {steps === 2 && (<StepTwo data={formData} setData={setFormData} /> )}

                        <div className="flex justify-end mt-6 gap-3">
                        {steps > 1 && (
                            <button className="bg-[#b74d4c] w-full sm:w-auto px-4 sm:px-5 py-2 text-sm sm:text-base rounded-md text-white hover:bg-[#c16666] hover:scale-105 transition duration-300 ease-in-out cursor-pointer" onClick={() => setSteps(steps - 1)} disabled={loading}>Previous</button>
                        )}

                        {steps < 2 ? (
                            <button className="bg-[#990100] w-full sm:w-auto px-4 sm:px-5 py-2 text-sm sm:text-base rounded-md text-white hover:bg-[#ad3332] hover:scale-105 transition duration-300 ease-in-out cursor-pointer" onClick={handleNext}>Next</button>
                        ) : (
                            <button className="bg-[#990100] w-full sm:w-auto px-4 sm:px-5 py-2 text-sm sm:text-base rounded-md text-white hover:bg-[#ad3332] hover:scale-105 transition duration-300 ease-in-out cursor-pointer" onClick={handleSubmit} disabled={loading}>{loading ? 'Saving ...' : 'Save'}</button>
                        )}
                        </div>
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
        
    );

}

export default Onboarding;