import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../../components/navbar.jsx';
import { get } from '../../../services/api.js';
import { compareDate, compareText } from '../../../utils/sort.js';

function ProjectCard({ project, onClick }) {

  const statusStyle = (status) => {
  const key = String(status || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_');

  switch (key) {
    case 'ACTIVE':
      return 'bg-[#C8C8FF] text-[#0000FF]';
    case 'COMPLETED':
      return 'bg-[#198C19]/25 text-[#198C19]';
    case 'ON_HOLD':
      return 'bg-[#FFA500]/25 text-[#FFA500]';
    case 'CANCELLED':
      return 'bg-[#CC0000]/25 text-[#CC0000]';
    default:
      return 'bg-gray-200 text-gray-700';
  }
};

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
  };

  const dateRange = `${formatDate(project.start_date)} to ${formatDate(project.end_date)}`;

  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left w-full hover:scale-105 transition duration-300 ease-in-out"
    >
      <div className="bg-[#FFFFFF] border border-gray-300 rounded-lg shadow-lg px-6 py-5 min-h-[170px] flex flex-col justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#990100] mb-3">
            {project.project_name || 'Project'}
          </h2>

          <div className="flex items-center text-base mb-2 gap-2">
            <img src="icons/red-location.png" alt="location" className="w-4 h-4" />
            <span>{project.site_location || '—'}</span>
          </div>

          <div className="flex items-center text-base gap-2">
            <img src="icons/red-leave.png" alt="calendar" className="w-4 h-4" />
            <span>{dateRange.trim() === 'to' ? '—' : dateRange}</span>
          </div>
        </div>

        <div className="mt-4">
          <span className={`inline-block px-6 py-2 rounded-xl text-sm font-semibold ${statusStyle(project.status)}`}>
            {project.status || '—'}
          </span>
        </div>
      </div>
    </button>
  );
}

export default function EmployeeProjects() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('project_name_az');
  const [isProjectBased, setIsProjectBased] = useState(false);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftSortOrder, setDraftSortOrder] = useState(sortOrder);

  const sortOptions = useMemo(
    () => [
      { value: 'project_name_az', label: 'Project Name: A - Z' },
      { value: 'project_name_za', label: 'Project Name: Z - A' },
      { value: 'site_location_az', label: 'Site Location: A - Z' },
      { value: 'site_location_za', label: 'Site Location: Z - A' },
      { value: 'status_az', label: 'Status: A - Z' },
      { value: 'status_za', label: 'Status: Z - A' },
      { value: 'start_date_newest', label: 'Start Date: Newest' },
      { value: 'start_date_oldest', label: 'Start Date: Oldest' },
      { value: 'end_date_newest', label: 'End Date: Newest' },
      { value: 'end_date_oldest', label: 'End Date: Oldest' },
    ],
    []
  );

  const defaultSort = 'project_name_az';

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

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await get('/projects/my');
      const rows = Array.isArray(res?.data) ? res.data : [];
      setProjects(rows);
    } catch (e) {
      console.error('Failed to load projects:', e);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const run = async () => {
      try {
        const me = await get('/employees/me');
        const personnel = String(me?.data?.personnel_type || '').trim().toLowerCase();
        const isPb = personnel === 'project-based' || personnel === 'project based';
        setIsProjectBased(isPb);
        if (!isPb) await fetchProjects();
      } catch {
        setIsProjectBased(false);
        await fetchProjects();
      }
    };
    run();
  }, []);

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return projects;
    const q = searchTerm.toLowerCase();
    return projects.filter((p) => {
      const name = String(p.project_name || '').toLowerCase();
      const loc = String(p.site_location || '').toLowerCase();
      return name.includes(q) || loc.includes(q);
    });
  }, [projects, searchTerm]);

  const visibleProjects = useMemo(() => {
    const sorted = [...filtered].sort((a, b) => {
      switch (sortOrder) {
        case 'project_name_az':
          return compareText(a?.project_name, b?.project_name);
        case 'project_name_za':
          return compareText(b?.project_name, a?.project_name);
        case 'site_location_az':
          return compareText(a?.site_location, b?.site_location);
        case 'site_location_za':
          return compareText(b?.site_location, a?.site_location);
        case 'status_az':
          return compareText(a?.status, b?.status);
        case 'status_za':
          return compareText(b?.status, a?.status);
        case 'start_date_newest':
          return compareDate(b?.start_date, a?.start_date);
        case 'start_date_oldest':
          return compareDate(a?.start_date, b?.start_date);
        case 'end_date_newest':
          return compareDate(b?.end_date, a?.end_date);
        case 'end_date_oldest':
          return compareDate(a?.end_date, b?.end_date);
        default:
          return compareText(a?.project_name, b?.project_name);
      }
    });

    return sorted;
  }, [filtered, sortOrder]);

  return (
    <div>
      <Navbar />

      <div className="p-7 lg:mx-[4.5rem] md:mx-10">
        <div className="md:flex justify-between items-center w-full">
          <h1 className="lg:text-3xl text-2xl text-[#990100] font-bold md:mb-0 mb-5">Projects</h1>

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

        <div className="mt-6">
          {isProjectBased ? (
            <div className="text-sm text-gray-600">Projects are not available for Project-Based employees.</div>
          ) : loading ? (
            <div className="text-sm text-gray-600">Loading projects…</div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-gray-600">No Projects Displayed at the moment.</div>
          ) : (
            <div className="grid lg:grid-cols-3 md:grid-cols-2 grid-cols-1 gap-6">
              {visibleProjects.map((p) => (
                <ProjectCard key={p.id} project={p} onClick={() => navigate(`/projects/${p.id}`)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
