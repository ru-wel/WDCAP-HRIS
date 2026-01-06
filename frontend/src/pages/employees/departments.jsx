import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/navbar";
import DropDownFilter from "../../components/dropdownfilter";
import ReactPaginate from "react-paginate";
import { del, get, post, put } from "../../services/api.js";
import { compareNumber, compareText } from '../../utils/sort.js';
import ConfirmModal from "../../components/confirm-modal.jsx";
import ReportModal from '../../components/report-modal.jsx';
import { exportRowsToCsv } from '../../utils/csv.js';
import { exportRowsToXlsx } from '../../utils/excel.js';
import { filterRowsByDateRange } from '../../utils/reporting.js';

function DepartmentCard({
  id,
  name,
  employeesCount,
  mode,
  editedName,
  onNameChange,
  onSaveEdit,
  onDelete,
  saving,
  activeEditId,
  onSelectEdit,
  onConfirmDelete,
  onOpen,
}) {
  const showDeleteOverlay = mode === "delete";
  const isClickable = mode === "view" || mode === "edit";
  const isActiveEdit = mode === 'edit' && String(activeEditId || '') === String(id || '');

  const CardWrapper = isClickable ? "button" : "div";

  return (
    <CardWrapper
      type={isClickable ? "button" : undefined}
      onClick={
        mode === 'view'
          ? onOpen
          : mode === 'edit'
            ? () => onSelectEdit?.(id)
            : undefined
      }
      className={`relative bg-[#EDEDED] rounded-lg shadow-lg px-7 pt-6 transition-all duration-300 text-left w-full
        ${showDeleteOverlay ? "pb-20" : "pb-6"}
        ${isClickable ? "hover:scale-105 cursor-pointer" : ""}
      `}
      style={{ minHeight: 140 }}
    >
      {mode === "edit" && isActiveEdit ? (
        <>
          <input
            value={editedName}
            onChange={(e) => onNameChange(id, e.target.value)}
            className="w-full bg-transparent text-xl font-bold outline-none
                       text-[#990100] border-b border-transparent
                       focus:border-[#990100]"
            onClick={(e) => e.stopPropagation()}
          />

          <div className="mt-3 flex justify-end">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.(id);
                }}
                disabled={!!saving}
                className="cursor-pointer bg-red-700 text-white px-5 py-2 rounded-md shadow-md
                           hover:bg-red-600 hover:scale-105
                           transition duration-300 ease-in-out disabled:opacity-50 disabled:pointer-events-none"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSaveEdit?.(id);
                }}
                disabled={
                  !!saving ||
                  !String(editedName || "").trim() ||
                  String(editedName || "").trim() === String(name || "").trim()
                }
                className="green-button px-5 py-2 disabled:opacity-50 disabled:pointer-events-none"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </>
      ) : (
        <h2
          className={`text-xl font-bold ${
            mode === "delete" ? "text-[#c98b8b]" : "text-[#990100]"
          }`}
        >
          {name}
        </h2>
      )}

      <div className="flex items-center gap-4 pt-4">
        <img src="/icons/red-employees.png" alt="employees" className="w-9 h-9" />
        <p className="text-lg">
          <span className="font-medium">{employeesCount}</span> employee
          {employeesCount !== 1 ? "s" : ""}
        </p>
      </div>

      {mode === "delete" && (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center z-10">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onConfirmDelete();
            }}
            className="cursor-pointer bg-red-700 text-white px-5 py-2 rounded-md shadow-md
                       hover:bg-red-600 hover:scale-105
                       transition duration-300 ease-in-out"
          >
            Delete Department
          </button>
        </div>
      )}
    </CardWrapper>
  );
}

function NewDepartmentCard({ value, onChange }) {
  return (
    <div className="bg-[#EDEDED] rounded-lg shadow-lg px-7 py-6 min-h-[140px]">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type Department Name"
        className="w-full bg-transparent text-xl font-bold outline-none
                   text-[#990100] placeholder:text-[#c98b8b]"
      />

      <div className="flex items-center gap-4 pt-4">
        <img src="/icons/red-employees.png" alt="employees" className="w-9 h-9" />
        <p className="text-lg">employees</p>
      </div>
    </div>
  );
}

export default function Departments() {
  const navigate = useNavigate();

  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState('department_name_az');
  const [mode, setMode] = useState("view");
  const [newDeptName, setNewDeptName] = useState("");
  const [editedNames, setEditedNames] = useState({});
  const [activeEditDeptId, setActiveEditDeptId] = useState(null);
  const [showUpdateActions, setShowUpdateActions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmState, setConfirmState] = useState({
    open: false,
    title: 'Confirmation',
    message: '',
    confirmText: 'OK',
    cancelText: 'Cancel',
    onConfirm: null,
  });

  const [reportOpen, setReportOpen] = useState(false);

  const openConfirm = ({ title, message, confirmText, cancelText, onConfirm }) => {
    setConfirmState({
      open: true,
      title: title || 'Confirmation',
      message: message || '',
      confirmText: confirmText || 'OK',
      cancelText: cancelText ?? 'Cancel',
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

        const wasConfirmation = snapshot.cancelText != null && snapshot.cancelText !== '';
        if (!wasConfirmation) {
          return { ...prev, open: false, onConfirm: null };
        }

        return {
          open: true,
          title: 'Success',
          message: 'Action completed successfully.',
          confirmText: 'OK',
          cancelText: null,
          onConfirm: null,
        };
      });
    } catch (e) {
      setConfirmState({
        open: true,
        title: 'Error',
        message: e?.message || 'Action failed.',
        confirmText: 'OK',
        cancelText: null,
        onConfirm: null,
      });
    } finally {
      setConfirmBusy(false);
    }
  };

  useEffect(() => {
    setShowUpdateActions(false);
  }, [mode]);

  useEffect(() => {
    if (mode !== 'edit') {
      setActiveEditDeptId(null);
    }
  }, [mode]);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      setError("");

      const [deptRes, empRes] = await Promise.all([
        get("/departments"),
        get("/employees"),
      ]);

      const employees = empRes?.success ? (empRes.data || []) : [];
      const counts = new Map();

      employees.forEach((emp) => {
        const deptId = emp?.departments?.id || emp?.department_id;
        if (!deptId) return;
        counts.set(deptId, (counts.get(deptId) || 0) + 1);
      });

      const list = (deptRes?.success ? (deptRes.data || []) : []).map((d) => ({
        id: d.id,
        name: d.department_name,
        created_at: d.created_at,
        employees: counts.get(d.id) || 0,
      }));

      setDepartments(list);
    } catch (e) {
      console.error("Failed to fetch departments:", e);
      setError(e.message || "Failed to load departments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const filteredDepartments = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const filtered = !q
      ? departments
      : departments.filter((d) => d.name.toLowerCase().includes(q));

    const sorted = [...filtered].sort((a, b) => {
      switch (sortOrder) {
        case 'department_id_asc':
          return compareText(a?.id, b?.id);
        case 'department_id_desc':
          return compareText(b?.id, a?.id);
        case 'department_name_az':
          return compareText(a?.name, b?.name);
        case 'department_name_za':
          return compareText(b?.name, a?.name);
        case 'employees_high':
          return compareNumber(b?.employees, a?.employees);
        case 'employees_low':
          return compareNumber(a?.employees, b?.employees);
        default:
          return compareText(a?.name, b?.name);
      }
    });

    return sorted;
  }, [departments, searchTerm, sortOrder]);

  const handleGenerateReport = ({ startDate, endDate, fileType } = {}) => {
    const rowsForExport = (startDate || endDate)
      ? filterRowsByDateRange(filteredDepartments, (r) => r?.created_at, startDate, endDate)
      : filteredDepartments;

    const stamp = new Date().toISOString().slice(0, 10);
    const isCsv = fileType === 'CSV';
    const filename = `departments-report-${stamp}.${isCsv ? 'csv' : 'xlsx'}`;

    post('/audit-logs/reports', {
      report_name: 'Departments Report',
      filename,
      start_date: startDate || null,
      end_date: endDate || null,
      row_count: rowsForExport.length,
      source: 'departments',
    }).catch(() => {
      // best-effort only
    });

    const columns = [
      { header: 'Department ID', value: (r) => r?.id ?? '' },
      { header: 'Department Name', value: (r) => r?.name ?? '' },
      { header: 'Employees Count', value: (r) => r?.employees ?? 0 },
      { header: 'Created At', value: (r) => (r?.created_at ? new Date(r.created_at).toLocaleString() : '') },
    ];

    if (isCsv) {
      exportRowsToCsv({ filename, columns, rows: rowsForExport });
    } else {
      exportRowsToXlsx({ filename, sheetName: 'Departments', columns, rows: rowsForExport });
    }

    setReportOpen(false);
  };


  const displayList = useMemo(() => {
    if (mode === "add") return [{ id: "__new__" }, ...filteredDepartments];
    return filteredDepartments;
  }, [mode, filteredDepartments]);

  const [itemOffset, setItemOffset] = useState(0);
  const itemsPerPage = 9;

  const endOffset = itemOffset + itemsPerPage;
  const currentItems = displayList.slice(itemOffset, endOffset);
  const pageCount = Math.ceil(displayList.length / itemsPerPage);

  useEffect(() => {
    setItemOffset(0);
  }, [searchTerm, mode, sortOrder]);

  const handlePageClick = (e) => {
    setItemOffset(e.selected * itemsPerPage);
  };

  const startAdd = () => {
    setMode("add");
    setNewDeptName("");
  };

  const startEdit = () => {
    const map = {};
    departments.forEach((d) => (map[d.id] = d.name));
    setEditedNames(map);
    setMode("edit");
    setActiveEditDeptId(null);
  };

  const startDelete = () => setMode("delete");

  const hasUnsavedChanges = () => {
    if (mode === 'add') return Boolean(newDeptName.trim());
    if (mode !== 'edit') return false;
    return departments.some((d) => {
      const nextName = (editedNames[d.id] ?? d.name).trim();
      return Boolean(nextName) && nextName !== d.name;
    });
  };

  const cancelWorking = () => {
    const doCancel = () => {
      setMode('view');
      setNewDeptName('');
      setEditedNames({});
      setActiveEditDeptId(null);
    };

    if (!hasUnsavedChanges()) {
      doCancel();
      return;
    }

    openConfirm({
      title: 'Discard changes?',
      message: 'You have unsaved changes. Do you want to cancel without saving?',
      confirmText: 'OK',
      cancelText: 'Cancel',
      onConfirm: doCancel,
    });
  };

  const doSaveChanges = async () => {
    try {
      setSaving(true);
      if (mode === "add") {
        const name = newDeptName.trim();
        if (!name) return;

        const response = await post("/departments", { department_name: name });

        if (response?.success) {
          const created = response.data;
          setDepartments((prev) => [
            {
              id: created.id,
              name: created.department_name,
              employees: 0,
            },
            ...prev,
          ]);
        }
      }

      if (mode === "edit") {
        const updates = departments
          .map((d) => {
            const nextName = (editedNames[d.id] ?? d.name).trim();
            if (!nextName || nextName === d.name) return null;
            return { id: d.id, name: nextName };
          })
          .filter(Boolean);

        if (updates.length > 0) {
          await Promise.all(
            updates.map((u) =>
              put(`/departments/${u.id}`, { department_name: u.name })
            )
          );

          setDepartments((prev) =>
            prev.map((d) => {
              const match = updates.find((u) => u.id === d.id);
              return match ? { ...d, name: match.name } : d;
            })
          );
        }
      }

      setMode("view");
      setNewDeptName("");
      setEditedNames({});
      setActiveEditDeptId(null);
      openConfirm({
        title: 'Success',
        message: 'Changes saved successfully.',
        confirmText: 'OK',
        cancelText: null,
        onConfirm: null,
      });
    } catch (e) {
      console.error("Failed to save changes:", e);
      openConfirm({
        title: 'Save failed',
        message: e?.message || 'Failed to save changes',
        confirmText: 'OK',
        cancelText: null,
        onConfirm: null,
      });
    } finally {
      setSaving(false);
    }
  };

  const saveChanges = () => {
    openConfirm({
      title: 'Save changes',
      message: 'Are you sure you want to save these changes?',
      confirmText: 'OK',
      cancelText: 'Cancel',
      onConfirm: doSaveChanges,
    });
  };

  const saveOneDepartment = (id) => {
    if (mode !== 'edit') return;
    const dept = departments.find((d) => d.id === id);
    if (!dept) return;
    const nextName = String(editedNames[id] ?? dept.name).trim();
    if (!nextName || nextName === String(dept.name || '').trim()) return;

    openConfirm({
      title: 'Save department',
      message: 'Save this department name change?',
      confirmText: 'OK',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          setSaving(true);
          await put(`/departments/${id}`, { department_name: nextName });
          setDepartments((prev) => prev.map((d) => (d.id === id ? { ...d, name: nextName } : d)));
        } catch (e) {
          console.error('Failed to save department:', e);
          openConfirm({
            title: 'Save failed',
            message: e?.message || 'Failed to save department',
            confirmText: 'OK',
            cancelText: null,
            onConfirm: null,
          });
        } finally {
          setSaving(false);
        }
      },
    });
  };

  const confirmDelete = (id, name) => {
    openConfirm({
      title: 'Delete department',
      message: `Delete ${name || 'this department'}? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          setSaving(true);
          const response = await del(`/departments/${id}`);
          if (response?.success) {
            setDepartments((prev) => prev.filter((d) => d.id !== id));
            setActiveEditDeptId((prev) => (String(prev || '') === String(id) ? null : prev));
            openConfirm({
              title: 'Success',
              message: 'Department deleted successfully.',
              confirmText: 'OK',
              cancelText: null,
              onConfirm: null,
            });
          }
        } catch (e) {
          console.error("Failed to delete department:", e);
          openConfirm({
            title: 'Delete failed',
            message: e?.message || 'Failed to delete department',
            confirmText: 'OK',
            cancelText: null,
            onConfirm: null,
          });
        } finally {
          setSaving(false);
        }
      },
    });
  };

  const deleteOneDepartment = (id) => {
    const dept = departments.find((d) => d.id === id);
    confirmDelete(id, dept?.name || '');
  };

  const openDepartment = (dept) => {
    if (mode !== "view") return;
    navigate(`/employees/departments/${dept.id}`, {
      state: { department: dept },
    });
  };

  const isWorking = mode !== "view";
  const saveDisabled = mode === "add" && !newDeptName.trim();

  return (
    <div>
      <Navbar />

      <div className="p-7 lg:mx-18 md:mx-10">
        <div className="md:flex justify-between items-center">
          <h1 className="lg:text-3xl text-2xl text-[#990100] font-bold">
            Departments
          </h1>

          <div className="flex items-center gap-3">
            <DropDownFilter
              value={sortOrder}
              onChange={setSortOrder}
              options={[
                { value: 'department_id_asc', label: 'Department ID: Ascending' },
                { value: 'department_id_desc', label: 'Department ID: Descending' },
                { value: 'department_name_az', label: 'Department Name: A - Z' },
                { value: 'department_name_za', label: 'Department Name: Z - A' },
                { value: 'employees_high', label: 'Employees Count: High - Low' },
                { value: 'employees_low', label: 'Employees Count: Low - High' },
              ]}
            />
            <div className="relative border border-[#990100] rounded-lg">
              <input
                type="search"
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 px-3 pr-8 rounded-lg text-sm focus:outline-none"
              />
              <img
                src="/icons/red-search.png"
                alt="search"
                className="w-4 h-4 absolute right-2 top-2.5"
              />
            </div>
          </div>
        </div>

        <hr className="text-[#990100] mt-6" />

        {loading && (
          <div className="flex items-center justify-center py-20">
            <p className="text-gray-600">Loading departments...</p>
          </div>
        )}

        {error && !loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={fetchDepartments}
                className="bg-[#990100] text-white px-4 py-2 rounded"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {!loading && !error && (
          <>

        <div className="flex justify-end mt-6 gap-3 flex-wrap">
          {mode === 'view' && (
            <button
              type="button"
              className="generate-report-button disabled:opacity-60 disabled:pointer-events-none"
              onClick={() => setReportOpen(true)}
              disabled={saving}
            >
              Generate Report
            </button>
          )}

          {isWorking ? (
            <div className="flex gap-3">
              <button
                className="cursor-pointer bg-[#990100] text-white px-4 py-2 rounded-md
                           hover:bg-[#ad3332] hover:scale-105
                           transition duration-300 ease-in-out"
                onClick={cancelWorking}
                disabled={saving}
              >
                Cancel
              </button>
              {mode === 'add' && (
                <button
                  className="green-button"
                  onClick={saveChanges}
                  disabled={saveDisabled || saving}
                >
                  Save
                </button>
              )}
            </div>
          ) : (
            <>
              {!showUpdateActions ? (
                <button
                  className="bg-[#990100] text-white px-4 py-2 rounded-md hover:bg-[#ad3332] hover:scale-105 transition duration-300 ease-in-out"
                  onClick={() =>
                    openConfirm({
                      title: 'Update departments',
                      message: 'Enter edit mode? You can update or delete departments.',
                      confirmText: 'OK',
                      cancelText: 'Cancel',
                      onConfirm: () => setShowUpdateActions(true),
                    })
                  }
                >
                  Update Department
                </button>
              ) : (
                <div className="flex gap-3">
                  <button
                    onClick={startDelete}
                    className="cursor-pointer bg-red-700 text-white px-4 py-2 rounded-md
                               hover:bg-red-600 hover:scale-105
                               transition duration-300 ease-in-out"
                  >
                    Delete Department
                  </button>
                  <button className="green-button" onClick={startEdit}>
                    Edit Departments
                  </button>
                  <button className="mustard-button" onClick={startAdd}>
                    Add New Department
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentItems.map((dept) =>
            dept.id === "__new__" ? (
              <NewDepartmentCard
                key="new"
                value={newDeptName}
                onChange={setNewDeptName}
              />
            ) : (
              <DepartmentCard
                key={dept.id}
                id={dept.id}
                name={dept.name}
                employeesCount={dept.employees}
                mode={mode}
                editedName={editedNames[dept.id]}
                onNameChange={(id, val) =>
                  setEditedNames((p) => ({ ...p, [id]: val }))
                }
                onSaveEdit={saveOneDepartment}
                onDelete={deleteOneDepartment}
                saving={saving}
                activeEditId={activeEditDeptId}
                onSelectEdit={(id) => setActiveEditDeptId(id)}
                onConfirmDelete={() => confirmDelete(dept.id, dept.name)}
                onOpen={() => openDepartment(dept)}
              />
            )
          )}
        </div>

        <div className="flex justify-end mt-6 text-[#990100]">
          {pageCount > 1 && (
            <ReactPaginate
              previousLabel="<"
              nextLabel=">"
              pageCount={pageCount}
              forcePage={Math.floor(itemOffset / itemsPerPage)}
              onPageChange={handlePageClick}
              containerClassName="flex gap-3"
              activeClassName="underline font-bold"
            />
          )}
        </div>

          </>
        )}
      </div>

      <ReportModal
        open={reportOpen}
        title="Generate Report - Departments"
        onClose={() => setReportOpen(false)}
        onGenerate={handleGenerateReport}
        enableDateRange={true}
      />

      <ConfirmModal
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmBusy ? 'Processing…' : confirmState.confirmText}
        cancelText={confirmState.cancelText}
        onConfirm={handleConfirm}
        onCancel={confirmBusy ? undefined : closeConfirm}
        confirmDisabled={saving || confirmBusy}
      />
    </div>
  );
}