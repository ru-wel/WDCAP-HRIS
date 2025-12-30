import React, { useEffect, useMemo, useState } from "react";
import Navbar from "../components/navbar";
import DropDownFilter from "../components/dropdownfilter";

const leaveCreditsRows = [
  { id: "AC-00001", name: "Reuel Christian Sundiam", credits: 2, usedLeave: 3 },
  { id: "AC-00002", name: "Reuel Christian Sundiam", credits: 4, usedLeave: 1 },
  { id: "AC-00003", name: "Reuel Christian Sundiam", credits: 6, usedLeave: 4 },
  { id: "AC-00004", name: "Reuel Christian Sundiam", credits: 1, usedLeave: 4 },
  { id: "AC-00005", name: "Reuel Christian Sundiam", credits: 3, usedLeave: 2 },
  { id: "AC-00006", name: "Reuel Christian Sundiam", credits: 3, usedLeave: 2 },
  { id: "AC-00007", name: "Reuel Christian Sundiam", credits: 3, usedLeave: 2 },
  { id: "AC-00008", name: "Reuel Christian Sundiam", credits: 3, usedLeave: 2 },
  { id: "AC-00009", name: "Reuel Christian Sundiam", credits: 3, usedLeave: 2 },
];

function ModalShell({ open, title, onClose, children }) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/20"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-2xl mx-4 bg-white rounded-lg shadow-xl border border-gray-300 overflow-hidden">
        <div className="bg-[#990100] text-white px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-white text-2xl leading-none hover:opacity-80"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="px-10 py-8">{children}</div>
      </div>
    </div>
  );
}

function LeaveCreditsDetailsModal({ open, row, onClose }) {
  const leaveTypes = useMemo(
    () => [
      {
        label: "Service Incentive Leave",
        credit: row?.credits ?? 0,
        used: row?.usedLeave ?? 0,
        enabled: true,
      },
      { label: "Maternity Leave", credit: "DISABLED", used: "", enabled: false },
      { label: "Paternity Leave", credit: "DISABLED", used: "", enabled: false },
      { label: "Parental Leave", credit: "DISABLED", used: "", enabled: false },
      { label: "Leave under VAWC", credit: "DISABLED", used: "", enabled: false },
      {
        label: "Special Leave for Women",
        credit: "DISABLED",
        used: "",
        enabled: false,
      },
    ],
    [row]
  );

  return (
    <ModalShell
      open={open}
      title={`Leave Credits of ${row?.id ?? ""}`}
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
          <div className="flex gap-2">
            <span className="font-semibold">Employee Name:</span>
            <span>{row?.name ?? ""}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-semibold">Position:</span>
            <span>Web Developer</span>
          </div>
        </div>

        <hr className="border-[#990100]" />

        <div className="grid grid-cols-[1fr_140px_120px] gap-x-4 items-center text-sm font-semibold">
          <div className="text-center">Leave Type</div>
          <div className="text-center">Leave Credit</div>
          <div className="text-center">Used Leave</div>
        </div>

        <div className="space-y-3">
          {leaveTypes.map((lt) => (
            <div
              key={lt.label}
              className="grid grid-cols-[1fr_140px_120px] gap-x-4 items-center text-sm"
            >
              <div className="text-center">{lt.label}</div>

              <div className="flex justify-center">
                {lt.enabled ? (
                  <span className="font-medium">{lt.credit}</span>
                ) : (
                  <select
                    className="border border-gray-300 rounded-md px-3 py-1 text-xs text-gray-400 bg-white w-28"
                    disabled
                    value="DISABLED"
                    onChange={() => {}}
                  >
                    <option value="DISABLED">DISABLED</option>
                  </select>
                )}
              </div>

              <div className="flex justify-center">
                {lt.enabled ? (
                  <span className="font-medium">{lt.used}</span>
                ) : (
                  <select
                    className="border border-gray-300 rounded-md px-3 py-1 text-xs text-gray-400 bg-white w-28"
                    disabled
                    value="DISABLED"
                    onChange={() => {}}
                  >
                    <option value="DISABLED">DISABLED</option>
                  </select>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-end justify-between pt-4 text-sm">
          <div>
            <span className="font-semibold">Last Updated:</span> 10/20/25
          </div>
          <button
            type="button"
            className="green-button shadow-md px-6"
            onClick={onClose}
          >
            Update Leave
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function GenerateReportModal({ open, onClose }) {
  const [startingDate, setStartingDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [fileType, setFileType] = useState("CSV");

  useEffect(() => {
    if (!open) return;
    setStartingDate("");
    setEndDate("");
    setFileType("CSV");
  }, [open]);

  return (
    <ModalShell open={open} title="Generate Report - Leave Credits" onClose={onClose}>
      <div className="space-y-5">
        <div className="grid grid-cols-[140px_1fr] items-center gap-4 text-sm">
          <div className="text-right font-semibold">Starting Date:</div>
          <input
            type="date"
            className="border border-gray-300 rounded-md px-3 py-1 text-sm w-40"
            value={startingDate}
            onChange={(e) => setStartingDate(e.target.value)}
          />

          <div className="text-right font-semibold">End Date:</div>
          <input
            type="date"
            className="border border-gray-300 rounded-md px-3 py-1 text-sm w-40"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />

          <div className="text-right font-semibold">File Type:</div>
          <select
            className="border border-gray-300 rounded-md px-3 py-1 text-sm w-40 bg-white"
            value={fileType}
            onChange={(e) => setFileType(e.target.value)}
          >
            <option value="CSV">CSV</option>
          </select>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            className="bg-[#990100] text-white text-xs px-5 py-2 rounded-md hover:bg-[#ad3332] transition duration-300 ease-in-out"
            onClick={onClose}
          >
            Generate Report
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

export default function LeaveCredits() {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [reportOpen, setReportOpen] = useState(false);

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

        <div className="flex justify-end mt-4">
          <button
            type="button"
            className="generate-report-button"
            onClick={() => setReportOpen(true)}
          >
            Generate Report
          </button>
        </div>

        <div className="div-table">
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
              {leaveCreditsRows.map((row) => (
                <tr key={row.id} className="tr-style">
                  <td className="td-style font-medium">{row.id}</td>
                  <td className="td-style">{row.name}</td>
                  <td className="td-style">{row.credits}</td>
                  <td className="td-style">{row.usedLeave}</td>
                  <td className="td-style">
                    <button
                      type="button"
                      className="bg-[#990100] text-white text-sm px-4 py-[5px] rounded-lg hover:bg-[#ad3332] hover:scale-105 transition duration-300 ease-in-out"
                      onClick={() => {
                        setSelectedRow(row);
                        setDetailsOpen(true);
                      }}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <br />

          <div className="lg:flex items-center lg:justify-between">
            <p className="lg:text-md text-sm">
              Showing <b>{leaveCreditsRows.length}</b> employee
              {leaveCreditsRows.length !== 1 ? "s" : ""}
            </p>

            <div className="flex items-center space-x-2 md:pt-0 pt-4">
              <span className="text-[#990100] hover:underline">
                <a href="#"> &lt; </a>
              </span>
              <span className="text-sm font-medium text-body">1</span>
              <span className="text-sm text-body">to 2</span>
              <span className="text-[#990100] hover:underline">
                <a href="#"> &gt; </a>
              </span>
            </div>
          </div>
        </div>
      </div>

      <LeaveCreditsDetailsModal
        open={detailsOpen}
        row={selectedRow}
        onClose={() => setDetailsOpen(false)}
      />

      <GenerateReportModal open={reportOpen} onClose={() => setReportOpen(false)} />
    </div>
  );
}
