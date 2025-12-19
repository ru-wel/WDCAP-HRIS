import React, { useEffect, useRef, useState } from 'react'
import Navbar from "../components/navbar";
import DropDownFilter from "../components/dropdownfilter";


const userAcc = [
  {
    id: "AC-00001",
    username: "rcsundiam@acdc.ph",
    role: "Admin",
    createdAt: "12/10/25",
    status: "ACTIVE",
  },
  {
    id: "AC-00002",
    username: "gmrdelossantos@acdc.ph",
    role: "Admin",
    createdAt: "12/10/25",
    status: "INACTIVE",
  },
  {
    id: "AC-00003",
    username: "clpaldeng@acdc.ph",
    role: "Admin",
    createdAt: "12/10/25",
    status: "ACTIVE",
  },
  {
    id: "AC-00004",
    username: "clpcabe@acdc.ph",
    role: "Admin",
    createdAt: "12/10/25",
    status: "ACTIVE",
  },
];

function ModalAccounts ({isOpen, onClose, employeeAcc, onSave}){

    if (!isOpen || !employeeAcc) return null;
    const [data, setData] = useState(employeeAcc);
    const [editData, setEditData] = useState(false);

    // WHEN EDITING THE VALUE
    const handleChange = (a) => {
        const { name, value } = a.target;
        setData(prev => ({...prev, [name]:value}));
    };

    const handleSave = () => {
        onSave(data);  
        setEditData(false);
    };


    const [initialData, setInitialData] = useState(employeeAcc);

    useEffect(() => {
        setData(employeeAcc);
        setInitialData(employeeAcc);
        setEditData(false);
    }, [employeeAcc]);

    const unsavedChanges = JSON.stringify(data) !== JSON.stringify(initialData);

    return (
        <div className="fixed inset-0 flex items-center justify-center z-1000 bg-[#EDEDED]/50">
             <div className="bg-white rounded-lg shadow-lg md:p-6 px-3 py-6 lg:w-150 md:w-130 w-80 md:h-auto h-100 overflow-y-auto border border-gray-300">
                <div className="rounded-lg bg-[#990100] flex items-center justify-between lg:py-[10px] py-[6px] md:px-4 px-3">
                    <h1 className='text-white text-lg font-medium lg:text-lg text-sm'>Account of {data.id}</h1>
                    <button className="text-white text-2xl font-bold hover:scale-110 transition" 
                    onClick={() => {
                        if (unsavedChanges){
                            const confirmCancel = window.confirm("You have unsaved changes. Do you want to close it without saving?");
                            if (!confirmCancel) return;
                        } onClose();
                    }}> ✕ </button>
                </div>

                <div className="pt-5 px-3">

                    <p>hello</p>
                    <div className="">
                        <p>Role</p>
                        <select name="role" className='input-field disabled:text-gray-600 w-75' value={data.role} disabled = {!editData} onChange={handleChange} >
                            <option value="">Select Role</option>
                            <option value="Active">ACTIVE</option>
                            <option value="Inactive">INACTIVE</option>
                        </select>
                    </div>
                </div>

                 <div className="pt-7">
                    {!editData ? (
                        <div className="flex justify-center gap-4">
                            <button onClick = {() => setEditData(true)} className='bg-[#198C19] lg:px-5 py-[7px] px-4 lg:text-md text-xs rounded-md text-white hover:bg-[#46a346] hover:scale-105 transition duration-300 ease-in-out'>Update Record</button>
                            <button className='bg-[#C60000] lg:px-5 py-[7px] px-4 lg:text-md text-xs rounded-md text-white hover:bg-[#d13232] hover:scale-105 transition duration-300 ease-in-out'>Delete Record</button>
                        </div>
                    ):(
                        <div className="flex justify-center gap-4">
                            <button className='bg-[#C60000] lg:px-5 py-[7px] px-4 py lg:text-md text-xs rounded-md text-white hover:bg-[#d13232] hover:scale-105 transition duration-300 ease-in-out'
                                    onClick = {() => {
                                        if (unsavedChanges){
                                            const confirmCancel = window.confirm("You have unsaved changes. Do you want to close it without saving?");
                                            if (!confirmCancel) return;
                                        } setData(initialData); setEditData(false);
                                    }}
                                >Cancel Changes</button>
                            <button onClick={() => {

                                    if (!data.role) {
                                        alert("Please fill out all fields and do not leave any of them blank.");
                                        return;
                                    }

                                    handleSave();
                                    onClose();

                                    const confirmUpdate = window.confirm("Are you sure you want to save these changes?");
                                    if (confirmUpdate) {
                                        handleSave();
                                        onClose();
                                        alert(`You've successfully updated the record of ${data.id}!`)
                                    }

                                    
                                }} className='bg-[#FFA500] lg:px-5 md:py-[7px] px-4 py-[7px] lg:text-md text-xs rounded-md text-white hover:bg-[#ffb732] hover:scale-105 transition duration-300 ease-in-out'>Save Changes</button>
                        </div>
                    )}
                 </div>


             </div>
        </div>
    )

}

function UserAccounts (){

    const [isModalOpen, setModalOpen] = useState(false);
    const [viewEmployeeAcc, setViewEmployeeAcc] = useState(null);
    const [employeesAcc, setEmployeesAcc] = useState(userAcc);

    const handleOpen = (employeeAcc) => {
        setViewEmployeeAcc(employeeAcc);
        setModalOpen(true)
    };

    const handleClose = () => setModalOpen(false);

    const updateEmployeeAcc = (updated) => {
        setEmployeesAcc(prev =>
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
                        <h1 className='lg:text-3xl text-2xl text-[#990100] font-bold md:mb-0 mb-5'>User Accounts</h1>
                    </div>

                    <div className="flex items-center justify-end md:gap-4 gap-3"> 
                        <DropDownFilter />

                        <div className="relative text-gray-600 border border-[#990100] rounded-lg ">
                            <input type="search" name="search" placeholder="Search" className="bg-white lg:h-10 md:h-9 h-8 px-2 lg:pr-10 md:pr-5 pr-5 md:w-auto w-35 rounded-lg text-sm focus:outline-none" />
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

                <div className="flex justify-end mt-5">
                    <button className='generate-report-button'>Generate Report</button>
                </div>

                <div className="div-table">
                    <table className="table-style">
                        <thead className="thead-style">
                            <tr>
                                <th className="th-style rounded-tl-lg rounded-bl-lg">Employee ID</th>
                                <th className="th-style">Username</th>
                                <th className="th-style">Role</th>
                                <th className="th-style">Created At</th>
                                <th className="th-style">Status</th>
                                <th className="th-style hidden sm:table-cell rounded-tr-lg rounded-br-lg">Actions</th>
                            </tr>
                        </thead>
                        <tbody className='tbody-style'>
                            {employeesAcc.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                        No employees found
                                    </td>
                                </tr>
                            ) : (
                               employeesAcc.map((row) => (
                                    <tr key={row.id} className="tr-style">
                                        <td className="td-style-nobtn font-medium">
                                            {row.id}
                                        </td>
                                        <td className="td-style-nobtn ">
                                            {row.username}
                                        </td>
                                        <td className="td-style-nobtn">
                                            {row.role}
                                        </td>
                                        <td className="td-style-nobtn">
                                            {row.createdAt}
                                        </td>
                                        <td className= " td-style-nobtn">
                                            <p className={` py-[6px] rounded-xl text-xs font-semibold  ${row.status === 'ACTIVE' ? 'text-[#198C19] bg-[#198C19]/25': 'text-[#C60000] bg-[#C60000]/25'}`}>{row.status}</p>
                                        </td>
                                        <td className="td-style-nobtn">
                                            <button className="bg-[#990100] text-white lg:text-sm text-xs px-4 py-[5px] rounded-lg hover:bg-[#ad3332] hover:scale-105 transition duration-300 ease-in-out" onClick={() => handleOpen(row)}>
                                                View Details
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                    {/* CONNECT WITH THE FUNCTION */}
                    <ModalAccounts
                        isOpen={isModalOpen}
                        onClose={handleClose}
                        employeeAcc = {viewEmployeeAcc}
                        onSave={updateEmployeeAcc}
                    />
                    <br />
                    <div className="lg:flex items-center lg:justify-between">
                        <p className='lg:text-md text-sm'>Showing <b>{employeesAcc.length}</b> employee{employeesAcc.length !== 1 ? 's' : ''}</p>
                        
                        <div className="flex items-center space-x-2 md:pt-0 pt-4">
                            <span className='text-[#990100] hover:underline'><a href = "#"> &lt; </a></span>
                            <span className="text-sm font-medium text-body">1</span>
                            <span className="text-sm text-body">to 10</span>
                            <span className='text-[#990100] hover:underline'><a href = "#"> &gt; </a></span>
                        </div>                       
                    </div>
                </div>
            </div>
        </div>
    )
} export default UserAccounts;