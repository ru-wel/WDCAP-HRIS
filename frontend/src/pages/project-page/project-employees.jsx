import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/navbar";
import DropDownFilter from "../components/dropdownfilter";
import { get, post, del } from "../../services/api.js";
import ReactPaginate from 'react-paginate';

function AddEmployeeModal({ isOpen, onClose, projectId, onEmployeeAdded, existingEmployeeIds }) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedEmployee, setSelectedEmployee] = React.useState(null);
  const [availableEmployees, setAvailableEmployees] = React.useState([]);
  const [assignmentDate, setAssignmentDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = React.useState("Active");
  const [loading, setLoading] = React.useState(false);
  const [addLoading, setAddLoading] = React.useState(false);

  // fetch available employees when modal opens
  React.useEffect(() => {
    if (isOpen) {
      fetchAvailableEmployees();
    }
  }, [isOpen, projectId]);

  const fetchAvailableEmployees = async () => {
    try {
      setLoading(true);
      const response = await get('/employees');

      if (response.success) {
        setAvailableEmployees(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch employees:', error);
      alert('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };
  
  const assignedIds = existingEmployeeIds instanceof Set ? existingEmployeeIds : new Set(existingEmployeeIds || []);

  const filteredEmployees = searchTerm
    ? availableEmployees
        .filter((emp) => !assignedIds.has(emp.id))
        .filter((emp) => {
        const fullName = `${emp.first_name} ${emp.last_name}`.toLowerCase();
        return fullName.includes(searchTerm.toLowerCase());
      })
    : [];

  const handleSelectEmployee = (employee) => {
    setSelectedEmployee(employee);
    setSearchTerm("");
  };

  const handleAdd = async () => {
    if (!selectedEmployee) return;

    try {
      setAddLoading(true);

      const response = await post('/projectassignments', {
        project_id: projectId,
        employee_id: selectedEmployee.id,
        assignment_date: assignmentDate,
        status: status
      });

      if (response.success) {
        alert(`${selectedEmployee.first_name} ${selectedEmployee.last_name} added to project successfully!`);
        onEmployeeAdded(); // Refresh the employee list
        // Reset form
        setSelectedEmployee(null);
        setSearchTerm("");
        setAssignmentDate(new Date().toISOString().split('T')[0]);
        setStatus("Active");
        onClose();
      }
    } catch (error) {
      console.error('Failed to add employee:', error);
      alert(error.message || 'Failed to add employee to project');
    } finally {
      setAddLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#EDEDED]/50 z-50">
    <div className="bg-white rounded-lg shadow-lg w-[560px] max-w-[90%] p-6 min-h-[300px]">

        <div className="bg-[#990100] rounded-lg px-5 py-3 flex justify-between items-center">
          <h1 className="text-white text-lg font-semibold">Add New Employee</h1>
          <button
            onClick={onClose}
            className="text-white text-2xl font-bold hover:scale-110 transition"
          >
            ✕
          </button>
        </div>

        <div className="mt-6 flex flex-col items-center gap-3">
          {loading ? (
            <p className="text-gray-600">Loading employees...</p>
          ): (
            <>
              <div className="flex items-center gap-3 w-full max-w-md">
                <input
                  type="text"
                  placeholder="Search Name"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 border rounded-lg px-3 py-2 text-base shadow"
                />

                <button
                  onClick={handleAdd}
                  disabled={!selectedEmployee || addLoading}
                  className={`px-6 py-2 rounded-lg text-base font-medium transition
                    ${
                      selectedEmployee && !addLoading
                        ? "bg-[#990100] text-white hover:bg-[#7a0100] hover:scale-105"
                        : "bg-gray-300 text-gray-600 cursor-not-allowed"
                    }`}
                >
                  {addLoading ? 'Adding ...' : 'Add'}
                </button>
              </div>

              {filteredEmployees.length > 0 && (
                <div className="w-full max-w-md border rounded-lg bg-white shadow max-h-40 overflow-y-auto">
                  {filteredEmployees.map((employee) => (
                    <button
                      key={employee.id}
                      type="button"
                      onClick={() => handleSelectEmployee(employee)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-[#F5F5F5]"
                    >
                      {employee.first_name} {employee.last_name} ({employee.employee_id})
                    </button>
                  ))}
                </div>
              )}

              {selectedEmployee && (
                <input
                  type="text"
                  value={`${selectedEmployee.first_name} ${selectedEmployee.last_name} (${selectedEmployee.employee_id})`}
                  readOnly
                  className="w-full max-w-md border rounded-lg px-3 py-2 text-base shadow bg-gray-50"
                />
              )}

              {selectedEmployee && (
                <>
                  <div className="w-full max-w-md mt-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Assignment Date
                    </label>
                    <input
                      type="date"
                      value={assignmentDate}
                      onChange={(e) => setAssignmentDate(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 text-base shadow"
                    />
                  </div>

                  <div className="w-full max-w-md">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 text-base shadow"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                </>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}

function ProjectEmployees() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  // state for project employees
  const [projectEmployees, setProjectEmployees] = useState([]);
  const [projectDetails, setProjectDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const openAddModal = () => setAddModalOpen(true);
  const closeAddModal = () => setAddModalOpen(false);

  // fetch project details
  const fetchProjectDetails = async () => {
    try {
      const response = await get(`/projects/${projectId}`);

      if (response.success) {
        setProjectDetails(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch project details:', error);
    }
  };

  // fetch project employees
  const fetchProjectEmployees = async () => {
    try {
        setLoading(true);
        const response = await get(`/projectassignments/by-project/${projectId}`);

        if (response.success) {
          setProjectEmployees(response.data);
        }

      } catch (error) {
        console.error('Failed to fetch project employees:', error);
        setError(error.message || 'Failed to load employees');
      } finally { setLoading(false); }
    };

  const handleDeleteEmployee = async (assignmentId) => {
    const confirmDelete = window.confirm('Are you sure you want to remove this employee from the project?');

    if (!confirmDelete) return;

    try {
      const response = await del(`/projectassignments/${assignmentId}`);

      if (response.success) {
        alert('Employee removed from project successfully!');
        fetchProjectEmployees();
      }
    } catch (error) {
      console.error('Failed to remove employee:', error);
      alert(error.message || 'Failed to remove employee from project');
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchProjectDetails();
      fetchProjectEmployees();
    }
  }, [projectId]);

  //REACT-PAGINATE
  
  const [itemOffset, setItemOffset] = useState(0);
  const itemsPerPage = 15;
  const endOffset = itemOffset + itemsPerPage;
  const currentProjEmp = projectEmployees.slice(itemOffset, endOffset);
  const assignedEmployeeIds = new Set(projectEmployees.map((a) => a.employee_id).filter(Boolean));
  const pageCount = Math.ceil(projectEmployees.length / itemsPerPage);
  const multiPages = pageCount > 1;
  
  const handlePageClick = (event) => {
    const newOffset = (event.selected * itemsPerPage);
    setItemOffset(newOffset);
  };
      

  return (
    <div>
      <Navbar />

      <div className="p-7 lg:mx-18 md:mx-10">
        <div className="flex justify-between items-center">

          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/projects')} className="text-[#990100] hover:text-[#CC0000] transition-colors flex items-center gap-1 text-sm font-medium cursor-pointer">
              <span className="text-xl">←</span>Back
            </button>
            <span className="text-gray-300">|</span>
            <h1 className="lg:text-3xl text-2xl text-[#990100] font-bold">
              {projectDetails?.project_name || `Project #${projectId}`} Employees
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <DropDownFilter />

            <div className="relative text-gray-600 border border-[#990100] rounded-lg">
              <input
                type="search"
                placeholder="Search"
                className="bg-white lg:h-10 h-9 px-2 pr-10 rounded-lg text-sm focus:outline-none"
              />
              <img
                src="/icons/red-search.png"
                className="absolute right-2 top-2 w-5 h-5"
              />
            </div>
          </div>
        </div>

        <hr className="text-[#990100] mt-6" />
        
        {loading && (
          <div className="flex justify-center items-center py-20">
            <p className="text-gray-600">Loading employees...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p>{error}</p>
            <button onClick={() => window.location.reload()} className="mt-2 bg-red-600 text-white px-4 py-2 rounded text-sm">Retry</button>
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="flex justify-end mt-5">
              <button
                onClick={openAddModal}
                className="generate-report-button"
              >
                Add Employee
              </button>
            </div>
          </>
        )}

        <div className="div-table">
          <table className="table-style">
            <thead className="thead-style">
              <tr>
                <th className="th-style rounded-tl-lg rounded-bl-lg">Employee ID</th>
                <th className="th-style">Name</th>
                <th className="th-style">Position</th>
                <th className="th-style">Personnel Type</th>
                <th className="th-style">Date Added</th>
                <th className="th-style rounded-tr-lg rounded-br-lg">Actions</th>
              </tr>
            </thead>

            <tbody className="tbody-style">
              {currentProjEmp.map((assignment) => (
                <tr
                  key={assignment.id}
                  className="tr-style"
                >
                  <td className="td-style font-medium">{assignment.employees?.employee_id || 'N/A'}</td>
                  <td className="td-style">{assignment.employees?.first_name + " " + assignment.employees?.last_name || 'Unknown'}</td>
                  <td className="td-style">{assignment.employees?.positions?.position_title || 'N/A'}</td>
                  <td className="td-style">{assignment.employees?.personnel_type}</td>
                  <td className="td-style">
                    {assignment.assignment_date
                      ? new Date(assignment.assignment_date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })
                      : 'N/A'}
                  </td>

                  <td className="td-style">
                    <button
                      onClick={() => handleDeleteEmployee(assignment.id)}
                      className="bg-[#CC0000] text-white text-sm px-4 py-[6px] rounded-lg hover:bg-[#aa0000] hover:scale-105 transition"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <br />
          <div className="lg:flex items-center lg:justify-between">
            <p className="lg:text-md text-sm">
              Showing <b>{currentProjEmp.length}</b> of <b>{projectEmployees.length}</b>
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

      <AddEmployeeModal
        isOpen={isAddModalOpen}
        onClose={closeAddModal}
        projectId={projectId}
        onEmployeeAdded={fetchProjectEmployees}
        existingEmployeeIds={assignedEmployeeIds}
      />
    </div>
  );
}

export default ProjectEmployees;