import React, { useMemo, useState, useEffect } from "react";
import Navbar from "../components/navbar";
import DropDownFilter from "../components/dropdownfilter";
import ReactPaginate from "react-paginate";

function LeaveRequestModal({
  isOpen,
  onClose,
  data,
  statusValue,
  onStatusChange,
  onUpdate,
}) {
  if (!isOpen || !data) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/20">
      <div className="bg-white rounded-lg shadow-xl border border-gray-400 w-[900px] max-w-none">
        <div className="p-6">
          <div className="bg-[#990100] rounded-lg px-8 py-4 flex items-center justify-between">
            <h2 className="text-white font-semibold text-xl">
              Leave Request of {data.id}
            </h2>
            <button
              onClick={onClose}
              className="text-white text-3xl font-bold leading-none hover:scale-110 transition"
              aria-label="Close"
              title="Close"
            >
              ✕
            </button>
          </div>

          <div className="pt-6">
            <div className="grid grid-cols-[170px_1fr] gap-y-3 text-[15px]">
              <p className="font-bold">Date Requested:</p>
              <p>{data.dateRequested}</p>

              <p className="font-bold">Employee Name:</p>
              <p>{data.name}</p>

              <p className="font-bold">Position:</p>
              <p>{data.position}</p>

              <p className="font-bold">Leave Type:</p>
              <p>{data.type}</p>

              <p className="font-bold">Date:</p>
              <p>{data.leaveDate}</p>
            </div>

            <div className="grid grid-cols-[170px_1fr] gap-4 mt-6 items-start">
              <p className="font-bold pt-2">Reason:</p>

              <textarea
                placeholder="Reason"
                value={data.reason || ""}
                readOnly
                className="w-full h-[110px] border border-gray-400 rounded-md px-4 py-3 text-sm resize-none
                           focus:outline-none bg-white placeholder:text-gray-500"
              />
            </div>

            <hr className="border-[#990100] my-8" />

            <div className="flex items-center gap-5">
              <p className="font-bold text-[15px]">Status:</p>

              <div className="relative">
                <select
                  value={statusValue}
                  onChange={(e) => onStatusChange(e.target.value)}
                  className="appearance-none border border-gray-400 rounded-md px-4 py-2 pr-10 text-sm bg-white w-[170px]
                             focus:outline-none"
                >
                  <option value="PENDING">PENDING</option>
                  <option value="APPROVED">APPROVED</option>
                  <option value="REJECTED">REJECTED</option>
                </select>

                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#990100] text-lg">
                  ▾
                </span>
              </div>
            </div>

            <p className="mt-6 text-[15px]">
              <span className="font-bold">Update Made By:</span>{" "}
              {data.updatedBy}
            </p>

            <div className="flex justify-center mt-8">
              <button
                onClick={onUpdate}
                className="bg-[#198C19] text-white px-6 py-2 rounded-md shadow-md
                           hover:bg-[#46a346] hover:scale-105 transition duration-300 ease-in-out"
              >
                Update Request
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const leaveRequestsSeed = [
  {
    id: "AC-4001",
    name: "Reuel Christian Sundiam",
    position: "Web Developer",
    type: "SIL",
    leaveDate: "November 2, 2025 to November 4, 2025",
    dateRequested: "10/29/2025",
    status: "PENDING",
    reason: "",
    updatedBy: "Gabrielle Delos Santos (10/29/2025, 2:18 PM PHT)",
  },
  {
    id: "AC-00002",
    name: "Lance Paolo Cabe",
    position: "Web Developer",
    type: "SIL",
    leaveDate: "November 11, 2025",
    dateRequested: "10/29/2025",
    status: "PENDING",
    reason: "",
    updatedBy: "Gabrielle Delos Santos (10/29/2025, 2:18 PM PHT)",
  },
  {
    id: "AC-00003",
    name: "Gabrielle Delos Santos",
    position: "Web Developer",
    type: "SIL",
    leaveDate: "November 29, 2025",
    dateRequested: "10/29/2025",
    status: "PENDING",
    reason: "",
    updatedBy: "Gabrielle Delos Santos (10/29/2025, 2:18 PM PHT)",
  },
  {
    id: "AC-00004",
    name: "Reuel Christian Sundiam",
    position: "Web Developer",
    type: "SIL",
    leaveDate: "December 1, 2025",
    dateRequested: "10/29/2025",
    status: "PENDING",
    reason: "",
    updatedBy: "Gabrielle Delos Santos (10/29/2025, 2:18 PM PHT)",
  },
  {
    id: "AC-00005",
    name: "Carl Paldeng",
    position: "Web Developer",
    type: "SIL",
    leaveDate: "December 4, 2025",
    dateRequested: "10/29/2025",
    status: "PENDING",
    reason: "",
    updatedBy: "Gabrielle Delos Santos (10/29/2025, 2:18 PM PHT)",
  },
];

export default function LeaveRequest() {
  const [rows, setRows] = useState(leaveRequestsSeed);
  const [searchTerm, setSearchTerm] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [modalStatus, setModalStatus] = useState("PENDING");

  const openDetails = (row) => {
    setSelectedRequest(row);
    setModalStatus(row.status || "PENDING");
    setOpenModal(true);
  };

  const closeDetails = () => {
    setOpenModal(false);
    setSelectedRequest(null);
  };

  const handleUpdateRequest = () => {
    if (!selectedRequest) return;

    setRows((prev) =>
      prev.map((r) =>
        r.id === selectedRequest.id ? { ...r, status: modalStatus } : r
      )
    );

    alert(`Updated ${selectedRequest.id} to ${modalStatus}`);
    closeDetails();
  };

  const filteredRows = useMemo(() => {
    if (!searchTerm) return rows;
    const q = searchTerm.toLowerCase();
    return rows.filter((r) =>
      `${r.id} ${r.name} ${r.position} ${r.type} ${r.leaveDate} ${r.status}`
        .toLowerCase()
        .includes(q)
    );
  }, [rows, searchTerm]);

  const [itemOffset, setItemOffset] = useState(0);
  const itemsPerPage = 10;
  const endOffset = itemOffset + itemsPerPage;
  const currentRows = filteredRows.slice(itemOffset, endOffset);
  const pageCount = Math.ceil(filteredRows.length / itemsPerPage);
  const multiPages = pageCount > 1;

  useEffect(() => {
    setItemOffset(0);
  }, [searchTerm]);

  const handlePageClick = (event) => {
    const newOffset = event.selected * itemsPerPage;
    setItemOffset(newOffset);
  };

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
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white lg:h-10 md:h-9 h-8 px-2 lg:pr-10 md:pr-5 pr-5 md:w-auto w-35 rounded-lg text-sm focus:outline-none"
              />
              <button
                type="button"
                className="absolute right-0 top-0 md:mt-3 mt-2 lg:mr-3 mr-2 items-center cursor-pointer"
                aria-label="Search"
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
        <div className="div-table">
          <table className="table-style">
            <thead className="thead-style">
              <tr>
                <th className="th-style rounded-tl-lg rounded-bl-lg">
                  Employee ID
                </th>
                <th className="th-style">Name</th>
                <th className="th-style">Leave Type</th>
                <th className="th-style">Date</th>
                <th className="th-style">Status</th>
                <th className="th-style rounded-tr-lg rounded-br-lg">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="tbody-style">
              {currentRows.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    No leave requests found
                  </td>
                </tr>
              ) : (
                currentRows.map((row) => (
                  <tr key={row.id} className="tr-style">
                    <td className="td-style font-medium">{row.id}</td>
                    <td className="td-style">{row.name}</td>
                    <td className="td-style">{row.type}</td>
                    <td className="td-style">{row.leaveDate}</td>
                    <td className="td-style">
                      <span className="inline-block bg-[#FFE1A3] text-[#805200] px-4 py-[6px] rounded-xl text-xs font-semibold">
                        {row.status}
                      </span>
                    </td>
                    <td className="td-style">
                      <button
                        onClick={() => openDetails(row)}
                        className="bg-[#990100] text-white text-sm px-4 py-[5px] rounded-lg
                                   hover:bg-[#ad3332] hover:scale-105 transition duration-300 ease-in-out"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <br />

          <div className="lg:flex items-center lg:justify-between">
            <p className="lg:text-md text-sm">
              Showing <b>{currentRows.length}</b> of{" "}
              <b>{filteredRows.length}</b> request
              {filteredRows.length !== 1 ? "s" : ""}
            </p>

            {multiPages && (
              <ReactPaginate
                breakLabel="..."
                nextLabel=">"
                onPageChange={handlePageClick}
                pageRangeDisplayed={2}
                pageCount={pageCount}
                previousLabel="<"
                renderOnZeroPageCount={null}
                containerClassName="pagination"
                pageClassName="page-num"
                previousClassName="page-num"
                nextClassName="page-num"
                activeClassName="active"
              />
            )}
          </div>
        </div>
      </div>

      <LeaveRequestModal
        isOpen={openModal}
        onClose={closeDetails}
        data={selectedRequest}
        statusValue={modalStatus}
        onStatusChange={setModalStatus}
        onUpdate={handleUpdateRequest}
      />
    </div>
  );
}