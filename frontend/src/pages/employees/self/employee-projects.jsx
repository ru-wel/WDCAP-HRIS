import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../../components/navbar.jsx';
import DropDownFilter from '../../../components/dropdownfilter.jsx';
import { get } from '../../../services/api.js';
import { compareDate, compareText } from '../../../utils/sort.js';

function ProjectCard({ project, onClick }) {
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
          <span className="inline-block px-6 py-2 rounded-xl text-sm font-semibold bg-gray-200 text-gray-700">
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
            <DropDownFilter
              value={sortOrder}
              onChange={setSortOrder}
              options={[
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
              ]}
            />

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
