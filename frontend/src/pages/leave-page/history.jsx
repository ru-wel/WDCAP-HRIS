import React, { useEffect, useMemo, useState } from "react";
import Navbar from "../components/navbar";
import DropDownFilter from "../components/dropdownfilter";

const seedRows = [
  { id: "AC-00001", name: "Reuel Christian Sundiam", type: "SIL", date: "11/3/25 - 11/4/25", status: "APPROVED" },
  { id: "AC-00002", name: "Reuel Christian Sundiam", type: "SIL", date: "11/11/25", status: "APPROVED" },
  { id: "AC-00003", name: "Reuel Christian Sundiam", type: "SIL", date: "11/29/25", status: "REJECTED" },
  { id: "AC-00004", name: "Reuel Christian Sundiam", type: "SIL", date: "12/1/25", status: "REJECTED" },
  { id: "AC-00005", name: "Reuel Christian Sundiam", type: "SIL", date: "12/4/25", status: "APPROVED" },
  { id: "AC-00002", name: "Reuel Christian Sundiam", type: "SIL", date: "11/11/25", status: "APPROVED" },
  { id: "AC-00003", name: "Reuel Christian Sundiam", type: "SIL", date: "11/29/25", status: "REJECTED" },
  { id: "AC-00004", name: "Reuel Christian Sundiam", type: "SIL", date: "12/1/25", status: "REJECTED" },
  { id: "AC-00005", name: "Reuel Christian Sundiam", type: "SIL", date: "12/4/25", status: "APPROVED" },
  { id: "AC-00006", name: "Reuel Christian Sundiam", type: "SIL", date: "12/6/25", status: "APPROVED" },
  { id: "AC-00007", name: "Reuel Christian Sundiam", type: "SIL", date: "12/9/25", status: "REJECTED" },
  { id: "AC-00008", name: "Reuel Christian Sundiam", type: "SIL", date: "12/10/25", status: "APPROVED" },
];

function StatusPill({ status }) {
  const s = String(status).toUpperCase();
  const approved = s === "APPROVED";

  return (
    <span
      className={`inline-flex items-center justify-center
        px-4 py-1.5 rounded-md
        text-xs font-semibold
        ${approved ? "bg-[#BFE0B9] text-[#0B7A0B]" : "bg-[#F7B7B7] text-[#FF0000]"}
      `}
    >
      {s}
    </span>
  );
}

function LeaveHistoryDetailsModal({ open, onClose, data }) {
  if (!open) return null;

  const approved = String(data?.status || "").toUpperCase() === "APPROVED";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-2xl w-[600px] max-w-[92%] relative border border-gray-400">
        <div className="px-6 pt-6">
          <div className="bg-[#990100] text-white rounded-lg px-8 py-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              Leave History of {data?.employeeId || "—"}
            </h2>

            <button
              type="button"
              onClick={onClose}
              className="text-3xl leading-none font-bold hover:opacity-80"
              aria-label="Close"
              title="Close"
            >
              ×
            </button>
          </div>
        </div>

        <div className="px-10 pt-6 pb-10 text-black">
          <div className="grid grid-cols-[190px_1fr] gap-y-3 items-start">
            <div className="font-semibold">Date Requested:</div>
            <div>{data?.dateRequested || "—"}</div>

            <div className="font-semibold">Employee Name:</div>
            <div>{data?.name || "—"}</div>

            <div className="font-semibold">Position:</div>
            <div>{data?.position || "—"}</div>

            <div className="font-semibold">Leave Type:</div>
            <div>{data?.leaveType || "—"}</div>

            <div className="font-semibold">Date:</div>
            <div>{data?.dateRange || "—"}</div>

            <div className="font-semibold pt-2">Reason:</div>
            <div>
              <textarea
                readOnly
                value={data?.reason || ""}
                placeholder="Reason"
                className="w-full h-[140px] border border-gray-500 rounded-md px-4 py-3 resize-none shadow-md focus:outline-none"
              />
            </div>
          </div>

          <hr className="my-8 border-red-200" />

          <div className="flex items-center gap-6">
            <div className="font-semibold">Status:</div>

            <span
              className={`inline-flex items-center justify-center px-5 py-2 rounded-md text-xs font-semibold
                ${approved ? "bg-[#BFE0B9] text-[#0B7A0B]" : "bg-[#F7B7B7] text-[#FF0000]"}
              `}
            >
              {String(data?.status || "").toUpperCase() || "—"}
            </span>

            <select
              disabled
              value={String(data?.status || "").toUpperCase()}
              className="w-[240px] h-10 border border-gray-500 rounded-md px-4 shadow-md bg-white text-gray-700 cursor-not-allowed"
            >
              <option value="APPROVED">APPROVED</option>
              <option value="REJECTED">REJECTED</option>
              <option value="PENDING">PENDING</option>
            </select>
          </div>

          <div className="mt-10 text-[16px]">
            <span className="font-semibold">Update Made By:</span>{" "}
            <span>{data?.updatedBy || "—"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LeaveHistory() {
  const [rows] = useState(seedRows);
  const [searchTerm, setSearchTerm] = useState("");
  const itemsPerPage = 8;
  const [pageIndex, setPageIndex] = useState(0);
  const [openModal, setOpenModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const q = searchTerm.toLowerCase();
    return rows.filter((r) =>
      `${r.id} ${r.name} ${r.type} ${r.date} ${r.status}`.toLowerCase().includes(q)
    );
  }, [rows, searchTerm]);

  useEffect(() => setPageIndex(0), [searchTerm]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / itemsPerPage));
  const start = pageIndex * itemsPerPage;
  const end = start + itemsPerPage;
  const currentRows = filteredRows.slice(start, end);

  const prevPage = () => setPageIndex((p) => Math.max(0, p - 1));
  const nextPage = () => setPageIndex((p) => Math.min(pageCount - 1, p + 1));

  const openDetails = (row) => {
    setSelected({
      employeeId: row.id,
      dateRequested: "10/29/2025",
      name: row.name,
      position: "Web Developer",
      leaveType: row.type,
      dateRange: "November 2, 2025 to November 4, 2025",
      reason: "Reason",
      status: row.status,
      updatedBy: "Gabrielle Delos Santos (10/29/2025, 2:18 PM PHT)",
    });
    setOpenModal(true);
  };

  return (
    <div>
      <Navbar />

      <div className="p-7 lg:mx-18 md:mx-10">
        <div className="flex justify-between items-center">
          <h1 className="text-[#990100] font-extrabold lg:text-4xl text-3xl">
            Leave History
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

        <div className="div-table mt-6">
          <table className="table-style">
            <thead className="thead-style">
              <tr>
                <th className="th-style rounded-tl-lg rounded-bl-lg">Employee ID</th>
                <th className="th-style">Name</th>
                <th className="th-style">Leave Type</th>
                <th className="th-style">Date</th>
                <th className="th-style">Status</th>
                <th className="th-style rounded-tr-lg rounded-br-lg">Actions</th>
              </tr>
            </thead>

            <tbody className="tbody-style">
              {currentRows.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    No leave history found
                  </td>
                </tr>
              ) : (
                currentRows.map((row, idx) => (
                  <tr key={`${row.id}-${idx}`} className="tr-style">
                    <td className="td-style font-medium">{row.id}</td>
                    <td className="td-style">{row.name}</td>
                    <td className="td-style">{row.type}</td>
                    <td className="td-style">{row.date}</td>
                    <td className="td-style">
                      <StatusPill status={row.status} />
                    </td>
                    <td className="td-style">
                      <button
                        type="button"
                        className="bg-[#990100] text-white text-sm px-4 py-[6px] rounded-lg
                                   hover:bg-[#ad3332] hover:scale-105 transition duration-300 ease-in-out"
                        onClick={() => openDetails(row)}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="flex justify-end mt-8">
            <div className="flex items-center gap-4 text-[#990100]">
              <button
                type="button"
                onClick={prevPage}
                disabled={pageIndex === 0}
                className="text-xl disabled:opacity-40 hover:opacity-80 transition"
              >
                &lt;
              </button>

              <div className="flex items-center gap-3 text-gray-900">
                <div className="w-8 h-8 border border-gray-400 shadow-sm flex items-center justify-center">
                  {pageIndex + 1}
                </div>
                <span>to</span>
                <span>{pageCount}</span>
              </div>

              <button
                type="button"
                onClick={nextPage}
                disabled={pageIndex >= pageCount - 1}
                className="text-xl disabled:opacity-40 hover:opacity-80 transition"
              >
                &gt;
              </button>
            </div>
          </div>
        </div>
      </div>

      <LeaveHistoryDetailsModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        data={selected}
      />
    </div>
  );
}
