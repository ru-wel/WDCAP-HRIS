import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import Navbar from "../components/navbar";
import DropDownFilter from "../components/dropdownfilter";
import ReactPaginate from "react-paginate";
import { del, get, post, put } from "../../services/api.js";

export default function DepartmentEmployees() {
  const { departmentId } = useParams();
  const location = useLocation();
  const deptFromState = location.state?.department;
  const [departmentName, setDepartmentName] = useState(deptFromState?.name || "Department");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [allEmployees, setAllEmployees] = useState([]);
  const [allPositions, setAllPositions] = useState([]);
  const [tab, setTab] = useState("employees");
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [addPositionTitleDraft, setAddPositionTitleDraft] = useState("");
  const [positionTitleDraft, setPositionTitleDraft] = useState("");
  const [isEditingPosition, setIsEditingPosition] = useState(false);
  const [positionSaving, setPositionSaving] = useState(false);
  const [positionError, setPositionError] = useState("");
  const formatShortDate = (value) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
  };

  const formatUpdated = (value) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    const date = d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
    const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    return `${date} | ${time}`;
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");

      const [deptRes, empRes, posRes] = await Promise.all([
        get(`/departments/${departmentId}`),
        get('/employees'),
        get('/positions'),
      ]);

      if (deptRes?.success) {
        setDepartmentName(deptRes.data?.department_name || departmentName);
      }

      setAllEmployees(empRes?.success ? (empRes.data || []) : []);
      setAllPositions(posRes?.success ? (posRes.data || []) : []);
    } catch (e) {
      console.error('Failed to fetch department data:', e);
      setError(e.message || 'Failed to load department data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (departmentId) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departmentId]);

  const employees = useMemo(() => {
    const byDept = allEmployees
      .filter((e) => (e?.departments?.id || e?.department_id) === departmentId)
      .map((e) => ({
        id: e.employee_id,
        name: `${e.first_name} ${e.last_name}`,
        position: e.positions?.position_title || 'N/A',
        hireDate: formatShortDate(e.hire_date),
        type: e.personnel_type,
      }));
    if (!search.trim()) return byDept;
    const s = search.toLowerCase();
    return byDept.filter(
      (e) =>
        e.id.toLowerCase().includes(s) ||
        e.name.toLowerCase().includes(s) ||
        e.position.toLowerCase().includes(s) ||
        e.type.toLowerCase().includes(s)
    );
  }, [allEmployees, departmentId, search]);

  const positions = useMemo(() => {
    const byDept = allPositions
      .filter((p) => (p?.departments?.id || p?.department_id) === departmentId)
      .map((p) => ({
        id: p.id,
        title: p.position_title,
        createdAt: formatShortDate(p.created_at),
        updatedAt: formatUpdated(p.updated_at),
      }));
    if (!search.trim()) return byDept;

    const s = search.toLowerCase();
    return byDept.filter(
      (p) =>
        p.id.toLowerCase().includes(s) ||
        p.title.toLowerCase().includes(s) ||
        p.createdAt.toLowerCase().includes(s) ||
        p.updatedAt.toLowerCase().includes(s)
    );
  }, [allPositions, departmentId, search]);
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
  const onAddPosition = () => {
    setPositionError("");
    setAddPositionTitleDraft("");
    setIsAddOpen(true);
  };

  const closeAdd = ({ force = false } = {}) => {
    if (positionSaving && !force) return;
    setIsAddOpen(false);
    setAddPositionTitleDraft("");
    setPositionError("");
  };

  const onCreatePosition = async () => {
    const title = addPositionTitleDraft.trim();
    if (!title) {
      setPositionError("Position title is required");
      return;
    }

    try {
      setPositionSaving(true);
      setPositionError("");

      const res = await post('/positions', {
        position_title: title,
        department_id: departmentId,
      });

      if (!res?.success) {
        throw new Error(res?.message || 'Failed to create position');
      }

      closeAdd({ force: true });
      await fetchData();
    } catch (e) {
      console.error('Failed to create position:', e);
      setPositionError(e?.message || 'Failed to create position');
    } finally {
      setPositionSaving(false);
    }
  };

  const onViewPosition = (pos) => {
    setSelectedPosition(pos);
    setPositionTitleDraft(pos.title);
    setIsEditingPosition(false);
    setPositionError("");
    setIsDetailsOpen(true);
  };

  const closeDetails = ({ force = false } = {}) => {
    if (positionSaving && !force) return;
    setIsDetailsOpen(false);
    setSelectedPosition(null);
    setPositionTitleDraft("");
    setIsEditingPosition(false);
    setPositionError("");
  };

  const onUpdatePosition = async () => {
    if (!selectedPosition?.id) return;
    const title = positionTitleDraft.trim();
    if (!title) {
      setPositionError('Position title is required');
      return;
    }

    try {
      setPositionSaving(true);
      setPositionError("");

      const res = await put(`/positions/${selectedPosition.id}`, {
        position_title: title,
      });

      if (!res?.success) {
        throw new Error(res?.message || 'Failed to update position');
      }

      closeDetails({ force: true });
      await fetchData();
    } catch (e) {
      console.error('Failed to update position:', e);
      setPositionError(e?.message || 'Failed to update position');
    } finally {
      setPositionSaving(false);
    }
  };

  const onDeletePosition = async () => {
    if (!selectedPosition?.id) return;
    const ok = window.confirm(`Delete position "${selectedPosition.title}"?`);
    if (!ok) return;

    try {
      setPositionSaving(true);
      setPositionError("");

      const res = await del(`/positions/${selectedPosition.id}`);
      if (!res?.success) {
        throw new Error(res?.message || 'Failed to delete position');
      }

      closeDetails({ force: true });
      await fetchData();
    } catch (e) {
      console.error('Failed to delete position:', e);
      setPositionError(e?.message || 'Failed to delete position');
    } finally {
      setPositionSaving(false);
    }
  };

  return (
    <div>
      <Navbar />

      <div className="p-7 lg:mx-18 md:mx-10">
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

        {loading && (
          <div className="flex items-center justify-center py-20">
            <p className="text-gray-600">Loading...</p>
          </div>
        )}

        {error && !loading && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p>{error}</p>
            <button onClick={fetchData} className="mt-2 bg-red-600 text-white px-4 py-2 rounded text-sm">Retry</button>
          </div>
        )}

        {!loading && !error && (
          <>

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
                onClick={onAddPosition}
                className="cursor-pointer bg-[#B63A3A] text-white px-6 py-3 rounded-lg
                           shadow-md hover:opacity-90 hover:scale-105
                           transition duration-300 ease-in-out"
              >
                Add Position
              </button>
            )}
          </div>

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
                              className="cursor-pointer bg-[#990100] text-white px-6 py-2 rounded-lg
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

          </>
        )}
      </div>

      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={closeAdd}>
          <div className="absolute inset-0 bg-black/25" />

          <div
            className="relative w-[600px] max-w-[92vw] max-h-[50vh] overflow-y-auto bg-white rounded-lg border border-gray-400 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5">
              <div className="bg-[#990100] rounded-lg px-8 py-5 flex items-center justify-between shadow-md">
                <h2 className="text-white text-2xl font-bold">Add Position</h2>

                <button
                  type="button"
                  onClick={closeAdd}
                  aria-label="Close"
                  className="text-white text-4xl font-bold leading-none cursor-pointer hover:opacity-80"
                  disabled={positionSaving}
                >
                  ×
                </button>
              </div>

              <div className="py-10">
                <div className="flex items-center justify-center gap-5">
                  <span className="font-bold text-lg">Position Title:</span>

                  <div className="flex flex-col">
                    <input
                      value={addPositionTitleDraft}
                      onChange={(e) => setAddPositionTitleDraft(e.target.value)}
                      className="w-[280px] px-4 py-2 rounded-md border border-gray-500 focus:outline-none shadow-sm"
                      disabled={positionSaving}
                    />
                    {positionError && (
                      <span className="text-sm text-red-600 mt-2 font-medium">{positionError}</span>
                    )}
                  </div>
                </div>

                <div className="flex justify-center gap-8 mt-10">
                  <button
                    type="button"
                    onClick={onCreatePosition}
                    disabled={positionSaving}
                    className="bg-green-700 text-white px-8 py-3 rounded-lg cursor-pointer
                               shadow-md hover:bg-green-600 hover:scale-105
                               transition duration-300 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {positionSaving ? 'Saving...' : 'Save Position'}
                  </button>

                  <button
                    type="button"
                    onClick={closeAdd}
                    disabled={positionSaving}
                    className="bg-gray-600 text-white px-8 py-3 rounded-lg cursor-pointer
                               shadow-md hover:bg-gray-500 hover:scale-105
                               transition duration-300 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isDetailsOpen && selectedPosition && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={closeDetails}>
          <div className="absolute inset-0 bg-black/25" />

          <div
            className="relative w-[600px] max-w-[92vw] max-h-[50vh] overflow-y-auto bg-white rounded-lg border border-gray-400 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5">
              <div className="bg-[#990100] rounded-lg px-8 py-5 flex items-center justify-between shadow-md">
                <h2 className="text-white text-2xl font-bold">Details of {selectedPosition.title}</h2>

                <button
                  type="button"
                  onClick={closeDetails}
                  aria-label="Close"
                  className="text-white text-4xl font-bold leading-none cursor-pointer hover:opacity-80"
                >
                  ×
                </button>
              </div>

              <div className="py-10">
                <div className="flex items-center justify-center gap-5">
                  <span className="font-bold text-lg">Position Title:</span>

                  <div className="flex flex-col">
                    <input
                      value={positionTitleDraft}
                      onChange={(e) => setPositionTitleDraft(e.target.value)}
                      className="w-[280px] px-4 py-2 rounded-md border border-gray-500 focus:outline-none shadow-sm"
                      readOnly={!isEditingPosition || positionSaving}
                      disabled={positionSaving}
                    />
                    <span className="text-sm text-gray-500 mt-2 font-medium">
                      Last Updated: {selectedPosition.updatedAt}
                    </span>
                    {positionError && (
                      <span className="text-sm text-red-600 mt-2 font-medium">{positionError}</span>
                    )}
                  </div>
                </div>

                <div className="flex justify-center gap-8 mt-10">
                  <button
                    type="button"
                    onClick={() => {
                      if (!isEditingPosition) {
                        setIsEditingPosition(true);
                        setPositionError('');
                        return;
                      }
                      onUpdatePosition();
                    }}
                    disabled={positionSaving}
                    className="bg-green-700 text-white px-8 py-3 rounded-lg cursor-pointer
                               shadow-md hover:bg-green-600 hover:scale-105
                               transition duration-300 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {positionSaving ? 'Saving...' : (isEditingPosition ? 'Save Changes' : 'Update Position')}
                  </button>

                  <button
                    type="button"
                    onClick={onDeletePosition}
                    disabled={positionSaving}
                    className="bg-red-700 text-white px-8 py-3 rounded-lg cursor-pointer
                               shadow-md hover:bg-red-600 hover:scale-105
                               transition duration-300 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {positionSaving ? 'Working...' : 'Delete Position'}
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