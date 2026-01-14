import React, { useCallback, useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/navbar";
import DropDownFilter from "../../components/dropdownfilter";
import { get, post, put, del } from "../../services/api.js";
import { PROJECT_STATUSES } from "../../constants/config.js";
import ReactPaginate from 'react-paginate';
import ConfirmModal from "../../components/confirm-modal.jsx";
import { compareDate, compareText } from "../../utils/sort";
import { exportRowsToCsv } from "../../utils/csv.js";
import { exportRowsToXlsx } from "../../utils/excel.js";
import ReportModal from '../../components/report-modal.jsx';
import { filterRowsByDateRange } from '../../utils/reporting.js';
import { exportReportToPdf } from '../../utils/pdf.js';

function ViewProjectCard({ project, index, onClick }) {
  // format dates for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
  }

  const dateRange = `${formatDate(project.start_date)} to ${formatDate(project.end_date)}`;

  // change format according to status
  const statusStyle = (status) => {
    switch(status) {
      case PROJECT_STATUSES.ACTIVE:
        return "bg-[#C8C8FF] text-[#0000FF]"; 
              case PROJECT_STATUSES.COMPLETED:
        return "text-[#198C19] bg-[#198C19]/25";
      case PROJECT_STATUSES.ON_HOLD:
        return "bg-[#FFA500]/25 text-[#FFA500]";
      case PROJECT_STATUSES.CANCELLED:
        return "bg-[#CC0000]/25 text-[#CC0000]";
      default:
        return "bg-gray-200 text-gray-600";
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left w-full hover:scale-105 transition duration-300 ease-in-out"
    >
      <div className="bg-[#FFFFFF] border border-gray-300 rounded-lg shadow-lg px-6 py-5 min-h-[170px] flex flex-col justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#990100] mb-3">
            {project.project_name || `Project #${index + 1}`}
          </h2>

          <div className="flex items-center text-base mb-2 gap-2">
            <img
              src="icons/red-location.png"
              alt="location"
              className="w-4 h-4"
            />
            <span>{project.site_location}</span>
          </div>

          <div className="flex items-center text-base gap-2">
            <img
              src="icons/red-leave.png"
              alt="calendar"
              className="w-4 h-4"
            />
            <span>{dateRange}</span>
          </div>
        </div>

        <div className="mt-4">
          <span className={`inline-block px-6 py-2 rounded-xl text-sm font-semibold ${statusStyle(project.status)}`}>
            {project.status}
          </span>
        </div>
      </div>
    </button>
  );
}

function EditableProjectCard({ project, index, onChange, onDelete, onSave, loading }) {
  const handleChange = (field, value) => {
    onChange(project.id, field, value);
  };

  const handleSaveClick = async () => {
    await onSave(project);
  }

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="bg-[#EDEDED] rounded-lg shadow-lg px-6 py-5 min-h-[170px] flex flex-col justify-between">
      <h2 className="text-xl font-bold text-[#990100] mb-2">
        {project.project_name || `Project #${index + 1}`}
      </h2>

      {/* PROJECT NAME INPUT */}
      <div className="mb-3">
        <label className="block text-sm font-semibold mb-1">
          Project Name
        </label>
        <input
          type="text"
          value={project.project_name || ''}
          onChange={(e) => handleChange("project_name", e.target.value)}
          className="w-full project-field"
          placeholder="Enter project name"
          disabled={loading}
        />
      </div>

      <div className="mb-3 flex items-center gap-2">
        <img
          src="icons/red-location.png"
          alt="location"
          className="w-4 h-4 mt-[2px]"
        />
        <input
          type="text"
          value={project.site_location || ''}
          onChange={(e) => handleChange("site_location", e.target.value)}
          className="flex-1 project-field"
          placeholder="Location"
          disabled={loading}
        />
      </div>

      <div className="mb-3 flex items-center gap-2">
        <img
          src="icons/red-leave.png"
          alt="calendar"
          className="w-4 h-4 mt-[2px]"
        />
        <input
          type="date"
          value={project.start_date || ''}
          onChange={(e) => handleChange("start_date", e.target.value)}
          className="project-field w-[40%]"
          max={project.end_date || today}
          disabled={loading}
        />
        <span className="text-sm">to</span>
        <input
          type="date"
          value={project.end_date || ''}
          onChange={(e) => handleChange("end_date", e.target.value)}
          className="project-field w-[40%]"
          min={project.start_date || today}
          disabled={loading}
        />
      </div>

      <div className="mb-4 flex items-center gap-2">
        <span className="w-4" />
        <select
          value={project.status || PROJECT_STATUSES.ACTIVE}
          onChange={(e) => handleChange("status", e.target.value)}
          className="project-field w-40"
          disabled={loading}
        >
          <option value={PROJECT_STATUSES.ACTIVE}>{PROJECT_STATUSES.ACTIVE}</option>
          <option value={PROJECT_STATUSES.COMPLETED}>{PROJECT_STATUSES.COMPLETED}</option>
          <option value={PROJECT_STATUSES.ON_HOLD}>{PROJECT_STATUSES.ON_HOLD}</option>
          <option value={PROJECT_STATUSES.CANCELLED}>{PROJECT_STATUSES.CANCELLED}</option>
        </select>
      </div>

      {/* BALIKAN MO TO */}

      <div className="flex justify-center items-center gap-4 ">
        <button
          onClick={handleSaveClick}
          disabled={loading}
          className="bg-[#22C55E] text-white px-6 py-2 rounded-full lg:text-sm text-xs font-medium hover:bg-[#16A34A] hover:scale-105 transition duration-300 ease-in-out disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save'}
        </button>

       <button
          onClick={() => onDelete(project.id)}
          className="bg-[#CC0000] text-white lg:px-6 px-5 py-2 rounded-full lg:text-sm text-xs font-medium hover:bg-[#aa0000] hover:scale-105 transition duration-300 ease-in-out disabled:opacity-50"
        >
          Delete Project
        </button>
      {/* BALIKAN MO TO */}
      </div>
      
      {/*<div className="flex justify-center">
       
      </div>*/}
    </div>
  );
}

function NewProjectCard({ values, onChange, onSave, loading }) {
  const handleChange = (field, value) => {
    onChange({ ...values, [field]: value });
  };

  return (
    <div className="bg-[#EDEDED] rounded-lg shadow-lg px-6 py-5 min-h-[170px] flex flex-col justify-between">
      <h2 className="text-xl font-bold text-[#c4bcbc] mb-2">
        {`New Project`}
      </h2>

      {/* PROJECT NAME INPUT */}
      <div className="mb-3">
        <label className="block text-sm font-semibold mb-1">
          Project Name
        </label>
        <input
          type="text"
          value={values.project_name || ''}
          onChange={(e) => handleChange("project_name", e.target.value)}
          className="w-full border border-gray-400 rounded-sm px-2 py-1 text-sm bg-white"
          placeholder="Enter project name"
          disabled={loading}
        />
      </div>

      <div className="mb-3 flex items-center gap-2">
        <img
          src="icons/red-location.png"
          alt="location"
          className="w-4 h-4 mt-[2px]"
        />
        <input
          type="text"
          value={values.site_location || ''}
          onChange={(e) => handleChange("site_location", e.target.value)}
          className="flex-1 border border-gray-400 rounded-sm px-2 py-1 text-sm bg-white"
          placeholder="Location"
          disabled={loading}
        />
      </div>

      <div className="mb-3 flex items-center gap-2">
        <img
          src="icons/red-leave.png"
          alt="calendar"
          className="w-4 h-4 mt-[2px]"
        />
        <input
          type="date"
          value={values.start_date || ''}
          onChange={(e) => handleChange("start_date", e.target.value)}
          className="border border-gray-400 rounded-sm px-2 py-1 text-sm bg-white w-[40%]"
          placeholder="Start Date"
          min={values.start_date}
          disabled={loading}
        />
        <span className="text-sm">to</span>
        <input
          type="date"
          value={values.end_date || ''}
          onChange={(e) => handleChange("end_date", e.target.value)}
          className="border border-gray-400 rounded-sm px-2 py-1 text-sm bg-white w-[40%]"
          placeholder="End Date"
          min={values.start_date}
          disabled={loading}
        />
      </div>

      <div className="mb-1 flex items-center gap-2">
        <span className="w-4" />
        <select
          value={values.status || PROJECT_STATUSES.ACTIVE}
          onChange={(e) => handleChange("status", e.target.value)}
          className="border border-gray-400 rounded-sm px-2 py-1 text-sm bg-white w-40"
          disabled={loading}
        >
          <option value={PROJECT_STATUSES.ACTIVE}>{PROJECT_STATUSES.ACTIVE}</option>
          <option value={PROJECT_STATUSES.COMPLETED}>{PROJECT_STATUSES.COMPLETED}</option>
          <option value={PROJECT_STATUSES.ON_HOLD}>{PROJECT_STATUSES.ON_HOLD}</option>
          <option value={PROJECT_STATUSES.CANCELLED}>{PROJECT_STATUSES.CANCELLED}</option>
        </select>
      </div>

      <div className="flex justify-center mt-3">
        <button
          onClick={onSave}
          disabled={loading || !values.project_name || !values.site_location}
          className="bg-[#16A34A] text-white px-6 py-2 rounded-full text-sm font-medium hover:bg-[#15803D] hover:scale-105 transition duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating ...' : 'Create Project'}
        </button>
      </div>
    </div>
  );
}

function Projects() {
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [mode, setMode] = useState("view");
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [draftProject, setDraftProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('project_name_az');
  const [reportOpen, setReportOpen] = useState(false);
  const [showUpdateActions, setShowUpdateActions] = useState(false);
  const [confirmState, setConfirmState] = useState({
    open: false,
    title: 'Confirmation',
    message: '',
    confirmText: 'OK',
    cancelText: 'Cancel',
    onConfirm: null,
  });

  const [confirmBusy, setConfirmBusy] = useState(false);

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

  const [newProject, setNewProject] = useState({
    project_name: "",
    site_location: "",
    start_date: "",
    end_date: "",
    status: PROJECT_STATUSES.ACTIVE,
  });

  //REACT-PAGINATE
  const [itemOffset, setItemOffset] = useState(0);


  const filteredProjects = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const filtered = !q
      ? projects
      : projects.filter((p) => {
          const haystack = `${p.project_name || ''} ${p.site_location || ''} ${p.status || ''}`.toLowerCase();
          return haystack.includes(q);
        });

    return [...filtered].sort((a, b) => {
      switch (sortOrder) {
        case 'project_name_za':
          return compareText(b.project_name, a.project_name);
        case 'site_location_az':
          return compareText(a.site_location, b.site_location);
        case 'site_location_za':
          return compareText(b.site_location, a.site_location);
        case 'status_az':
          return compareText(a.status, b.status);
        case 'status_za':
          return compareText(b.status, a.status);
        case 'start_date_newest':
          return compareDate(b.start_date, a.start_date);
        case 'start_date_oldest':
          return compareDate(a.start_date, b.start_date);
        case 'end_date_newest':
          return compareDate(b.end_date, a.end_date);
        case 'end_date_oldest':
          return compareDate(a.end_date, b.end_date);
        case 'project_name_az':
        default:
          return compareText(a.project_name, b.project_name);
      }
    });
  }, [projects, searchTerm, sortOrder]);

  let cardDescriptors;

  if (mode === "add") {
    cardDescriptors = [
      { type: "new" },
      ...filteredProjects.map((p) => ({ type: "view", project: p })),
    ];
  } else if (mode === "edit") {
    cardDescriptors = filteredProjects.map((p) => {
      if (editingProjectId && String(p.id) === String(editingProjectId) && draftProject) {
        return { type: 'edit', project: draftProject };
      }
      return { type: 'view', project: p };
    });
  } else {
    cardDescriptors = filteredProjects.map((p) => ({
      type: "view",
      project: p,
    }));
  }

  const itemsPerPage = 6;
  const endOffset = itemOffset + itemsPerPage;
  const currentProj = cardDescriptors.slice(itemOffset, endOffset);
  const pageCount = Math.ceil(cardDescriptors.length / itemsPerPage);
  const multiPages = pageCount > 1;
      
  const handlePageClick = (event) => {
    const newOffset = (event.selected * itemsPerPage);
    setItemOffset(newOffset);
  };

  useEffect(() => {
    setItemOffset(0);
  }, [mode, projects.length, searchTerm, sortOrder]);

  useEffect(() => {
    setShowUpdateActions(false);
  }, [mode]);

  useEffect(() => {
    if (mode !== 'edit') {
      setEditingProjectId(null);
      setDraftProject(null);
    }
  }, [mode]);

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await get('/projects');

      if (response.success){
        setProjects(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      setError(error.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, []);

  // fetch projects from backend
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleEditClick = () => {
    openConfirm({
      title: 'Edit projects',
      message: 'Enter edit mode? You can update or delete projects.',
      confirmText: 'OK',
      cancelText: 'Cancel',
      onConfirm: () => {
        setMode('edit');
        setEditingProjectId(null);
        setDraftProject(null);
      },
    });
  };

  const handleAddClick = () => {
    setNewProject({
      project_name: "",
      site_location: "",
      start_date: "",
      end_date: "",
      status: PROJECT_STATUSES.ACTIVE,
    });
    setMode("add");
  };

  // create new project
  const handleCreateProject = async () => {
    if (!newProject.project_name || !newProject.site_location) {
      openConfirm({
        title: 'Missing fields',
        message: 'Please fill in project name and location.',
        confirmText: 'OK',
        cancelText: null,
      });
      return;
    }

    openConfirm({
      title: 'Create project',
      message: `Create project "${newProject.project_name}"?`,
      confirmText: 'OK',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          setActionLoading(true);

          const response = await post('/projects', {
            project_name: newProject.project_name,
            site_location: newProject.site_location,
            start_date: newProject.start_date || null,
            end_date: newProject.end_date || null,
            status: newProject.status || PROJECT_STATUSES.ACTIVE
          });

          if (response.success) {
            setProjects(prev => [...prev, response.data]);
            setNewProject({
              project_name: "",
              site_location: "",
              start_date: "",
              end_date: "",
              status: PROJECT_STATUSES.ACTIVE,
            });
            setMode('view');
            openConfirm({
              title: 'Success',
              message: `Project "${newProject.project_name}" created successfully.`,
              confirmText: 'OK',
              cancelText: null,
            });
          }
        } catch (error) {
          console.error('Create project error:', error);
          openConfirm({
            title: 'Error',
            message: error.message || 'Failed to create project',
            confirmText: 'OK',
            cancelText: null,
          });
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  // update project
  const handleSaveProject = async (project) => {
    if (!project.project_name || !project.site_location) {
      openConfirm({
        title: 'Missing fields',
        message: 'Please fill in project name and location.',
        confirmText: 'OK',
        cancelText: null,
      });
      return;
    }

    openConfirm({
      message: `Save changes to "${project.project_name}"?`,
      confirmText: 'OK',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          setActionLoading(true);

          const response = await put(`/projects/${project.id}`, {
            project_name: project.project_name,
            site_location: project.site_location,
            start_date: project.start_date || null,
            end_date: project.end_date || null,
            status: project.status
          });

          if (response.success) {
            setProjects(prev =>
              prev.map(p => p.id === project.id ? response.data : p)
            );
            setEditingProjectId(null);
            setDraftProject(null);
            openConfirm({
              title: 'Success',
              message: `Project "${project.project_name}" updated successfully.`,
              confirmText: 'OK',
              cancelText: null,
            });
          }
        } catch (error) {
          console.error('Update project error:', error);
          openConfirm({
            title: 'Error',
            message: error.message || 'Failed to update project',
            confirmText: 'OK',
            cancelText: null,
          });
        } finally { setActionLoading(false); }
      }
    });
  };

  // delete project
  const handleDeleteProject = async (id) => {
    const project = projects.find(p => p.id === id);
    openConfirm({
      title: 'Delete project',
      message: `Are you sure you want to delete "${project?.project_name}"? This action cannot be undone. Note: projects with assigned employees may need assignments removed first.`,
      confirmText: 'OK',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          setActionLoading(true);

          const response = await del(`/projects/${id}`);

          if (response.success) {
            setProjects(prev => prev.filter(p => p.id !== id));
            openConfirm({
              title: 'Success',
              message: 'Project deleted successfully.',
              confirmText: 'OK',
              cancelText: null,
            });
          }
        } catch (error) {
          console.error('Delete project error:', error);
          openConfirm({
            title: 'Error',
            message: error.message || 'Failed to delete project',
            confirmText: 'OK',
            cancelText: null,
          });
        } finally { setActionLoading(false); }
      }
    });
  };

  const handleFieldChange = (id, field, value) => {
    // In edit mode, we only allow editing a single draft project at a time.
    if (mode === 'edit' && draftProject && String(draftProject.id) === String(id)) {
      setDraftProject((prev) => ({ ...(prev || {}), [field]: value }));
      return;
    }

    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const handleCancelAdd = () => {
    setNewProject({
      project_name: "",
      site_location: "",
      start_date: "",
      end_date: "",
      status: PROJECT_STATUSES.ACTIVE,
    });
    setMode("view");
  };

  const handleGenerateReport = ({ startDate, endDate, fileType, category } = {}) => {
    const base = (startDate || endDate)
      ? filterRowsByDateRange(filteredProjects, (p) => p?.start_date, startDate, endDate)
      : filteredProjects;

    const cat = category || 'all';
    const rowsForExport = base.filter((p) => {
      const s = String(p?.status || '');
      if (cat === 'active') return s === PROJECT_STATUSES.ACTIVE;
      if (cat === 'completed') return s === PROJECT_STATUSES.COMPLETED;
      if (cat === 'on_hold') return s === PROJECT_STATUSES.ON_HOLD;
      if (cat === 'cancelled') return s === PROJECT_STATUSES.CANCELLED;
      return true;
    });

    const stamp = new Date().toISOString().slice(0, 10);
    const upperType = String(fileType || 'XLSX').toUpperCase();
    const isCsv = upperType === 'CSV';
    const isPdf = upperType === 'PDF';
    const ext = isPdf ? 'pdf' : isCsv ? 'csv' : 'xlsx';
    const filename = `projects-report-${cat}-${stamp}.${ext}`;

    post('/audit-logs/reports', {
      report_name: 'Projects Report',
      filename,
      start_date: startDate || null,
      end_date: endDate || null,
      row_count: rowsForExport.length,
      source: 'projects',
    }).catch(() => {
      // best-effort only
    });

    const columns = [
      { header: 'Project Name', value: (p) => p.project_name },
      { header: 'Site Location', value: (p) => p.site_location },
      { header: 'Start Date', value: (p) => p.start_date },
      { header: 'End Date', value: (p) => p.end_date },
      { header: 'Status', value: (p) => p.status },
    ];

    if (isPdf) {
      const counts = {
        [PROJECT_STATUSES.ACTIVE]: rowsForExport.filter((p) => p.status === PROJECT_STATUSES.ACTIVE).length,
        [PROJECT_STATUSES.COMPLETED]: rowsForExport.filter((p) => p.status === PROJECT_STATUSES.COMPLETED).length,
        [PROJECT_STATUSES.ON_HOLD]: rowsForExport.filter((p) => p.status === PROJECT_STATUSES.ON_HOLD).length,
        [PROJECT_STATUSES.CANCELLED]: rowsForExport.filter((p) => p.status === PROJECT_STATUSES.CANCELLED).length,
      };

      exportReportToPdf({
        filename,
        title: 'Projects Report',
        summaryLines: [
          `Category: ${cat}`,
          startDate || endDate ? `Range: ${startDate || '…'} to ${endDate || '…'}` : 'Range: All time',
          `Active: ${counts[PROJECT_STATUSES.ACTIVE]} | Completed: ${counts[PROJECT_STATUSES.COMPLETED]} | On Hold: ${counts[PROJECT_STATUSES.ON_HOLD]} | Cancelled: ${counts[PROJECT_STATUSES.CANCELLED]}`,
        ],
        columns,
        rows: rowsForExport,
      }).catch(() => {
        // best-effort only
      });
    } else if (isCsv) {
      exportRowsToCsv({ filename, columns, rows: rowsForExport });
    } else {
      exportRowsToXlsx({ filename, sheetName: 'Projects', columns, rows: rowsForExport });
    }

    setReportOpen(false);
  };

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-gray-600">Loading projects...</p>
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
              onClick={fetchProjects}
              className="bg-[#990100] text-white px-4 py-2 rounded"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  

  return (
    <div>
      <Navbar />

      <div className="p-7 lg:mx-[4.5rem] md:mx-10">
        <div className="md:flex justify-between items-center w-full">
          <h1 className="lg:text-3xl text-2xl text-[#990100] font-bold md:mb-0 mb-5">
            Projects
          </h1>
          <div className="flex items=center justify-end md:gap-4 gap-3">
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
                  alt="search"
                />
              </button>
            </div>
          </div>
        </div>

        <hr className="text-[#990100] mt-6" />

        <div className="flex justify-end mt-6 gap-3 flex-wrap">
          {mode === "view" && (
            <>
              <button className="generate-report-button" onClick={() => setReportOpen(true)}>
                Generate Report
              </button>

              <ReportModal
                open={reportOpen}
                title="Generate Report - Projects"
                onClose={() => setReportOpen(false)}
                onGenerate={handleGenerateReport}
                enableDateRange={true}
                fileTypes={['XLSX', 'CSV', 'PDF']}
                categoryOptions={[
                  { value: 'all', label: 'All Projects' },
                  { value: 'active', label: 'Active' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'on_hold', label: 'On Hold' },
                  { value: 'cancelled', label: 'Cancelled' },
                ]}
                defaultCategory="all"
              />

              {!showUpdateActions ? (
                <button
                  className="bg-[#990100] text-white px-4 py-2 rounded-md hover:bg-[#ad3332] hover:scale-105 transition duration-300 ease-in-out"
                  onClick={() => setShowUpdateActions(true)}
                >
                  Update Projects
                </button>
              ) : (
                <div className="flex gap-3">
                  <button className="green-button" onClick={handleEditClick}>
                    Edit Projects
                  </button>
                  <button className="mustard-button" onClick={handleAddClick}>
                    Add New Project
                  </button>
                </div>
              )}
            </>
          )}

          {/* {mode !== "view" && (
            <button
              className="bg-[#16A34A] text-white lg:px-6 md:py-[7px] px-5 py-[6px] lg:text-sm text-xs rounded-md hover:bg-[#15803D] hover:scale-105 transition duration-300 ease-in-out"
              onClick={handleSaveChanges}
            >
              Save Changes
            </button>
          )} */}

          {mode === "edit" && (
            <>
              <button
                className="bg-[#F59E0B] text-white lg:px-6 md:py-[7px] px-5 py-[6px] lg:text-sm text-xs rounded-md hover:bg-[#d97706] hover:scale-105 transition duration-300 ease-in-out"
                onClick={() =>
                  openConfirm({
                    title: 'Cancel editing',
                    message: 'Exit edit mode without saving pending changes?',
                    confirmText: 'OK',
                    cancelText: 'Cancel',
                    onConfirm: async () => {
                      try {
                        const response = await get('/projects');
                        if (response?.success) setProjects(response.data);
                      } catch {
                        // best-effort
                      } finally {
                        setEditingProjectId(null);
                        setDraftProject(null);
                        setMode('view');
                      }
                    },
                  })
                }
              >
                Cancel Editing
              </button>

              <button
                className="bg-[#16A34A] text-white lg:px-6 md:py-[7px] px-5 py-[6px] lg:text-sm text-xs rounded-md hover:bg-[#15803D] hover:scale-105 transition duration-300 ease-in-out"
                onClick={() =>
                  openConfirm({
                    title: 'Done editing',
                    message: 'Exit edit mode?',
                    confirmText: 'OK',
                    cancelText: 'Cancel',
                    onConfirm: () => {
                      setEditingProjectId(null);
                      setDraftProject(null);
                      setMode('view');
                    },
                  })
                }
              >
                Done Editing
              </button>
            </>
          )}

          {mode === "add" && (
            <button
              className="bg-[#CC0000] text-white lg:px-6 md:py-[7px] px-5 py-[6px] lg:text-sm text-xs rounded-md hover:bg-[#aa0000] hover:scale-105 transition duration-300 ease-in-out"
              onClick={handleCancelAdd}
            >
              Cancel
            </button>
          )}
        </div>

        {cardDescriptors.length === 0 && mode === "view" ? (
          <div className="mt-8 text-center py-20">
            <p className="text-gray-500 mb-4">No projects found</p>
            <button
              className="bg-[#F59E0B] text-white px-6 py-3 rounded-md hover:scale-105 transition duration-300 ease-in-out"
              onClick={handleAddClick}
            >
              Create Your First Project
            </button>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentProj.map((item, index) => {
              if (item.type === "new") {
                return (
                  <NewProjectCard
                    key="new-project"
                    values={newProject}
                    onChange={setNewProject}
                    onSave={handleCreateProject}
                    loading={actionLoading}
                  />
                );
              }

              if (item.type === "edit") {
                return (
                  <EditableProjectCard
                    key={item.project.id}
                    project={item.project}
                    index={index}
                    onChange={handleFieldChange}
                    onDelete={handleDeleteProject}
                    onSave={handleSaveProject}
                    loading={actionLoading}
                  />
                );
              }

              return (
                <ViewProjectCard
                  key={item.project.id}
                  project={item.project}
                  index={index}
                  onClick={() => {
                    if (mode === 'edit') {
                      setEditingProjectId(item.project.id);
                      setDraftProject({ ...item.project });
                      return;
                    }
                    navigate(`/projects/${item.project.id}`);
                  }}
                />
              );
            })}
          </div>
        )}

        {/*projects.length > 0 && (
          <div className="flex items-center justify-end mt-10 space-x-2">
            <span className="text-[#990100] hover:underline cursor-pointer mr-3">
              &lt;
            </span>
            <span className="text-sm font-medium mr-3">1</span>
            <span className="text-sm mr-3">to {Math.min(6, projects.length)}</span>
            <span className="text-[#990100] hover:underline cursor-pointer">
              &gt;
            </span>
          </div>
        )*/}

        {pageCount > 1 && (

          <div className=" ">
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
              previousClassName={multiPages ? "cursor-pointer hover:text-gray-500 hover:underline" : "text-gray-400 cursor-not-allowed pointer-events-none"}
              previousLinkClassName="page-link"
              nextClassName={multiPages ? "cursor-pointer hover:text-gray-500 hover:underline" : "text-gray-400 cursor-not-allowed pointer-events-none"}
              nextLinkClassName="page-link"
              breakClassName="page-item"
              breakLinkClassName="page-link"
              containerClassName="flex items-center space-x-2 lg:pt-0 pt-4 text-[#990100]"
              activeClassName="underline font-medium"
            />
          </div>
        )}
      </div>

      <ConfirmModal
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmBusy ? 'Processing…' : confirmState.confirmText}
        cancelText={confirmState.cancelText}
        onConfirm={handleConfirm}
        onCancel={confirmBusy ? undefined : closeConfirm}
        confirmDisabled={Boolean(actionLoading || confirmBusy)}
      />
    </div>
  );
}

export default Projects;