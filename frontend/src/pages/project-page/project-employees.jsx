import React, { useState } from "react";
import { useParams } from "react-router-dom";
import Navbar from "../components/navbar";
import DropDownFilter from "../components/dropdownfilter";

function AddEmployeeModal({ isOpen, onClose }) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedEmployee, setSelectedEmployee] = React.useState("");
  
  const employees = [
    "Lance Cabe",
    "Reuel Christian Sundiam",
    "Gabrielle Delos Santos",
    "Carl Paldeng",
  ];

  const filteredEmployees = searchTerm
    ? employees.filter((name) =>
        name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  const handleSelectEmployee = (name) => {
    setSelectedEmployee(name);
    setSearchTerm("");
  };

  const handleAdd = () => {
    if (!selectedEmployee) return;
    onClose();
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
              disabled={!selectedEmployee}
              className={`px-6 py-2 rounded-lg text-base font-medium transition
                ${
                  selectedEmployee
                    ? "bg-[#990100] text-white hover:bg-[#7a0100] hover:scale-105"
                    : "bg-gray-300 text-gray-600 cursor-not-allowed"
                }`}
            >
              Add
            </button>
          </div>

          {filteredEmployees.length > 0 && (
            <div className="w-full max-w-md border rounded-lg bg-white shadow max-h-40 overflow-y-auto">
              {filteredEmployees.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => handleSelectEmployee(name)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-[#F5F5F5]"
                >
                  {name}
                </button>
              ))}
            </div>
          )}

          {selectedEmployee && (
            <input
              type="text"
              value={selectedEmployee}
              readOnly
              className="w-full max-w-md border rounded-lg px-3 py-2 text-base shadow"
            />
          )}
        </div>
      </div>
    </div>
  );
}

const employeeRows = [
  {
    id: "AC-00001",
    name: "Reuel Christian Sundiam",
    position: "Web Developer",
    personnelType: "Regular",
    dateAdded: "10/20/25",
  },
  {
    id: "AC-00002",
    name: "Reuel Christian Sundiam",
    position: "Web Developer",
    personnelType: "Regular",
    dateAdded: "10/20/25",
  },
  {
    id: "AC-00003",
    name: "Reuel Christian Sundiam",
    position: "Web Developer",
    personnelType: "Regular",
    dateAdded: "10/20/25",
  },
];

function ProjectEmployees() {
  const { projectId } = useParams();

  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const openAddModal = () => setAddModalOpen(true);
  const closeAddModal = () => setAddModalOpen(false);

  return (
    <div>
      <Navbar />

      <div className="p-7 lg:mx-18 md:mx-10">
        <div className="flex justify-between items-center">
          <h1 className="lg:text-3xl text-2xl text-[#990100] font-bold">
            Project #{projectId || 1} Employees
          </h1>

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

        <div className="flex justify-end mt-5">
          <button
            onClick={openAddModal}
            className="generate-report-button"
          >
            Add Employee
          </button>
        </div>

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
              {employeeRows.map((row) => (
                <tr
                  key={row.id}
                  className="tr-style"
                >
                  <td className="td-style font-medium">{row.id}</td>
                  <td className="td-style">{row.name}</td>
                  <td className="td-style">{row.position}</td>
                  <td className="td-style">{row.personnelType}</td>
                  <td className="td-style">{row.dateAdded}</td>

                  <td className="td-style">
                    <button className="bg-[#CC0000] text-white text-sm px-4 py-[6px] rounded-lg hover:bg-[#aa0000] hover:scale-105 transition">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-between mt-5">
            <p>
              Showing <b>{employeeRows.length}</b> employees
            </p>

            <div className="flex items-center space-x-2">
              <span className="text-[#990100] hover:underline cursor-pointer">
                &lt;
              </span>
              <span className="text-sm font-medium">1</span>
              <span className="text-sm">to {employeeRows.length}</span>
              <span className="text-[#990100] hover:underline cursor-pointer">
                &gt;
              </span>
            </div>
          </div>
        </div>
      </div>

      <AddEmployeeModal isOpen={isAddModalOpen} onClose={closeAddModal} />
    </div>
  );
}

export default ProjectEmployees;