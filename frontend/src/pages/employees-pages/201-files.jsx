import React, { useEffect, useRef, useState } from 'react'
import Navbar from "../components/navbar";
import DropDownFilter from "../components/dropdownfilter";


const empFiles = [
  {
    id: "AC-00001",
    name: "Reuel Christian Sundiam",
    personnelType: "Regular",
    hireDate: "10/20/25",
    remarks: "",
    empContract: "Contract.pdf",
    empContractStatus: "approved",
    empCV: "CV.pdf",
    empCVStatus: "approved",
    empApplication: "Application.pdf",
    empApplicationStatus: "approved",
    empDataSheet:"DataSheet.pdf",
    empDataSheetStatus: "disapproved",
    empNDA: "",
    empNDAStatus: "pending",
    empExam: "",
    empExamStatus: "pending",
    empDiploma: "Diploma.pdf",
    empDiplomaStatus: "disapproved",
    empTranscriptRec: "Transcript.pdf",
    empTranscriptRecStatus: "approved",
    empSSS: "SSS.pdf",
    empSSS_Status: "approved",
    empPhilhealth: "Philhealth.pdf",
    empPhilhealthStatus: "disapproved",
    empPagibig: "Pagibig.pdf",
    empPagibigStatus: "approved",
    empValidID: "ID.pdf",
    empValidIDStatus: "approved",
  },
  {
    id: "AC-00002",
    name: "Gabrielle Delos Santos",
    personnelType: "Probationary",
    hireDate: "10/20/25",
    remarks: "",
    empContract: "Contract.pdf",
    empContractStatus: "approved",
    empCV: "CV.pdf",
    empCVStatus: "approved",
    empApplication: "Application.pdf",
    empApplicationStatus: "approved",
    empDataSheet:"DataSheet.pdf",
    empDataSheetStatus: "approved",
    empNDA: "NDA.pdf",
    empNDAStatus: "approved",
    empExam: "Exam.pdf",
    empExamStatus: "approved",
    empDiploma: "Diploma.pdf",
    empDiplomaStatus: "approved",
    empTranscriptRec: "Transcript.pdf",
    empTranscriptRecStatus: "approved",
    empSSS: "SSS.pdf",
    empSSS_Status: "approved",
    empPhilhealth: "Philhealth.pdf",
    empPhilhealthStatus: "approved",
    empPagibig: "Pagibig.pdf",
    empPagibigStatus: "approved",
    empValidID: "ID.pdf",
    empValidIDStatus: "approved",
  },
  {
    id: "AC-00003",
    name: "Carl Lester Paldeng",
    personnelType: "Regular",
    hireDate: "10/20/25",
    remarks: "",
    empContract: "Contract.pdf",
    empContractStatus: "approved",
    empCV: "CV.pdf",
    empCVStatus: "approved",
    empApplication: "Application.pdf",
    empApplicationStatus: "approved",
    empDataSheet:"DataSheet.pdf",
    empDataSheetStatus: "disapproved",
    empNDA: "",
    empNDAStatus: "pending",
    empExam: "",
    empExamStatus: "pending",
    empDiploma: "Diploma.pdf",
    empDiplomaStatus: "disapproved",
    empTranscriptRec: "Transcript.pdf",
    empTranscriptRecStatus: "approved",
    empSSS: "SSS.pdf",
    empSSS_Status: "approved",
    empPhilhealth: "Philhealth.pdf",
    empPhilhealthStatus: "disapproved",
    empPagibig: "Pagibig.pdf",
    empPagibigStatus: "approved",
    empValidID: "ID.pdf",
    empValidIDStatus: "approved",
  },
  {
    id: "AC-00004",
    name: "Lance Paolo Cabe",
    personnelType: "Probationary",
    hireDate: "10/20/25",
    remarks: "",
    empContract: "Contract.pdf",
    empContractStatus: "approved",
    empCV: "CV.pdf",
    empCVStatus: "approved",
    empApplication: "Application.pdf",
    empApplicationStatus: "approved",
    empDataSheet:"DataSheet.pdf",
    empDataSheetStatus: "disapproved",
    empNDA: "",
    empNDAStatus: "pending",
    empExam: "",
    empExamStatus: "pending",
    empDiploma: "Diploma.pdf",
    empDiplomaStatus: "disapproved",
    empTranscriptRec: "Transcript.pdf",
    empTranscriptRecStatus: "approved",
    empSSS: "SSS.pdf",
    empSSS_Status: "approved",
    empPhilhealth: "Philhealth.pdf",
    empPhilhealthStatus: "disapproved",
    empPagibig: "Pagibig.pdf",
    empPagibigStatus: "approved",
    empValidID: "ID.pdf",
    empValidIDStatus: "approved",
  },
];

function ModalAccounts ({isOpen, onClose, employeeFiles, onSave}){

    if (!isOpen || !employeeFiles) return null;
    const [data, setData] = useState(employeeFiles);
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


    const [initialData, setInitialData] = useState(employeeFiles);

    useEffect(() => {
        setData(employeeFiles);
        setInitialData(employeeFiles);
        setEditData(false);
    }, [employeeFiles]);

    const unsavedChanges = JSON.stringify(data) !== JSON.stringify(initialData);

    //RETURN TO THIS SETTING THE PAGES NEEDED
    //const [pages, setPages] = useState(1);



    return (
        <div className="fixed inset-0 flex items-center justify-center z-1000 bg-[#EDEDED]/50">
             <div className="bg-white rounded-lg shadow-lg md:p-6 px-3 py-6 lg:w-150 md:w-130 w-80 md:h-130 border border-gray-300 overflow-y-auto">
                <div className="rounded-lg bg-[#990100] flex items-center justify-between lg:py-[10px] py-[6px] md:px-4 px-3">
                    <h1 className='text-white text-lg font-medium lg:text-lg text-sm'>201 Files of {data.id}</h1>
                    <button className="text-white text-2xl font-bold hover:scale-110 transition" 
                    onClick={() => {
                        if (unsavedChanges){
                            const confirmCancel = window.confirm("You have unsaved changes. Do you want to close it without saving?");
                            if (!confirmCancel) return;
                        } onClose();
                    }}> ✕ </button>
                </div>

                <div className="px-3  overflow-x-auto ">
                    <table className='min-w-full text-center'>
                        <thead>
                            <tr>
                                <th></th>
                                <th className='px-6 py-3'>File</th>
                                <th className='px-6 py-3'>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className='text-left font-semibold pb-5 px-3'>Employee Contract</td>
                                <td className='pb-5 px-3'>

                                    {/* LMK PAANO FUNCTION NG SA BUTTON NA DOWNLOAD NG FILES KASI IM NOT SURE IF PAANO YUNG MAGIGING INTERFACE AND FUNCTION NIYA MWEHEHEH */}
                                    <button 
                                    className='cursor-pointer border px-4 py-1 rounded-lg shadow-md hover:border-gray-400 hover:text-[#990100] hover:underline w-35'
                                    download=""
                                    href= "#"
                                    target='_blank'
                                    rel="noreferrer"
                                    >
                                        {data.empContract || "Pending"}
                                    </button>
                                </td>
                                <td className='pb-5 px-3'>
                                    <select name="status" className='input-field disabled:text-gray-600 lg:py-1.5 lg:px-2 p-1 lg:text-sm text-xs' value={data.empContractStatus} disabled = {!editData} onChange={handleChange} required>
                                        <option value="">Select Status</option>
                                        <option value="pending">Pending</option>
                                        <option value="approved">Approved</option>
                                        <option value="disapproved">Disapproved</option>
                                    </select>
                                </td>
                            </tr>

                            <tr>
                                <td className='text-left font-semibold pb-5 px-3'>Resume/CV</td>
                                <td className='pb-5 px-3'>
                                    <button
                                    className='cursor-pointer border px-4 py-1 rounded-lg shadow-md hover:border-gray-400 hover:text-[#990100] hover:underline w-35'
                                    download=""
                                    href= "#"
                                    target='_blank'
                                    rel="noreferrer"
                                    >
                                        {data.empCV || "Pending"}
                                    </button>
                                </td>
                                <td className='pb-5 px-3'>
                                    <select name="status" className='input-field disabled:text-gray-600 lg:py-1.5 lg:px-2 p-1 lg:text-sm text-xs' value={data.empCVStatus} disabled = {!editData} onChange={handleChange} required>
                                        <option value="">Select Status</option>
                                        <option value="pending">Pending</option>
                                        <option value="approved">Approved</option>
                                        <option value="disapproved">Disapproved</option>
                                    </select>
                                </td>
                            </tr>

                            <tr>
                                <td className='text-left font-semibold pb-5 px-3'>Application for Employment</td>
                                <td className='pb-5 px-3'>
                                    <button 
                                    className='cursor-pointer border px-4 py-1 rounded-lg shadow-md hover:border-gray-400 hover:text-[#990100] hover:underline w-35'
                                    download=""
                                    href= "#"
                                    target='_blank'
                                    rel="noreferrer"
                                    >
                                        {data.empApplication || "Pending"}
                                    </button>
                                </td>
                                <td className='pb-5 px-3'>
                                    <select name="status" className='input-field disabled:text-gray-600 lg:py-1.5 lg:px-2 p-1 lg:text-sm text-xs' value={data.empApplicationStatus} disabled = {!editData} onChange={handleChange} required>
                                        <option value="">Select Status</option>
                                        <option value="pending">Pending</option>
                                        <option value="approved">Approved</option>
                                        <option value="disapproved">Disapproved</option>
                                    </select>
                                </td>
                            </tr>

                            <tr>
                                <td className='text-left font-semibold pb-5 px-3'>Personal Data Sheet</td>
                                <td className='pb-5 px-3'>
                                    <button 
                                    className='cursor-pointer border px-4 py-1 rounded-lg shadow-md hover:border-gray-400 hover:text-[#990100] hover:underline w-35'
                                    download=""
                                    href= "#"
                                    target='_blank'
                                    rel="noreferrer"
                                    >
                                        {data.empDataSheet || "Pending"}
                                    </button>
                                </td>
                                <td className='pb-5 px-3'>
                                    <select name="status" className='input-field disabled:text-gray-600 lg:py-1.5 lg:px-2 p-1 lg:text-sm text-xs' value={data.empDataSheetStatus} disabled = {!editData} onChange={handleChange} required>
                                        <option value="">Select Status</option>
                                        <option value="pending">Pending</option>
                                        <option value="approved">Approved</option>
                                        <option value="disapproved">Disapproved</option>
                                    </select>
                                </td>
                            </tr>

                            <tr>
                                <td className='text-left font-semibold pb-5 px-3'>NDA</td>
                                <td className='pb-5 px-3'>
                                    <button 
                                    className={`border px-4 py-1 rounded-lg shadow-md w-35
                                    ${data.empNDAStatus !== "pending"
                                    ? "cursor-pointer hover:border-gray-400 hover:text-[#990100] hover:underline"
                                    : "text-gray-400"
                                    }`}
                                    download=""
                                    href= "#"
                                    target='_blank'
                                    rel="noreferrer"
                                    >
                                        {data.empNDA || "Pending"}
                                    </button>
                                </td>
                                <td className='pb-5 px-3'>
                                    <select name="status" className='input-field disabled:text-gray-600 lg:py-1.5 lg:px-2 p-1 lg:text-sm text-xs' value={data.empNDAStatus} disabled = {!editData} onChange={handleChange} required>
                                        <option value="">Select Status</option>
                                        <option value="pending">Pending</option>
                                        <option value="approved">Approved</option>
                                        <option value="disapproved">Disapproved</option>
                                    </select>
                                </td>
                            </tr>

                            <tr>
                                <td className='text-left font-semibold pb-5 px-3'>Pre-employment Exam</td>
                                <td className='pb-5 px-3'>
                                    <button 
                                    className='cursor-pointer border px-4 py-1 rounded-lg shadow-md hover:border-gray-400 hover:text-[#990100] hover:underline w-35'
                                    download=""
                                    href= "#"
                                    target='_blank'
                                    rel="noreferrer"
                                    >
                                        {data.empExam || "Pending"}
                                    </button>
                                </td>
                                <td className='pb-5 px-3'>
                                    <select name="status" className='input-field disabled:text-gray-600 lg:py-1.5 lg:px-2 p-1 lg:text-sm text-xs' value={data.empExamStatus} disabled = {!editData} onChange={handleChange} required>
                                        <option value="">Select Status</option>
                                        <option value="pending">Pending</option>
                                        <option value="approved">Approved</option>
                                        <option value="disapproved">Disapproved</option>
                                    </select>
                                </td>
                            </tr>

                            <tr>
                                <td className='text-left font-semibold pb-5 px-3'>Diploma</td>
                                <td className='pb-5 px-3'>
                                    <button
                                    className='cursor-pointer border px-4 py-1 rounded-lg shadow-md hover:border-gray-400 hover:text-[#990100] hover:underline w-35'
                                    download=""
                                    href= "#"
                                    target='_blank'
                                    rel="noreferrer"
                                    >
                                        {data.empDiploma || "Pending"}
                                    </button>
                                </td>
                                <td className='pb-5 px-3'>
                                    <select name="status" className='input-field disabled:text-gray-600 lg:py-1.5 lg:px-2 p-1 lg:text-sm text-xs' value={data.empDiplomaStatus} disabled = {!editData} onChange={handleChange} required>
                                        <option value="">Select Status</option>
                                        <option value="pending">Pending</option>
                                        <option value="approved">Approved</option>
                                        <option value="disapproved">Disapproved</option>
                                    </select>
                                </td>
                            </tr>

                            <tr>
                                <td className='text-left font-semibold pb-5 px-3'>Transcript of Records</td>
                                <td className='pb-5 px-3'>
                                    <button 
                                    className='cursor-pointer border px-4 py-1 rounded-lg shadow-md hover:border-gray-400 hover:text-[#990100] hover:underline w-35'
                                    download=""
                                    href= "#"
                                    target='_blank'
                                    rel="noreferrer"
                                    >
                                        {data.empTranscriptRec || "Pending"}
                                    </button>
                                </td>
                                <td className='pb-5 px-3'>
                                    <select name="status" className='input-field disabled:text-gray-600 lg:py-1.5 lg:px-2 p-1 lg:text-sm text-xs' value={data.empTranscriptRecStatus} disabled = {!editData} onChange={handleChange} required>
                                        <option value="">Select Status</option>
                                        <option value="pending">Pending</option>
                                        <option value="approved">Approved</option>
                                        <option value="disapproved">Disapproved</option>
                                    </select>
                                </td>
                            </tr>

                            <tr>
                                <td className='text-left font-semibold pb-5 px-3'>Social Security System</td>
                                <td className='pb-5 px-3'>
                                    <button
                                    className='cursor-pointer border px-4 py-1 rounded-lg shadow-md hover:border-gray-400 hover:text-[#990100] hover:underline w-35'
                                    download=""
                                    href= "#"
                                    target='_blank'
                                    rel="noreferrer"
                                    >
                                        {data.empSSS || "Pending"}
                                    </button>
                                </td>
                                <td className='pb-5 px-3'>
                                    <select name="status" className='input-field disabled:text-gray-600 lg:py-1.5 lg:px-2 p-1 lg:text-sm text-xs' value={data.empSSS_Status} disabled = {!editData} onChange={handleChange} required>
                                        <option value="">Select Status</option>
                                        <option value="pending">Pending</option>
                                        <option value="approved">Approved</option>
                                        <option value="disapproved">Disapproved</option>
                                    </select>
                                </td>
                            </tr>

                            <tr>
                                <td className='text-left font-semibold pb-5 px-3'>Philhealth</td>
                                <td className='pb-5 px-3'>
                                    <button 
                                    className='cursor-pointer border px-4 py-1 rounded-lg shadow-md hover:border-gray-400 hover:text-[#990100] hover:underline w-35'
                                    download=""
                                    href= "#"
                                    target='_blank'
                                    rel="noreferrer"
                                    >
                                        {data.empPhilhealth || "Pending"}
                                    </button>
                                </td>
                                <td className='pb-5 px-3'>
                                    <select name="status" className='input-field disabled:text-gray-600 lg:py-1.5 lg:px-2 p-1 lg:text-sm text-xs' value={data.empPhilhealthStatus} disabled = {!editData} onChange={handleChange} required>
                                        <option value="">Select Status</option>
                                        <option value="pending">Pending</option>
                                        <option value="approved">Approved</option>
                                        <option value="disapproved">Disapproved</option>
                                    </select>
                                </td>
                            </tr>

                            <tr>
                                <td className='text-left font-semibold pb-5 px-3'>Pag ibig</td>
                                <td className='pb-5 px-3'>
                                    <button 
                                    className='cursor-pointer border px-4 py-1 rounded-lg shadow-md hover:border-gray-400 hover:text-[#990100] hover:underline w-35'
                                    download=""
                                    href= "#"
                                    target='_blank'
                                    rel="noreferrer"
                                    >
                                        {data.empPagibig || "Pending"}
                                    </button>
                                </td>
                                <td className='pb-5 px-3'>
                                    <select name="status" className='input-field disabled:text-gray-600 lg:py-1.5 lg:px-2 p-1 lg:text-sm text-xs' value={data.empPagibigStatus} disabled = {!editData} onChange={handleChange} required>
                                        <option value="">Select Status</option>
                                        <option value="pending">Pending</option>
                                        <option value="approved">Approved</option>
                                        <option value="disapproved">Disapproved</option>
                                    </select>
                                </td>
                            </tr>

                            <tr>
                                <td className='text-left font-semibold pb-5 px-3'>Valid ID</td>
                                <td className='pb-5 px-3'>
                                    <button 
                                    className='cursor-pointer border px-4 py-1 rounded-lg shadow-md hover:border-gray-400 hover:text-[#990100] hover:underline w-35'
                                    download=""
                                    href= "#"
                                    target='_blank'
                                    rel="noreferrer"
                                    >
                                        {data.empValidID || "Pending"}
                                    </button>
                                </td>
                                <td className='pb-5 px-3'>
                                    <select name="status" className='input-field disabled:text-gray-600 lg:py-1.5 lg:px-2 p-1 lg:text-sm text-xs' value={data.empValidIDStatus} disabled = {!editData} onChange={handleChange} required>
                                        <option value="">Select Status</option>
                                        <option value="pending">Pending</option>
                                        <option value="approved">Approved</option>
                                        <option value="disapproved">Disapproved</option>
                                    </select>
                                </td>
                            </tr>

                            
                        </tbody>
                    </table>
                </div>

                

                {/* ADD THE PAGES FUNCTIONALITY */}

               {/*{pages === 1 &&(<Page1 onChange={handleChange} onNext={nextPage} />)}
               {pages === 2 &&(<Page2 onChange={handleChange} onBack={prevPage} onSubmit={handleSubmit} />)}*/}

                {/*<div className="pt-5 md:px-35 px-10">

                    <p className='lg:text-sm text-xs'><b>Employee ID:</b> {data.id}</p>
                    <div className="lg:pt-3 pt-2">
                        <p className='lg:text-sm text-xs pb-2 font-medium'>Role</p>
                        <select name="role" className='input-field disabled:text-gray-600 lg:py-1.5 lg:px-2 p-1 lg:text-sm text-xs' value={data.role} disabled = {!editData} onChange={handleChange} required>
                            <option value="">Select Role</option>
                            <option value="Admin">Admin</option>
                            <option value="HR">HR</option>
                            <option value="Employee">Employee</option>
                        </select>
                    </div>*/}

                    {/* CAN THE USER UPDATE THIS OR NO? I DISABLED IT MUNA*/}
                    {/*<div className="lg:pt-3 pt-2">
                        <p className='lg:text-sm text-xs pb-2 font-medium'>Email</p>
                        <input type="email" name="email" className="input-field disabled:text-gray-600 lg:py-1.5 lg:px-2 p-1 lg:text-sm text-xs" value={data.email} disabled />
                    </div>

                    <div className="lg:pt-3 pt-2">
                        <p className='lg:text-sm text-xs pb-2 font-medium'>Status</p>
                        <select name="status" className='input-field disabled:text-gray-600 lg:py-1.5 lg:px-2 p-1 lg:text-sm text-xs' value={data.status} disabled = {!editData} onChange={handleChange} required>
                            <option value="">Select Status</option>
                            <option value="ACTIVE">ACTIVE</option>
                            <option value="INACTIVE">INACTIVE</option>
                        </select>
                    </div>


                </div>

                 <div className="pt-7">
                    {!editData ? (
                        <div className="flex justify-center gap-4">
                            <button onClick = {() => setEditData(true)} className='bg-[#198C19] lg:px-5 py-[7px] px-4 lg:text-[15px] text-xs rounded-md text-white hover:bg-[#46a346] hover:scale-105 transition duration-300 ease-in-out'>Update Record</button>
                            <button className='bg-[#C60000] lg:px-5 py-[7px] px-4 lg:text-[15px] text-xs rounded-md text-white hover:bg-[#d13232] hover:scale-105 transition duration-300 ease-in-out'>Delete Record</button>
                        </div>
                    ):(
                        <div className="flex justify-center gap-4">
                            <button className='bg-[#C60000] lg:px-5 py-[7px] px-4 py lg:text-[15px] text-xs rounded-md text-white hover:bg-[#d13232] hover:scale-105 transition duration-300 ease-in-out'
                                    onClick = {() => {
                                        if (unsavedChanges){
                                            const confirmCancel = window.confirm("You have unsaved changes. Do you want to close it without saving?");
                                            if (!confirmCancel) return;
                                        } setData(initialData); setEditData(false);
                                    }}
                                >Cancel Changes</button>
                            <button onClick={() => {

                                    if (!data.role || !data.status) {
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

                                    
                                }} className='bg-[#FFA500] lg:px-5 md:py-[7px] px-4 py-[7px] lg:text-[15px] text-xs rounded-md text-white hover:bg-[#ffb732] hover:scale-105 transition duration-300 ease-in-out disabled:opacity-50'>Save Changes</button>
                        </div>
                    )}
                 </div>*/}


             </div>
        </div>
    )

}

function OnboardingFiles (){

    const [isModalOpen, setModalOpen] = useState(false);
    const [viewEmployeeFiles, setViewEmployeeFiles] = useState(null);
    const [employeesFiles, setEmployeesFiles] = useState(empFiles);

    const handleOpen = (empFiles) => {
        setViewEmployeeFiles(empFiles);
        setModalOpen(true)
    };

    const handleClose = () => setModalOpen(false);

    const updateEmployeeFiles = (updated) => {
        setEmployeesFiles(prev =>
            prev.map(emp => emp.id === updated.id ? updated : emp)
        );
    };

    const getRemarks = (empFiles) =>{
        const isComplete = empFiles.empContractStatus === "approved" && empFiles.empApplicationStatus === "approved" && empFiles.empDataSheetStatus === "approved" && empFiles.empNDAStatus === "approved" && empFiles.empExamStatus === "approved" && empFiles.empDiplomaStatus === "approved" && empFiles.empTranscriptRecStatus === "approved" && empFiles.empSSS_Status === "approved" && empFiles.empPhilhealthStatus && empFiles.empPagibigStatus === "approved" && empFiles.empValidIDStatus === "approved" && empFiles.empCVStatus === "approved";

        return isComplete ? "COMPLETE" : "INCOMPLETE";
    }

    return(
        <div className="">

            <Navbar />

            <div className="p-7 lg:mx-18 md:mx-10">
                {/* HEADER */}
                <div className="md:flex justify-between items-center w-full">

                    <div className="">
                        <h1 className='lg:text-3xl text-2xl text-[#990100] font-bold md:mb-0 mb-5'>201 Files</h1>
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
                                <th className="th-style">Name</th>
                                <th className="th-style">Personnel Type</th>
                                <th className="th-style">Hire Date</th>
                                <th className="th-style">Remarks</th>
                                <th className="th-style rounded-tr-lg rounded-br-lg">Actions</th>
                            </tr>
                        </thead>
                        <tbody className='tbody-style'>
                            {empFiles.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                        No employees found
                                    </td>
                                </tr>
                            ) : (
                               empFiles.map((row) =>{ 

                                const remarks = getRemarks(row);

                                return (

                                    <tr key={row.id} className="tr-style">
                                        <td className="td-style font-medium">
                                            {row.id}
                                        </td>
                                        <td className="td-style">
                                            {row.name}
                                        </td>
                                        <td className="td-style">
                                            {row.personnelType}
                                        </td>
                                        <td className="td-style">
                                            {row.hireDate}
                                        </td>
                                        <td className= " td-style">
                                            <p className={` lg:py-[4px] lg:px-0 px-4 py-1 lg:rounded-xl rounded-full text-xs font-semibold  ${remarks === 'COMPLETE' ? 'text-[#198C19] bg-[#198C19]/25': 'text-[#C60000] bg-[#C60000]/25'}`}>{remarks}</p>
                                        </td>
                                        <td className="td-style">
                                            <button className="bg-[#990100] text-white lg:text-sm text-xs px-4 py-[5px] rounded-lg hover:bg-[#ad3332] hover:scale-105 transition duration-300 ease-in-out" onClick={() => handleOpen(row)}>
                                                View Details
                                            </button>
                                        </td>
                                    </tr>
                                )})
                            )}
                        </tbody>
                    </table>
                    {/* CONNECT WITH THE FUNCTION */}
                    <ModalAccounts
                        isOpen={isModalOpen}
                        onClose={handleClose}
                        employeeFiles = {viewEmployeeFiles}
                        onSave={updateEmployeeFiles}
                    />
                    <br />
                    <div className="lg:flex items-center lg:justify-between">
                        <p className='lg:text-md text-sm'>Showing <b>{empFiles.length}</b> employee{empFiles.length !== 1 ? 's' : ''}</p>
                        
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
} export default OnboardingFiles;