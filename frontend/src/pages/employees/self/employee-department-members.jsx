import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { get } from "../../../services/api.js";
import { compareText } from "../../../utils/sort.js";

export default function EmployeeDepartmentMembers() {
  const { departmentId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [departmentName, setDepartmentName] = useState("Department");
  const [members, setMembers] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("name_az");

  // ✅ copied filter design behavior from departments-employees.jsx
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftSortOrder, setDraftSortOrder] = useState(sortOrder);

  const defaultSort = useMemo(() => "name_az", []);

  const activeFiltersCount = useMemo(() => {
    let n = 0;
    if (sortOrder !== defaultSort) n += 1;
    return n;
  }, [sortOrder, defaultSort]);

  useEffect(() => {
    if (!filtersOpen) return;
    setDraftSortOrder(sortOrder);
  }, [filtersOpen, sortOrder]);

  const sortOptions = useMemo(
    () => [
      { value: "employee_id_asc", label: "Employee ID: Ascending" },
      { value: "employee_id_desc", label: "Employee ID: Descending" },
      { value: "name_az", label: "Name: A - Z" },
      { value: "name_za", label: "Name: Z - A" },
      { value: "position_az", label: "Position: A - Z" },
      { value: "position_za", label: "Position: Z - A" },
    ],
    []
  );

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
          ? "bg-[#990100] text-white border-[#990100]"
          : "bg-white text-[#990100] border-[#990100] hover:bg-[#990100]/10",
      ].join(" ")}
    >
      {children}
    </button>
  );

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError("");

      const [deptRes, membersRes] = await Promise.all([
        get(`/departments/${departmentId}`),
        get(`/departments/${departmentId}/members`),
      ]);

      if (deptRes?.success) {
        setDepartmentName(deptRes?.data?.department_name || "Department");
      }

      const rows = Array.isArray(membersRes?.data) ? membersRes.data : [];

      // Normalize fields so search/sort work even if API response shape differs
      const mapped = rows.map((m, idx) => {
        const firstName = m?.first_name ?? m?.firstname ?? "";
        const lastName = m?.last_name ?? m?.lastname ?? "";
        const fullName = `${firstName} ${lastName}`.trim();

        const employeeId =
          m?.employee_id ??
          m?.employee_code ??
          m?.employee_no ??
          m?.id ??
          `row_${idx}`;

        const positionTitle =
          m?.position_title ??
          m?.positions?.position_title ??
          m?.position?.position_title ??
          (Array.isArray(m?.positions)
            ? m?.positions?.[0]?.position_title
            : undefined) ??
          "N/A";

        return {
          ...m,
          __row_key: employeeId,
          __full_name: fullName,
          __position_title: positionTitle,
        };
      });

      setMembers(mapped);
    } catch (e) {
      console.error("Failed to load department members:", e);
      setError(e?.message || "Failed to load department members");
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (departmentId) fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departmentId]);

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return members;
    const q = searchTerm.toLowerCase();

    return members.filter((m) => {
      const employeeCode = String(
        m?.employee_id ?? m?.employee_code ?? m?.employee_no ?? ""
      ).toLowerCase();

      const name = String(
        m?.__full_name ?? `${m?.first_name || ""} ${m?.last_name || ""}`
      )
        .toLowerCase()
        .trim();

      const position = String(
        m?.__position_title ??
          m?.position_title ??
          m?.positions?.position_title ??
          ""
      ).toLowerCase();

      return employeeCode.includes(q) || name.includes(q) || position.includes(q);
    });
  }, [members, searchTerm]);

  const visibleMembers = useMemo(() => {
    const sorted = [...filtered].sort((a, b) => {
      const aName = String(
        a?.__full_name ?? `${a?.first_name || ""} ${a?.last_name || ""}`
      ).trim();
      const bName = String(
        b?.__full_name ?? `${b?.first_name || ""} ${b?.last_name || ""}`
      ).trim();

      switch (sortOrder) {
        case "employee_id_asc":
          return compareText(
            a?.employee_id ?? a?.employee_code ?? a?.employee_no ?? a?.id,
            b?.employee_id ?? b?.employee_code ?? b?.employee_no ?? b?.id
          );
        case "employee_id_desc":
          return compareText(
            b?.employee_id ?? b?.employee_code ?? b?.employee_no ?? b?.id,
            a?.employee_id ?? a?.employee_code ?? a?.employee_no ?? a?.id
          );
        case "name_az":
          return compareText(aName, bName);
        case "name_za":
          return compareText(bName, aName);
        case "position_az":
          return compareText(
            a?.__position_title ?? a?.position_title ?? a?.positions?.position_title,
            b?.__position_title ?? b?.position_title ?? b?.positions?.position_title
          );
        case "position_za":
          return compareText(
            b?.__position_title ?? b?.position_title ?? b?.positions?.position_title,
            a?.__position_title ?? a?.position_title ?? a?.positions?.position_title
          );
        default:
          return compareText(aName, bName);
      }
    });

    return sorted;
  }, [filtered, sortOrder]);

  return (
    <div className="p-7 lg:mx-[4.5rem] md:mx-10">
      <div className="md:flex justify-between items-center w-full">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/employees/departments")}
            className="text-[#990100] hover:text-[#CC0000] transition-colors flex items-center gap-1 text-sm font-medium cursor-pointer"
          >
            <span className="text-xl">←</span>Back
          </button>
          <span className="text-gray-300">|</span>
          <h1 className="lg:text-3xl text-2xl text-[#990100] font-bold md:mb-0">
            {departmentName} Members
          </h1>
        </div>

        {/* ✅ Filter design copied from departments-employees.jsx */}
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
          <div className="text-sm text-gray-600">Loading members…</div>
        ) : error ? (
          <div className="text-sm text-red-700">{error}</div>
        ) : visibleMembers.length === 0 ? (
          <div className="text-sm text-gray-600">No members found.</div>
        ) : (
          <div className="div-table">
            <table className="table-style">
              <thead className="thead-style">
                <tr>
                  <th className="th-style rounded-tl-lg rounded-bl-lg">
                    Employee ID
                  </th>
                  <th className="th-style">Name</th>
                  <th className="th-style rounded-tr-lg rounded-br-lg">
                    Position
                  </th>
                </tr>
              </thead>

              <tbody className="tbody-style">
                {visibleMembers.map((m) => (
                  <tr
                    key={String(m?.__row_key ?? m?.employee_id ?? m?.id)}
                    className="tr-style"
                  >
                    <td className="td-style">
                      {m?.employee_id ?? m?.employee_code ?? m?.employee_no ?? "—"}
                    </td>
                    <td className="td-style">
                      {String(
                        m?.__full_name ??
                          `${m?.first_name || ""} ${m?.last_name || ""}`
                      ).trim() || "—"}
                    </td>
                    <td className="td-style">
                      {m?.__position_title ??
                        m?.position_title ??
                        m?.positions?.position_title ??
                        "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
