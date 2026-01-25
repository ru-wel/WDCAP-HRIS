import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./././components/navbar.jsx";
import ReactPaginate from "react-paginate";
import { get } from "./././services/api.js";
import { compareNumber, compareText } from "./././utils/sort.js";

export default function EmployeeDepartments() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("department_az");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftSortOrder, setDraftSortOrder] = useState(sortOrder);

  const sortOptions = useMemo(
    () => [
      { value: "department_az", label: "Department: A - Z" },
      { value: "department_za", label: "Department: Z - A" },
      { value: "employees_count_high", label: "Employees Count: High - Low" },
      { value: "employees_count_low", label: "Employees Count: Low - High" },
    ],
    []
  );

  const defaultSort = "department_az";

  const activeFiltersCount = useMemo(() => {
    let n = 0;
    if (sortOrder !== defaultSort) n += 1;
    return n;
  }, [sortOrder]);

  useEffect(() => {
    if (!filtersOpen) return;
    setDraftSortOrder(sortOrder);
  }, [filtersOpen, sortOrder]);

  useEffect(() => {
    if (!filtersOpen) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") setFiltersOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [filtersOpen]);

  useEffect(() => {
    if (!filtersOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [filtersOpen]);

  const clearFilters = () => {
    setDraftSortOrder(defaultSort);
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
          ? "bg-[#990100] border-[#990100] text-white"
          : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50",
      ].join(" ")}
    >
      {children}
    </button>
  );

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const res = await get("/departments");
      const rows = Array.isArray(res?.data) ? res.data : [];
      setDepartments(rows);
    } catch (e) {
      console.error("Failed to load departments:", e);
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const filtered = useMemo(() => {
    if (!searchTerm) return departments;
    const q = searchTerm.toLowerCase();
    return departments.filter((d) =>
      String(d.department_name || "").toLowerCase().includes(q)
    );
  }, [departments, searchTerm]);

  const visibleDepartments = useMemo(() => {
    const sorted = [...filtered].sort((a, b) => {
      switch (sortOrder) {
        case "department_az":
          return compareText(a?.department_name, b?.department_name);
        case "department_za":
          return compareText(b?.department_name, a?.department_name);
        case "employees_count_high":
          return compareNumber(b?.employees_count, a?.employees_count);
        case "employees_count_low":
          return compareNumber(a?.employees_count, b?.employees_count);
        default:
          return compareText(a?.department_name, b?.department_name);
      }
    });

    return sorted;
  }, [filtered, sortOrder]);

  // Pagination
  const [itemOffset, setItemOffset] = useState(0);
  const itemsPerPage = 9;
  const endOffset = itemOffset + itemsPerPage;
  const currentItems = visibleDepartments.slice(itemOffset, endOffset);
  const pageCount = Math.ceil(visibleDepartments.length / itemsPerPage);

  useEffect(() => {
    setItemOffset(0);
  }, [searchTerm, sortOrder, departments.length]);

  const handlePageClick = (event) => {
    setItemOffset(event.selected * itemsPerPage);
  };

  return (
    <div>
      <Navbar />

      <div className="p-7 lg:mx-[4.5rem] md:mx-10">
        <div className="md:flex justify-between items-center w-full">
          <h1 className="lg:text-3xl text-2xl text-[#990100] font-bold md:mb-0 mb-5">
            Departments
          </h1>

          <div className="flex items-center justify-end md:gap-4 gap-3">
            <div className="relative" data-filters-root="true">
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
                      <p className="text-sm font-semibold text-gray-700 mb-2">
                        Sort
                      </p>
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
                name="search"
                placeholder="Search"
                className="bg-white lg:h-10 md:h-9 h-8 px-2 lg:pr-10 md:pr-5 pr-5 md:w-auto w-35 rounded-lg text-sm focus:outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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

        <div className="mt-6">
          {loading ? (
            <div className="text-sm text-gray-600">Loading departments…</div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-gray-600">No departments found.</div>
          ) : (
            <div className="grid lg:grid-cols-3 md:grid-cols-2 grid-cols-1 gap-6">
              {currentItems.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => navigate(`/employees/departments/${d.id}`)}
                  className="text-left bg-[#EDEDED] rounded-lg shadow-lg px-7 pt-6 pb-6 hover:scale-105 transition duration-300 ease-in-out"
                >
                  <h2 className="text-xl font-bold text-[#990100]">
                    {d.department_name}
                  </h2>

                  <div className="flex items-center gap-4 pt-4">
                    <img
                      src="/icons/red-employees.png"
                      alt="employees"
                      className="w-9 h-9"
                    />
                    <p className="text-lg">
                      <span className="font-medium">
                        {Number(d.employees_count ?? 0)}
                      </span>{" "}
                      employee{Number(d.employees_count ?? 0) !== 1 ? "s" : ""}
                    </p>
                  </div>
                </button>
              ))}
            </div>
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
      </div>
    </div>
  );
}