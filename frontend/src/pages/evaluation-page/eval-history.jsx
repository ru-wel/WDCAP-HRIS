import React, { useMemo, useState } from "react";
import Navbar from "../components/navbar";
import DropDownFilter from "../components/dropdownfilter";
import { useEffect } from "react";

function FilePill({ label }) {
  return (
    <button
      type="button"
      className="relative w-[180px] max-w-full border border-gray-400 bg-white rounded-md px-3 py-2 text-sm text-left shadow-sm hover:border-gray-500 transition">
      <span className="block pr-8 truncate">{label}</span>
      <img src="/icons/Download.png" alt="download" className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4"/>
    </button>
  );
}

function EvaluationHistoryDetailsModal({ open, onClose, data }) {
  if (!open || !data) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/20">
      <div className="bg-white rounded-lg shadow-2xl border border-gray-500 w-[780px] max-w-[92vw]">
        <div className="p-6">
          <div className="bg-[#990100] rounded-lg px-8 py-4 flex items-center justify-between">
            <h2 className="text-white font-semibold text-xl">
              Evaluation History of {data.id}
            </h2>

            <button
              onClick={onClose}
              className="text-white text-4xl font-bold leading-none hover:scale-110 transition"
              aria-label="Close"
              title="Close"
            >
              ✕
            </button>
          </div>

          <div className="pt-7 px-8">
            <div className="grid grid-cols-[190px_1fr] gap-y-3 text-[18px]">
              <p className="font-bold">Employee Name:</p>
              <p>{data.name}</p>

              <p className="font-bold">Position:</p>
              <p>{data.position}</p>

              <p className="font-bold">Personnel Type:</p>
              <p>{data.personnelType}</p>

              <p className="font-bold">Hire Date:</p>
              <p>{data.hireDateFull}</p>
            </div>

            <hr className="border-[#D96A6A] my-8" />

            <div className="px-6">
              <div className="grid grid-cols-[1.2fr_.95fr_.95fr] text-left font-bold text-[18px] pb-4">
                <p>Evaluation Type</p>
                <p className="text-center">Breakdown</p>
                <p className="text-center">Last</p>
              </div>

              <div className="space-y-4">
                {(data.evaluations || []).map((row, idx) => (
                  <div
                    key={`${row.type}-${idx}`}
                    className="grid grid-cols-[1.2fr_.95fr_.95fr] items-center gap-4"
                  >
                    <p className="text-[17px] pl-1">{row.type}</p>

                    <div className="flex justify-center">
                      <FilePill label={row.breakdown} />
                    </div>

                    <div className="flex justify-center">
                      <FilePill label={row.last} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between mt-12 px-2">
              <p className="text-[15px]">
                <span className="font-bold">Last Updated:</span> {data.lastUpdated}
              </p>

              <button
                type="button"
                className="bg-[#198C19] text-white px-10 py-2 rounded-md shadow-md
                           hover:bg-[#46a346] hover:scale-105 transition duration-300 ease-in-out"
              >
                Update Evaluation
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EvaluationHistory() {
  const rows = [
    {
      id: "AC-00001",
      name: "Reuel Christian Sundiam",
      position: "Web Developer",
      hireDate: "10/20/25",
      personnelType: "Regular",

      hireDateFull: "10/20/2025",
      lastUpdated: "10/20/25 | 10:00 AM PHT",
      evaluations: [
        { type: "ANNUAL (2025)", breakdown: "Breakdown.pdf", last: "Final.pdf" },
        { type: "Probationary", breakdown: "Breakdown.pdf", last: "Final.pdf" },
      ],
    },
    {
      id: "AC-00002",
      name: "Reuel Christian Sundiam",
      position: "Web Developer",
      hireDate: "10/20/25",
      personnelType: "Regular",
      hireDateFull: "10/20/2025",
      lastUpdated: "10/20/25 | 10:00 AM PHT",
      evaluations: [
        { type: "ANNUAL (2025)", breakdown: "Breakdown.pdf", last: "Final.pdf" },
        { type: "Probationary", breakdown: "Breakdown.pdf", last: "Final.pdf" },
      ],
    },
    {
      id: "AC-00003",
      name: "Reuel Christian Sundiam",
      position: "Web Developer",
      hireDate: "10/20/25",
      personnelType: "Regular",
      hireDateFull: "10/20/2025",
      lastUpdated: "10/20/25 | 10:00 AM PHT",
      evaluations: [
        { type: "ANNUAL (2025)", breakdown: "Breakdown.pdf", last: "Final.pdf" },
        { type: "Probationary", breakdown: "Breakdown.pdf", last: "Final.pdf" },
      ],
    },
    {
      id: "AC-00004",
      name: "Reuel Christian Sundiam",
      position: "Web Developer",
      hireDate: "10/20/25",
      personnelType: "Regular",
      hireDateFull: "10/20/2025",
      lastUpdated: "10/20/25 | 10:00 AM PHT",
      evaluations: [
        { type: "ANNUAL (2025)", breakdown: "Breakdown.pdf", last: "Final.pdf" },
        { type: "Probationary", breakdown: "Breakdown.pdf", last: "Final.pdf" },
      ],
    },
    {
      id: "AC-00005",
      name: "Reuel Christian Sundiam",
      position: "Web Developer",
      hireDate: "10/20/25",
      personnelType: "Regular",
      hireDateFull: "10/20/2025",
      lastUpdated: "10/20/25 | 10:00 AM PHT",
      evaluations: [
        { type: "ANNUAL (2025)", breakdown: "Breakdown.pdf", last: "Final.pdf" },
        { type: "Probationary", breakdown: "Breakdown.pdf", last: "Final.pdf" },
      ],
    },
    {
      id: "AC-00006",
      name: "Reuel Christian Sundiam",
      position: "Web Developer",
      hireDate: "10/20/25",
      personnelType: "Regular",
      hireDateFull: "10/20/2025",
      lastUpdated: "10/20/25 | 10:00 AM PHT",
      evaluations: [
        { type: "ANNUAL (2025)", breakdown: "Breakdown.pdf", last: "Final.pdf" },
        { type: "Probationary", breakdown: "Breakdown.pdf", last: "Final.pdf" },
      ],
    },
    {
      id: "AC-00007",
      name: "Reuel Christian Sundiam",
      position: "Web Developer",
      hireDate: "10/20/25",
      personnelType: "Regular",
      hireDateFull: "10/20/2025",
      lastUpdated: "10/20/25 | 10:00 AM PHT",
      evaluations: [
        { type: "ANNUAL (2025)", breakdown: "Breakdown.pdf", last: "Final.pdf" },
        { type: "Probationary", breakdown: "Breakdown.pdf", last: "Final.pdf" },
      ],
    },
    {
      id: "AC-00008",
      name: "Reuel Christian Sundiam",
      position: "Web Developer",
      hireDate: "10/20/25",
      personnelType: "Regular",
      hireDateFull: "10/20/2025",
      lastUpdated: "10/20/25 | 10:00 AM PHT",
      evaluations: [
        { type: "ANNUAL (2025)", breakdown: "Breakdown.pdf", last: "Final.pdf" },
        { type: "Probationary", breakdown: "Breakdown.pdf", last: "Final.pdf" },
      ],
    },
    {
      id: "AC-00009",
      name: "Reuel Christian Sundiam",
      position: "Web Developer",
      hireDate: "10/20/25",
      personnelType: "Regular",
      hireDateFull: "10/20/2025",
      lastUpdated: "10/20/25 | 10:00 AM PHT",
      evaluations: [
        { type: "ANNUAL (2025)", breakdown: "Breakdown.pdf", last: "Final.pdf" },
        { type: "Probationary", breakdown: "Breakdown.pdf", last: "Final.pdf" },
      ],
    },
  ];

  // PAGE TITLE
    useEffect(() => {
      document.title = "ARISE | EVALUATION HISTORY"; 
    }, []);

  const [searchTerm, setSearchTerm] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const q = searchTerm.toLowerCase();
    return rows.filter((r) =>
      `${r.id} ${r.name} ${r.position} ${r.hireDate} ${r.personnelType}`
        .toLowerCase()
        .includes(q)
    );
  }, [searchTerm]);

  const openDetails = (row) => {
    setSelectedRow({ ...row, id: row.id === "AC-00001" ? "AC-4001" : row.id });
    setOpenModal(true);
  };

  const closeDetails = () => {
    setOpenModal(false);
    setSelectedRow(null);
  };

  return (
    <div>
      <Navbar />

      <div className="p-7 lg:mx-18 md:mx-10">
        <div className="md:flex justify-between items-center w-full mb-5">
          <h1 className="lg:text-3xl text-2xl text-[#990100] font-bold">
            Evaluation History
          </h1>

          <div className="flex items-center gap-3 md:mt-0 mt-4 justify-end">
            <DropDownFilter />

            <div className="relative text-gray-600 border border-[#990100] rounded-lg">
              <input
                type="search"
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white lg:h-10 md:h-9 h-9 px-3 pr-10 rounded-lg text-sm focus:outline-none"
              />
              <img
                src="/icons/red-search.png"
                className="absolute right-3 top-2.5 w-5 h-5"
                alt="search"
              />
            </div>
          </div>
        </div>

        <hr className="border-[#990100] mt-6 mb-6" />

        <div className="bg-white border border-gray-500/70 rounded-lg shadow-md p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-[#990100] text-white text-sm">
                  <th className="py-4 px-6 font-medium rounded-tl-lg rounded-bl-lg">
                    Employee ID
                  </th>
                  <th className="py-4 px-6 font-medium">Name</th>
                  <th className="py-4 px-6 font-medium">Position</th>
                  <th className="py-4 px-6 font-medium">Hire Date</th>
                  <th className="py-4 px-6 font-medium">Personnel Type</th>
                  <th className="py-4 px-6 font-medium rounded-tr-lg rounded-br-lg">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-gray-500">
                      No records found
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => (
                    <tr key={r.id} className="border-b border-[#D96A6A]">
                      <td className="py-5 px-6 text-sm">{r.id}</td>
                      <td className="py-5 px-6 text-sm">{r.name}</td>
                      <td className="py-5 px-6 text-sm">{r.position}</td>
                      <td className="py-5 px-6 text-sm">{r.hireDate}</td>
                      <td className="py-5 px-6 text-sm">{r.personnelType}</td>
                      <td className="py-5 px-6">
                        <button
                          type="button"
                          onClick={() => openDetails(r)}
                          className="bg-[#B63A3A] text-white px-6 py-2 rounded-lg text-sm
                                     hover:opacity-90 hover:scale-105 transition"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end mt-6">
            <div className="flex items-center gap-3 text-[#990100]">
              <button type="button" className="px-2 py-1 hover:underline">
                {"<"}
              </button>

              <span className="border border-gray-500/70 bg-white px-3 py-1 text-black">
                1
              </span>

              <span className="text-black">to</span>
              <span className="text-black">10</span>

              <button type="button" className="px-2 py-1 hover:underline">
                {">"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <EvaluationHistoryDetailsModal
        open={openModal}
        onClose={closeDetails}
        data={selectedRow}
      />
    </div>
  );
}