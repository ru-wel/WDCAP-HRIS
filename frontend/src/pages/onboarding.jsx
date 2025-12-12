import React, { useState, useEffect } from "react";
import Navbar from "./components/navbar";
import { useNavigate } from "react-router-dom";
import { get, post } from "../services/api.js";
import { ROLES, EMPLOYMENT_STATUSES, PERSONNEL_TYPES } from "../constants/config.js";

function StepOne({ data, setData, departments, positions }) {

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const maxDate = `${yyyy}-${mm}-${dd}`;

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
                        <select name="status" className="input-select" value={data.status} onChange={(e) => setData({ ...data, status: e.target.value })}>
                            <option value="">Select Status</option>
                            <option value={EMPLOYMENT_STATUSES.ACTIVE}>{EMPLOYMENT_STATUSES.ACTIVE}</option>
                            <option value={EMPLOYMENT_STATUSES.INACTIVE}>{EMPLOYMENT_STATUSES.INACTIVE}</option>
                        </select>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mt-3">
                    <div>
                        <p className="text-sm pb-2"><b>First Name:</b></p>
                        <input type="text" className="input-field" placeholder="Employee's First Name" value={data.fname} onChange={(e) => setData({ ...data, fname: e.target.value })} required/>
                    </div>

                    <div>
                        <p className="text-sm pb-2"><b>Last Name:</b></p>
                        <input type="text" className="input-field" placeholder="Employee's Last Name" value={data.lname} onChange={(e) => setData({ ...data, lname: e.target.value })} required/>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mt-3">
                    <div>
                        <p className="text-sm pb-2"><b>Department:</b></p>
                        <select className="input-select" value={data.department_id} onChange={(e) => setData({ ...data, department_id: e.target.value })} required>
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
                        <select className="input-select" value={data.position_id} onChange={(e) => setData({ ...data, position_id: e.target.value })} required>
                            <option value="">Select Position</option>
                            {positions.map((pos) =>  (
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
                        <select className="input-select" value={data.personnelType} onChange={(e) => setData({ ...data, personnelType: e.target.value })} required>
                            <option value="">Select Type</option>
                            <option value={PERSONNEL_TYPES.PROBATIONARY}>{PERSONNEL_TYPES.PROBATIONARY}</option>
                            <option value={PERSONNEL_TYPES.REGULAR}>{PERSONNEL_TYPES.REGULAR}</option>
                            <option value={PERSONNEL_TYPES.PROJECT_BASED}>{PERSONNEL_TYPES.PROJECT_BASED}</option>
                        </select>
                    </div>

                    <div>
                        <p className="text-sm pb-2"><b>Hire Date:</b></p>
                        <input type="date" className="input-field" value={data.hireDate} onChange={(e) => setData({ ...data, hireDate: e.target.value })} min="2019-01-01" max={maxDate} required/>
                    </div>
                </div>

                <div className="py-5">
                    <hr className="border-[#990100]" />
                </div>

                <h2 className="text-md font-bold pb-4">Personal Information</h2>

                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <p className="text-sm pb-2"><b>Birth Date:</b></p>
                        <input type="date" className="input-field" value={data.birthDate} onChange={(e) => setData({ ...data, birthDate: e.target.value })} max={maxDate} required/>
                    </div>

                    <div>
                        <p className="text-sm pb-2"><b>Phone No.:</b></p>
                        <input type="tel" maxLength="11" className="input-field" value={data.phone} placeholder="Employee's Phone No." onInput={(e) => e.target.value = e.target.value.replace(/[^0-9]/g, '')} onChange={(e) => setData({ ...data, phone: e.target.value })} required/>
                    </div>
                </div>

                <div className="mt-4">
                    <p className="text-sm pb-2"><b>Home Address:</b></p>
                    <input type="text"  className="input-field w-full" placeholder="Employee's Address" value={data.address} onChange={(e) => setData({ ...data, address: e.target.value })} required/>
                </div>

                <div className="mt-4">
                    <p className="text-sm pb-2"><b>Emergency Contact Name:</b></p>
                    <input type="text" className="input-field w-full" placeholder="Emergency Contact Name" value={data.emergencyName} onChange={(e) => setData({ ...data, emergencyName: e.target.value })} required/>
                </div>

                <div className="mt-4">
                    <p className="text-sm pb-2"><b>Emergency Contact No.:</b></p>
                    <input type="tel" maxLength="11" className="input-field w-full" placeholder="Emergency Contact No." value={data.emergencyPhone} onInput={(e) => e.target.value = e.target.value.replace(/[^0-9]/g, '')} onChange={(e) => setData({ ...data, emergencyPhone: e.target.value })} required/>
                </div>

            </div>
        </div>
    );
}

function StepTwo({ data, setData }) {
  return (
    <div>

        <div className="rounded-lg bg-[#990100] items-center lg:py-[10px] py-[6px] md:px-4 px-3 mb-3">
            <h1 className='text-white font-medium lg:text-lg text-medium'>Create New Account</h1>
        </div>

        <div className="md:px-20 px-8 px-2">

            <div className="flex items-center justify-center lg:pt-5 pt-3">
                <div className="">
                    <p className='text-sm pb-2'><b>Role:</b></p>
                    <select name="role" className='input-field lg:w-75 md:w-50 w-40' value={data.role} onChange={(e) => setData({...data, role: e.target.value})}>
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
                    <input type="email" name="email" className="input-field lg:w-75 md:w-50 w-40" placeholder="Enter Email" value={data.email} onChange={(e) => setData({...data, email: e.target.value})} required/>
                </div>
            </div>

            <div className="flex justify-center items-center text-left lg:pt-5 md:pt-3 pt-2">
                <div className="">
                    <p className='lg:text-sm text-xs pb-2'><b>Enter Password:</b></p>
                    <input type="password" name="password" className="input-field lg:w-75 md:w-50 w-40 " placeholder="Enter Password" value={data.password} onChange={(e) => setData({...data, password: e.target.value})} required/>
                </div>
            </div>

            <div className="flex justify-center items-center text-left lg:pt-5 md:pt-3 pt-2">
                <div className="">
                    <p className='lg:text-sm text-xs pb-2'><b>Re-enter Password:</b></p>
                    <input type="password" name="rePassword" className="input-field lg:w-75 md:w-50 w-40" placeholder="Re-enter Password" value={data.rePassword} onChange={(e) => setData({...data, rePassword: e.target.value})} required/>
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
        if (!formData.fname || !formData.lname || !formData.position_id || !formData.hireDate || !formData.personnelType || !formData.status || !formData.department_id || !formData.birthDate || !formData.phone || !formData.address || !formData.emergencyName || !formData.emergencyPhone) {
            setError("Please fill out all fields in Step 1");
            return false;
        }

        // phone number validation
        if (formData.phone.length !== 11) {
            setError('Phone number must be exactly 11 digits');
            return false;
        }

        if (formData.emergencyPhone.length !== 11) {
            setError('Emergency contact phone must be exactly 11 digits');
            return false;
        }

        return true;
    };

    // validation of step 2 fields
    const validateStep2 = () => {
        if (!formData.email || !formData.role || !formData.password || !formData.rePassword) {
            setError("Please fill out all fields");
            return false;
        }

        if (formData.password !== formData.rePassword) {
            setError("Passwords do not match");
            return false;
        }

        if (formData.password.length < 6) {
            setError("Password must be at least 6 characters");
            return false;
        }

        return true;
    };

    // form submission
    const handleSubmit = async () => {
        setError("");

        // validate all fields
        if (!validateStep2()) return;

        try {
            setLoading(true);

            // step 2 (create user account)
            const userResponse = await post('/auth/register', {
                email: formData.email,
                password: formData.password,
                role: formData.role
            });

            if (!userResponse.success) throw new Error(userResponse.message || 'Failed to create user account');

            const userId = userResponse.data.id;

            // step 1 (create employee record)
            const employeeResponse = await post('/employees', {
                user_id: userId,
                first_name: formData.fname,
                last_name: formData.lname,
                department_id: formData.department_id,
                position_id: formData.position_id,
                hire_date: formData.hireDate,
                personnel_type: formData.personnelType,
                employment_status: formData.status,
                birth_date: formData.birthDate,
                phone_number: formData.phone,
                address: formData.address,
                emergency_contact_name: formData.emergencyName,
                emergency_contact_number: formData.emergencyPhone
            });

            if (!employeeResponse.success) throw new Error(employeeResponse.message || 'Failed to create employee record');
            
            alert("Employee record successfully created!");
            navigate('/employees');

        } catch (err) {
            console.error('Onboarding error:', err);
            setError(err.message || 'Failed to create employee record. Please try again.');
        } finally { setLoading(false); }
    };

    const handleNext = () => {
        setError("");
        if (validateStep1()) setSteps(2);
    };

    if (loadingData) {
        return (
            <div>
                <Navbar />
                <div className="flex items-center justify-center min-h-screen">
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    return(

        <div className="">
            <Navbar />
            <div className="p-7 lg:mx-18 md:mx-10">
                <div className="mb-10">
                    <h1 className='lg:text-3xl text-2xl text-[#990100] font-bold'>Onboarding</h1>
                </div>

                <div className="flex justify-center">
                    <div className="bg-white w-full max-w-4xl rounded-lg border border-gray-200 shadow-lg p-4 sm:p-6 lg:p-8">
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
                            <button className="bg-[#b74d4c] w-full sm:w-auto px-4 sm:px-5 py-2 text-sm sm:text-base rounded-md text-white hover:bg-[#c16666] hover:scale-105 transition duration-300 ease-in-out" onClick={() => setSteps(steps - 1)} disabled={loading}>Previous</button>
                        )}

                        {steps < 2 ? (
                            <button className="bg-[#990100] w-full sm:w-auto px-4 sm:px-5 py-2 text-sm sm:text-base rounded-md text-white hover:bg-[#ad3332] hover:scale-105 transition duration-300 ease-in-out" onClick={handleNext}>Next</button>
                        ) : (
                            <button className="bg-[#990100] w-full sm:w-auto px-4 sm:px-5 py-2 text-sm sm:text-base rounded-md text-white hover:bg-[#ad3332] hover:scale-105 transition duration-300 ease-in-out" onClick={handleSubmit} disabled={loading}>{loading ? 'Saving ...' : 'Save'}</button>
                        )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
    );

}

export default Onboarding;