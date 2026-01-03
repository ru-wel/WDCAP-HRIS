import React, { useEffect, useState } from 'react'
import Navbar from "../components/navbar";
import DropDownFilter from "../components/dropdownfilter";
import { get, post } from '../../services/api';
import { ONBOARDING_STATUSES } from '../../constants/config';
import ReactPaginate from 'react-paginate';

const modalFiles = [
    {
        fileName: "Employee Contract",
        file: "empContract",
        status: "empContractStatus",
        comment:"empContractComment",
        checklistId: "empContractChecklistId",
        documentId: "empContractDocumentId"
    },
    {
        fileName: "Resume/CV",
        file: "empCV",
        status: "empCVStatus",
        comment:"empCVComment",
        checklistId: "empCVChecklistId",
        documentId: "empCVDocumentId"
    },
    {
        fileName: "Application for Employment",
        file: "empApplication",
        status: "empApplicationStatus",
        comment:"empApplicationComment",
        checklistId: "empApplicationChecklistId",
        documentId: "empApplicationDocumentId"
    },
    {
        fileName: "Personal Data Sheet",
        file: "empDataSheet",
        status: "empDataSheetStatus",
        comment:"empDataSheetComment",
        checklistId: "empDataSheetChecklistId",
        documentId: "empDataSheetDocumentId"
    },
    {
        fileName: "NDA",
        file: "empNDA",
        status: "empNDAStatus",
        comment:"empNDAComment",
        checklistId: "empNDAChecklistId",
        documentId: "empNDADocumentId"
    },
    {
        fileName: "Pre Employment Exam",
        file: "empExam",
        status: "empExamStatus",
        comment:"empExamComment",
        checklistId: "empExamChecklistId",
        documentId: "empExamDocumentId"
    },
    {
        fileName: "Diploma",
        file: "empDiploma",
        status: "empDiplomaStatus",
        comment:"empDiplomaComment",
        checklistId: "empDiplomaChecklistId",
        documentId: "empDiplomaDocumentId"
    },
    {
        fileName: "Transcript of Records",
        file: "empTranscriptRec",
        status: "empTranscriptRecStatus",
        comment:"empTranscriptRecComment",
        checklistId: "empTranscriptRecChecklistId",
        documentId: "empTranscriptRecDocumentId"
    },
    {
        fileName: "SSS",
        file: "empSSS",
        status: "empSSS_Status",
        comment:"empSSSComment",
        checklistId: "empSSSChecklistId",
        documentId: "empSSSDocumentId"
    },
    {
        fileName: "Philhealth",
        file: "empPhilhealth",
        status: "empPhilhealthStatus",
        comment:"empPhilhealthComment",
        checklistId: "empPhilhealthChecklistId",
        documentId: "empPhilhealthDocumentId"
    },
    {
        fileName: "Pag ibig",
        file: "empPagibig",
        status: "empPagibigStatus",
        comment:"empPagibigComment",
        checklistId: "empPagibigChecklistId",
        documentId: "empPagibigDocumentId"
    },
    {
        fileName: "Valid ID",
        file: "empValidID",
        status: "empValidIDStatus",
        comment:"empValidIDComment",
        checklistId: "empValidIDChecklistId",
        documentId: "empValidIDDocumentId"
    },

]

function ModalFiles ({isOpen, onClose, employeeFiles, onSave, onRefresh}){

    const [data, setData] = useState(employeeFiles ?? null);
    const [editData, setEditData] = useState(false);
    const [loading, setLoading] = useState(false);

    const [files] = useState(modalFiles);

    // WHEN EDITING THE VALUE
    const handleChange = (a) => {
        const { name, value } = a.target;
        setData(prev => ({...prev, [name]:value}));
    };

    const handleDownload = async (documentId, fileName) => {
        if (!documentId) {
            alert('No document available to download');
            return;
        }

        try {
            setLoading(true);

            const response = await get(`/documents/${documentId}/download`);

            if (response.success && response.data.signedUrl) {
                // open download URL in new tab
                window.open(response.data.signedUrl, '_blank');
            } else {
                alert('Failed to generate download link');
            }
        } catch (error) {
            console.error('Download error:', error);
            alert(error.message || 'Failed to download document');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!data) return;

        const confirmUpdate = window.confirm("Are you sure you want to save these changes?");
        if (!confirmUpdate) return;

        try {
            setLoading(true);

            // review each document that has a status and checklist ID
            const reviewPromises = [];

            files.forEach(file => {
                const checklistId = data[file.checklistId];
                const status = data[file.status];
                const remarks = data[file.comment] || null;

                // Only call API if status is approved or rejected (not pending/submitted)
                if (checklistId && (status === ONBOARDING_STATUSES.APPROVED || status === ONBOARDING_STATUSES.REJECTED)) {
                    const reviewPromise = post(`/onboarding/checklist/${checklistId}/review`, {
                        status,
                        remarks
                    });
                    reviewPromises.push(reviewPromise);
                }
            });

            // wait for all promises to complete
            await Promise.all(reviewPromises);

            alert(`You've successfully updated the record of ${data.id}!`);

            if (onRefresh) {
                await onRefresh();
            }

            setEditData(false);
            onClose();
        } catch (error) {
            console.error('Review error:', error);
            alert(error.message || 'Failed to update documents');

            // Revert to initial data on error
            setData(initialData);
        } finally {
            setLoading(false);
        }
    };

    const [initialData, setInitialData] = useState(employeeFiles ?? null);

    useEffect(() => {
        setData(employeeFiles ?? null);
        setInitialData(employeeFiles ?? null);
        setEditData(false);
    }, [employeeFiles]);

    const unsavedChanges = data && initialData ? JSON.stringify(data) !== JSON.stringify(initialData) : false;

    if (!isOpen || !employeeFiles || !data || !initialData) return null;

    const renderSectionHeaderRow = (title) => (
        <tr key={`section-${title}`}>
            <td colSpan={4} className="px-3 pt-5 pb-2">
                <div className="flex items-center gap-4">
                    <span className="font-bold text-base tracking-wide">{title}</span>
                    <div className="flex-1 border-t border-[#990100]/40" />
                </div>
            </td>
        </tr>
    );

    //RETURN TO THIS FOR SETTING THE PAGES NEEDED
    //const [pages, setPages] = useState(1);

    return (
        <div className="fixed inset-0 flex items-center justify-center z-1000 bg-[#EDEDED]/50">
             <div className="bg-white rounded-lg shadow-lg md:p-6 px-3 py-6 lg:w-190 md:w-140 w-75 md:h-130 h-120 border border-gray-300 overflow-y-auto overflow-x-auto">
                <div className="rounded-lg bg-[#990100] flex items-center justify-between lg:py-[10px] py-[6px] md:px-4 px-3 w-full">
                    <h1 className='text-white text-lg font-medium lg:text-lg text-sm'>201 Files of {data.id}</h1>
                    <button
                        className="text-white text-2xl font-bold hover:scale-110 transition disabled:opacity-50 cursor-pointer"
                        disabled={loading}
                        onClick={() => {
                            if (unsavedChanges){
                                const confirmCancel = window.confirm("You have unsaved changes. Do you want to close it without saving?");
                                if (!confirmCancel) return;
                            } onClose();
                        }}
                    > ✕ </button>
                </div>

                <div className="   ">
                    <table className='min-w-full text-center'>
                        <thead>
                            <tr >
                                <th></th>
                                <th className='px-6 py-3 text-sm'>File</th>
                                <th className='px-6 py-3 text-sm'>Status</th>
                                <th className='px-6 py-3 text-sm'>Comments</th>
                            </tr>
                        </thead>
                        <tbody>
                            {files.map((row) => (
                                <React.Fragment key={row.status}>
                                {row.file === 'empSSS' && renderSectionHeaderRow('BENEFITS')}
                                {row.file === 'empValidID' && renderSectionHeaderRow('VALID ID')}
                                <tr>
                                <td className='text-left font-semibold pb-5 px-3 lg:text-sm text-xs'>{row.fileName}</td>
                                <td className='pb-5 px-3'>
                                    {data[row.file] && data[row.documentId] ? (
                                        // has document - show as downloadable link
                                        <button
                                            onClick={() => {
                                                const documentId = data[row.documentId];
                                                const fileName = data[row.file];
                                                handleDownload(documentId, fileName);
                                            }}
                                            disabled={loading}
                                            className="text-[#990100] hover:underline lg:text-sm text-xs disabled:opacity-50 disabled:cursor-not-allowed text-left w-full cursor-pointer"
                                            title="Click to download"
                                        >
                                            📄 {data[row.file]}
                                        </button>
                                    ) : data[row.status] === ONBOARDING_STATUSES.SUBMITTED ? (
                                        // submitted but no document link yet
                                        <span className="text-yellow-600 lg:text-sm text-xs">
                                            Submitted (Processing...)
                                        </span>
                                    ) : (
                                        // pending or no document
                                        <span className="text-gray-500 lg:text-sm text-xs">
                                            {data[row.status] === ONBOARDING_STATUSES.PENDING ? "Pending Upload" : "No File"}
                                        </span>
                                    )}
                                </td>
                                <td className='pb-5 px-3'>
                                    <select name={row.status} className='input-field disabled:text-gray-600 lg:py-1.5 lg:px-2 p-1 lg:text-sm text-xs' value={data[row.status]} disabled = {!editData || loading} onChange={handleChange} required>
                                        <option value="">Select Status</option>
                                        <option value={ONBOARDING_STATUSES.APPROVED}>Approved</option>
                                        <option value={ONBOARDING_STATUSES.REJECTED}>Rejected</option>
                                    </select>
                                </td>

                                <td className='pb-5 px-3'>
                                    {data[row.status] === ONBOARDING_STATUSES.REJECTED &&(
                                        editData ? (
                                        <textarea name={row.comment}
                                            value={data[row.comment] || ""}
                                            onChange={handleChange}
                                            disabled={loading}
                                            required
                                            placeholder="Reason"
                                            className="input-field w-full lg:text-sm text-xs disabled:opacity-50"
                                            maxLength="25" />
                                        ):(
                                            <p className="lg:text-sm text-xs text-gray-700">
                                                {data[row.comment] || "No comment provided"}
                                            </p>
                                        )
                                    )}

                                    {data[row.status] === ONBOARDING_STATUSES.APPROVED &&(
                                        <p className='lg:text-sm text-xs'>DONE!</p>
                                    )}

                                    {(data[row.status] === ONBOARDING_STATUSES.PENDING || data[row.status] === ONBOARDING_STATUSES.SUBMITTED) &&(
                                        <p className='lg:text-sm text-xs'>{data[row.status] === ONBOARDING_STATUSES.SUBMITTED ? "Awaiting Review..." : "Pending..."}</p>
                                    )}
                                </td>
                            </tr>
                                </React.Fragment>
                            ))}

                        </tbody>
                    </table>

                    <div className="flex items-center justify-end px-3 pt-3 text-xs text-gray-700">
                        <p>
                            <b>Last Updated:</b> {data.lastUpdatedDate || data.hireDate} | {data.lastUpdatedTime || '10:00 AM PHT'}
                        </p>
                    </div>

                    <div className="pt-7">
                        {!editData ? (
                            <div className="flex justify-center gap-4">
                                <button
                                    onClick={() => setEditData(true)}
                                    disabled={loading}
                                    className='bg-[#198C19] lg:px-5 py-[7px] px-4 lg:text-[15px] text-xs rounded-md text-white hover:bg-[#46a346] hover:scale-105 transition duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'
                                >
                                    Update Record
                                </button>
                                <button
                                    disabled={loading}
                                    className='bg-[#C60000] lg:px-5 py-[7px] px-4 lg:text-[15px] text-xs rounded-md text-white hover:bg-[#d13232] hover:scale-105 transition duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'
                                >
                                    Delete Record
                                </button>
                            </div>
                        ):(
                            <div className="flex justify-center gap-4">
                                <button
                                    className='bg-[#C60000] lg:px-5 py-[7px] px-4 py lg:text-[15px] text-xs rounded-md text-white hover:bg-[#d13232] hover:scale-105 transition duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'
                                    disabled={loading}
                                    onClick={() => {
                                        if (unsavedChanges){
                                            const confirmCancel = window.confirm("You have unsaved changes. Do you want to close it without saving?");
                                            if (!confirmCancel) return;
                                        }
                                        setData(initialData);
                                        setEditData(false);
                                    }}
                                >
                                    Cancel Changes
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={loading}
                                    className='bg-[#FFA500] lg:px-5 md:py-[7px] px-4 py-[7px] lg:text-[15px] text-xs rounded-md text-white hover:bg-[#ffb732] hover:scale-105 transition duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'
                                >
                                    {loading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        )}
                    </div>      
                </div>
             </div>
        </div>
    )
}

function OnboardingFiles (){

    // PAGE TITLE
      useEffect(() => {
        document.title = "ARISE | 201 FILES"; 
      }, []);

    const [isModalOpen, setModalOpen] = useState(false);
    const [viewEmployeeFiles, setViewEmployeeFiles] = useState(null);
    const [employeesFiles, setEmployeesFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [itemOffset, setItemOffset] = useState(0);
    const itemsPerPage = 15;

    // fetch employee checklists from API
    useEffect(() => {
        fetchEmployeesWithChecklists();
    }, []);

    const fetchEmployeesWithChecklists = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await get('/onboarding/checklists');

            if (response.success) {
                // transform backend data to frontend format
                const transformedData = transformChecklistData(response.data);
                setEmployeesFiles(transformedData);
            }
        } catch (err) {
            setError(err.message || 'Failed to fetch employee checklists');
            console.error('Failed to fetch checklists:', err);
        } finally {
            setLoading(false);
        }
    };

    // transform backend checklist data to frontend format
    const transformChecklistData = (backendData) => {
        // group by employee_id
        const employeeMap = {};

        backendData.forEach(item => {
            const empId = item.employee_id;

            if (!employeeMap[empId]) {
                employeeMap[empId] = {
                    id: item.employees.employee_id, // AC-00001
                    name: `${item.employees.first_name} ${item.employees.last_name}`,
                    personnelType: item.employees.personnel_type || 'N/A',
                    hireDate: formatDate(item.employees.hire_date),
                    remarks: '',
                    // initialize all document fields
                    empContract: '',
                    empContractStatus: ONBOARDING_STATUSES.PENDING,
                    empContractComment: '',
                    empCV: '',
                    empCVStatus: ONBOARDING_STATUSES.PENDING,
                    empCVComment: '',
                    empApplication: '',
                    empApplicationStatus: ONBOARDING_STATUSES.PENDING,
                    empApplicationComment: '',
                    empDataSheet: '',
                    empDataSheetStatus: ONBOARDING_STATUSES.PENDING,
                    empDataSheetComment: '',
                    empNDA: '',
                    empNDAStatus: ONBOARDING_STATUSES.PENDING,
                    empNDAComment: '',
                    empExam: '',
                    empExamStatus: ONBOARDING_STATUSES.PENDING,
                    empExamComment: '',
                    empDiploma: '',
                    empDiplomaStatus: ONBOARDING_STATUSES.PENDING,
                    empDiplomaComment: '',
                    empTranscriptRec: '',
                    empTranscriptRecStatus: ONBOARDING_STATUSES.PENDING,
                    empTranscriptComment: '',
                    empSSS: '',
                    empSSS_Status: ONBOARDING_STATUSES.PENDING,
                    empSSSComment: '',
                    empPhilhealth: '',
                    empPhilhealthStatus: ONBOARDING_STATUSES.PENDING,
                    empPhilhealthComment: '',
                    empPagibig: '',
                    empPagibigStatus: ONBOARDING_STATUSES.PENDING,
                    empPagibigComment: '',
                    empValidID: '',
                    empValidIDStatus: ONBOARDING_STATUSES.PENDING,
                    empValidIDComment: '',
                    lastUpdatedDate: formatDate(new Date()),
                    lastUpdatedTime: formatTime(new Date())
                };
            }

            // map item to corresponding field
            const employee = employeeMap[empId];
            const itemName = item.onboarding_items.item_name;

            // map backend document types to frontend fields
            const fieldMapping = {
                'Employee Contract': 'empContract',
                'Resume/CV': 'empCV',
                'Application for Employment': 'empApplication',
                'Personal Data Sheet': 'empDataSheet',
                'NDA': 'empNDA',
                'Pre Employment Exam': 'empExam',
                'Diploma': 'empDiploma',
                'Transcript of Records': 'empTranscriptRec',
                'SSS': 'empSSS',
                'Philhealth': 'empPhilhealth',
                'Pag ibig': 'empPagibig',
                'Valid ID': 'empValidID'
            };

            const fieldName = fieldMapping[itemName];
            if (fieldName) {
                employee[fieldName] = item.documents?.file_name || '';
                employee[`${fieldName}Status`] = item.status || ONBOARDING_STATUSES.PENDING;
                employee[`${fieldName}Comment`] = item.remarks || '';
                employee[`${fieldName}ChecklistId`] = item.id; // store checklist ID for API calls
                employee[`${fieldName}DocumentId`] = item.documents?.id || null; // store document ID for download

                if (fieldName === 'empSSS') {
                    employee.empSSS_Status = item.status || ONBOARDING_STATUSES.PENDING;
                }

                // update last updated timestamp
                if (item.reviewed_at) {
                    employee.lastUpdatedDate = formatDate(item.reviewed_at);
                    employee.lastUpdatedTime = formatTime(item.reviewed_at);
                }
            }
        });

        // calculate completion status for each employee
        Object.values(employeeMap).forEach(emp => {
            emp.remarks = getRemarks(emp);
        });

        return Object.values(employeeMap);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const year = String(date.getFullYear()).slice(-2);
        return `${month}/${day}/${year}`;
    };

    const formatTime = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        let hours = date.getHours();
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        return `${hours}:${minutes} ${ampm} PHT`;
    };

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
        const isComplete = empFiles.empContractStatus === ONBOARDING_STATUSES.APPROVED &&
            empFiles.empApplicationStatus === ONBOARDING_STATUSES.APPROVED &&
            empFiles.empDataSheetStatus === ONBOARDING_STATUSES.APPROVED &&
            empFiles.empNDAStatus === ONBOARDING_STATUSES.APPROVED &&
            empFiles.empExamStatus === ONBOARDING_STATUSES.APPROVED &&
            empFiles.empDiplomaStatus === ONBOARDING_STATUSES.APPROVED &&
            empFiles.empTranscriptRecStatus === ONBOARDING_STATUSES.APPROVED &&
            empFiles.empSSS_Status === ONBOARDING_STATUSES.APPROVED &&
            empFiles.empPhilhealthStatus === ONBOARDING_STATUSES.APPROVED &&
            empFiles.empPagibigStatus === ONBOARDING_STATUSES.APPROVED &&
            empFiles.empValidIDStatus === ONBOARDING_STATUSES.APPROVED &&
            empFiles.empCVStatus === ONBOARDING_STATUSES.APPROVED;

        return isComplete ? "COMPLETE" : "INCOMPLETE";
    }

    // loading state
    if (loading) {
        return (
            <div className="">
                <Navbar />
                <div className="flex items-center justify-center h-screen">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#990100] mx-auto mb-4"></div>
                        <p className="text-xl text-gray-700">Loading employee checklists...</p>
                    </div>
                </div>
            </div>
        );
    }

    // error state
    if (error) {
        return (
            <div className="">
                <Navbar />
                <div className="flex items-center justify-center h-screen">
                    <div className="text-center">
                        <p className="text-xl text-red-600 mb-4">Error: {error}</p>
                        <button
                            onClick={fetchEmployeesWithChecklists}
                            className="bg-[#990100] text-white px-6 py-2 rounded-lg hover:bg-[#ad3332] transition"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            </div>
        );
    }
    
    //REACT-PAGINATE
    
    
    const endOffset = itemOffset + itemsPerPage;
    const currentLogs = employeesFiles.slice(itemOffset, endOffset);
    const pageCount = Math.ceil(employeesFiles.length / itemsPerPage);
    const multiPages = pageCount > 1;
    
    const handlePageClick = (event) => {
        const newOffset = (event.selected * itemsPerPage);
        setItemOffset(newOffset);
    };
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
                            {employeesFiles.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                        No employees found
                                    </td>
                                </tr>
                            ) : (
                               currentLogs.map((row) =>{

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
                                            <p className={` lg:py-[4px] lg:px-2 px-4 py-1 lg:rounded-xl rounded-full text-xs font-semibold  ${remarks === 'COMPLETE' ? 'text-[#198C19] bg-[#198C19]/25': 'text-[#C60000] bg-[#C60000]/25'}`}>{remarks}</p>
                                        </td>
                                        <td className="td-style">
                                            <button className="bg-[#990100] text-white lg:text-sm text-xs px-4 py-[5px] rounded-lg hover:bg-[#ad3332] hover:scale-105 transition duration-300 ease-in-out cursor-pointer" onClick={() => handleOpen(row)}>
                                                View Details
                                            </button>
                                        </td>
                                    </tr>
                                )})
                            )}
                        </tbody>
                    </table>
                    {/* CONNECT WITH THE FUNCTION */}
                    <ModalFiles
                        isOpen={isModalOpen}
                        onClose={handleClose}
                        employeeFiles={viewEmployeeFiles}
                        onSave={updateEmployeeFiles}
                        onRefresh={fetchEmployeesWithChecklists}
                    />
                    <br />
                    <div className="lg:flex items-center lg:justify-between">
                        <p className='lg:text-md text-sm'>Showing <b>{currentLogs.length}</b> of <b>{employeesFiles.length}</b> employee{employeesFiles.length !== 1 ? 's' : ''}</p>
                        
                        <div className=" ">
                            <ReactPaginate
                            breakLabel="..."
                            nextLabel=">"
                            onPageChange={handlePageClick}
                            pageRangeDisplayed={2}
                            pageCount={pageCount}
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
                        </div>                    
                    </div>
                </div>
            </div>
        </div>
    )
} export default OnboardingFiles;