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
        <div className="rounded-lg bg-[#990100] items-center lg:py-[10px] py-[6px] md:px-4 px-3 mb-3">
            <h1 className='text-white text-lg font-medium lg:text-lg text-sm'>Onboarding Form</h1>
        </div>

        <div className="md:px-3 px-2">
            <div className="md:grid md:grid-cols-2 items-center lg:pt-5 pt-3 text-left">
                <div className="pr-2 md:pb-0 pb-3">
                    <p className='lg:text-sm text-xs'><b>Employee ID:</b> (auto-generated)</p>
                </div>
                        
                <div className="flex items-center md:justify-between md:pl-2">
                    <p className='lg:text-sm text-xs pr-2'><b>Employment Status:</b></p>
                    <select name="status" className='shadow-sm lg:text-sm text-xs border border-[#990100] py-1 px-2 text-[#990100] focus:outline-gray-400 rounded-md lg:w-60 md:w-20 w-20 disabled:text-gray-600' value={data.status} onChange={(e) => setData({...data, status: e.target.value})}>
                        <option>Active</option>
                        <option>Inactive</option>
                    </select>
                </div>
            </div>

            <div className="md:grid md:grid-cols-2 items-center lg:pt-5 pt-3 text-left"> 
                <div className="flex items-center md:justify-between pr-2 md:pb-0 pb-3">
                    <p className='lg:text-sm text-xs md:pr-0 pr-3'><b>First Name:</b></p>
                    <input type="text" name="fname" className="bg-white rounded-md lg:text-sm text-xs focus:outline-gray-400 border border-[#990100] shadow-sm py-1 px-2 text-[#990100] text-sm lg:w-82 md:w-38 w-36 disabled:text-gray-600" placeholder="Employee's First Name" value={data.fname} onChange={(e) => setData({...data, status: e.target.value})} />
                </div>
                        
                <div className="flex items-center md:justify-between md:pl-2">
                    <p className='lg:text-sm text-xs md:pr-0 pr-4'><b>Last Name:</b></p>
                    <input type="text" name="lname" className="bg-white rounded-md lg:text-sm text-xs focus:outline-gray-400 border border-[#990100] shadow-sm py-1 px-2 text-[#990100] text-sm lg:w-82 md:w-38 w-36 disabled:text-gray-600" placeholder="Employee's Last Name" value={data.lname} onChange={(e) => setData({...data, lname: e.target.value})} />
                </div>
            </div>

            <div className="md:grid md:grid-cols-2 items-center lg:pt-5 pt-3 text-left"> 
                <div className="flex items-center md:justify-between pr-2 md:pb-0 pb-3">
                    <p className='lg:text-sm text-xs md:pr-0 pr-2'><b>Department:</b></p>
                    <select name="department" className='shadow-sm lg:text-sm text-xs border border-[#990100] py-1 px-2 text-[#990100] focus:outline-gray-400 rounded-md lg:w-82 md:w-38 w-36 disabled:text-gray-600' value={data.department} onChange={(e) => setData({...data, department: e.target.value})}>
                        <option>IT</option>
                        <option>HR</option>
                    </select>
                </div>
                        
            <div className="flex items-center md:justify-between md:pl-2">
                <p className='lg:text-sm text-xs md:pr-0 pr-8'><b>Position:</b></p>
                <select name="position" className='shadow-sm border border-[#990100] lg:text-sm text-xs py-1 px-2 text-[#990100] focus:outline-gray-400 rounded-md lg:w-82 md:w-38 w-36 disabled:text-gray-600' value={data.position} onChange={(e) => setData({...data, position: e.target.value})}>
                    <option>Web Developer</option>
                    <option>IT Support</option>
                </select>
                </div>
            </div>

            <div className="md:grid md:grid-cols-2 items-center lg:pt-5 pt-3 text-left"> 
                <div className="flex items-center md:justify-between pr-2 md:pb-0 pb-3">
                    <p className='lg:text-sm text-xs md:pr-0 pr-2'><b>Personnel Type:</b></p>
                    <select name="personnelType" className='shadow-sm border border-[#990100] py-1 px-2 text-[#990100] focus:outline-gray-400 rounded-md lg:w-75 md:w-33 w-32 lg:text-sm text-xs disabled:text-gray-600' value={data.personnelType} onChange={(e) => setData({...data, personnelType: e.target.value})}>
                        <option>Probationary</option>
                        <option>Regular</option>
                        <option>Project-based</option>
                    </select>
                </div>
                        
                <div className="flex items-center md:justify-between md:pl-2">
                    <p className='lg:text-sm text-xs md:pr-0 pr-7'><b>Hire Date:</b></p>
                    <input type="date" name="hireDate" className="block lg:w-82 md:w-38 w-35 rounded-md border border-[#990100] shadow-sm focus:outline-gray-400 py-1 px-2 lg:text-sm text-xs text-[#990100] disabled:text-gray-600" value={data.hireDate} onChange={(e) => setData({...data, hireDate: e.target.value})} min = "2019-01-01" max = {maxDate} />
                </div>
            </div>

            <div className="lg:py-5 pt-5 pb-3">
                <hr className='text-[#990100]'/>
            </div>

            <h2 className='lg:text-md text:sm text-left pb-4'><b>Personal Information</b></h2>

            <div className="md:grid md:grid-cols-2 items-center text-left"> 
                        
                <div className="flex items-center md:justify-between pr-2 md:pb-0 pb-3">
                    <p className='lg:text-sm text-xs md:pr-0 pr-5'><b>Birth Date:</b></p>
                    <input type="date" name="birthDate" className="block lg:w-82 md:w-38 w-36 rounded-md border border-[#990100] shadow-sm focus:outline-gray-400 py-1 px-2 lg:text-sm text-xs text-[#990100] disabled:text-gray-600" value={data.birthDate} onChange={(e) => setData({...data, birthDate: e.target.value})} max = {maxDate} />
                </div>

                <div className="flex items-center md:justify-between md:pl-2">
                    <p className='lg:text-sm text-xs md:pr-0 pr-5'><b>Phone No.:</b></p>
                    <input type="tel" name="phone" className="bg-white rounded-md text-sm focus:outline-gray-400 border border-[#990100] shadow-sm py-1 px-2 text-[#990100] lg:text-sm text-xs lg:w-82 md:w-38 w-36 disabled:text-gray-600" maxLength="11" onInput={(e) => {e.target.value = e.target.value.replace(/[^0-9]/g, ''); }} placeholder="Employee's Phone No." value={data.phone} onChange={(e) => setData({...data, phone: e.target.value})} />
                </div>
            </div>

            <div className="md:flex md:justify-between items-center text-left lg:pt-5 pt-3">
                <p className='lg:text-sm text-xs md:pr-0 pr-2'><b>Home Address:</b></p>
                <input type="text" name="address" className="bg-white rounded-md text-sm focus:outline-gray-400 border border-[#990100] shadow-sm py-1 px-2 text-[#990100] lg:text-sm text-xs lg:w-185 md:w-93 w-57 disabled:text-gray-600 mt-2 md:mt-0" placeholder="Employee's Address" value={data.address} onChange={(e) => setData({...data, address: e.target.value})} />
            </div>

            <div className="md:flex md:justify-between items-center text-left lg:pt-5 md:pt-3 pt-2">
                <p className='lg:text-sm text-xs'><b>Emergency Contact Name:</b></p>
                <input type="text" name="emergencyName" className="bg-white rounded-md text-sm focus:outline-gray-400 border border-[#990100] shadow-sm py-1 px-2 text-[#990100] lg:text-sm text-xs lg:w-165 md:w-78 w-57 disabled:text-gray-600 mt-2 md:mt-0" placeholder="Employee's Emergnency Contact Name" value={data.emergencyName} onChange={(e) => setData({...data, emergencyName: e.target.value})} />
            </div>

            <div className="md:flex justify-between items-center text-left lg:pt-5 md:pt-3 pt-2">
                <p className='lg:text-sm text-xs'><b>Emergency Contact No.:</b></p>
                <input type="tel" name="emergencyPhone" className="bg-white rounded-md text-sm focus:outline-gray-400 border border-[#990100] shadow-sm py-1 px-2 text-[#990100] lg:text-sm text-xs lg:w-165 md:w-78 w-57 disabled:text-gray-600 mt-2 md:mt-0" maxLength="11" onInput={(e) => {e.target.value = e.target.value.replace(/[^0-9]/g, ''); }} placeholder="Employee's Emergency Contact No." value={data.emergencyPhone} onChange={(e) => setData({...data, emergencyPhone: e.target.value})} />
            </div>

            {/*<div className="pt-5">
                <p className="text-sm">Page <strong>1</strong> of 2</p>
            </div>*/}

            
        </div>
    </div>
  );
}

function StepTwo({ data, setData }) {
  return (
    <div>

        <div className="rounded-lg bg-[#990100] items-center lg:py-[10px] py-[6px] md:px-4 px-3 mb-3">
            <h1 className='text-white text-lg font-medium lg:text-lg text-sm'>Create New Account</h1>
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
        emergencyPhone: ""
    });

    const [steps, setSteps] = useState(1);

    return(

        <div className="">
            <Navbar />
            <div className="p-7 lg:mx-18 md:mx-10">
                <div className="mb-10">
                    <h1 className='lg:text-3xl text-2xl text-[#990100] font-bold'>Onboarding</h1>
                </div>

                <div className="mx-18 flex justify-center">
                    <div className="bg-white rounded-lg border border-gray-200 shadow-lg lg:p-8 md:p-6 p-4">
                        {steps === 1 && <StepOne data={formData} setData={setFormData} />}
                        {steps === 2 && <StepTwo data={formData} setData={setFormData} />}

                        <div className="flex justify-end mt-6 gap-3">
                        {steps > 1 && (
                            <button className="bg-[#b74d4c] lg:px-5 md:py-[7px] px-4 py-[7px] lg:text-[15px] md:text-xs rounded-md text-white hover:bg-[#c16666] hover:scale-105 transition duration-300 ease-in-out" onClick={() => setSteps(steps - 1)}>Previous</button>
                        )}

                        {steps < 2 ? (
                            <button className="bg-[#990100] lg:px-5 md:py-[7px] px-4 py-[7px] lg:text-[15px] md:text-xs rounded-md text-white hover:bg-[#ad3332] hover:scale-105 transition duration-300 ease-in-out" onClick={() => setSteps(steps + 1)}>Next</button>
                        ) : (
                            <button className="bg-[#990100] lg:px-5 md:py-[7px] px-4 py-[7px] lg:text-[15px] md:text-xs rounded-md text-white hover:bg-[#ad3332] hover:scale-105 transition duration-300 ease-in-out" onClick={() => {
                                if (!formData.fname || !formData.lname || !formData.position || !formData.hireDate || !formData.personnelType || !formData.status || !formData.department || !formData.birthDate ||!formData.phone || !formData.address || !formData.emergencyName || !formData.emergencyPhone) {
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