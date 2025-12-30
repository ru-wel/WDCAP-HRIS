import React, { useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import Navbar from "../components/navbar";
import DropDownFilter from "../components/dropdownfilter";
import ReactPaginate from "react-paginate";

const demoEmployees = [
  { id: "AC-00001", name: "Reuel Christian Sundiam", position: "Talent Acquisition", hireDate: "10/20/25", type: "Regular", deptId: 1 },
  { id: "AC-00002", name: "Lance Paolo Cabe", position: "Accountant", hireDate: "10/20/25", type: "Regular", deptId: 2 },
  { id: "AC-00003", name: "Gabrielle Delos Santos", position: "HR Specialist", hireDate: "10/20/25", type: "Regular", deptId: 1 },
  { id: "AC-00004", name: "Carl Paldeng", position: "IT Senior", hireDate: "10/20/25", type: "Regular", deptId: 3 },
  { id: "AC-00005", name: "John Dayrit", position: "HR Assistant", hireDate: "10/20/25", type: "Regular", deptId: 1 },
];

const seedPositions = [
  { id: "POS-001", title: "HR Staff", createdAt: "10/18/25", updatedAt: "10/20/25 | 10:00 AM PHT", deptId: 1 },
  { id: "POS-002", title: "HR Staff", createdAt: "10/18/25", updatedAt: "10/20/25 | 10:00 AM PHT", deptId: 1 },
  { id: "POS-003", title: "HR Staff", createdAt: "10/18/25", updatedAt: "10/20/25 | 10:00 AM PHT", deptId: 1 },
  { id: "POS-004", title: "Accountant", createdAt: "10/18/25", updatedAt: "10/20/25 | 10:00 AM PHT", deptId: 2 },
  { id: "POS-005", title: "IT Senior", createdAt: "10/18/25", updatedAt: "10/20/25 | 10:00 AM PHT", deptId: 3 },
];

function nowStamp() {
  // simple local string; replace with backend timestamp later
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  let hours = d.getHours();
  const mins = String(d.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const hh = String(hours).padStart(2, "0");
  return `${mm}/${dd}/${yy} | ${hh}:${mins} ${ampm} PHT`;
}

export default function DepartmentEmployees() {
  const { departmentId } = useParams();
  const location = useLocation();

  const deptFromState = location.state?.department;
  const departmentName = deptFromState?.name || "Department";
  const deptIdNum = Number(departmentId);

  const [tab, setTab] = useState("employees");
  const [search, setSearch] = useState("");

  // ✅ positions state (so Add/Update/Delete reflect in UI)
  const [positionsData, setPositionsData] = useState(seedPositions);

  // -------- Modal: View Details (Edit/Delete) ----------
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [positionTitleDraft, setPositionTitleDraft] = useState("");

  // -------- Modal: Add Position ----------
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const employees = useMemo(() => {
    const byDept = demoEmployees.filter((e) => e.deptId === deptIdNum);
    if (!search.trim()) return byDept;

    const s = search.toLowerCase();
    return byDept.filter(
      (e) =>
        e.id.toLowerCase().includes(s) ||
        e.name.toLowerCase().includes(s) ||
        e.position.toLowerCase().includes(s) ||
        e.type.toLowerCase().includes(s)
    );
  }, [deptIdNum, search]);

  const positions = useMemo(() => {
    const byDept = positionsData.filter((p) => p.deptId === deptIdNum);
    if (!search.trim()) return byDept;

    const s = search.toLowerCase();
    return byDept.filter(
      (p) =>
        p.id.toLowerCase().includes(s) ||
        p.title.toLowerCase().includes(s) ||
        p.createdAt.toLowerCase().includes(s) ||
        p.updatedAt.toLowerCase().includes(s)
    );
  }, [deptIdNum, search, positionsData]);

  // Pagination (separate per tab)
  const itemsPerPage = 10;

  const [empOffset, setEmpOffset] = useState(0);
  const empEnd = empOffset + itemsPerPage;
  const currentEmployees = employees.slice(empOffset, empEnd);
  const empPageCount = Math.ceil(employees.length / itemsPerPage);

  const [posOffset, setPosOffset] = useState(0);
  const posEnd = posOffset + itemsPerPage;
  const currentPositions = positions.slice(posOffset, posEnd);
  const posPageCount = Math.ceil(positions.length / itemsPerPage);

  const handlePageClick = (event) => {
    if (tab === "employees") setEmpOffset(event.selected * itemsPerPage);
    else setPosOffset(event.selected * itemsPerPage);
  };

  const resetPaginationOnSearchOrTab = (nextTab) => {
    setEmpOffset(0);
    setPosOffset(0);
    if (nextTab) setTab(nextTab);
  };

  // ===== Add Position modal handlers =====
  const openAdd = () => {
    setNewTitle("");
    setIsAddOpen(true);
  };

  const closeAdd = () => {
    setIsAddOpen(false);
    setNewTitle("");
  };

  const onResetAdd = () => setNewTitle("");

  const onSaveAdd = () => {
    if (!newTitle.trim()) return;

    const createdAt = (() => {
      const d = new Date();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const yy = String(d.getFullYear()).slice(-2);
      return `${mm}/${dd}/${yy}`;
    })();

    const newPos = {
      id: `POS-${Date.now()}`,
      title: newTitle.trim(),
      createdAt,
      updatedAt: nowStamp(),
      deptId: deptIdNum,
    };

    setPositionsData((prev) => [newPos, ...prev]);
    closeAdd();
  };

  // ===== View Details modal handlers =====
  const onViewPosition = (pos) => {
    setSelectedPosition(pos);
    setPositionTitleDraft(pos.title);
    setIsDetailsOpen(true);
  };

  const closeDetails = () => {
    setIsDetailsOpen(false);
    setSelectedPosition(null);
    setPositionTitleDraft("");
  };

  const onUpdatePosition = () => {
    if (!selectedPosition) return;
    const nextTitle = positionTitleDraft.trim();
    if (!nextTitle) return;

    setPositionsData((prev) =>
      prev.map((p) =>
        p.id === selectedPosition.id
          ? { ...p, title: nextTitle, updatedAt: nowStamp() }
          : p
      )
    );

    closeDetails();
  };

  const onDeletePosition = () => {
    if (!selectedPosition) return;
    setPositionsData((prev) => prev.filter((p) => p.id !== selectedPosition.id));
    closeDetails();
  };

  // ===== Shared modal sizing (smaller) =====
  const modalShellClass =
    "relative w-[600px] max-w-[92vw] max-h-[350px] overflow-y-auto bg-white rounded-lg border border-gray-400 shadow-2xl";

  return (
    <div>
      <Navbar />

      <div className="p-7 lg:mx-18 md:mx-10">
        {/* HEADER */}
        <div className="md:flex justify-between items-center w-full">
          <h1 className="lg:text-3xl text-2xl text-[#990100] font-bold">
            {departmentName}
          </h1>

          <div className="flex items-center justify-end md:gap-4 gap-3 md:mt-0 mt-5">
            <DropDownFilter />

            <div className="relative text-gray-600 border border-[#990100] rounded-lg">
              <input
                type="search"
                placeholder="Search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  resetPaginationOnSearchOrTab();
                }}
                className="bg-white lg:h-10 md:h-9 h-8 px-2 lg:pr-10 md:pr-5 pr-5 md:w-auto w-35 rounded-lg text-sm focus:outline-none"
              />
              <button
                type="button"
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

        {/* TABS + Add Position */}
        <div className="mt-6 relative">
          <div className="flex items-end justify-between">
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => resetPaginationOnSearchOrTab("employees")}
                className={`px-8 py-3 font-medium rounded-t-lg transition ${
                  tab === "employees"
                    ? "bg-[#B63A3A] text-white z-20 -mb-[1px]"
                    : "bg-[#D9D9D9] text-black z-10"
                }`}
              >
                Employees
              </button>

              <button
                type="button"
                onClick={() => resetPaginationOnSearchOrTab("positions")}
                className={`px-8 py-3 font-medium rounded-t-lg transition ${
                  tab === "positions"
                    ? "bg-[#B63A3A] text-white z-20 -mb-[1px]"
                    : "bg-[#D9D9D9] text-black z-10"
                }`}
              >
                Positions
              </button>
            </div>

            {tab === "positions" && (
              <button
                type="button"
                onClick={openAdd}
                className="cursor-pointer bg-[#B63A3A] text-white px-6 py-3 rounded-lg
                           shadow-md hover:opacity-90 hover:scale-105
                           transition duration-300 ease-in-out"
              >
                Add Position
              </button>
            )}
          </div>

          {/* CONTENT CARD */}
          <div className="relative z-10 border border-gray-300 rounded-b-lg rounded-tr-lg p-6 shadow-lg bg-white">
            {tab === "employees" ? (
              <>
                <div className="div-table">
                  <table className="table-style">
                    <thead className="thead-style">
                      <tr>
                        <th className="th-style rounded-tl-lg rounded-bl-lg">Employee ID</th>
                        <th className="th-style">Name</th>
                        <th className="th-style">Position</th>
                        <th className="th-style">Hire Date</th>
                        <th className="th-style rounded-tr-lg rounded-br-lg">Personnel Type</th>
                      </tr>
                    </thead>

                    <tbody className="tbody-style">
                      {currentEmployees.map((row) => (
                        <tr key={row.id} className="tr-style">
                          <td className="td-style font-medium">{row.id}</td>
                          <td className="td-style">{row.name}</td>
                          <td className="td-style">{row.position}</td>
                          <td className="td-style">{row.hireDate}</td>
                          <td className="td-style">{row.type}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end mt-6 text-[#990100]">
                  <ReactPaginate
                    previousLabel="<"
                    nextLabel=">"
                    pageCount={empPageCount}
                    onPageChange={handlePageClick}
                    containerClassName="flex gap-3"
                    activeClassName="underline font-bold"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="div-table">
                  <table className="table-style">
                    <thead className="thead-style">
                      <tr>
                        <th className="th-style rounded-tl-lg rounded-bl-lg">Position Title</th>
                        <th className="th-style">Created At</th>
                        <th className="th-style">Last Updated At</th>
                        <th className="th-style rounded-tr-lg rounded-br-lg">Actions</th>
                      </tr>
                    </thead>

                    <tbody className="tbody-style">
                      {currentPositions.map((p) => (
                        <tr key={p.id} className="tr-style">
                          <td className="td-style font-medium">{p.title}</td>
                          <td className="td-style">{p.createdAt}</td>
                          <td className="td-style">{p.updatedAt}</td>
                          <td className="td-style">
                            <button
                              type="button"
                              onClick={() => onViewPosition(p)}
                              className="cursor-pointer bg-[#B63A3A] text-white px-6 py-2 rounded-lg
                                         hover:opacity-90 hover:scale-105
                                         transition duration-300 ease-in-out"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end mt-6 text-[#990100]">
                  <ReactPaginate
                    previousLabel="<"
                    nextLabel=">"
                    pageCount={posPageCount}
                    onPageChange={handlePageClick}
                    containerClassName="flex gap-3"
                    activeClassName="underline font-bold"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* =========================
          ADD POSITION MODAL (copied design)
         ========================= */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={closeAdd}>
          <div className="absolute inset-0 bg-black/25" />

          <div className={modalShellClass} onClick={(e) => e.stopPropagation()}>
            <div className="p-5">
              {/* inset red header */}
              <div className="bg-[#990100] rounded-lg px-10 py-6 flex items-center justify-between shadow-md">
                <h2 className="text-white text-2xl font-bold">Add New Position</h2>
                <button
                  type="button"
                  onClick={closeAdd}
                  aria-label="Close"
                  className="text-white text-4xl font-bold leading-none cursor-pointer hover:opacity-80"
                >
                  ×
                </button>
              </div>

              {/* body */}
              <div className="py-10">
                <div className="flex items-center justify-center gap-5">
                  <span className="font-bold text-lg">Position Title:</span>

                  <input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Position"
                    className="w-[280px] px-4 py-2 rounded-md border border-gray-500 focus:outline-none shadow-sm"
                  />
                </div>

                <div className="flex justify-center gap-10 mt-12">
                  <button
                    type="button"
                    onClick={onResetAdd}
                    className="bg-[#B63A3A] text-white px-10 py-3 rounded-lg cursor-pointer
                               shadow-md hover:opacity-90 hover:scale-105
                               transition duration-300 ease-in-out"
                  >
                    Reset
                  </button>

                  <button
                    type="button"
                    onClick={onSaveAdd}
                    className="bg-[#990100] text-white px-10 py-3 rounded-lg cursor-pointer
                               shadow-md hover:opacity-90 hover:scale-105
                               transition duration-300 ease-in-out"
                    disabled={!newTitle.trim()}
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================
          VIEW DETAILS MODAL (copied design)
         ========================= */}
      {isDetailsOpen && selectedPosition && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={closeDetails}>
          <div className="absolute inset-0 bg-black/25" />

          <div className={modalShellClass} onClick={(e) => e.stopPropagation()}>
            <div className="p-5">
              {/* inset red header */}
              <div className="bg-[#990100] rounded-lg px-10 py-6 flex items-center justify-between shadow-md">
                <h2 className="text-white text-2xl font-bold">
                  Details of {selectedPosition.title}
                </h2>

                <button
                  type="button"
                  onClick={closeDetails}
                  aria-label="Close"
                  className="text-white text-4xl font-bold leading-none cursor-pointer hover:opacity-80"
                >
                  ×
                </button>
              </div>

              {/* body */}
              <div className="py-10">
                <div className="flex items-center justify-center gap-5">
                  <span className="font-bold text-lg">Position Title:</span>

                  <div className="flex flex-col">
                    <input
                      value={positionTitleDraft}
                      onChange={(e) => setPositionTitleDraft(e.target.value)}
                      className="w-[280px] px-4 py-2 rounded-md border border-gray-500 focus:outline-none shadow-sm"
                    />
                    <span className="text-sm text-gray-500 mt-2 font-medium">
                      Last Updated: {selectedPosition.updatedAt}
                    </span>
                  </div>
                </div>

                <div className="flex justify-center gap-8 mt-10">
                  <button
                    type="button"
                    onClick={onUpdatePosition}
                    className="bg-green-700 text-white px-8 py-3 rounded-lg cursor-pointer
                               shadow-md hover:bg-green-600 hover:scale-105
                               transition duration-300 ease-in-out"
                    disabled={!positionTitleDraft.trim()}
                  >
                    Update Position
                  </button>

                  <button
                    type="button"
                    onClick={onDeletePosition}
                    className="bg-red-700 text-white px-8 py-3 rounded-lg cursor-pointer
                               shadow-md hover:bg-red-600 hover:scale-105
                               transition duration-300 ease-in-out"
                  >
                    Delete Position
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}