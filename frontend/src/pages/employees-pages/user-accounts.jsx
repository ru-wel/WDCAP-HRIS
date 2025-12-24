import React, { useEffect, useState } from 'react'
import Navbar from "../components/navbar";
import DropDownFilter from "../components/dropdownfilter";
import { del, get, put } from "../../services/api.js";
import ReactPaginate from 'react-paginate';

function ModalAccounts ({isOpen, onClose, employeeAcc, onSave, onDelete}){

    const [data, setData] = useState(employeeAcc);
    const [editData, setEditData] = useState(false);
    const [loading, setLoading] = useState(false);

    // WHEN EDITING THE VALUE
    const handleChange = (a) => {
        const { name, value } = a.target;
        setData(prev => ({...(prev ?? employeeAcc ?? {}), [name]:value}));
    };

    const [initialData, setInitialData] = useState(employeeAcc);

    useEffect(() => {
        setData(employeeAcc);
        setInitialData(employeeAcc);
        setEditData(false);
    }, [employeeAcc]);

    if (!isOpen || !employeeAcc) return null;

    const currentData = data ?? employeeAcc;
    const originalData = initialData ?? employeeAcc;
    const unsavedChanges = JSON.stringify(currentData) !== JSON.stringify(originalData);

    return (
        <div className="fixed inset-0 flex items-center justify-center z-[1000] bg-[#EDEDED]/50">
             <div className="bg-white rounded-lg shadow-lg md:p-6 px-3 py-6 lg:w-150 md:w-130 w-80 md:h-auto border border-gray-300">
                <div className="rounded-lg bg-[#990100] flex items-center justify-between lg:py-[10px] py-[6px] md:px-4 px-3">
                    <h1 className='text-white text-lg font-medium lg:text-lg text-sm'>Account of {currentData.id}</h1>
                    <button className="text-white text-2xl font-bold hover:scale-110 transition" 
                    onClick={() => {
                        if (unsavedChanges){
                            const confirmCancel = window.confirm("You have unsaved changes. Do you want to close it without saving?");
                            if (!confirmCancel) return;
                        } onClose();
                    }}> ✕ </button>
                </div>

                <div className="pt-5 md:px-35 px-10">

                    <p className='lg:text-sm text-xs'><b>Employee ID:</b> {currentData.id}</p>
                    <div className="lg:pt-3 pt-2">
                        <p className='lg:text-sm text-xs pb-2 font-medium'>Role</p>
                        <select name="role" className='input-field disabled:text-gray-600 lg:py-1.5 lg:px-2 p-1 lg:text-sm text-xs' value={currentData.role || ""} disabled = {!editData || loading} onChange={handleChange} required>
                            <option value="">Select Role</option>
                            <option value="Admin">Admin</option>
                            <option value="HR">HR</option>
                            <option value="Employee">Employee</option>
                        </select>
                    </div>

                    {/* CAN THE USER UPDATE THIS OR NO? I DISABLED IT MUNA*/}
                    <div className="lg:pt-3 pt-2">
                        <p className='lg:text-sm text-xs pb-2 font-medium'>Email</p>
                        <input type="email" name="email" className="input-field disabled:text-gray-600 lg:py-1.5 lg:px-2 p-1 lg:text-sm text-xs" value={currentData.email || ""} disabled />
                    </div>

                    <div className="lg:pt-3 pt-2">
                        <p className='lg:text-sm text-xs pb-2 font-medium'>Status</p>
                        <select name="status" className='input-field disabled:text-gray-600 lg:py-1.5 lg:px-2 p-1 lg:text-sm text-xs' value={currentData.status || ""} disabled = {!editData || loading} onChange={handleChange} required>
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
                                className='bg-[#198C19] lg:px-5 py-[7px] px-4 lg:text-[15px] text-xs rounded-md text-white hover:bg-[#46a346] hover:scale-105 transition duration-300 ease-in-out disabled:opacity-50'
                            >
                                Update Record
                            </button>
                            <button
                                onClick={async () => {
                                    const confirmDelete = window.confirm("Delete this account? This action cannot be undone.");
                                    if (!confirmDelete) return;
                                    setLoading(true);
                                    try {
                                        await onDelete(currentData.id);
                                        onClose();
                                    } finally {
                                        setLoading(false);
                                    }
                                }}
                                disabled={loading}
                                className='bg-[#C60000] lg:px-5 py-[7px] px-4 lg:text-[15px] text-xs rounded-md text-white hover:bg-[#d13232] hover:scale-105 transition duration-300 ease-in-out disabled:opacity-50'
                            >
                                {loading ? "Deleting..." : "Delete Record"}
                            </button>
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
                            <button
                                onClick={async () => {
                                    if (!currentData.role || !currentData.status) {
                                        alert("Please fill out all fields and do not leave any of them blank.");
                                        return;
                                    }

                                    const confirmUpdate = window.confirm("Are you sure you want to save these changes?");
                                    if (!confirmUpdate) return;

                                    setLoading(true);
                                    try {
                                        await onSave(currentData);
                                        setEditData(false);
                                        onClose();
                                        alert(`You've successfully updated the record of ${currentData.id}!`);
                                    } finally {
                                        setLoading(false);
                                    }
                                }}
                                disabled={loading}
                                className='bg-[#FFA500] lg:px-5 md:py-[7px] px-4 py-[7px] lg:text-[15px] text-xs rounded-md text-white hover:bg-[#ffb732] hover:scale-105 transition duration-300 ease-in-out disabled:opacity-50'
                            >
                                {loading ? "Saving..." : "Save Changes"}
                            </button>
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
    const [employeesAcc, setEmployeesAcc] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchTerm, setSearchTerm] = useState("");

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
        // optimistic UI
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
            alert(e.message || "Failed to update user");
            await fetchUsers();
        }
    };

    const deleteEmployeeAcc = async (employeeId) => {
        // optimistic UI
        setEmployeesAcc(prev => prev.filter(emp => emp.id !== employeeId));
        try {
            await del(`/users/${employeeId}`);
            alert("Account deleted successfully");
        } catch (e) {
            alert(e.message || "Failed to delete user");
            await fetchUsers();
        }
    }

    const filteredEmployeesAcc = employeesAcc.filter((row) => {
        const haystack = `${row.id} ${row.email} ${row.role} ${row.createdAt} ${row.status}`.toLowerCase();
        return haystack.includes(searchTerm.toLowerCase());
    });

    //REACT-PAGINATE
    
        const [itemOffset, setItemOffset] = useState(0);
        const itemsPerPage = 15;
        const endOffset = itemOffset + itemsPerPage;
        const currentUserAcc = filteredEmployeesAcc.slice(itemOffset, endOffset);
        const pageCount = Math.ceil(filteredEmployeesAcc.length / itemsPerPage);
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
                        <h1 className='lg:text-3xl text-2xl text-[#990100] font-bold md:mb-0 mb-5'>User Accounts</h1>
                    </div>

                    <div className="flex items-center justify-end md:gap-4 gap-3"> 
                        <DropDownFilter />

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

                <div className="flex justify-end mt-5">
                    <button className='generate-report-button'>Generate Report</button>
                </div>

                <div className="div-table">
                    <table className="table-style">
                        <thead className="thead-style">
                            <tr>
                                <th className="th-style rounded-tl-lg rounded-bl-lg">Employee ID</th>
                                <th className="th-style">Email</th>
                                <th className="th-style">Role</th>
                                <th className="th-style">Created At</th>
                                <th className="th-style">Status</th>
                                <th className="th-style hidden sm:table-cell rounded-tr-lg rounded-br-lg">Actions</th>
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
                                            className="bg-[#990100] text-white px-4 py-2 rounded hover:bg-[#ad3332]"
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
                                        <td className="td-style-nobtn ">
                                            {row.email}
                                        </td>
                                        <td className="td-style-nobtn">
                                            {row.role}
                                        </td>
                                        <td className="td-style-nobtn">
                                            {row.createdAt}
                                        </td>
                                        <td className= " td-style-nobtn">
                                            <p className={` lg:py-[6px] lg:px-0 px-4 py-1 lg:rounded-xl rounded-full text-xs font-semibold  ${row.status === 'ACTIVE' ? 'text-[#198C19] bg-[#198C19]/25': 'text-[#C60000] bg-[#C60000]/25'}`}>{row.status}</p>
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
                        onDelete={deleteEmployeeAcc}
                    />
                    <br />

                    <div className="lg:flex items-center lg:justify-between">
                        <p className="lg:text-md text-sm">
                            Showing <b>{currentUserAcc.length}</b> of <b>{filteredEmployeesAcc.length}</b> employee{filteredEmployeesAcc.length !== 1 ? 's' : ''}
                        </p>

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
}

export default UserAccounts;