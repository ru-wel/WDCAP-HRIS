import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Navbar from "../../components/navbar";
import ReactPaginate from "react-paginate";
import { del, get, post, put } from "../../services/api.js";
import ConfirmModal from "../../components/confirm-modal.jsx";
import { compareDate, compareText } from "../../utils/sort.js";

export default function DepartmentEmployees() {
  const { departmentId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const deptFromState = location.state?.department;

  const [departmentName, setDepartmentName] = useState(
    deptFromState?.name || "Department"
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [allEmployees, setAllEmployees] = useState([]);
  const [allPositions, setAllPositions] = useState([]);

  const [tab, setTab] = useState("employees");
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState("name_az");

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState(null);

  const [addPositionTitleDraft, setAddPositionTitleDraft] = useState("");
  const [positionTitleDraft, setPositionTitleDraft] = useState("");
  const [isEditingPosition, setIsEditingPosition] = useState(false);

  const [positionSaving, setPositionSaving] = useState(false);
  const [positionError, setPositionError] = useState("");

  const [originalPositionTitle, setOriginalPositionTitle] = useState("");

  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmState, setConfirmState] = useState({
    open: false,
    title: "Confirmation",
    message: "",
    confirmText: "OK",
    cancelText: "Cancel",
    onConfirm: null,
  });

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftSortOrder, setDraftSortOrder] = useState(sortOrder);

  const [deptSaving, setDeptSaving] = useState(false);
  const [isEditingDeptName, setIsEditingDeptName] = useState(false);
  const [deptNameDraft, setDeptNameDraft] = useState("");

  const defaultSort = useMemo(
    () => (tab === "positions" ? "position_title_az" : "name_az"),
    [tab]
  );

  const activeFiltersCount = useMemo(() => {
    let n = 0;
    if (sortOrder !== defaultSort) n += 1;
    return n;
  }, [sortOrder, defaultSort]);

  useEffect(() => {
    if (!filtersOpen) return;
    setDraftSortOrder(sortOrder);
  }, [filtersOpen, sortOrder]);

  /*useEffect(() => {
    if (!filtersOpen) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") setFiltersOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [filtersOpen]);*/

  const sortOptions = useMemo(() => {
    if (tab === "positions") {
      return [
        { value: "position_id_asc", label: "Position ID: Ascending" },
        { value: "position_id_desc", label: "Position ID: Descending" },
        { value: "position_title_az", label: "Position Title: A - Z" },
        { value: "position_title_za", label: "Position Title: Z - A" },
      ];
    }

    return [
      { value: "employee_id_asc", label: "Employee ID: Ascending" },
      { value: "employee_id_desc", label: "Employee ID: Descending" },
      { value: "name_az", label: "Name: A - Z" },
      { value: "name_za", label: "Name: Z - A" },
      { value: "position_az", label: "Position: A - Z" },
      { value: "position_za", label: "Position: Z - A" },
      { value: "hire_date_newest", label: "Hire Date: Newest" },
      { value: "hire_date_oldest", label: "Hire Date: Oldest" },
      { value: "personnel_type_az", label: "Personnel Type: A - Z" },
      { value: "personnel_type_za", label: "Personnel Type: Z - A" },
    ];
  }, [tab]);

  const clearFilters = () => {
    const nextDefault = tab === "positions" ? "position_title_az" : "name_az";
    setDraftSortOrder(nextDefault);
  };

  const applyDraftFilters = () => {
    setSortOrder(draftSortOrder);
    setFiltersOpen(false);
  };

  const ChipButton = ({ active, onClick, children }) => (
    <button
      type="button"
      onClick={onClick}
      className={[
        "px-3 py-1.5 rounded-full text-xs font-semibold border transition",
        active
          ? "bg-[#990100] text-white border-[#990100]"
          : "bg-white text-[#990100] border-[#990100] hover:bg-[#990100]/10",
      ].join(" ")}
    >
      {children}
    </button>
  );

  const openConfirm = ({ title, message, confirmText, cancelText, onConfirm }) => {
    setConfirmState({
      open: true,
      title: title || "Confirmation",
      message: message || "",
      confirmText: confirmText || "OK",
      cancelText: cancelText ?? "Cancel",
      onConfirm: onConfirm || null,
    });
  };

  const closeConfirm = () => {
    setConfirmState((prev) => ({ ...prev, open: false, onConfirm: null }));
  };

  const handleConfirm = async () => {
    const fn = confirmState.onConfirm;
    if (!fn) {
      closeConfirm();
      return;
    }

    const snapshot = {
      title: confirmState.title,
      message: confirmState.message,
      confirmText: confirmState.confirmText,
      cancelText: confirmState.cancelText,
      onConfirm: confirmState.onConfirm,
    };

    try {
      setConfirmBusy(true);
      await fn?.();

      setConfirmState((prev) => {
        const isSameDialog =
          prev.open &&
          prev.onConfirm === snapshot.onConfirm &&
          prev.title === snapshot.title &&
          prev.message === snapshot.message &&
          prev.confirmText === snapshot.confirmText &&
          prev.cancelText === snapshot.cancelText;

        if (!isSameDialog) return prev;

        const wasConfirmation = snapshot.cancelText != null && snapshot.cancelText !== "";
        if (!wasConfirmation) {
          return { ...prev, open: false, onConfirm: null };
        }

        return {
          open: true,
          title: "Success",
          message: "Action completed successfully.",
          confirmText: "OK",
          cancelText: null,
          onConfirm: null,
        };
      });
    } catch (e) {
      setConfirmState({
        open: true,
        title: "Error",
        message: e?.message || "Action failed.",
        confirmText: "OK",
        cancelText: null,
        onConfirm: null,
      });
    } finally {
      setConfirmBusy(false);
    }
  };

  const formatShortDate = (value) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "2-digit",
    });
  };

  const formatUpdated = (value) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    const date = d.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "2-digit",
    });
    const time = d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${date} | ${time}`;
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");

      const [deptRes, empRes, posRes] = await Promise.all([
        get(`/departments/${departmentId}`),
        get("/employees"),
        get("/positions"),
      ]);

      if (deptRes?.success) {
        setDepartmentName(deptRes.data?.department_name || departmentName);
      }

      setAllEmployees(empRes?.success ? empRes.data || [] : []);
      setAllPositions(posRes?.success ? posRes.data || [] : []);
    } catch (e) {
      console.error("Failed to fetch department data:", e);
      setError(e.message || "Failed to load department data");
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
        position: e.positions?.position_title || "N/A",
        hireDate: formatShortDate(e.hire_date),
        hireDateRaw: e.hire_date || "",
        type: e.personnel_type,
      }));

    const s = search.trim().toLowerCase();
    const filtered = !s
      ? byDept
      : byDept.filter(
          (e) =>
            e.id.toLowerCase().includes(s) ||
            e.name.toLowerCase().includes(s) ||
            e.position.toLowerCase().includes(s) ||
            e.type.toLowerCase().includes(s)
        );

    const sorted = [...filtered].sort((a, b) => {
      switch (sortOrder) {
        case "employee_id_asc":
          return compareText(a?.id, b?.id);
        case "employee_id_desc":
          return compareText(b?.id, a?.id);
        case "name_az":
          return compareText(a?.name, b?.name);
        case "name_za":
          return compareText(b?.name, a?.name);
        case "position_az":
          return compareText(a?.position, b?.position);
        case "position_za":
          return compareText(b?.position, a?.position);
        case "hire_date_newest":
          return compareDate(b?.hireDateRaw, a?.hireDateRaw);
        case "hire_date_oldest":
          return compareDate(a?.hireDateRaw, b?.hireDateRaw);
        case "personnel_type_az":
          return compareText(a?.type, b?.type);
        case "personnel_type_za":
          return compareText(b?.type, a?.type);
        default:
          return compareText(a?.name, b?.name);
      }
    });

    return sorted;
  }, [allEmployees, departmentId, search, sortOrder]);

  const positions = useMemo(() => {
    const byDept = allPositions
      .filter((p) => (p?.departments?.id || p?.department_id) === departmentId)
      .map((p) => ({
        id: p.id,
        title: p.position_title,
        createdAtRaw: p.created_at || "",
        createdAt: formatShortDate(p.created_at),
        updatedAtRaw: p.updated_at || "",
        updatedAt: formatUpdated(p.updated_at),
      }));

    const s = search.trim().toLowerCase();
    const filtered = !s
      ? byDept
      : byDept.filter(
          (p) =>
            p.id.toLowerCase().includes(s) ||
            p.title.toLowerCase().includes(s)
        );

    const sorted = [...filtered].sort((a, b) => {
      switch (sortOrder) {
        case "position_id_asc":
          return compareText(a?.id, b?.id);
        case "position_id_desc":
          return compareText(b?.id, a?.id);
        case "position_title_az":
          return compareText(a?.title, b?.title);
        case "position_title_za":
          return compareText(b?.title, a?.title);
        case "created_at_newest":
          return compareDate(b?.createdAtRaw, a?.createdAtRaw);
        case "created_at_oldest":
          return compareDate(a?.createdAtRaw, b?.createdAtRaw);
        case "updated_at_newest":
          return compareDate(b?.updatedAtRaw, a?.updatedAtRaw);
        case "updated_at_oldest":
          return compareDate(a?.updatedAtRaw, b?.updatedAtRaw);
        default:
          return compareText(a?.title, b?.title);
      }
    });

    return sorted;
  }, [allPositions, departmentId, search, sortOrder]);

  const itemsPerPage = 10;

  const [empOffset, setEmpOffset] = useState(0);
  const empEnd = empOffset + itemsPerPage;
  const currentEmployees = employees.slice(empOffset, empEnd);
  const empPageCount = Math.ceil(employees.length / itemsPerPage);
  const empMultiPages = empPageCount > 1;
  const empCurrentPage = empPageCount ? Math.floor(empOffset / itemsPerPage) + 1 : 0;

  const [posOffset, setPosOffset] = useState(0);
  const posEnd = posOffset + itemsPerPage;
  const currentPositions = positions.slice(posOffset, posEnd);
  const posPageCount = Math.ceil(positions.length / itemsPerPage);
  const posMultiPages = posPageCount > 1;
  const posCurrentPage = posPageCount ? Math.floor(posOffset / itemsPerPage) + 1 : 0;

  const handlePageClick = (event) => {
    if (tab === "employees") setEmpOffset(event.selected * itemsPerPage);
    else setPosOffset(event.selected * itemsPerPage);
  };

  const resetPaginationOnSearchOrTab = (nextTab) => {

    if (unsavedChangesPosition) {
      confirmUnsavedChanges(() => {
        setIsEditingPosition(false);
        setPositionTitleDraft(originalPositionTitle);
      });
      return;
    }

    setEmpOffset(0);
    setPosOffset(0);
    if (nextTab) {
      setTab(nextTab);
      const nextDefault = nextTab === "positions" ? "position_title_az" : "name_az";
      setSortOrder(nextDefault);
      setFiltersOpen(false);
    }
  };

  const onAddPosition = () => {
    setPositionError("");
    setAddPositionTitleDraft("");
    setIsAddOpen(true);
  };

  const closeAdd = ({ force = false } = {}) => {
    if (positionSaving && !force) return;

    if (!force && unsavedChangesAddPosition) {
      confirmUnsavedChanges(() => {
        closeAdd({ force: true });
      });
      return;
    }

    setIsAddOpen(false);
    setAddPositionTitleDraft("");
    setPositionError("");
  };

const onCreatePosition = async () => {
  const title = (addPositionTitleDraft || "").trim();
  if (!title) {
    setPositionError("Position title is required");
    return;
  }

  if (!departmentId) {
    setPositionError("Department is required");
    return;
  }

  try {
    setPositionSaving(true);
    setPositionError("");

    const res = await post("/positions", {
      position_title: title,
      department_id: departmentId,
    });

    if (!res?.success) {
      throw new Error(res?.message || "Failed to create position");
    }

    closeAdd({ force: true });
    await fetchData();
  } catch (e) {
    console.error("Failed to create position:", e);
    setPositionError(e?.message || "Failed to create position");
  } finally {
    setPositionSaving(false);
  }
};

  const onViewPosition = (pos) => {
    setSelectedPosition(pos);
    setPositionTitleDraft(pos.title);
    setOriginalPositionTitle(pos.title);
    setIsEditingPosition(false);
    setPositionError("");
    setIsDetailsOpen(true);
  };

  const closeDetails = ({ force = false } = {}) => {
    if (positionSaving && !force) return;

    if (!force && unsavedChangesPosition) {
      confirmUnsavedChanges(() => {
        closeDetails({ force: true });
      });
      return;
    }

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
      setPositionError("Position title is required");
      return;
    }

    try {
      setPositionSaving(true);
      setPositionError("");

      const res = await put(`/positions/${selectedPosition.id}`, {
        position_title: title,
      });

      if (!res?.success) {
        throw new Error(res?.message || "Failed to update position");
      }

      closeDetails({ force: true });
      await fetchData();
    } catch (e) {
      console.error("Failed to update position:", e);
      setPositionError(e?.message || "Failed to update position");
    } finally {
      setPositionSaving(false);
    }
  };

  const onDeletePosition = async () => {
    if (!selectedPosition?.id) return;
    openConfirm({
      title: "Delete position",
      message: `Delete position "${selectedPosition.title}"?`,
      confirmText: "OK",
      cancelText: "Cancel",
      onConfirm: async () => {
        try {
          setPositionSaving(true);
          setPositionError("");

          const res = await del(`/positions/${selectedPosition.id}`);
          if (!res?.success) {
            throw new Error(res?.message || "Failed to delete position");
          }

          closeDetails({ force: true });
          await fetchData();
        } catch (e) {
          console.error("Failed to delete position:", e);
          setPositionError(e?.message || "Failed to delete position");
        } finally {
          setPositionSaving(false);
        }
      },
    });
  };

  //FOR UNSAVED CHANGES
  const unsavedChangesPosition = isDetailsOpen && isEditingPosition && positionTitleDraft !== originalPositionTitle;
  const unsavedChangesAddPosition = isAddOpen && addPositionTitleDraft.trim() !== "";

  const confirmUnsavedChanges = (onDiscard) => {
    openConfirm({
      title: "Unsaved Changes",
      message: "You have unsaved changes. Do you want to close it without saving?",
      confirmText: "OK",
      cancelText: "Cancel",
      onConfirm: onDiscard,
    });
  };

  const onStartEditDeptName = () => {
    setDeptNameDraft(departmentName);
    setIsEditingDeptName(true);
  };

  const onCancelEditDeptName = () => {
    setIsEditingDeptName(false);
    setDeptNameDraft("");
  };

  const onUpdateDepartment = () => {
    const name = deptNameDraft.trim();
    if (!name || name === departmentName) return;
    openConfirm({
      title: "Update department name",
      message: "Are you sure you want to update the department name?",
      confirmText: "OK",
      cancelText: "Cancel",
      onConfirm: async () => {
        try {
          setDeptSaving(true);
          const res = await put(`/departments/${departmentId}`, { department_name: name });
          if (!res?.success) throw new Error(res?.message || "Failed to update department");
          setDepartmentName(name);
          setIsEditingDeptName(false);
          setDeptNameDraft("");
        } catch (e) {
          console.error("Failed to update department:", e);
          throw e;
        } finally {
          setDeptSaving(false);
        }
      },
    });
  };

  const onDeleteDepartment = () => {
    openConfirm({
      title: "Delete department",
      message: `Delete "${departmentName}" department? This cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
      onConfirm: async () => {
        try {
          setDeptSaving(true);
          const res = await del(`/departments/${departmentId}`);
          if (!res?.success) throw new Error(res?.message || "Failed to delete department");
          navigate("/employees/departments");
        } catch (e) {
          console.error("Failed to delete department:", e);
          throw e;
        } finally {
          setDeptSaving(false);
        }
      },
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#990100] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading {departmentName} Department Employees...</p>
        </div>
      </div>
    );
  }

  return (
    <div>

      <Navbar />

  
      <div className="p-7 lg:mx-[4.5rem] md:mx-10">
        <div className="md:flex justify-between items-center w-full">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => navigate("/employees/departments")}
              className="text-[#990100] hover:text-[#CC0000] transition-colors flex items-center gap-1 text-sm font-medium cursor-pointer"
            >
              <span className="text-xl">←</span>Back
            </button>
            <span className="text-gray-300">|</span>
            {isEditingDeptName ? (
              <>
                <input value={deptNameDraft} onChange={(e) => setDeptNameDraft(e.target.value)} className="lg:text-2xl text-xl font-bold text-[#990100]/70 border-b border-[#990100] bg-gray-100 px-2 py-1 focus:outline-gray-400" disabled={deptSaving} />
                <button
                  type="button"
                  onClick={onUpdateDepartment}
                  disabled={
                    deptSaving ||
                    !deptNameDraft.trim() ||
                    deptNameDraft.trim() === departmentName
                  }
                  className="green-button text-sm px-3 py-1.5 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {deptSaving ? "Saving..." : "Save"}
                </button>
                <button type="button" onClick={onCancelEditDeptName} disabled={deptSaving} className="text-sm text-white bg-red-700 hover:bg-red-600 px-3 py-1.5 rounded-md transition cursor-pointer" >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <h1 className="lg:text-3xl text-2xl text-[#990100] font-bold">
                  {departmentName}
                </h1>
                <button type="button" onClick={onStartEditDeptName} className="text-sm text-[#990100] border border-[#990100] px-3 py-1 rounded-md hover:bg-[#990100]/10 transition cursor-pointer" >
                  Edit
                </button>
                <button type="button" onClick={onDeleteDepartment} className="text-sm text-white bg-red-700 hover:bg-red-600 px-3 py-1 rounded-md transition cursor-pointer" >
                  Delete
                </button>
              </>
            )}
          </div>

          <div className="flex items-center justify-end md:gap-4 gap-3 md:mt-0 mt-5">
            <div className="relative">
              <button
                type="button"
                onClick={() => setFiltersOpen((p) => !p)}
                className="bg-white lg:h-10 md:h-9 h-8 px-3 rounded-lg text-sm border border-[#990100] text-[#990100] hover:bg-[#990100]/10 transition cursor-pointer inline-flex items-center gap-2"
                aria-haspopup="dialog"
                aria-expanded={filtersOpen}
              >
                <span className="font-medium">Filters</span>

                {activeFiltersCount ? (
                  <span className="ml-1 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-[#990100] text-white text-xs">
                    {activeFiltersCount}
                  </span>
                ) : null}

                <span className="text-xs">▾</span>
              </button>

            {filtersOpen ? (
              <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                <div
                  className="absolute inset-0 bg-black/40"
                  onClick={() => setFiltersOpen(false)}
                />

                <div className="relative bg-white w-[92%] max-w-lg rounded-2xl shadow-xl border border-gray-200 overflow-hidden z-10">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                    <p className="text-sm font-bold text-[#990100]">Filters</p>
                    <button
                      type="button"
                      onClick={() => setFiltersOpen(false)}
                      className="text-[#990100] hover:opacity-70 text-lg leading-none"
                      aria-label="Close"
                    >
                      ×
                    </button>
                  </div>

                  <div className="px-4 py-4 max-h-[65vh] overflow-y-auto">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Sort</p>
                    <div className="flex flex-wrap gap-2">
                      {sortOptions.map((opt) => (
                        <ChipButton
                          key={opt.value}
                          active={draftSortOrder === opt.value}
                          onClick={() => setDraftSortOrder(opt.value)}
                        >
                          {opt.label}
                        </ChipButton>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-white">
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="text-xs font-semibold text-[#990100] hover:underline cursor-pointer"
                    >
                      Clear all
                    </button>
                    <button
                      type="button"
                      onClick={applyDraftFilters}
                      className="bg-[#990100] text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-[#ad3332] transition cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
            </div>

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

        

        {error && !loading && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p>{error}</p>
            <button
              onClick={fetchData}
              className="mt-2 bg-red-600 text-white px-4 py-2 rounded text-sm"
            >
              Retry
            </button>
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
                    className={`lg:px-4 lg:py-2 px-2.5 py-1.5 font-medium rounded-t-lg transition duration-300 cursor-pointer md:text-sm text-xs ${
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
                    className={`lg:px-4 lg:py-2 px-2.5 py-1.5 font-medium rounded-t-lg transition duration-300 cursor-pointer md:text-sm text-xs ${
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
                    className="generate-report-button mb-4 font-medium"
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
                            <th className="th-style rounded-tl-lg rounded-bl-lg">
                              Employee ID
                            </th>
                            <th className="th-style">Name</th>
                            <th className="th-style">Position</th>
                            <th className="th-style">Hire Date</th>
                            <th className="th-style rounded-tr-lg rounded-br-lg">
                              Personnel Type
                            </th>
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
                    <br />

                    <div className="lg:flex items-center lg:justify-between">
                      <p className="lg:text-md text-sm">
                        Showing <b>{currentEmployees.length}</b> of{" "}
                        <b>{employees.length}</b> employee
                        {employees.length !== 1 ? "s" : ""}
                        {empPageCount ? (
                          <>
                            {" "}
                            | Page <b>{empCurrentPage}</b> of <b>{empPageCount}</b>
                          </>
                        ) : null}
                      </p>

                      <div className="">
                        {empPageCount >= 1 && (
                          <ReactPaginate
                            breakLabel="..."
                            nextLabel=">"
                            onPageChange={handlePageClick}
                            pageRangeDisplayed={2}
                            pageCount={empPageCount}
                            forcePage={Math.floor(empOffset / itemsPerPage)}
                            previousLabel="<"
                            renderOnZeroPageCount={null}
                            marginPagesDisplayed={2}
                            pageClassName=""
                            pageLinkClassName="cursor-pointer hover:text-gray-500 hover:underline"
                            previousClassName={
                              empMultiPages
                                ? "cursor-pointer hover:text-gray-500 hover:underline"
                                : "text-gray-400 cursor-not-allowed pointer-events-none"
                            }
                            previousLinkClassName="page-link"
                            nextClassName={
                              empMultiPages
                                ? "cursor-pointer hover:text-gray-500 hover:underline"
                                : "text-gray-400 cursor-not-allowed pointer-events-none"
                            }
                            nextLinkClassName="page-link"
                            breakClassName="page-item"
                            breakLinkClassName="page-link"
                            containerClassName="flex items-center space-x-2 lg:pt-0 pt-4 text-[#990100]"
                            activeClassName="underline font-medium"
                          />
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="div-table">
                      <table className="table-style">
                        <thead className="thead-style">
                          <tr>
                            <th className="th-style rounded-tl-lg rounded-bl-lg">
                              Position Title
                            </th>
                            <th className="th-style rounded-tr-lg rounded-br-lg">
                              Actions
                            </th>
                          </tr>
                        </thead>

                        <tbody className="tbody-style">
                          {currentPositions.map((p) => (
                            <tr key={p.id} className="tr-style">
                              <td className="td-style font-medium">{p.title}</td>
                              <td className="td-style">
                                <button
                                  type="button"
                                  onClick={() => onViewPosition(p)}
                                  className="bg-[#990100] text-white lg:text-sm text-xs px-4 py-[5px] rounded-lg hover:bg-[#ad3332] hover:scale-105 transition duration-300 ease-in-out cursor-pointer"
                                >
                                  Edit Details
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <br />

                    <div className="lg:flex items-center lg:justify-between">
                      <p className="lg:text-md text-sm">
                        Showing <b>{currentPositions.length}</b> of{" "}
                        <b>{positions.length}</b> position
                        {positions.length !== 1 ? "s" : ""}
                        {posPageCount ? (
                          <>
                            {" "}
                            | Page <b>{posCurrentPage}</b> of <b>{posPageCount}</b>
                          </>
                        ) : null}
                      </p>

                      <div className="">
                        {posPageCount >= 1 && (
                          <ReactPaginate
                            breakLabel="..."
                            nextLabel=">"
                            onPageChange={handlePageClick}
                            pageRangeDisplayed={2}
                            pageCount={posPageCount}
                            forcePage={Math.floor(posOffset / itemsPerPage)}
                            previousLabel="<"
                            renderOnZeroPageCount={null}
                            marginPagesDisplayed={2}
                            pageClassName=""
                            pageLinkClassName="cursor-pointer hover:text-gray-500 hover:underline"
                            previousClassName={
                              posMultiPages
                                ? "cursor-pointer hover:text-gray-500 hover:underline"
                                : "text-gray-400 cursor-not-allowed pointer-events-none"
                            }
                            previousLinkClassName="page-link"
                            nextClassName={
                              posMultiPages
                                ? "cursor-pointer hover:text-gray-500 hover:underline"
                                : "text-gray-400 cursor-not-allowed pointer-events-none"
                            }
                            nextLinkClassName="page-link"
                            breakClassName="page-item"
                            breakLinkClassName="page-link"
                            containerClassName="flex items-center space-x-2 lg:pt-0 pt-4 text-[#990100]"
                            activeClassName="underline font-medium"
                          />
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {isAddOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          
        >
          <div className="absolute inset-0 bg-black/25" />

          <div
            className="relative w-[600px] max-w-[92vw] max-h-[50vh] overflow-y-auto bg-white rounded-lg border border-gray-400 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            data-lenis-prevent
          >
            <div className="p-5">
              <div className="rounded-lg bg-[#990100] flex items-center justify-between lg:py-[10px] py-[6px] md:px-4 px-3">
                <h2 className="text-white text-lg font-medium lg:text-lg text-sm">Add New Position</h2>

                <button
                  type="button"
                  onClick={closeAdd}
                  aria-label="Close"
                  className="text-white text-2xl font-bold hover:scale-110 transition cursor-pointer"
                  disabled={positionSaving}
                >
                  ✕
                </button>
              </div>

              <div className="lg:py-10 py-7">
                <div className="lg:mx-15 md:mx-30 mx-20">
                  <span className=" text-left font-bold lg:text-lg text-[#483D3D] text-sm uppercase">Position Title:</span>

                  <div className="flex flex-col w-full sm:w-auto pt-1.5">
                    <input
                      value={addPositionTitleDraft}
                      onChange={(e) => setAddPositionTitleDraft(e.target.value)}
                      className="w-full px-2 lg:py-2 py-1.5 rounded-md border border-[#990100] focus:outline-gray-400 shadow-sm"
                      disabled={positionSaving}
                    />
                    {positionError && (
                      <span className="text-sm text-red-600 mt-2 font-medium">
                        {positionError}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex justify-center gap-4 mt-10">
                  <button
                    type="button"
                    onClick={onCreatePosition}
                    disabled={positionSaving}
                    className="green-button"
                  >
                    {positionSaving ? "Saving..." : "Save Position"}
                  </button>

                  <button
                    type="button"
                    onClick={closeAdd}
                    disabled={positionSaving}
                    className="bg-red-700 hover:bg-red-600 generate-report-button font-medium"
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
        >
          <div className="absolute inset-0 bg-black/25" />

          <div
            className="relative w-[600px] max-w-[92vw] max-h-[60vh] overflow-y-auto bg-white rounded-lg border border-gray-400 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            data-lenis-prevent
          >
            <div className="p-5 pb-0">
              <div className="rounded-lg bg-[#990100] flex items-center justify-between lg:py-[10px] py-[6px] md:px-4 px-3">
                <h2 className="text-white text-lg font-medium lg:text-lg text-sm">
                  Details of {selectedPosition.title}
                </h2>

                <button
                  type="button"
                  onClick={closeDetails}
                  aria-label="Close"
                  className="text-white text-2xl font-bold hover:scale-110 transition cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="lg:py-10 py-7">
                <div className="lg:mx-15 md:mx-30 mx-20">
                  <span className="text-left font-bold lg:text-lg text-sm text-[#483D3D] uppercase">Position Title:</span>

                  <div className="flex flex-col w-full sm:w-auto pt-1.5">
                    <input
                      value={positionTitleDraft}
                      onChange={(e) => setPositionTitleDraft(e.target.value)}
                      className="w-full px-2 lg:py-2 py-1.5 rounded-md border border-[#990100] focus:outline-gray-400 shadow-sm"
                      readOnly={!isEditingPosition || positionSaving}
                      disabled={positionSaving}
                    />
                    <span className="text-sm text-gray-500 mt-2 font-medium">
                      Last Updated: {selectedPosition.updatedAt}
                    </span>
                    {positionError && (
                      <span className="text-sm text-red-600 mt-2 font-medium">
                        {positionError}
                      </span>
                    )}
                  </div>
                </div>

                
                  { isEditingPosition ? (
                    <div className="flex justify-center gap-8 mt-10">

                      <button
                        type="button"
                        onClick={() => {
                            if (positionSaving) return;

                            if (unsavedChangesPosition) {
                              confirmUnsavedChanges(() => {
                              setIsEditingPosition(false);
                              setPositionTitleDraft(originalPositionTitle);
                              setPositionError("");
                            });
                              return;
                            }

                            setPositionTitleDraft(originalPositionTitle);
                            setIsEditingPosition(false);
                            setPositionError("");
                        }}
                        aria-label="Close"
                        className="bg-red-700 hover:bg-red-600 generate-report-button font-medium"
                      >
                        Cancel Changes
                      </button>

                      <button
                      type="button"
                      onClick={() => {
                        openConfirm({
                          title: "Save changes",
                          message: "Do you want to save the changes to this position?",
                          confirmText: "OK",
                          cancelText: "Cancel",
                          onConfirm: onUpdatePosition,
                        });
                      }}
                        disabled={positionSaving}
                        className="mustard-button font-medium"
                      >
                        Save Changes
                      </button>
                    </div>

                    
                  ):(

                    <div className="flex justify-center gap-8 mt-10">

                      <button
                        type="button"
                        onClick={() => {
                          
                          if (!isEditingPosition) {
                            setIsEditingPosition(true);
                            setPositionError("");
                            return;
                          }
                          onUpdatePosition();
                        }}
                        disabled={positionSaving}
                        className="green-button hover:bg-[#22C55E]/80 font-medium"
                      >
                        {positionSaving ? "Saving..." : "Update Position"}
                      </button>

                      <button
                        type="button"
                        onClick={onDeletePosition}
                        disabled={positionSaving}
                        className="bg-red-700 hover:bg-red-600 generate-report-button font-medium"
                      >
                        {positionSaving ? "Working..." : "Delete Position"}
                      </button>
                    </div>
                    )
                  }


                  

              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmBusy ? "Processing…" : confirmState.confirmText}
        cancelText={confirmState.cancelText}
        onConfirm={handleConfirm}
        onCancel={confirmBusy ? undefined : closeConfirm}
        confirmDisabled={positionSaving || deptSaving || confirmBusy}
      />
    </div>
  );
}