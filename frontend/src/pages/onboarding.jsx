import React from "react";
import { useState } from "react";
import Navbar from "./components/navbar";

function StepOne({ data, setData }) {

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
                            <option>Active</option>
                            <option>Inactive</option>
                        </select>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mt-3">
                    <div>
                        <p className="text-sm pb-2"><b>First Name:</b></p>
                        <input type="text" className="input-field" placeholder="Employee's First Name" value={data.fname} onChange={(e) => setData({ ...data, fname: e.target.value })}/>
                    </div>

                    <div>
                        <p className="text-sm pb-2"><b>Last Name:</b></p>
                        <input type="text" className="input-field" placeholder="Employee's Last Name" value={data.lname} onChange={(e) => setData({ ...data, lname: e.target.value })} />
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mt-3">
                    <div>
                        <p className="text-sm pb-2"><b>Department:</b></p>
                        <select className="input-select" value={data.department} onChange={(e) => setData({ ...data, department: e.target.value })}>
                            <option>IT</option>
                            <option>HR</option>
                        </select>
                    </div>

                    <div>
                        <p className="text-sm pb-2"><b>Position:</b></p>
                        <select className="input-select" value={data.position} onChange={(e) => setData({ ...data, position: e.target.value })} >
                            <option>Web Developer</option>
                            <option>IT Support</option>
                        </select>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mt-3">
                    <div>
                        <p className="text-sm pb-2"><b>Personnel Type:</b></p>
                        <select className="input-select" value={data.personnelType} onChange={(e) => setData({ ...data, personnelType: e.target.value })} >
                            <option>Probationary</option>
                            <option>Regular</option>
                            <option>Project-based</option>
                        </select>
                    </div>

                    <div>
                        <p className="text-sm pb-2"><b>Hire Date:</b></p>
                        <input type="date" className="input-field" value={data.hireDate} onChange={(e) => setData({ ...data, hireDate: e.target.value })} min="2019-01-01" max={maxDate}/>
                    </div>
                </div>

                <div className="py-5">
                    <hr className="border-[#990100]" />
                </div>

                <h2 className="text-md font-bold pb-4">Personal Information</h2>

                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <p className="text-sm pb-2"><b>Birth Date:</b></p>
                        <input type="date" className="input-field" value={data.birthDate} onChange={(e) => setData({ ...data, birthDate: e.target.value })} max={maxDate}/>
                    </div>

                    <div>
                        <p className="text-sm pb-2"><b>Phone No.:</b></p>
                        <input type="tel" maxLength="11" className="input-field" value={data.phone} placeholder="Employee's Phone No." onInput={(e) => e.target.value = e.target.value.replace(/[^0-9]/g, '')} onChange={(e) => setData({ ...data, phone: e.target.value })}/>
                    </div>
                </div>

                <div className="mt-4">
                    <p className="text-sm pb-2"><b>Home Address:</b></p>
                    <input type="text"  className="input-field w-full" placeholder="Employee's Address" value={data.address} onChange={(e) => setData({ ...data, address: e.target.value })} />
                </div>

                <div className="mt-4">
                    <p className="text-sm pb-2"><b>Emergency Contact Name:</b></p>
                    <input type="text" className="input-field w-full" placeholder="Emergency Contact Name" value={data.emergencyName} onChange={(e) => setData({ ...data, emergencyName: e.target.value })}/>
                </div>

                <div className="mt-4">
                    <p className="text-sm pb-2"><b>Emergency Contact No.:</b></p>
                    <input type="tel" maxLength="11" className="input-field w-full" placeholder="Emergency Contact No." value={data.emergencyPhone} onInput={(e) => e.target.value = e.target.value.replace(/[^0-9]/g, '')} onChange={(e) => setData({ ...data, emergencyPhone: e.target.value })}/>
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
                        <option>Admin</option>
                        <option>HR</option>
                        <option>User</option>
                    </select>
                </div>
                
            </div>

            <div className="flex justify-center items-center text-left lg:pt-5 md:pt-3 pt-2">
                <div className="">
                    <p className='text-sm pb-2'><b>Username:</b></p>
                    <input type="text" name="username" className="input-field lg:w-75 md:w-50 w-40" placeholder="Enter Username" value={data.username} onChange={(e) => setData({...data, username: e.target.value})} />
                </div>
            </div>

            <div className="flex justify-center items-center text-left lg:pt-5 md:pt-3 pt-2">
                <div className="">
                    <p className='lg:text-sm text-xs pb-2'><b>Enter Password:</b></p>
                    <input type="text" name="password" className="input-field lg:w-75 md:w-50 w-40 " placeholder="Enter Password" value={data.password} onChange={(e) => setData({...data, password: e.target.value})} />
                </div>
            </div>

            <div className="flex justify-center items-center text-left lg:pt-5 md:pt-3 pt-2">
                <div className="">
                    <p className='lg:text-sm text-xs pb-2'><b>Re-enter Password:</b></p>
                    <input type="text" name="rePassword" className="input-field lg:w-75 md:w-50 w-40" placeholder="Re-enter Password" value={data.rePassword} onChange={(e) => setData({...data, rePassword: e.target.value})} />
                </div>
            </div>

        </div>
      
    </div>
  );
}

function Onboarding(){

    const [formData, setFormData] = useState({
        fname: "",
        lname: "",
        position: "",
        hireDate: "",
        personnelType: "",
        status: "",
        department: "",
        birthDate: "",
        phone: "",
        address: "",
        emergencyName: "",
        emergencyPhone: "",
        role: "",
        username: "",
        password: "",
        rePassword: ""
    });

    const [steps, setSteps] = useState(1);

    return(

        <div className="">
            <Navbar />
            <div className="p-7 lg:mx-18 md:mx-10">
                <div className="mb-10">
                    <h1 className='lg:text-3xl text-2xl text-[#990100] font-bold'>Onboarding</h1>
                </div>

                <div className="flex justify-center">
                    <div className="bg-white w-full max-w-4xl rounded-lg border border-gray-200 shadow-lg p-4 sm:p-6 lg:p-8">
                        {steps === 1 && <StepOne data={formData} setData={setFormData} />}
                        {steps === 2 && <StepTwo data={formData} setData={setFormData} />}

                        <div className="flex justify-end mt-6 gap-3">
                        {steps > 1 && (
                            <button className="bg-[#b74d4c] w-full sm:w-auto px-4 sm:px-5 py-2 text-sm sm:text-base rounded-md text-white hover:bg-[#c16666] hover:scale-105 transition duration-300 ease-in-out" onClick={() => setSteps(steps - 1)}>Previous</button>
                        )}

                        {steps < 2 ? (
                            <button className="bg-[#990100] w-full sm:w-auto px-4 sm:px-5 py-2 text-sm sm:text-base rounded-md text-white hover:bg-[#ad3332] hover:scale-105 transition duration-300 ease-in-out" onClick={() => setSteps(steps + 1)}>Next</button>
                        ) : (
                            <button className="bg-[#990100] w-full sm:w-auto px-4 sm:px-5 py-2 text-sm sm:text-base rounded-md text-white hover:bg-[#ad3332] hover:scale-105 transition duration-300 ease-in-out" onClick={() => {
                                if (!formData.fname || !formData.lname || !formData.position || !formData.hireDate || !formData.personnelType || !formData.status || !formData.department || !formData.birthDate ||!formData.phone || !formData.address || !formData.emergencyName || !formData.emergencyPhone || !formData.username || !formData.role || !formData.password || !formData.rePassword) {
                                    alert("Please fill out all the fields and do not leave any of them blank.");
                                    return;
                                } alert("You've successfully added a new employee!")
                            }}>Save</button>
                        )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
    );

}


export default Onboarding;