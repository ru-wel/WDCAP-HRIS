import React from "react";
import { useParams } from "react-router-dom";
import Navbar from "../components/navbar";
import DropDownFilter from "../components/dropdownfilter";


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
  {
    id: "AC-00004",
    name: "Reuel Christian Sundiam",
    position: "Web Developer",
    personnelType: "Regular",
    dateAdded: "10/20/25",
  },
  {
    id: "AC-00005",
    name: "Reuel Christian Sundiam",
    position: "Web Developer",
    personnelType: "Regular",
    dateAdded: "10/20/25",
  },
  {
    id: "AC-00006",
    name: "Reuel Christian Sundiam",
    position: "Web Developer",
    personnelType: "Regular",
    dateAdded: "10/20/25",
  },
  {
    id: "AC-00007",
    name: "Reuel Christian Sundiam",
    position: "Web Developer",
    personnelType: "Regular",
    dateAdded: "10/20/25",
  },
  {
    id: "AC-00008",
    name: "Reuel Christian Sundiam",
    position: "Web Developer",
    personnelType: "Regular",
    dateAdded: "10/20/25",
  },
];

function ProjectEmployees() {
  const { projectId } = useParams();

  return (
    <div>
      <Navbar />

      <div className="p-7 lg:mx-18 md:mx-10">
        <div className="md:flex justify-between items-center w-full">
          <h1 className="lg:text-3xl text-2xl text-[#990100] font-bold md:mb-0 mb-5">
            {`Project #${projectId || 1}`}
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
                  alt="search"
                />
              </button>
            </div>
          </div>
        </div>

        <hr className="text-[#990100] mt-6" />

        <div className="flex justify-end mt-6">
          <button className="bg-[#b63b3a] text-white lg:px-6 md:py-[7px] px-5 py-[6px] lg:text-sm text-xs rounded-md hover:bg-[#990100] hover:scale-105 transition duration-300 ease-in-out">
            Add Employee
          </button>
        </div>

        <div className="mt-6 bg-[#F5F5F5] rounded-lg shadow-lg border border-[#e5e5e5] px-6 py-6">
          <div className="overflow-x-auto">
            <table className="min-w-full text-center">
              <thead className="bg-[#990100] text-white">
                <tr>
                  <th className="px-6 py-3 text-sm font-medium">Employee ID</th>
                  <th className="px-6 py-3 text-sm font-medium">Name</th>
                  <th className="px-6 py-3 text-sm font-medium">Position</th>
                  <th className="px-6 py-3 text-sm font-medium">Personnel Type</th>
                  <th className="px-6 py-3 text-sm font-medium">Date Added</th>
                  <th className="px-6 py-3 text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {employeeRows.map((row, i) => (
                  <tr
                    key={`${row.id}-${i}`}
                    className="border-b border-[#990100]"
                  >
                    <td className="px-6 py-3 text-sm text-gray-900">
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
                      <button className="bg-[#CC0000] text-white px-5 py-[6px] rounded-full text-xs font-medium hover:bg-[#aa0000] hover:scale-105 transition duration-300 ease-in-out">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end items-center mt-6 text-sm">
            <span className="text-[#990100] cursor-pointer hover:underline mr-3">
              &lt;
            </span>
            <span className="border border-[#990100] rounded-md px-2 py-1 mr-3 text-[#990100]">
              1
            </span>
            <span className="mr-3">to 2</span>
            <span className="text-[#990100] cursor-pointer hover:underline">
              &gt;
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProjectEmployees;