import React from "react";
import Navbar from "../components/navbar";
import DropDownFilter from "../components/dropdownfilter";

const leaveRequests = [
  {
    id: "AC-00001",
    name: "Reuel Christian Sundiam",
    type: "SIL",
    date: "11/3/25 - 11/4/25",
    status: "PENDING",
  },
  {
    id: "AC-00002",
    name: "Lance Paolo Cabe",
    type: "SIL",
    date: "11/11/25",
    status: "PENDING",
  },
  {
    id: "AC-00003",
    name: "Gabrielle Delos Santos",
    type: "SIL",
    date: "11/29/25",
    status: "PENDING",
  },
  {
    id: "AC-00004",
    name: "Reuel Christian Sundiam",
    type: "SIL",
    date: "12/1/25",
    status: "PENDING",
  },
  {
    id: "AC-00005",
    name: "Carl Paldeng",
    type: "SIL",
    date: "12/4/25",
    status: "PENDING",
  },
];

function LeaveRequest() {
  return (
    <div>
      <Navbar />

      <div className="p-7 lg:mx-18 md:mx-10">
        <div className="md:flex justify-between items-center w-full">
          <h1 className="lg:text-3xl text-2xl text-[#990100] font-bold md:mb-0 mb-5">
            Leave Requests
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
        <div className="overflow-x-auto bg-white border rounded-lg overflow-hidden mt-8 shadow-lg px-8 py-10">
          <table className="min-w-full text-center">
            <thead className="bg-[#990100] text-white">
              <tr>
                <th className="px-6 py-3 text-xs tracking-wider rounded-tl-lg rounded-bl-lg">
                  Employee ID
                </th>
                <th className="px-6 py-3 text-xs tracking-wider">Name</th>
                <th className="px-6 py-3 text-xs tracking-wider">Leave Type</th>
                <th className="px-6 py-3 text-xs tracking-wider">Date</th>
                <th className="px-6 py-3 text-xs tracking-wider">Status</th>
                <th className="px-6 py-3 text-xs tracking-wider rounded-tr-lg rounded-br-lg">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#990100]">
              {leaveRequests.map((row, index) => (
                <tr
                  key={row.id}
                  className={
                    index % 2 === 1
                      ? "bg-gray-100 hover:bg-[#f4e5e5]"
                      : "hover:bg-[#f4e5e5]"
                  }
                >
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900 font-medium">
                    {row.id}
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">
                    {row.name}
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">
                    {row.type}
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">
                    {row.date}
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">
                    <span className="inline-block bg-[#FFE1A3] text-[#805200] px-4 py-[6px] rounded-xl text-xs font-semibold">
                      {row.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">
                    <button className="bg-[#990100] text-white text-sm px-4 py-[5px] rounded-lg hover:bg-[#ad3332] hover:scale-105 transition duration-300 ease-in-out">
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default LeaveRequest;