import React, { useState } from "react";
import { useParams } from "react-router-dom";
import Navbar from "../components/navbar";
import DropDownFilter from "../components/dropdownfilter";

function ModalProjectEmployee({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-1000 bg-[#EDEDED]/50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-150 h-120">
        <div className="rounded-lg bg-[#990100] flex items-center justify-between py-3 px-4">
          <h1 className="text-white text-lg font-medium">
            Employee Information
          </h1>
          <button
            className="text-white text-lg font-medium hover:scale-105 transition duration-300 ease-in-out"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="pt-3 text-left pl-3 pr-3">
          <p className="text-md">
            <b>Employee ID:</b> AC-00001
          </p>
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

  const [isModalOpen, setModalOpen] = useState(false);
  const handleOpen = () => setModalOpen(true);
  const handleClose = () => setModalOpen(false);

  return (
    <div>
      <Navbar />

      <div className="p-7 lg:mx-18 md:mx-10">
        {/* HEADER */}
        <div className="md:flex justify-between items-center w-full">
          <h1 className="lg:text-3xl text-2xl text-[#990100] font-bold md:mb-0 mb-5">
            Project #{projectId || 1} Employees
          </h1>

          <div className="flex items-center justify-end md:gap-4 gap-3">
            <DropDownFilter />

            <div className="relative text-gray-600 border border-[#990100] rounded-lg">
              <input
                type="search"
                name="search"
                placeholder="Search"
                className="bg-white lg:h-10 md:h-9 h-8 px-2 lg:pr-10 md:pr-5 pr-5 md:w-auto w-35 rounded-lg text-sm focus:outline-none"
              />
              <button
                type="submit"
                className="absolute right-0 top-0 md:mt-3 mt-2 lg:mr-3 mr-2 items-center cursor-pointer"
              >
                <img
                  src="/icons/red-search.png"
                  className="lg:w-5 lg:h-5 w-4 h-4 items-center"
                />
              </button>
            </div>
          </div>
        </div>

        <hr className="text-[#990100] mt-6" />

        {/* BUTTONS */}
        <div className="flex justify-end mt-5">
          <button className="bg-[#b63b3a] lg:px-5 md:py-[7px] px-4 py-[5px] lg:text-md text-sm rounded-md text-white hover:bg-[#990100] hover:scale-105 transition duration-300 ease-in-out">
            Add Employee
          </button>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto bg-white border rounded-lg overflow-hidden mt-5 shadow-lg px-8 py-10">
          <table className="min-w-full text-center">
            <thead className="bg-[#990100] text-white">
              <tr>
                <th className="px-6 py-3 text-xs tracking-wider rounded-tl-lg rounded-bl-lg">
                  Employee ID
                </th>
                <th className="px-6 py-3 text-xs tracking-wider">Name</th>
                <th className="px-6 py-3 text-xs tracking-wider">Position</th>
                <th className="px-6 py-3 text-xs tracking-wider">
                  Personnel Type
                </th>
                <th className="px-6 py-3 text-xs tracking-wider">Date Added</th>
                <th className="px-6 py-3 text-xs tracking-wider rounded-tr-lg rounded-br-lg">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#990100]">
              {employeeRows.map((row, i) => (
                <tr
                  key={row.id}
                  className="odd:bg-transparent even:bg-gray-100 hover:bg-[#f4e5e5]"
                >
                  <td className="px-6 py-3 text-sm text-gray-900 font-medium">
                    {row.id}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-900">
                    {row.name}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-900">
                    {row.position}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-900">
                    {row.personnelType}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-900">
                    {row.dateAdded}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-900">
                    <button
                      className="bg-[#990100] text-white text-sm px-4 py-[5px] rounded-lg hover:bg-[#ad3332] hover:scale-105 transition duration-300 ease-in-out"
                      onClick={handleOpen}
                    >
                      View Details
                    </button>

                    <ModalProjectEmployee
                      isOpen={isModalOpen}
                      onClose={handleClose}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* FOOTER PAGINATION */}
          <div className="flex items-center justify-between w-full mt-5">
            <p>
              Showing <b>{employeeRows.length}</b> employees
            </p>

            <div className="flex items-center space-x-2">
              <span className="text-[#990100] hover:underline">
                <a href="#"> &lt; </a>
              </span>
              <span className="text-sm font-medium">1</span>
              <span className="text-sm">to {employeeRows.length}</span>
              <span className="text-[#990100] hover:underline">
                <a href="#"> &gt; </a>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProjectEmployees;