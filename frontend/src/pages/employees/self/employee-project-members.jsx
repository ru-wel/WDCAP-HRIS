import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { get } from '../../../services/api.js';
import { compareText } from '../../../utils/sort.js';

const formatDate = (dateString) => {
  if (!dateString) return '—';
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric'
  });
};

export default function EmployeeProjectMembers() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [projectName, setProjectName] = useState('Project');
  const [projectDetails, setProjectDetails] = useState(null);
  const [members, setMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('name_az');

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftSortOrder, setDraftSortOrder] = useState(sortOrder);

  const sortOptions = useMemo(
    () => [
      { value: 'employee_id_asc', label: 'Employee ID: Ascending' },
      { value: 'employee_id_desc', label: 'Employee ID: Descending' },
      { value: 'name_az', label: 'Name: A - Z' },
      { value: 'name_za', label: 'Name: Z - A' },
      { value: 'position_az', label: 'Position: A - Z' },
      { value: 'position_za', label: 'Position: Z - A' },
      { value: 'status_az', label: 'Status: A - Z' },
      { value: 'status_za', label: 'Status: Z - A' },
    ],
    []
  );

  const defaultSort = 'name_az';

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
      if (e.key === 'Escape') setFiltersOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [filtersOpen]);

  useEffect(() => {
    if (!filtersOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
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
        'px-3 py-1.5 rounded-full text-xs font-semibold border transition',
        active
          ? 'bg-[#990100] border-[#990100] text-white'
          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50',
      ].join(' ')}
    >
      {children}
    </button>
  );

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError('');

      const [projRes, membersRes] = await Promise.all([
        get(`/projects/${projectId}`),
        get(`/projects/${projectId}/members`)
      ]);

      if (projRes?.success) {
        setProjectName(projRes?.data?.project_name || 'Project');
        setProjectDetails(projRes?.data || null);
      } else {
        setProjectDetails(null);
      }

      const rows = Array.isArray(membersRes?.data) ? membersRes.data : [];
      setMembers(rows);
    } catch (e) {
      console.error('Failed to load project members:', e);
      setError(e?.message || 'Failed to load project members');
      setMembers([]);
      setProjectDetails(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const flattened = useMemo(() => {
    return members.map((a) => {
      const emp = a?.employees;
      return {
        id: a?.id,
        status: a?.status,
        employee_id: emp?.employee_id,
        name: `${emp?.first_name || ''} ${emp?.last_name || ''}`.trim(),
        position: emp?.positions?.position_title || 'N/A'
      };
    });
  }, [members]);

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return flattened;
    const q = searchTerm.toLowerCase();
    return flattened.filter((m) => {
      const employeeCode = String(m.employee_id || '').toLowerCase();
      const name = String(m.name || '').toLowerCase();
      const position = String(m.position || '').toLowerCase();
      const status = String(m.status || '').toLowerCase();
      return employeeCode.includes(q) || name.includes(q) || position.includes(q) || status.includes(q);
    });
  }, [flattened, searchTerm]);

  const visibleMembers = useMemo(() => {
    const sorted = [...filtered].sort((a, b) => {
      switch (sortOrder) {
        case 'employee_id_asc':
          return compareText(a?.employee_id, b?.employee_id);
        case 'employee_id_desc':
          return compareText(b?.employee_id, a?.employee_id);
        case 'name_az':
          return compareText(a?.name, b?.name);
        case 'name_za':
          return compareText(b?.name, a?.name);
        case 'position_az':
          return compareText(a?.position, b?.position);
        case 'position_za':
          return compareText(b?.position, a?.position);
        case 'status_az':
          return compareText(a?.status, b?.status);
        case 'status_za':
          return compareText(b?.status, a?.status);
        default:
          return compareText(a?.name, b?.name);
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
            onClick={() => navigate('/projects')}
            className="text-[#990100] hover:text-[#CC0000] transition-colors flex items-center gap-1 text-sm font-medium cursor-pointer"
          >
            <span className="text-xl">←</span>Back
          </button>
          <span className="text-gray-300">|</span>
          <h1 className="lg:text-3xl text-2xl text-[#990100] font-bold md:mb-0">
            {projectName} Members
          </h1>
        </div>

        <div className="flex items-center justify-end md:gap-4 gap-3 md:mt-0 mt-5">
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
              <img src="/icons/red-search.png" className="lg:w-5 lg:h-5 w-4 h-4 items-center" alt="search" />
            </button>
          </div>
        </div>
      </div>

      <hr className="text-[#990100] mt-6" />

      <div className="mt-6 bg-white rounded-lg border border-gray-200 shadow-lg p-5">
        <h2 className="text-lg font-semibold text-[#990100]">Project Overview</h2>

        <div className="mt-3 rounded-md border border-gray-200 overflow-hidden">
          <div className="bg-[#EDEDED] px-4 py-3">
            <p className="text-center font-bold text-gray-900 tracking-wide uppercase">
              {(projectDetails?.project_name || projectName || `Project #${projectId}`) +
                (projectDetails?.site_location ? `, ${projectDetails.site_location}` : '')}
            </p>
          </div>

          <div className="px-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-[180px_12px_1fr] gap-y-2 text-sm text-gray-900">
              <div className="font-semibold uppercase tracking-wide">Project ID</div>
              <div className="font-semibold hidden sm:block">:</div>
              <div className="break-words">{projectDetails?.project_code || projectId || '—'}</div>

              <div className="font-semibold uppercase tracking-wide">Project Name</div>
              <div className="font-semibold hidden sm:block">:</div>
              <div className="break-words">{projectDetails?.project_name || '—'}</div>

              <div className="font-semibold uppercase tracking-wide">Status</div>
              <div className="font-semibold hidden sm:block">:</div>
              <div className="break-words">{projectDetails?.status || '—'}</div>

              <div className="font-semibold uppercase tracking-wide">Date Started</div>
              <div className="font-semibold hidden sm:block">:</div>
              <div className="break-words">{formatDate(projectDetails?.start_date)}</div>

              <div className="font-semibold uppercase tracking-wide">Contract Completion Date</div>
              <div className="font-semibold hidden sm:block">:</div>
              <div className="break-words">{formatDate(projectDetails?.end_date)}</div>

              <div className="font-semibold uppercase tracking-wide">Location</div>
              <div className="font-semibold hidden sm:block">:</div>
              <div className="break-words">{projectDetails?.site_location || '—'}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="text-sm text-gray-600">Loading members…</div>
        ) : error ? (
          <div className="text-sm text-red-700">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-gray-600">No members found.</div>
        ) : (
          <div className="div-table">
            <table className="table-style">
              <thead className="thead-style">
                <tr>
                  <th className="th-style rounded-tl-lg rounded-bl-lg">Employee ID</th>
                  <th className="th-style">Name</th>
                  <th className="th-style">Position</th>
                  <th className="th-style rounded-tr-lg rounded-br-lg">Status</th>
                </tr>
              </thead>
              <tbody className="tbody-style">
                {visibleMembers.map((m) => (
                  <tr key={m.id || m.employee_id} className="tr-style">
                    <td className="td-style">{m.employee_id || '—'}</td>
                    <td className="td-style">{m.name || '—'}</td>
                    <td className="td-style">{m.position}</td>
                    <td className="td-style">{m.status || '—'}</td>
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
