import React, { useEffect, useRef } from 'react'
import Navbar from './components/navbar';
import DropDownFilter from './components/dropdownfilter';
import { useState } from "react";

const employeeRows = [
  {
    id: "AC-00001",
    fname: "Reuel Christian",
    lname: "Sundiam",
    position: "Web Developer",
    hireDate: "2025-10-20",
    personnelType: "Regular",
    status: "Active",
    department: "IT",
    birthDate: "2000-05-21",
    phone: "09181234567",
    address: "Rich Town, San Fernando, Pampanga",
    emergencyName: "Sandy Sundiam",
    emergencyPhone: "09181234567"
  },
  {
    id: "AC-00002",
    fname: "Gabrielle",
    lname: "Delos Santos",
    position: "Web Developer",
    hireDate: "2025-10-20",
    personnelType: "Regular",
    status: "Active",
    department: "IT",
    birthDate: "2000-05-21",
    phone: "09181234567",
    address: "Rich Town, San Fernando, Pampanga",
    emergencyName: "Sandy Sundiam",
    emergencyPhone: "09181234567"
  },
  {
    id: "AC-00003",
    fname: "Lance Paolo",
    lname: "Cabe",
    position: "Web Developer",
    hireDate: "2025-10-20",
    personnelType: "Regular",
    status: "Active",
    department: "IT",
    birthDate: "2000-05-21",
    phone: "09181234567",
    address: "Rich Town, San Fernando, Pampanga",
    emergencyName: "Sandy Sundiam",
    emergencyPhone: "09181234567"
  },
  {
    id: "AC-00004",
    fname: "Carl Lester",
    lname: "Paldeng",
    position: "Web Developer",
    hireDate: "2025-10-20",
    personnelType: "Regular",
    status: "Active",
    department: "IT",
    birthDate: "2000-05-21",
    phone: "09181234567",
    address: "Rich Town, San Fernando, Pampanga",
    emergencyName: "Sandy Sundiam",
    emergencyPhone: "09181234567"
  },
  {
    id: "AC-00005",
    fname: "Reuel",
    lname: "Sundiam",
    position: "Web Developer",
    hireDate: "2025-10-20",
    personnelType: "Regular",
    status: "Active",
    department: "IT",
    birthDate: "2000-05-21",
    phone: "09181234567",
    address: "Rich Town, San Fernando, Pampanga",
    emergencyName: "Sandy Sundiam",
    emergencyPhone: "09181234567"
  },
  {
    id: "AC-00006",
    fname: "Reuel",
    lname: "Sundiam",
    position: "Web Developer",
    hireDate: "2025-10-20",
    personnelType: "Regular",
    status: "Active",
    department: "IT",
    birthDate: "2000-05-21",
    phone: "09181234567",
    address: "Rich Town, San Fernando, Pampanga",
    emergencyName: "Sandy Sundiam",
    emergencyPhone: "09181234567"
  },
  {
    id: "AC-00007",
    fname: "Reuel",
    lname: "Sundiam",
    position: "Web Developer",
    hireDate: "2025-10-20",
    personnelType: "Regular",
    status: "Active",
    department: "IT",
    birthDate: "2000-05-21",
    phone: "09181234567",
    address: "Rich Town, San Fernando, Pampanga",
    emergencyName: "Sandy Sundiam",
    emergencyPhone: "09181234567"
  },
  {
    id: "AC-00008",
    fname: "Reuel",
    lname: "Sundiam",
    position: "Web Developer",
    hireDate: "2025-10-20",
    personnelType: "Regular",
    status: "Active",
    department: "IT",
    birthDate: "2000-05-21",
    phone: "09181234567",
    address: "Rich Town, San Fernando, Pampanga",
    emergencyName: "Sandy Sundiam",
    emergencyPhone: "09181234567"
  },
  {
    id: "AC-00009",
    fname: "Reuel",
    lname: "Sundiam",
    position: "Web Developer",
    hireDate: "2025-10-20",
    personnelType: "Regular",
    status: "Active",
    department: "IT",
    birthDate: "2000-05-21",
    phone: "09181234567",
    address: "Rich Town, San Fernando, Pampanga",
    emergencyName: "Sandy Sundiam",
    emergencyPhone: "09181234567"
  }
];

function ModalEmployees({isOpen, onClose, employee, onSave}){
    if (!isOpen || !employee) return null;
    const [data, setData] = useState(employee);
    const [editData, setEditData] = useState(false);

    useEffect(() => {
        setData(employee);
        setEditData(false);
    }, [employee]);


    {/* WHEN EDITING THE VALUE */}
    const handleChange = (a) => {
        const { name, value } = a.target;
        setData(prev => ({...prev, [name]:value}));
    };

    const handleSave = () => {
        onSave(data);  
        setEditData(false);
    };
    

    const [initialData, setInitialData] = useState(employee);

    useEffect(() => {
        setData(employee);
        setInitialData(employee);
        setEditData(false);
    }, [employee]);

    const unsavedChanges = JSON.stringify(data) !== JSON.stringify(initialData);

    return(
        
        <div className="fixed inset-0 flex items-center justify-center z-1000 bg-[#EDEDED]/50">

            <div className="bg-white rounded-lg shadow-lg p-6 w-150 h-auto">
                <div className="rounded-lg bg-[#990100] flex items-center justify-between py-[10px] px-4">
                    <h1 className='text-white text-lg font-medium'>Information of {data.id}</h1>
                    <button className="text-white text-lg font-medium hover:scale-105 transition duration-300 ease-in-out" onClick={() => {
                        if (unsavedChanges){
                            const confirmCancel = window.confirm("You have unsaved changes. Do you want to close it without saving?");
                            if (!confirmCancel) return;
                        } onClose();
                    }}> ✕ </button>
                </div>

                <div className="px-4">
                    <div className="grid grid-cols-2 items-center pt-5 text-left">
                        <div className="pr-2">
                            <p className='text-[15px]'><b>Employee ID:</b> {data.id}</p>
                        </div>
                        
                        <div className="flex items-center pl-2">
                            <p className='text-[15px] pr-2'><b>Employment Status:</b></p>
                            <select name="status" value = {data.status} disabled = {!editData} onChange={handleChange} className='shadow-sm text-sm border border-[#990100] p-1 text-[#990100] focus:outline-gray-400 rounded-md w-25'>
                                <option>Active</option>
                                <option>Inactive</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 items-center pt-5 text-left"> 
                        <div className="flex items-center justify-between pr-2">
                            <p className='text-[15px]'><b>First Name:</b></p>
                            <input type="text" name="fname" value = {data.fname} disabled = {!editData} onChange={handleChange} className="bg-white rounded-md text-sm focus:outline-gray-400 border border-[#990100] shadow-sm p-1 text-[#990100] text-sm w-39" />
                        </div>
                        
                        <div className="flex items-center justify-between pl-2">
                            <p className='text-[15px]'><b>Last Name:</b></p>
                            <input type="text" name="lname" value = {data.lname} disabled = {!editData} onChange={handleChange} className="bg-white rounded-md text-sm focus:outline-gray-400 border border-[#990100] shadow-sm p-1 text-[#990100] text-sm w-40" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 items-center pt-5 text-left"> 
                        <div className="flex items-center justify-between pr-2">
                            <p className='text-[15px]'><b>Department:</b></p>
                            <select name="department" value = {data.department} disabled = {!editData} onChange={handleChange} className='shadow-sm text-sm border border-[#990100] p-1 text-[#990100] focus:outline-gray-400 rounded-md w-39'>
                                <option>IT</option>
                                <option>HR</option>
                            </select>
                        </div>
                        
                        <div className="flex items-center justify-between pl-2">
                            <p className='text-[15px]'><b>Position:</b></p>
                            <select name="position" value = {data.position} disabled = {!editData} onChange={handleChange} className='shadow-sm border border-[#990100] text-sm p-1 text-[#990100] focus:outline-gray-400 rounded-md w-40'>
                                <option>Web Developer</option>
                                <option>IT Support</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 items-center pt-5 text-left"> 
                        <div className="flex items-center justify-between pr-2">
                            <p className='text-[15px]'><b>Personnel Type:</b></p>
                            <select name="personnelType" className='shadow-sm border border-[#990100] p-1 text-[#990100] focus:outline-gray-400 rounded-md w-33 text-sm' value = {data.personnelType} disabled = {!editData} onChange={handleChange}>
                                <option>Probationary</option>
                                <option>Regular</option>
                                <option>Project-based</option>
                            </select>
                        </div>
                        
                        <div className="flex items-center justify-between pl-2">
                            <p className='text-[15px]'><b>Hire Date:</b></p>
                            <input type="date" name="hireDate" value = {data.hireDate} disabled = {!editData} onChange={handleChange} className="block w-40 rounded-md border border-[#990100] shadow-sm focus:outline-gray-400 p-1 text-sm text-[#990100]" />
                        </div>
                    </div>

                    <div className="py-5">
                        <hr className='text-[#990100]'/>
                    </div>

                    <h2 className='text-md text-left pb-4'><b>Personal Information</b></h2>

                    <div className="grid grid-cols-2 items-center text-left"> 
                        
                        <div className="flex items-center justify-between pr-2">
                            <p className='text-[15px]'><b>Birth Date:</b></p>
                            <input type="date" name="birthDate" value={data.birthDate} disabled = {!editData} onChange={handleChange} className="block w-40 rounded-md border border-[#990100] shadow-sm focus:outline-gray-400 p-1 text-sm text-[#990100]" />
                        </div>

                        <div className="flex items-center justify-between pl-2">
                            <p className='text-[15px]'><b>Phone No.:</b></p>
                            <input type="text" name="phone" value = {data.phone} disabled = {!editData} onChange={handleChange} className="bg-white rounded-md text-sm focus:outline-gray-400 border border-[#990100] shadow-sm p-1 text-[#990100] text-sm w-40" maxLength="11" />
                        </div>
                    </div>

                    <div className="flex justify-between items-center text-left pt-5">
                        <p className='text-[15px]'><b>Home Address:</b></p>
                        <input type="text" name="address" value = {data.address} disabled = {!editData} onChange={handleChange} className="bg-white rounded-md text-sm focus:outline-gray-400 border border-[#990100] shadow-sm p-1 text-[#990100] text-sm w-100" />
                    </div>

                    <div className="flex justify-between items-center text-left pt-5">
                        <p className='text-[15px]'><b>Emergency Contact Name:</b></p>
                        <input type="text" name="emergencyName" value = {data.emergencyName} disabled = {!editData} onChange={handleChange} className="bg-white rounded-md text-sm focus:outline-gray-400 border border-[#990100] shadow-sm p-1 text-[#990100] text-sm w-80" />
                    </div>

                    <div className="flex justify-between items-center text-left pt-5">
                        <p className='text-[15px]'><b>Emergency Contact No.:</b></p>
                        <input type="text" name="emergencyPhone" value = {data.emergencyPhone} disabled = {!editData} onChange={handleChange} className="bg-white rounded-md text-sm focus:outline-gray-400 border border-[#990100] shadow-sm p-1 text-[#990100] text-sm w-80" maxLength="11" />
                    </div>
                    

                    {/* BUTTONS FOR CREATING AND SAVING CHANGES AS WELL AS DELETING THE RECORD */}

                    <div className="pt-7">

                        {!editData ? (
                            <div className="flex justify-end gap-4">
                                <button onClick = {() => setEditData(true)} className='bg-[#198C19] lg:px-5 md:py-[7px] px-4 py-[5px] lg:text-md text-sm rounded-md text-white hover:bg-[#46a346] hover:scale-105 transition duration-300 ease-in-out'>Update Record</button>
                                <button className='bg-[#C60000] lg:px-5 md:py-[7px] px-4 py-[5px] lg:text-md text-sm rounded-md text-white hover:bg-[#d13232] hover:scale-105 transition duration-300 ease-in-out'>Delete Record</button>
                            </div>
                        ) : (
                            <div className="flex justify-end gap-4">
                                <button className='bg-[#C60000] lg:px-5 md:py-[7px] px-4 py-[5px] lg:text-md text-sm rounded-md text-white hover:bg-[#d13232] hover:scale-105 transition duration-300 ease-in-out'>Cancel Changes</button>
                                <button onClick={() => {
                                    const confirmUpdate = window.confirm("Are you sure you want to save these changes?");
                                    if (confirmUpdate) {
                                        handleSave();
                                        onClose();
                                        alert(`You've successfully updated the record of ${data.id}!`)
                                    }
                                }} 
                                className='bg-[#FFA500] lg:px-5 md:py-[7px] px-4 py-[5px] lg:text-md text-sm rounded-md text-white hover:bg-[#ffb732] hover:scale-105 transition duration-300 ease-in-out'>Save Changes</button>
                            </div>
                             
                        )}

                    </div>

                </div>
            </div>
        </div>
    )
}

function Employees(){
    
    const [isModalOpen, setModalOpen] = useState(false);
    const [viewEmployee, setViewEmployee] = useState(null);
    const [employees, setEmployees] = useState(employeeRows);

    const handleOpen = (employee) => {
        setViewEmployee(employee);
        setModalOpen(true)
    };

    const handleClose = () => setModalOpen(false);

    const updateEmployeeData = (updated) => {
        setEmployees(prev =>
            prev.map(emp => emp.id === updated.id ? updated : emp)
        );
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

                        <DropDownFilter />

                        <div className="relative text-gray-600 border border-[#990100] rounded-lg ">
                            <input type="search" name="search" placeholder="Search" className="bg-white lg:h-10 md:h-9 h-8 px-2 lg:pr-10 md:pr-5 pr-5 md:w-auto w-35 rounded-lg text-sm focus:outline-none" />
                            <button type="submit" className="absolute right-0 top-0 md:mt-3 mt-2 lg:mr-3 mr-2 items-center cursor-pointer">
                               <img src = "icons/red-search.png" className="lg:w-5 lg:h-5 w-4 h-4 items-center" type="submit" />
                            </button>
                        </div>

                    </div> 
                </div>
                <hr className='text-[#990100] mt-6 '/>

                <div className="flex justify-end mt-5">
                    <button className='bg-[#ad3332] lg:px-5 md:py-[7px] px-4 py-[5px] lg:text-md text-sm rounded-md text-white hover:bg-[#990100] hover:scale-105 transition duration-300 ease-in-out'>Generate Report</button>
                </div>

                {/* TABLE */}
                

                <div className="overflow-x-auto bg-white border rounded-lg overflow-hidden mt-5 shadow-lg px-8 py-10">
                    <table className="min-w-full text-center">
                        <thead className="bg-[#990100] text-white ">
                            <tr>
                                <th className="px-6 py-3 text-xs tracking-wider rounded-tl-lg rounded-bl-lg">Employee ID</th>
                                <th className="px-6 py-3 text-xs tracking-wider">Name</th>
                                <th className="px-6 py-3 text-xs tracking-wider">Position</th>
                                <th className="px-6 py-3 text-xs tracking-wider">Hire Date</th>
                                <th className="px-6 py-3 text-xs tracking-wider">Personnel Type</th>
                                <th className="px-6 py-3 text-xs tracking-wider rounded-tr-lg rounded-br-lg">Actions</th>
                            </tr>
                        </thead>
                        <tbody className='divide-y divide-[#990100]'>
                            {employees.map((row) => (
                                <tr key={row.id} className="odd:bg-transparent even:bg-gray-100 hover:bg-[#f4e5e5]">
                                    <td className="px-6 py-3 text-sm text-gray-900 font-medium">
                                        {row.id}
                                    </td>
                                    <td className="px-6 py-3 text-sm text-gray-900">
                                        {row.fname + " " + row.lname}
                                    </td>
                                    <td className="px-6 py-3 text-sm text-gray-900">
                                        {row.position}
                                    </td>
                                    <td className="px-6 py-3 text-sm text-gray-900">
                                        {row.hireDate}
                                    </td>
                                    <td className="px-6 py-3 text-sm text-gray-900">
                                        {row.personnelType}
                                    </td>
                                    <td className="px-6 py-3 text-sm text-gray-900">
                                        <button
                                        className="bg-[#990100] text-white text-sm px-4 py-[5px] rounded-lg hover:bg-[#ad3332] hover:scale-105 transition duration-300 ease-in-out"
                                        onClick={() => handleOpen(row)}
                                        >
                                        View Details
                                        </button>
                                        
                                    </td>
                                </tr>
                            ))}
                        </tbody>  
                    </table>
                    <ModalEmployees
                            isOpen={isModalOpen}
                            onClose={handleClose}
                            employee = {viewEmployee}
                            onSave={updateEmployeeData}/>
                    <br />

                    <div className="flex items-center justify-between w-full">
                        <p>Showing <b>{employeeRows.length}</b> out of 200 employees</p>
                        
                        <form >
                            <div className="flex items-center space-x-2">
                                <span className='text-[#990100] hover:underline'><a href = "#"> &lt; </a></span>
                                <span className="text-sm font-medium text-body">1</span>
                                <span className="text-sm text-body">to 10</span>
                                <span className='text-[#990100] hover:underline'><a href = "#"> &gt; </a></span>
                            </div>
                        </form>                        
                    </div>
                </div>     
            </div>
        </div>
    )
}

export default Employees;