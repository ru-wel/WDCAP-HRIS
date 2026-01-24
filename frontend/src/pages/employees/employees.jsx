import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import Navbar from "../../components/navbar";
import { get, put, del, post } from "../../services/api.js";
import {
  EMPLOYMENT_STATUSES,
  PERSONNEL_TYPES,
} from "../../constants/config.js";
import ReactPaginate from "react-paginate";
import ConfirmModal from "../../components/confirm-modal.jsx";
import { compareDate, compareText } from "../../utils/sort.js";
import { exportRowsToCsv } from "../../utils/csv.js";
import { exportRowsToXlsx } from "../../utils/excel.js";
import ReportModal from "../../components/report-modal.jsx";
import { filterRowsByDateRange } from "../../utils/reporting.js";
import {
  exportEmployeeDetailsToPdf,
  exportReportToPdf,
} from "../../utils/pdf.js";

function ChipButton({ active, children, onClick, title }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={[
        "px-3 py-1 rounded-full text-xs font-semibold border transition cursor-pointer",
        active
          ? "bg-[#990100] text-white border-[#990100]"
          : "bg-white text-[#990100] border-[#990100] hover:bg-[#990100]/10",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function ModalEmployees({
  isOpen,
  onClose,
  employee,
  onSave,
  onDelete,
  departments,
  positions,
}) {
  const [data, setData] = useState(employee || {});
  const [editData, setEditData] = useState(false);
  const [initialData, setInitialData] = useState(employee || {});
  const [loading, setLoading] = useState(false);

  const [confirmState, setConfirmState] = useState({
    open: false,
    title: "Confirmation",
    message: "",
    confirmText: "OK",
    cancelText: "Cancel",
    onConfirm: null,
  });

  const [confirmBusy, setConfirmBusy] = useState(false);

  const detailsRef = useRef(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState("");
  const [photoLoading, setPhotoLoading] = useState(false);

  const openConfirm = ({
    title,
    message,
    confirmText,
    cancelText,
    onConfirm,
  }) => {
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

        const wasConfirmation =
          snapshot.cancelText != null && snapshot.cancelText !== "";
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

  useEffect(() => {
    if (!isOpen || !employee) return;
    setData(employee);
    setInitialData(employee);
    setEditData(false);
  }, [isOpen, employee]);

  useEffect(() => {
    if (!isOpen || !employee?.id) return;

    let cancelled = false;
    let objectUrl = "";
    const run = async () => {
      try {
        setPhotoLoading(true);
        setPhotoPreviewUrl("");

        const res = await get(`/documents/${employee.id}`);
        const docs = Array.isArray(res?.data) ? res.data : [];
        const photoDoc =
          docs.find(
            (d) => String(d?.document_name || "") === "Employee Photo"
          ) || null;
        if (!photoDoc?.id) return;
        if (cancelled) return;

        const base = (
          import.meta.env.VITE_API_BASE_URL || "http://localhost:3000"
        ).replace(/\/$/, "");
        const apiBase = base.endsWith("/api") ? base : `${base}/api`;
        const token = localStorage.getItem("access_token");
        const downloadUrl = `${apiBase}/documents/${photoDoc.id}/download?disposition=inline`;

        const fileRes = await fetch(downloadUrl, {
          method: "GET",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!fileRes.ok) {
          const msg = await fileRes.text();
          throw new Error(msg || "Failed to load photo");
        }

        const ct = String(
          fileRes.headers.get("content-type") || ""
        ).toLowerCase();
        let blob;
        if (ct.includes("application/json")) {
          const json = await fileRes.json();
          const signedUrl = json?.data?.signedUrl;
          if (!signedUrl) throw new Error("Failed to load photo");
          const signedRes = await fetch(signedUrl);
          if (!signedRes.ok) throw new Error("Failed to load photo");
          blob = await signedRes.blob();
        } else {
          blob = await fileRes.blob();
        }

        objectUrl = URL.createObjectURL(blob);
        if (cancelled) return;
        setPhotoPreviewUrl(objectUrl);
      } catch {
        // best-effort
      } finally {
        if (!cancelled) setPhotoLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
      if (objectUrl) {
        try {
          URL.revokeObjectURL(objectUrl);
        } catch {}
      }
    };
  }, [isOpen, employee?.id]);

  const handleExportPdf = async () => {
    try {
      const today = new Date();
      const stamp = `${today.getFullYear()}${String(
        today.getMonth() + 1
      ).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
      const lastName = String(data?.last_name || "LastName")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/[^a-zA-Z0-9_-]+/g, "_");
      const firstName = String(data?.first_name || "FirstName")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/[^a-zA-Z0-9_-]+/g, "_");
      const filename = `${stamp}_${lastName}_${firstName}_EmployeeDetails.pdf`;

      await exportEmployeeDetailsToPdf({
        filename,
        employee: data,
        photoUrl: photoPreviewUrl,
      });
    } catch (e) {
      openConfirm({
        title: "Export failed",
        message: e?.message || "Failed to export PDF.",
        confirmText: "OK",
        cancelText: null,
        onConfirm: null,
      });
    }
  };

  const handleChange = (a) => {
    const { name, value } = a.target;

    if (name === "department_id") {
      setData((prev) => ({ ...prev, [name]: value, position_id: "" }));
    } else {
      setData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = async () => {
    if (
      !data.first_name ||
      !data.last_name ||
      !data.position_title ||
      !data.hire_date ||
      !data.personnel_type ||
      !data.employment_status ||
      !data.department_name ||
      !data.birth_date ||
      !data.phone_number ||
      !data.address ||
      !data.emergency_contact_name ||
      !data.emergency_contact_number
    ) {
      openConfirm({
        title: "Missing fields",
        message:
          "Please fill out all the fields and do not leave any of them blank.",
        confirmText: "OK",
        cancelText: null,
        onConfirm: null,
      });
      return;
    }

    openConfirm({
      message: "Are you sure you want to save these changes?",
      confirmText: "OK",
      cancelText: "Cancel",
      onConfirm: async () => {
        try {
          setLoading(true);

          const response = await put(`/employees/${employee.id}`, {
            first_name: data.first_name,
            last_name: data.last_name,
            department_id: data.department_id,
            position_id: data.position_id,
            hire_date: data.hire_date,
            personnel_type: data.personnel_type,
            employment_status: data.employment_status,
            birth_date: data.birth_date,
            phone_number: data.phone_number,
            address: data.address,
            emergency_contact_name: data.emergency_contact_name,
            emergency_contact_number: data.emergency_contact_number,
          });

          if (response.success) {
            onSave(response.data);
            setEditData(false);
            openConfirm({
              title: "Success",
              message: `Successfully updated the record of ${data.employee_id}!`,
              confirmText: "OK",
              cancelText: null,
              onConfirm: () => onClose(),
            });
          }
        } catch (error) {
          console.error("Update error:", error);
          openConfirm({
            title: "Update failed",
            message: error?.message || "Failed to update employee",
            confirmText: "OK",
            cancelText: null,
            onConfirm: null,
          });
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleDelete = async () => {
    openConfirm({
      title: "Archive employee",
      message: `Are you sure you want to archive ${data.employee_id} - ${data.first_name} ${data.last_name}? Their records and uploaded 201 files will be retained, but they will be removed from the Active employees list.`,
      confirmText: "OK",
      cancelText: "Cancel",
      onConfirm: async () => {
        try {
          setLoading(true);
          const response = await del(`/employees/${employee.id}`);

          if (response.success) {
            onDelete(employee.id);
            openConfirm({
              title: "Success",
              message: `Successfully archived ${data.employee_id}.`,
              confirmText: "OK",
              cancelText: null,
              onConfirm: () => onClose(),
            });
          }
        } catch (error) {
          console.error("Delete error:", error);
          openConfirm({
            title: "Archive failed",
            message: error?.message || "Failed to archive employee",
            confirmText: "OK",
            cancelText: null,
            onConfirm: null,
          });
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const maxDate = `${yyyy}-${mm}-${dd}`;

  const unsavedChanges = JSON.stringify(data) !== JSON.stringify(initialData);

  if (!isOpen || !employee) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-1000 bg-[#EDEDED]/50 p-4">
      <div
        className="bg-white rounded-lg shadow-lg p-4 sm:p-6 lg:w-180 md:w-140 w-80 lg:h-140 md:h-120 h-100 overflow-y-auto border border-gray-300"
        data-lenis-prevent
      >
        <div className="rounded-lg bg-[#990100] flex items-center justify-between py-2 sm:py-3 px-3 sm:px-4">
          <h1 className="text-white text-sm sm:text-base lg:text-lg font-medium">
            Information of {data.employee_id}
          </h1>
          <button
            className="text-white text-2xl font-bold hover:scale-110 transition cursor-pointer"
            onClick={() => {
              if (unsavedChanges) {
                openConfirm({
                  message:
                    "You have unsaved changes. Do you want to close it without saving?",
                  confirmText: "OK",
                  cancelText: "Cancel",
                  onConfirm: () => onClose(),
                });
                return;
              }
              onClose();
            }}
            disabled={loading}
          >
            {" "}
            ✕{" "}
          </button>
        </div>

        <div className="px-3" ref={detailsRef}>
          <div className="md:grid md:grid-cols-2 gap-4 items-center lg:pt-5 pt-3 text-left">
            <div className="pr-2 md:pb-0 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-md border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center">
                  {photoLoading ? (
                    <div className="text-[10px] text-gray-500">Loading…</div>
                  ) : photoPreviewUrl ? (
                    <img
                      src={photoPreviewUrl}
                      alt="Employee Photo"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-[10px] text-gray-500 text-center px-1">
                      No Photo
                    </div>
                  )}
                </div>
                <div className="flex flex-col ">
                  <p className="lg:text-sm text-xs text-[#483D3D]">
                    <b className="uppercase">Employee ID:</b> {data.employee_id}
                  </p>
                  <p className="lg:text-sm text-xs text-[#483D3D]">
                    <b className="uppercase">Name:</b> {data.first_name} {data.last_name}
                  </p>
                </div>
              </div>
            </div>

            <div className=" items-center">
              <p className="lg:text-sm text-xs pr-2 pb-1.5 text-[#483D3D] uppercase">
                <b>Employment Status:</b>
              </p>
              <select
                name="employment_status"
                value={data.employment_status}
                disabled={!editData || loading}
                onChange={handleChange}
                className="modal-employees-field cursor-pointer disabled:cursor-default"
              >
                <option value={EMPLOYMENT_STATUSES.ACTIVE}>
                  {EMPLOYMENT_STATUSES.ACTIVE}
                </option>
                <option value={EMPLOYMENT_STATUSES.INACTIVE}>
                  {EMPLOYMENT_STATUSES.INACTIVE}
                </option>
              </select>
            </div>
          </div>

          <div className="md:grid md:grid-cols-2 gap-4 items-center pt-3 text-left">
            <div className="items-center md:pb-0 pb-3">
              <p className="lg:text-sm text-xs pb-1.5 text-[#483D3D] uppercase">
                <b>First Name:</b>
              </p>
              <input
                type="text"
                name="first_name"
                value={data.first_name}
                disabled={!editData || loading}
                onChange={handleChange}
                className="modal-employees-field"
              />
            </div>

            <div className=" items-center ">
              <p className="lg:text-sm text-xs pb-1.5 text-[#483D3D] uppercase">
                <b>Last Name:</b>
              </p>
              <input
                type="text"
                name="last_name"
                value={data.last_name}
                disabled={!editData || loading}
                onChange={handleChange}
                className="modal-employees-field"
              />
            </div>
          </div>

          <div className="md:grid md:grid-cols-2 gap-4 items-center pt-3 text-left">
            <div className=" items-center md:pb-0 pb-3">
              <p className="lg:text-sm text-xs pb-1.5 text-[#483D3D] uppercase">
                <b>Department:</b>
              </p>
              <select
                name="department_id"
                value={data.department_id}
                disabled={!editData || loading}
                onChange={handleChange}
                className="modal-employees-field cursor-pointer disabled:cursor-default"
              >
                <option value="">Select Department</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.department_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="items-center ">
              <p className="lg:text-sm text-xs pb-1.5 text-[#483D3D] uppercase">
                <b>Position:</b>
              </p>
              <select
                name="position_id"
                value={data.position_id}
                disabled={!editData || loading || !data.department_id}
                onChange={handleChange}
                className="modal-employees-field cursor-pointer disabled:cursor-default"
              >
                <option value="">Select Position</option>
                {positions
                  .filter((pos) => {
                    return (
                      pos.id === employee.position_id ||
                      pos.departments?.id === data.department_id
                    );
                  })
                  .map((pos) => (
                    <option key={pos.id} value={pos.id}>
                      {pos.position_title}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="md:grid md:grid-cols-2 items-center gap-4 pt-3 text-left">
            <div className=" items-center md:pb-0 pb-3">
              <p className="lg:text-sm text-xs md:pr-0 pr-2 pb-1.5 text-[#483D3D] uppercase">
                <b>Personnel Type:</b>
              </p>
              <select
                name="personnel_type"
                className="modal-employees-field cursor-pointer disabled:cursor-default"
                value={data.personnel_type}
                disabled={!editData || loading}
                onChange={handleChange}
              >
                <option value={PERSONNEL_TYPES.PROBATIONARY}>
                  {PERSONNEL_TYPES.PROBATIONARY}
                </option>
                <option value={PERSONNEL_TYPES.REGULAR}>
                  {PERSONNEL_TYPES.REGULAR}
                </option>
                <option value={PERSONNEL_TYPES.PROJECT_BASED}>
                  {PERSONNEL_TYPES.PROJECT_BASED}
                </option>
              </select>
            </div>

            <div className="items-center md:pb-0 pb-3">
              <p className="lg:text-sm text-xs pb-1.5 text-[#483D3D] uppercase">
                <b>Hire Date:</b>
              </p>
              <input
                type="date"
                name="hire_date"
                value={data.hire_date}
                disabled={!editData || loading}
                onChange={handleChange}
                className="modal-employees-field cursor-pointer disabled:cursor-default"
                min="2019-01-01"
                max={maxDate}
              />
            </div>
          </div>

          <div className="lg:py-5 pt-5 pb-3">
            <hr className="text-[#990100]" />
          </div>

          <h2 className="lg:text-md text:sm text-left pb-4 text-[#483D3D] uppercase">
            <b>Personal Information</b>
          </h2>

          <div className="md:grid md:grid-cols-2 gap-4 items-center text-left">
            <div className="items-center md:pb-0 pb-3">
              <p className="lg:text-sm text-xs pb-1.5 text-[#483D3D] uppercase">
                <b>Birth Date:</b>
              </p>
              <input
                type="date"
                name="birth_date"
                value={data.birth_date}
                disabled={!editData || loading}
                onChange={handleChange}
                className="modal-employees-field cursor-pointer disabled:cursor-default"
                max={maxDate}
              />
            </div>

            <div className="items-center ">
              <p className="lg:text-sm text-xs pb-1.5 text-[#483D3D] uppercase">
                <b>Phone No.:</b>
              </p>
              <input
                type="tel"
                name="phone_number"
                value={data.phone_number}
                disabled={!editData || loading}
                onChange={handleChange}
                className="modal-employees-field"
                maxLength="11"
                onInput={(e) => {
                  e.target.value = e.target.value.replace(/[^0-9]/g, "");
                }}
              />
            </div>
          </div>

          <div className="items-center text-left pt-3">
            <p className="lg:text-sm text-xs pb-1.5 text-[#483D3D] uppercase">
              <b>Home Address:</b>
            </p>
            <input
              type="text"
              name="address"
              value={data.address}
              disabled={!editData || loading}
              onChange={handleChange}
              className="modal-employees-field"
            />
          </div>

          <div className="items-center text-left pt-3 ">
            <p className="lg:text-sm text-xs pb-1.5 text-[#483D3D] uppercase">
              <b>Emergency Contact Name:</b>
            </p>
            <input
              type="text"
              name="emergency_contact_name"
              value={data.emergency_contact_name}
              disabled={!editData || loading}
              onChange={handleChange}
              className="modal-employees-field"
            />
          </div>

          <div className="items-center text-left pt-3">
            <p className="lg:text-sm text-xs pb-1.5 text-[#483D3D] uppercase">
              <b>Emergency Contact No.:</b>
            </p>
            <input
              type="tel"
              name="emergency_contact_number"
              value={data.emergency_contact_number}
              disabled={!editData || loading}
              onChange={handleChange}
              className="modal-employees-field"
              maxLength="11"
              onInput={(e) => {
                e.target.value = e.target.value.replace(/[^0-9]/g, "");
              }}
            />
          </div>

          <div className="pt-7">
            {!editData ? (
              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={handleExportPdf}
                  disabled={loading}
                  className="bg-[#0f4c81] lg:px-5 py-[7px] px-4 lg:text-[15px] text-xs rounded-md text-white hover:bg-[#2a6aa1] hover:scale-105 transition duration-300 ease-in-out cursor-pointer"
                >
                  Export to PDF
                </button>
                <button
                  onClick={() => setEditData(true)}
                  disabled={loading}
                  className="bg-[#198C19] lg:px-5 py-[7px] px-4 lg:text-[15px] text-xs rounded-md text-white hover:bg-[#46a346] hover:scale-105 transition duration-300 ease-in-out cursor-pointer"
                >
                  Update Record
                </button>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="bg-[#C60000] lg:px-5 py-[7px] px-4 lg:text-[15px] text-xs rounded-md text-white hover:bg-[#d13232] hover:scale-105 transition duration-300 ease-in-out cursor-pointer"
                >
                  {loading ? "Archiving ..." : "Archive Employee"}
                </button>
              </div>
            ) : (
              <div className="flex justify-end gap-4">
                <button
                  className="bg-[#C60000] lg:px-5 py-[7px] px-4 py lg:text-[15px] text-xs rounded-md text-white hover:bg-[#d13232] hover:scale-105 transition duration-300 ease-in-out cursor-pointer"
                  onClick={() => {
                    if (unsavedChanges) {
                      openConfirm({
                        message:
                          "You have unsaved changes. Do you want to close it without saving?",
                        confirmText: "OK",
                        cancelText: "Cancel",
                        onConfirm: () => {
                          setData(initialData);
                          setEditData(false);
                        },
                      });
                      return;
                    }
                    setData(initialData);
                    setEditData(false);
                  }}
                  disabled={loading}
                >
                  Cancel Changes
                </button>

                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="bg-[#FFA500] lg:px-5 md:py-[7px] px-4 py-[7px] lg:text-[15px] text-xs rounded-md text-white hover:bg-[#ffb732] hover:scale-105 transition duration-300 ease-in-out disabled:opacity-50 cursor-pointer"
                >
                  {loading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmBusy ? "Processing…" : confirmState.confirmText}
        cancelText={confirmState.cancelText}
        onConfirm={handleConfirm}
        onCancel={confirmBusy ? undefined : closeConfirm}
        confirmDisabled={loading || confirmBusy}
      />
    </div>
  );
}

function Employees() {
  const [isModalOpen, setModalOpen] = useState(false);
  const [viewEmployee, setViewEmployee] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState(() => ({}));
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("name_az");
  const [reportOpen, setReportOpen] = useState(false);
  const [personnelTypeFilter, setPersonnelTypeFilter] = useState("ALL");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftSortOrder, setDraftSortOrder] = useState(sortOrder);
  const [draftPersonnelType, setDraftPersonnelType] =
    useState(personnelTypeFilter);

  const filtersWrapRef = useRef(null);

  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 767px)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mq = window.matchMedia('(max-width: 767px)');
    const handler = (e) => setIsMobile(Boolean(e.matches));

    if (mq.addEventListener) mq.addEventListener('change', handler);
    else mq.addListener(handler);

    setIsMobile(mq.matches);

    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', handler);
      else mq.removeListener(handler);
    };
  }, []);

  useEffect(() => {
    if (!filtersOpen || !isMobile) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [filtersOpen, isMobile]);

  useEffect(() => {
    const onDocMouseDown = (e) => {
      if (!filtersOpen) return;
      const el = filtersWrapRef.current;
      if (!el) return;
      if (el.contains(e.target)) return;
      setFiltersOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [filtersOpen]);

  const resetFilters = () => {
    setPersonnelTypeFilter("ALL");
    setSortOrder("name_az");
  };

  const sortOptions = useMemo(
    () => [
      { value: "employee_id_asc", label: "Employee ID: Asc" },
      { value: "employee_id_desc", label: "Employee ID: Desc" },
      { value: "name_az", label: "Name: A–Z" },
      { value: "name_za", label: "Name: Z–A" },
      { value: "position_az", label: "Position: A–Z" },
      { value: "position_za", label: "Position: Z–A" },
      { value: "hire_date_newest", label: "Hire Date: Newest" },
      { value: "hire_date_oldest", label: "Hire Date: Oldest" },
      { value: "personnel_type_az", label: "Personnel Type: A–Z" },
      { value: "personnel_type_za", label: "Personnel Type: Z–A" },
    ],
    []
  );

  const personnelTypeOptions = useMemo(
    () => [
      { value: "ALL", label: "All" },
      { value: "STANDARD", label: "Probationary/Regular" },
      { value: "PROJECT_BASED", label: "Project-Based" },
    ],
    []
  );

  const activeFilterChips = useMemo(() => {
    const chips = [];

    if (personnelTypeFilter !== "ALL") {
      const label =
        personnelTypeOptions.find((o) => o.value === personnelTypeFilter)
          ?.label || personnelTypeFilter;
      chips.push({
        key: "personnel_type",
        label: `Personnel: ${label}`,
        onClear: () => setPersonnelTypeFilter("ALL"),
      });
    }

    if (sortOrder !== "name_az") {
      const label =
        sortOptions.find((o) => o.value === sortOrder)?.label || sortOrder;
      chips.push({
        key: "sort",
        label: `Sort: ${label}`,
        onClear: () => setSortOrder("name_az"),
      });
    }

    return chips;
  }, [personnelTypeFilter, sortOrder, personnelTypeOptions, sortOptions]);

  const activeFilterCount = activeFilterChips.length;

  const formatYearsOfService = useCallback((hireDateValue) => {
    const raw = String(hireDateValue || "").trim();
    if (!raw) return "—";
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return "—";

    const now = new Date();
    if (d.getTime() > now.getTime()) return "0 years, 0 months";

    let years = now.getFullYear() - d.getFullYear();
    let months = now.getMonth() - d.getMonth();

    if (now.getDate() < d.getDate()) months -= 1;
    if (months < 0) {
      years -= 1;
      months += 12;
    }

    const yLabel = years === 1 ? "year" : "years";
    const mLabel = months === 1 ? "month" : "months";
    return `${Math.max(0, years)} ${yLabel}, ${Math.max(0, months)} ${mLabel}`;
  }, []);

  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);

  const filteredEmployees = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const filteredByType = (() => {
      if (personnelTypeFilter === "PROJECT_BASED") {
        return employees.filter(
          (e) =>
            String(e?.personnel_type || "").toLowerCase() ===
            String(PERSONNEL_TYPES.PROJECT_BASED || "").toLowerCase()
        );
      }
      if (personnelTypeFilter === "STANDARD") {
        return employees.filter((e) => {
          const t = String(e?.personnel_type || "").toLowerCase();
          return (
            t === String(PERSONNEL_TYPES.REGULAR || "").toLowerCase() ||
            t === String(PERSONNEL_TYPES.PROBATIONARY || "").toLowerCase()
          );
        });
      }
      return employees;
    })();

    const filtered = !q
      ? filteredByType
      : filteredByType.filter((e) => {
          const fullName = `${e.first_name || ""} ${
            e.last_name || ""
          }`.toLowerCase();
          return (
            String(e.employee_id || "")
              .toLowerCase()
              .includes(q) ||
            fullName.includes(q) ||
            String(e.position_title || "")
              .toLowerCase()
              .includes(q) ||
            String(e.department_name || "")
              .toLowerCase()
              .includes(q) ||
            String(e.personnel_type || "")
              .toLowerCase()
              .includes(q)
          );
        });

    const sorted = [...filtered].sort((a, b) => {
      const aName = `${a?.first_name || ""} ${a?.last_name || ""}`.trim();
      const bName = `${b?.first_name || ""} ${b?.last_name || ""}`.trim();

      const tieBreakByEmployeeId = () =>
        compareText(a?.employee_id, b?.employee_id);
      const aProject =
        String(a?.personnel_type || "").toLowerCase() ===
        String(PERSONNEL_TYPES.PROJECT_BASED || "").toLowerCase();
      const bProject =
        String(b?.personnel_type || "").toLowerCase() ===
        String(PERSONNEL_TYPES.PROJECT_BASED || "").toLowerCase();

      switch (sortOrder) {
        case "employee_id_asc":
          return compareText(a?.employee_id, b?.employee_id);
        case "employee_id_desc":
          return compareText(b?.employee_id, a?.employee_id);
        case "name_az":
          return compareText(aName, bName) || tieBreakByEmployeeId();
        case "name_za":
          return compareText(bName, aName) || tieBreakByEmployeeId();
        case "position_az":
          return (
            compareText(a?.position_title, b?.position_title) ||
            tieBreakByEmployeeId()
          );
        case "position_za":
          return (
            compareText(b?.position_title, a?.position_title) ||
            tieBreakByEmployeeId()
          );
        case "hire_date_oldest":
          return (
            compareDate(a?.hire_date, b?.hire_date) || tieBreakByEmployeeId()
          );
        case "hire_date_newest":
          return (
            compareDate(b?.hire_date, a?.hire_date) || tieBreakByEmployeeId()
          );
        case "personnel_type_az":
          return (
            compareText(a?.personnel_type, b?.personnel_type) ||
            tieBreakByEmployeeId()
          );
        case "personnel_type_za":
          return (
            compareText(b?.personnel_type, a?.personnel_type) ||
            tieBreakByEmployeeId()
          );
        case "personnel_type_employee_first":
          if (aProject === bProject)
            return compareText(aName, bName) || tieBreakByEmployeeId();
          return aProject ? 1 : -1;
        case "personnel_type_project_first":
          if (aProject === bProject)
            return compareText(aName, bName) || tieBreakByEmployeeId();
          return aProject ? -1 : 1;
        default:
          return compareText(aName, bName) || tieBreakByEmployeeId();
      }
    });

    return sorted;
  }, [employees, searchTerm, sortOrder, personnelTypeFilter]);

  const [itemOffset, setItemOffset] = useState(0);
  const itemsPerPage = 15;
  const endOffset = itemOffset + itemsPerPage;
  const currentEmp = filteredEmployees.slice(itemOffset, endOffset);
  const pageCount = Math.ceil(filteredEmployees.length / itemsPerPage);
  const multiPages = pageCount > 1;
  const currentPage = pageCount ? Math.floor(itemOffset / itemsPerPage) + 1 : 0;

  const handlePageClick = (event) => {
    const newOffset = event.selected * itemsPerPage;
    setItemOffset(newOffset);
  };

  useEffect(() => {
    setItemOffset(0);
  }, [searchTerm, sortOrder, personnelTypeFilter, employees.length]);

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [empResponse, deptResponse, posResponse] = await Promise.all([
        get("/employees"),
        get("/departments"),
        get("/positions"),
      ]);

      if (empResponse.success) {
        const mappedEmployees = empResponse.data.map((emp) => ({
          ...emp,
          department_name: emp.departments?.department_name || "N/A",
          position_title: emp.positions?.position_title || "N/A",
          department_id: emp.departments?.id,
          position_id: emp.positions?.id,
        }));
        setEmployees(mappedEmployees);
      }

      if (deptResponse.success) {
        setDepartments(deptResponse.data);
      }

      if (posResponse.success) {
        setPositions(posResponse.data);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      setError(error.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleOpen = (employee) => {
    setViewEmployee(employee);
    setModalOpen(true);
  };

  const handleClose = () => setModalOpen(false);

  const setPageSelected = (rows, selected) => {
    setSelectedEmployeeIds((prev) => {
      const next = { ...prev };
      for (const r of rows || []) {
        if (!r?.id) continue;
        if (selected) next[r.id] = true;
        else delete next[r.id];
      }
      return next;
    });
  };

  const selectedCount = useMemo(
    () => Object.keys(selectedEmployeeIds).length,
    [selectedEmployeeIds]
  );

  const updateEmployeeData = (updated) => {
    setEmployees((prev) =>
      prev.map((emp) =>
        emp.id === updated.id
          ? {
              ...updated,
              department_name: updated.departments?.department_name || "N/A",
              position_title: updated.positions?.position_title || "N/A",
              department_id: updated.departments?.id,
              position_id: updated.positions?.id,
            }
          : emp
      )
    );
  };

  const deleteEmployee = (employeeId) => {
    setEmployees((prev) => prev.filter((emp) => emp.id !== employeeId));
  };

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-gray-600">Loading Employees...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Navbar />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={fetchEmployees}
              className="bg-[#990100] text-white px-4 py-2 rounded cursor-pointer"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleGenerateReport = ({
    startDate,
    endDate,
    fileType,
    category,
  } = {}) => {
    const selectedOnly = selectedCount > 0;
    const inputRows = selectedOnly
      ? filteredEmployees.filter((r) => !!selectedEmployeeIds[r?.id])
      : filteredEmployees;

    const base =
      startDate || endDate
        ? filterRowsByDateRange(
            inputRows,
            (r) => r?.hire_date,
            startDate,
            endDate
          )
        : inputRows;

    const cat = category || "all";
    const rowsForExport = base.filter((r) => {
      const status = String(r?.employment_status || "");
      const p = String(r?.personnel_type || "");

      if (cat === "selected") return true;
      if (cat === "active") return status === EMPLOYMENT_STATUSES.ACTIVE;
      if (cat === "inactive") return status === EMPLOYMENT_STATUSES.INACTIVE;
      if (cat === "project_based") return p === PERSONNEL_TYPES.PROJECT_BASED;
      if (cat === "standard")
        return (
          p === PERSONNEL_TYPES.REGULAR || p === PERSONNEL_TYPES.PROBATIONARY
        );
      return true;
    });

    const stamp = new Date().toISOString().slice(0, 10);
    const upperType = String(fileType || "XLSX").toUpperCase();
    const isCsv = upperType === "CSV";
    const isPdf = upperType === "PDF";
    const ext = isPdf ? "pdf" : isCsv ? "csv" : "xlsx";
    const filename = `employees-report-${cat}-${stamp}.${ext}`;

    post("/audit-logs/reports", {
      report_name: "Employees Report",
      filename,
      start_date: startDate || null,
      end_date: endDate || null,
      row_count: rowsForExport.length,
      source: "employees",
    }).catch(() => {});

    const columns = [
      { header: "Employee ID", value: (r) => r.employee_id },
      {
        header: "Name",
        value: (r) => `${r.first_name || ""} ${r.last_name || ""}`.trim(),
      },
      { header: "Department", value: (r) => r.department_name || "N/A" },
      { header: "Position", value: (r) => r.position_title },
      { header: "Hire Date", value: (r) => r.hire_date },
      { header: "Personnel Type", value: (r) => r.personnel_type },
      { header: "Employment Status", value: (r) => r.employment_status },
    ];

    if (isPdf) {
      const activeCount = rowsForExport.filter(
        (r) => r.employment_status === EMPLOYMENT_STATUSES.ACTIVE
      ).length;
      const inactiveCount = rowsForExport.filter(
        (r) => r.employment_status === EMPLOYMENT_STATUSES.INACTIVE
      ).length;
      const projectBasedCount = rowsForExport.filter(
        (r) => r.personnel_type === PERSONNEL_TYPES.PROJECT_BASED
      ).length;
      const standardCount = rowsForExport.length - projectBasedCount;

      exportReportToPdf({
        filename,
        title: "Employees Report",
        summaryLines: [
          `Category: ${cat}`,
          startDate || endDate
            ? `Range: ${startDate || "…"} to ${endDate || "…"}`
            : "Range: All time",
          selectedOnly
            ? `Scope: Selected employees (${selectedCount})`
            : "Scope: All filtered employees",
          `Active: ${activeCount} | Inactive: ${inactiveCount}`,
          `Standard: ${standardCount} | Project-Based: ${projectBasedCount}`,
        ],
        columns,
        rows: rowsForExport,
      }).catch(() => {});
    } else if (isCsv) {
      exportRowsToCsv({ filename, columns, rows: rowsForExport });
    } else {
      exportRowsToXlsx({
        filename,
        sheetName: "Employees",
        columns,
        rows: rowsForExport,
      });
    }

    setReportOpen(false);
  };

  return (
    <div className="">
      <Navbar />

      <div className="p-7 lg:mx-18 md:mx-10">
        <div className="md:flex justify-between items-center w-full">
          <div className="">
            <h1 className="lg:text-3xl text-2xl text-[#990100] font-bold md:mb-0 mb-5">
              Employees
            </h1>
          </div>

          <div className="flex items-center justify-end md:gap-4 gap-3">
            <div
              className="relative"
              ref={filtersWrapRef}
              data-filters-root="true"
            >
              <button
                type="button"
                onClick={() => {
                  setFiltersOpen((p) => {
                    const next = !p;
                    if (next) {
                      setDraftPersonnelType(personnelTypeFilter);
                      setDraftSortOrder(sortOrder);
                    }
                    return next;
                  });
                }}                
                className="bg-white lg:h-10 md:h-9 h-8 px-3 rounded-lg text-sm border border-[#990100] text-[#990100] hover:bg-[#990100]/10 transition cursor-pointer inline-flex items-center gap-2"
                aria-haspopup="dialog"
                aria-expanded={filtersOpen}
              >
                <span className="font-medium">Filters</span>
                {activeFilterCount ? (
                  <span className="ml-1 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-[#990100] text-white text-xs">
                    {activeFilterCount}
                  </span>
                ) : null}
                <span className="text-xs">▾</span>
              </button>

              {filtersOpen ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                  <div
                    className="absolute inset-0 bg-black/40"
                    onClick={() => setFiltersOpen(false)}
                  />

                  <div className="relative bg-white w-[92%] max-w-lg rounded-2xl shadow-xl p-4 z-10">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-[#111827]">Filters</p>
                      <button
                        type="button"
                        onClick={() => setFiltersOpen(false)}
                        className="text-[#990100] hover:opacity-70 text-lg leading-none"
                        aria-label="Close"
                      >
                        ×
                      </button>
                    </div>

                    <div className="space-y-4 max-h-[65vh] overflow-y-auto">
                      <div>
                        <p className="text-xs font-semibold text-gray-700 mb-2">
                          Personnel Type
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {personnelTypeOptions.map((opt) => (
                            <ChipButton
                              key={opt.value}
                              active={draftPersonnelType === opt.value}
                              onClick={() => setDraftPersonnelType(opt.value)}
                              title={opt.label}
                            >
                              {opt.label}
                            </ChipButton>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-gray-700 mb-2">
                          Sort
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {sortOptions.map((opt) => (
                            <ChipButton
                              key={opt.value}
                              active={draftSortOrder === opt.value}
                              onClick={() => setDraftSortOrder(opt.value)}
                              title={opt.label}
                            >
                              {opt.label}
                            </ChipButton>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setDraftPersonnelType("ALL");
                          setDraftSortOrder("name_az");
                        }}
                        className="text-xs font-semibold text-[#990100] hover:underline cursor-pointer"
                      >
                        Clear all
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setPersonnelTypeFilter(draftPersonnelType);
                          setSortOrder(draftSortOrder);
                          setFiltersOpen(false);
                        }}
                        className="bg-[#990100] text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-[#ad3332] transition cursor-pointer"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="relative text-gray-600 border border-[#990100] rounded-lg ">
              <input
                type="search"
                name="search"
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white lg:h-10 md:h-9 h-8 px-2 lg:pr-10 md:pr-5 pr-5 md:w-auto w-35 rounded-lg text-sm focus:outline-none"
              />
              <button
                type="submit"
                className="absolute right-0 top-0 md:mt-3 mt-2 lg:mr-3 mr-2 items-center cursor-pointer"
              >
                <img
                  src="icons/red-search.png"
                  className="lg:w-5 lg:h-5 w-4 h-4 items-center"
                  type="submit"
                />
              </button>
            </div>
          </div>
        </div>

        <hr className="text-[#990100] mt-6 " />

        {selectedCount ? (
          <div className="mt-4 text-sm text-gray-700">
            Selected: <b>{selectedCount}</b>
            <button
              type="button"
              className="ml-3 text-[#990100] hover:underline"
              onClick={() => setSelectedEmployeeIds({})}
            >
              Clear
            </button>
          </div>
        ) : null}

        <div className="flex justify-end mt-5">
          <button
            className="generate-report-button"
            onClick={() => setReportOpen(true)}
            disabled={filteredEmployees.length === 0}
            title={
              selectedCount
                ? "Generate report for selected employees"
                : "Generate report"
            }
          >
            {selectedCount
              ? `Generate Report (Selected: ${selectedCount})`
              : "Generate Report"}
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
                <th className="th-style">Position</th>
                <th className="th-style">Hire Date</th>
                <th className="th-style">Years of Service</th>
                <th className="th-style">Personnel Type</th>
                <th className="th-style rounded-tr-lg rounded-br-lg">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="tbody-style">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td
                    colSpan="10"
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    No employees found
                  </td>
                </tr>
              ) : (
                currentEmp.map((row) => (
                  <tr key={row.id} className="tr-style">
                    <td className="td-style font-medium">{row.employee_id}</td>
                    <td className="td-style text-left">
                      {row.first_name} {row.last_name}
                    </td>
                    <td className="td-style">{row.position_title}</td>
                    <td className="td-style">{row.hire_date}</td>
                    <td className="td-style">
                      {formatYearsOfService(row.hire_date)}
                    </td>
                    <td className="td-style">{row.personnel_type}</td>
                    <td className="td-style">
                      <button
                        className="bg-[#990100] text-white lg:text-sm text-xs px-4 py-[5px] rounded-lg hover:bg-[#ad3332] hover:scale-105 transition duration-300 ease-in-out cursor-pointer"
                        onClick={() => handleOpen(row)}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <ModalEmployees
            isOpen={isModalOpen}
            onClose={handleClose}
            employee={viewEmployee}
            onSave={updateEmployeeData}
            onDelete={deleteEmployee}
            departments={departments}
            positions={positions}
          />

          <ReportModal
            open={reportOpen}
            title="Generate Report - Employees"
            onClose={() => setReportOpen(false)}
            onGenerate={handleGenerateReport}
            enableDateRange={true}
            fileTypes={["XLSX", "CSV", "PDF"]}
            categoryOptions={[
              ...(selectedCount
                ? [
                    {
                      value: "selected",
                      label: `Selected Employees (${selectedCount})`,
                    },
                  ]
                : []),
              { value: "all", label: "All Employees" },
              { value: "active", label: "Active Employees" },
              { value: "inactive", label: "Inactive Employees" },
              { value: "standard", label: "Standard (Regular/Probationary)" },
              { value: "project_based", label: "Project-Based" },
            ]}
            defaultCategory={selectedCount ? "selected" : "all"}
          />
          <br />

          <div className="lg:flex items-center lg:justify-between">
            <p className="lg:text-md text-sm">
              Showing <b>{currentEmp.length}</b> of{" "}
              <b>{filteredEmployees.length}</b> employee
              {filteredEmployees.length !== 1 ? "s" : ""}
              {pageCount ? (
                <>
                  {" "}
                  | Page <b>{currentPage}</b> of <b>{pageCount}</b>
                </>
              ) : null}
            </p>

            <div className=" ">
              {pageCount > 0 && (
                <ReactPaginate
                  breakLabel="..."
                  nextLabel=">"
                  onPageChange={handlePageClick}
                  pageRangeDisplayed={2}
                  pageCount={pageCount}
                  forcePage={Math.floor(itemOffset / itemsPerPage)}
                  previousLabel="<"
                  renderOnZeroPageCount={null}
                  marginPagesDisplayed={2}
                  pageClassName=""
                  pageLinkClassName="cursor-pointer hover:text-gray-500 hover:underline"
                  previousClassName={
                    multiPages
                      ? "cursor-pointer hover:text-gray-500 hover:underline"
                      : "text-gray-400 cursor-not-allowed pointer-events-none"
                  }
                  previousLinkClassName="page-link"
                  nextClassName={
                    multiPages
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
        </div>
      </div>
    </div>
  );
}

export default Employees;