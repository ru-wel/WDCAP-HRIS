import React, { useState } from "react";
import Navbar from "./components/navbar";
import DropDownFilter from "./components/dropdownfilter";

function EvaluationScheduleModal({ open, onClose, data }) {
  if (!open || !data) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/20">
      <div className="bg-white rounded-lg shadow-2xl border border-gray-400 w-[760px] max-w-[92vw] max-h-[92vh] overflow-y-auto">
        <div className="p-6">
          <div className="bg-[#990100] rounded-lg px-8 py-4 flex items-center justify-between">
            <h2 className="text-white font-semibold text-xl">
              Evaluation for {data.empId}
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

          <div className="pt-7 px-6">
            <div className="grid grid-cols-[190px_1fr] gap-y-4 text-[16px]">
              <p className="font-bold">Employee Name:</p>
              <p>{data.name}</p>

              <p className="font-bold">Position:</p>
              <p>{data.position}</p>

              <p className="font-bold">Personnel Type:</p>
              <p>{data.personnelType}</p>

              <p className="font-bold">Evaluation Type:</p>
              <p>{data.evalType}</p>

              <p className="font-bold">Deadline:</p>
              <p>{data.deadline}</p>

              <p className="font-bold pt-2">Schedule of Eval:</p>
              <div className="relative w-[210px]">
                <input
                  type="text"
                  defaultValue={data.schedule}
                  className="w-full border border-gray-400 rounded-md px-4 py-2 pr-10 text-sm bg-white shadow-sm focus:outline-none"
                  readOnly
                />
                <img
                  src="icons/red-leave.png"
                  alt="calendar"
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5"
                />
              </div>
            </div>

            <div className="mt-10">
              <p className="font-bold text-[16px] mb-3">Breakdown of Evaluation:</p>

              <div className="border border-gray-400 rounded-lg p-6 w-[420px] max-w-full mx-auto text-center">
                <p className="font-bold text-[18px]">Upload Files</p>
                <p className="text-sm text-gray-700 mt-2">
                  Files Supported: PDF, PNG, IMG
                </p>

                <button
                  type="button"
                  className="mt-4 bg-[#B63A3A] text-white px-8 py-2 rounded-lg shadow-md
                             hover:opacity-90 hover:scale-105 transition"
                >
                  Choose File
                </button>
              </div>
            </div>

            <div className="mt-10">
              <p className="font-bold text-[16px] mb-3">Last Page of Evaluation:</p>

              <div className="border border-gray-400 rounded-lg p-6 w-[420px] max-w-full mx-auto text-center">
                <p className="font-bold text-[18px]">Upload Files</p>
                <p className="text-sm text-gray-700 mt-2">
                  Files Supported: PDF, PNG, IMG
                </p>

                <button
                  type="button"
                  className="mt-4 bg-[#B63A3A] text-white px-8 py-2 rounded-lg shadow-md
                             hover:opacity-90 hover:scale-105 transition"
                >
                  Choose File
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between mt-12">
              <p className="text-[13px]">
                <span className="font-bold">Last Updated:</span> {data.lastUpdated}
              </p>

              <div className="flex items-center gap-4">
                <button
                  type="button"
                  className="bg-[#198C19] text-white px-7 py-2 rounded-md shadow-md
                             hover:bg-[#46a346] hover:scale-105 transition duration-300 ease-in-out"
                >
                  Update Schedule
                </button>

                <button
                  type="button"
                  className="bg-[#C60000] text-white px-7 py-2 rounded-md shadow-md
                             hover:bg-[#d13232] hover:scale-105 transition duration-300 ease-in-out"
                >
                  Delete Schedule
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

export default function Evaluation() {
  const cards = [
    {
      empId: "AC-00001",
      name: "Reuel Christian Sundiam",
      position: "Web Developer",
      personnelType: "Probationary",
      evalType: "6 months",
      deadline: "December 10, 2025",
      schedule: "11/06/25",
      lastUpdated: "10/30/25 | 10:00 AM PHT",
      subtitle: "Web Developer | Probationary | AC-00001",
      cardDeadline: "December 10, 2025",
      cardSchedule: "PENDING",
    },
    {
      empId: "AC-00002",
      name: "Lance Paolo Cabe",
      position: "Web Developer",
      personnelType: "Regular",
      evalType: "6 months",
      deadline: "December 10, 2025",
      schedule: "PENDING",
      lastUpdated: "10/30/25 | 10:00 AM PHT",
      subtitle: "Web Developer | Regular | AC-00002",
      cardDeadline: "December 10, 2025",
      cardSchedule: "PENDING",
    },
    {
      empId: "AC-00003",
      name: "Carl Lester Paldeng",
      position: "Web Developer",
      personnelType: "Probationary",
      evalType: "6 months",
      deadline: "December 10, 2025",
      schedule: "11/10/25",
      lastUpdated: "10/30/25 | 10:00 AM PHT",
      subtitle: "Web Developer | Probationary | AC-00003",
      cardDeadline: "December 10, 2025",
      cardSchedule: "November 10, 2025",
    },
  ];

  const [openModal, setOpenModal] = useState(false);
  const [selected, setSelected] = useState(null);

  const openSchedule = (row) => {
    setSelected(row);
    setOpenModal(true);
  };

  const closeSchedule = () => {
    setOpenModal(false);
    setSelected(null);
  };

  return (
    <div>
      <Navbar />

      <div className="p-7 lg:mx-18 md:mx-10">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-[#990100]">Evaluation</h1>

          <div className="flex items-center gap-3">
            <DropDownFilter />

            <div className="relative border border-[#990100] rounded-lg">
              <input
                type="search"
                placeholder="Search"
                className="bg-white h-10 px-3 pr-10 rounded-lg text-sm focus:outline-none"
              />
              <img
                src="/icons/red-search.png"
                alt="search"
                className="absolute right-3 top-2.5 w-5 h-5"
              />
            </div>
          </div>
        </div>

        <hr className="border-[#990100] mt-6 mb-8" />

        <h2 className="text-2xl font-bold text-[#990100] mb-6">
          Pending Evaluations
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((c) => (
            <div
              key={c.empId}
              className="bg-[#EDEDED] rounded-xl shadow-lg p-6 flex flex-col justify-between min-h-[230px]"
            >
              <div>
                <h3 className="text-xl font-bold text-[#990100]">{c.name}</h3>
                <p className="text-sm text-gray-700 mt-1">{c.subtitle}</p>

                <p className="text-sm mt-4">
                  <b>Deadline:</b> {c.cardDeadline}
                </p>
                <p className="text-sm mt-1">
                  <b>Schedule of Eval:</b> {c.cardSchedule}
                </p>
              </div>

              <button
                onClick={() => openSchedule(c)}
                className="mt-5 bg-[#C60000] text-white px-5 py-2 rounded-lg text-sm w-fit
                           hover:bg-[#D13232] hover:scale-105 transition"
              >
                Update Schedule
              </button>
            </div>
          ))}
        </div>
      </div>

      <EvaluationScheduleModal open={openModal} onClose={closeSchedule} data={selected} />
    </div>
  );
}
