import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/navbar";
import DropDownFilter from "../components/dropdownfilter";
import ReactPaginate from "react-paginate";

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
      className={`relative bg-[#EDEDED] rounded-lg shadow-lg px-7 pt-6 transition-all duration-300 text-left w-full
        ${showDeleteOverlay ? "pb-20" : "pb-6"}
        ${isClickable ? "hover:scale-105 cursor-pointer" : ""}
      `}
      style={{ minHeight: isDeleting ? 210 : 140 }}
    >
      {mode === "edit" ? (
        <input
          value={editedName}
          onChange={(e) => onNameChange(id, e.target.value)}
          className="w-full bg-transparent text-xl font-bold outline-none
                     text-[#990100] border-b border-transparent
                     focus:border-[#990100]"
          onClick={(e) => e.stopPropagation()}
        />
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

  const [departments, setDepartments] = useState([
    { id: 1, name: "HR Department", employees: 4 },
    { id: 2, name: "Finance Department", employees: 6 },
    { id: 3, name: "IT Department", employees: 5 },
    { id: 4, name: "Marketing Department", employees: 3 },
    { id: 5, name: "Operations Department", employees: 7 },
    { id: 6, name: "Admin Department", employees: 2 },
    { id: 7, name: "Legal Department", employees: 1 },
    { id: 8, name: "Procurement Department", employees: 3 },
    { id: 9, name: "Engineering Department", employees: 10 },
  ]);

  const [searchTerm, setSearchTerm] = useState("");
  const [mode, setMode] = useState("view");
  const [newDeptName, setNewDeptName] = useState("");
  const [editedNames, setEditedNames] = useState({});

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

  const saveChanges = () => {
    if (mode === "add" && newDeptName.trim()) {
      setDepartments((prev) => [
        { id: Date.now(), name: newDeptName.trim(), employees: 0 },
        ...prev,
      ]);
    }

    if (mode === "edit") {
      setDepartments((prev) =>
        prev.map((d) => ({
          ...d,
          name: editedNames[d.id]?.trim() || d.name,
        }))
      );
    }

    setMode("view");
    setNewDeptName("");
  };

  const confirmDelete = (id) => {
    setDepartments((prev) => prev.filter((d) => d.id !== id));
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

        <div className="flex justify-end mt-6">
          {isWorking ? (
            <button
              className="green-button"
              onClick={saveChanges}
              disabled={saveDisabled}
            >
              Save Changes
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
      </div>
    </div>
  );
}