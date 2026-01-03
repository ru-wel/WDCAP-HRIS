import React, { useEffect, useMemo, useState } from "react";
import Navbar from "../components/navbar";
import DropDownFilter from "../components/dropdownfilter";
import ReactPaginate from "react-paginate";

function GenerateReportLeaveCreditsModal({ isOpen, onClose, onGenerate }) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [fileType, setFileType] = useState("CSV");

  if (!isOpen) return null;

  const handleClose = () => {
    onClose?.();
  };

  const handleGenerate = () => {
    onGenerate?.({ startDate, endDate, fileType });
    handleClose();
  };

  const CalendarIcon = () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      className="text-[#990100]"
    >
      <path
        d="M7 2v2M17 2v2M3.5 9h17"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M6 5h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/20">
      <div className="bg-white rounded-lg shadow-xl border border-gray-400 w-[600px] h-[380px]">
        <div className="p-4">
          <div className="bg-[#990100] rounded-lg px-7 py-4 flex items-center justify-between">
            <h2 className="text-white font-semibold text-lg md:text-xl">
              Generate Report - Leave Credits
            </h2>

            <button
              onClick={handleClose}
              className="text-white text-4xl font-bold leading-none hover:scale-110 transition"
              aria-label="Close"
              title="Close"
            >
              ✕
            </button>
          </div>

          <div className="py-10 px-4 md:px-10">
            <div className="max-w-[520px] mx-auto">
              <div className="grid grid-cols-[180px_1fr] gap-y-5 items-center">
                <p className="font-semibold text-[15px] text-right pr-4">
                  Starting Date:
                </p>
                <div className="relative w-full max-w-[250px]">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full border border-gray-400 rounded-md px-4 py-2 pr-10 text-sm shadow-sm
                               focus:outline-none bg-white"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <CalendarIcon />
                  </span>
                </div>

                <p className="font-semibold text-[15px] text-right pr-4">
                  End Date:
                </p>
                <div className="relative w-full max-w-[250px]">
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full border border-gray-400 rounded-md px-4 py-2 pr-10 text-sm shadow-sm
                               focus:outline-none bg-white"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <CalendarIcon />
                  </span>
                </div>

                <p className="font-semibold text-[15px] text-right pr-4">
                  File Type:
                </p>
                <div className="relative w-full max-w-[250px]">
                  <select
                    value={fileType}
                    onChange={(e) => setFileType(e.target.value)}
                    className="appearance-none w-full border border-gray-400 rounded-md px-4 py-2 pr-10 text-sm bg-white
                               focus:outline-none shadow-sm"
                  >
                    <option value="CSV">CSV</option>
                    <option value="PDF">PDF</option>
                    <option value="XLSX">XLSX</option>
                  </select>

                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#990100] text-lg">
                    ▾
                  </span>
                </div>
              </div>

              <div className="flex justify-end mt-10">
                <button
                  onClick={handleGenerate}
                  className="bg-[#990100] text-white text-sm px-6 py-2 rounded-lg shadow
                             hover:bg-[#ad3332] hover:scale-105 transition duration-300 ease-in-out"
                >
                  Generate Report
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LeaveCreditsModal({ isOpen, onClose, data }) {
  if (!isOpen || !data) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/20">
      <div className="bg-white rounded-lg shadow-xl border border-gray-400 w-[600px] max-w-[95%]">
        <div className="p-6">
          <div className="bg-[#990100] rounded-lg px-8 py-4 flex items-center justify-between">
            <h2 className="text-white font-semibold text-xl">
              Leave Credits of {data.id}
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

          <div className="pt-7">
            <div className="grid grid-cols-[190px_1fr] gap-y-3 text-[15px]">
              <p className="font-bold">Employee Name:</p>
              <p>{data.name}</p>

              <p className="font-bold">Position:</p>
              <p>{data.position}</p>
            </div>

            <hr className="border-[#990100] my-6" />

            <div className="px-6">
              <div className="grid grid-cols-[1.2fr_.8fr_.8fr] text-center font-bold text-[18px] pb-4">
                <p>Leave Type</p>
                <p>Leave Credit</p>
                <p>Used Leave</p>
              </div>

              <div className="space-y-4">
                {(data.details || []).map((row) => (
                  <div
                    key={row.type}
                    className="grid grid-cols-[1.2fr_.8fr_.8fr] items-center"
                  >
                    <p className="text-[16px]">{row.type}</p>

                    <div className="flex justify-center">
                      {row.mode === "number" ? (
                        <p className="text-[16px]">{row.credit}</p>
                      ) : (
                        <div className="relative">
                          <select
                            disabled
                            defaultValue="DISABLED"
                            className="appearance-none border border-gray-400 rounded-md px-4 py-2 pr-10 text-sm bg-white w-[170px]
                                       text-gray-500 focus:outline-none shadow-sm"
                          >
                            <option>DISABLED</option>
                          </select>

                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#990100] text-lg">
                            ▾
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-center">
                      {row.used !== undefined && row.used !== null ? (
                        <p className="text-[16px]">{row.used}</p>
                      ) : (
                        <p className="text-[16px]">&nbsp;</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between mt-12 px-2">
              <p className="text-[15px]">
                <span className="font-bold">Last Updated:</span>{" "}
                {data.lastUpdated}
              </p>

              <button
                className="bg-[#198C19] text-white px-7 py-2 rounded-md shadow-md
                           hover:bg-[#46a346] hover:scale-105 transition duration-300 ease-in-out"
                onClick={() => alert("Update Leave (UI-only for now).")}
              >
                Update Leave
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const leaveCreditsSeed = [
  {
    id: "AC-00001",
    name: "Reuel Christian Sundiam",
    position: "Web Developer",
    credits: 2,
    used: 3,
    lastUpdated: "10/20/25",
    details: [
      { type: "Service Incentive Leave", mode: "number", credit: 2, used: 3 },
      { type: "Maternity Leave", mode: "disabled" },
      { type: "Paternity Leave", mode: "disabled" },
      { type: "Parental Leave", mode: "disabled" },
      { type: "Leave under VAWC", mode: "disabled" },
      { type: "Special Leave for Women", mode: "disabled" },
    ],
  },
  {
    id: "AC-00002",
    name: "Reuel Christian Sundiam",
    position: "Web Developer",
    credits: 4,
    used: 1,
    lastUpdated: "10/20/25",
    details: [
      { type: "Service Incentive Leave", mode: "number", credit: 4, used: 1 },
      { type: "Maternity Leave", mode: "disabled" },
      { type: "Paternity Leave", mode: "disabled" },
      { type: "Parental Leave", mode: "disabled" },
      { type: "Leave under VAWC", mode: "disabled" },
      { type: "Special Leave for Women", mode: "disabled" },
    ],
  },
  {
    id: "AC-00003",
    name: "Reuel Christian Sundiam",
    position: "Web Developer",
    credits: 6,
    used: 4,
    lastUpdated: "10/20/25",
    details: [
      { type: "Service Incentive Leave", mode: "number", credit: 6, used: 4 },
      { type: "Maternity Leave", mode: "disabled" },
      { type: "Paternity Leave", mode: "disabled" },
      { type: "Parental Leave", mode: "disabled" },
      { type: "Leave under VAWC", mode: "disabled" },
      { type: "Special Leave for Women", mode: "disabled" },
    ],
  },
];

export default function Credits() {
  const [rows] = useState(leaveCreditsSeed);
  const [searchTerm, setSearchTerm] = useState("");

  const [openModal, setOpenModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const [openGenerate, setOpenGenerate] = useState(false);

    // PAGE TITLE
    useEffect(() => {
      document.title = "ARISE | LEAVE CREDITS"; 
    }, []);

  const openDetails = (row) => {
    setSelectedRow(row);
    setOpenModal(true);
  };

  const closeDetails = () => {
    setSelectedRow(null);
    setOpenModal(false);
  };

  const filteredRows = useMemo(() => {
    if (!searchTerm) return rows;
    const q = searchTerm.toLowerCase();
    return rows.filter((r) =>
      `${r.id} ${r.name} ${r.credits} ${r.used}`.toLowerCase().includes(q)
    );
  }, [rows, searchTerm]);

  const [itemOffset, setItemOffset] = useState(0);
  const itemsPerPage = 9;
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
            Leave Credits
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

        <div className="flex justify-end mt-5">
          <button
            onClick={() => setOpenGenerate(true)}
            className="bg-[#990100]/80 text-white px-6 py-2 rounded-lg shadow
                       hover:bg-[#990100] hover:scale-105 transition duration-300 ease-in-out"
          >
            Generate Report
          </button>
        </div>

        <div className="div-table mt-6">
          <table className="table-style">
            <thead className="thead-style">
              <tr>
                <th className="th-style rounded-tl-lg rounded-bl-lg">
                  Employee ID
                </th>
                <th className="th-style">Name</th>
                <th className="th-style">Leave Credits</th>
                <th className="th-style">Used Leave</th>
                <th className="th-style rounded-tr-lg rounded-br-lg">Actions</th>
              </tr>
            </thead>

            <tbody className="tbody-style">
              {currentRows.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    No leave credits found
                  </td>
                </tr>
              ) : (
                currentRows.map((row) => (
                  <tr key={row.id} className="tr-style">
                    <td className="td-style font-medium">{row.id}</td>
                    <td className="td-style">{row.name}</td>
                    <td className="td-style">{row.credits}</td>
                    <td className="td-style">{row.used}</td>
                    <td className="td-style">
                      <button
                        onClick={() => openDetails(row)}
                        className="bg-[#990100] text-white text-sm px-4 py-[6px] rounded-lg
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
              <b>{filteredRows.length}</b> employee
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
                marginPagesDisplayed={2}
                pageLinkClassName="cursor-pointer hover:text-gray-500 hover:underline"
                previousClassName={
                  multiPages
                    ? "cursor-pointer hover:text-gray-500 hover:underline"
                    : "text-gray-400 cursor-not-allowed pointer-events-none"
                }
                nextClassName={
                  multiPages
                    ? "cursor-pointer hover:text-gray-500 hover:underline"
                    : "text-gray-400 cursor-not-allowed pointer-events-none"
                }
                containerClassName="flex items-center space-x-2 lg:pt-0 pt-4 text-[#990100]"
                activeClassName="underline font-medium"
              />
            )}
          </div>
        </div>
      </div>

      <GenerateReportLeaveCreditsModal
        isOpen={openGenerate}
        onClose={() => setOpenGenerate(false)}
        onGenerate={(payload) => {
          alert(
            `Generate Report - Leave Credits\n\nStarting Date: ${
              payload.startDate || "—"
            }\nEnd Date: ${payload.endDate || "—"}\nFile Type: ${payload.fileType}`
          );
        }}
      />

      <LeaveCreditsModal
        isOpen={openModal}
        onClose={closeDetails}
        data={selectedRow}
      />
    </div>
  );
}