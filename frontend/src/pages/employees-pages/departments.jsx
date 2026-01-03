import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/navbar";
import DropDownFilter from "../components/dropdownfilter";
import ReactPaginate from "react-paginate";
import { del, get, post, put } from "../../services/api.js";

function DepartmentCard({
  id,
  name,
  employeesCount,
  mode,
  editedName,
  onNameChange,
  onConfirmDelete,
  onOpen,
}) {
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (mode !== "delete") setIsDeleting(false);
  }, [mode]);

  const showDeleteOverlay = mode === "delete" && !isDeleting;
  const isClickable = mode === "view";

  const CardWrapper = isClickable ? "button" : "div";

  return (
    <CardWrapper
      type={isClickable ? "button" : undefined}
      onClick={isClickable ? onOpen : undefined}
      className={`relative bg-[#FFFFFF] border border-gray-300 rounded-lg shadow-lg px-7 pt-6 transition-all duration-300 text-left w-full
        ${showDeleteOverlay ? "pb-20" : "pb-6"}
        ${isClickable ? "hover:scale-105 cursor-pointer" : ""}
      `}
      style={{ minHeight: isDeleting ? 210 : 140 }}
    >
      {mode === "edit" ? (
        <input
          value={editedName}
          onChange={(e) => onNameChange(id, e.target.value)}
          className="w-full text-xl font-bold 
                     text-[#990100]/70
                     focus:border-[#990100] project-field bg-gray-100"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <h2
          className={`lg:text-xl text-lg font-bold ${
            mode === "delete" ? "text-[#c98b8b]" : "text-[#990100]"
          }`}
        >
          {name}
        </h2>
      )}

      <div className="flex items-center gap-4 pt-4">
        <img src="/icons/red-employees.png" alt="employees" className="md:w-9 md:h-9 w-8 h-8" />
        <p className="lg:text-lg text-md">
          <span className="font-medium">{employeesCount}</span> employee
          {employeesCount !== 1 ? "s" : ""}
        </p>
      </div>

      {mode === "delete" && (
        <>
          {showDeleteOverlay && (
            <div className="absolute bottom-4 left-0 right-0 flex justify-center z-10">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDeleting(true);
                }}
                className="cursor-pointer bg-red-700 text-white px-5 py-2 rounded-md shadow-md
                           hover:bg-red-600 hover:scale-105
                           transition duration-300 ease-in-out"
              >
                Delete Department
              </button>
            </div>
          )}

          {isDeleting && (
            <div className="mt-8 flex justify-center gap-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDeleting(false);
                }}
                className="cursor-pointer bg-gray-300 text-gray-800 px-4 py-2 rounded-md
                           hover:bg-gray-400 hover:scale-105
                           transition duration-300 ease-in-out"
              >
                Cancel
              </button>
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
                Confirm Delete
              </button>
            </div>
          )}
        </>
      )}
    </CardWrapper>
  );
}

function NewDepartmentCard({ value, onChange }) {
  return (
    <div className="bg-[#FFFFFF] border border-gray-300 rounded-lg shadow-lg px-7 py-6 min-h-[140px]">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type Department Name.."
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

  // PAGE TITLE
  useEffect(() => {
    document.title = "ARISE | DEPARTMENTS"; 
  }, []);

  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [mode, setMode] = useState("view");
  const [newDeptName, setNewDeptName] = useState("");
  const [editedNames, setEditedNames] = useState({});

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
    if (!searchTerm) return departments;
    return departments.filter((d) =>
      d.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [departments, searchTerm]);

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
  }, [searchTerm, mode]);

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
  };

  const startDelete = () => setMode("delete");

  const saveChanges = async () => {
    try {
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
    } catch (e) {
      console.error("Failed to save changes:", e);
      alert(e.message || "Failed to save changes");
    }
  };

  const confirmDelete = async (id) => {
    try {
      const response = await del(`/departments/${id}`);
      if (response?.success) {
        setDepartments((prev) => prev.filter((d) => d.id !== id));
      }
    } catch (e) {
      console.error("Failed to delete department:", e);
      alert(e.message || "Failed to delete department");
    }
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
            <DropDownFilter />
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

        <div className="flex justify-end flex-wrap">
          {isWorking ? (
            <button
              className="green-button mt-6"
              onClick={saveChanges}
              disabled={saveDisabled}
            >
              Save Changes
            </button>
          ) : (
            <div className="flex justify-end mt-6 gap-3 flex-wrap">
              <button
                onClick={startDelete}
                className="generate-report-button"
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
                onConfirmDelete={() => confirmDelete(dept.id)}
                onOpen={() => openDepartment(dept)}
              />
            )
          )}
        </div>

        <div className="flex justify-end mt-6 text-[#990100]">
          <ReactPaginate
            previousLabel="<"
            nextLabel=">"
            pageCount={pageCount}
            onPageChange={handlePageClick}
            containerClassName="flex gap-3"
            activeClassName="underline font-bold"
          />
        </div>

          </>
        )}
      </div>
    </div>
  );
}