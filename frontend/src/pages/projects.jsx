import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./components/navbar";
import DropDownFilter from "./components/dropdownfilter";
import { get, post, put, del } from "../services/api.js";
import { PROJECT_STATUSES } from "../constants/config.js";

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
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const [newProject, setNewProject] = useState({
    project_name: "",
    site_location: "",
    start_date: "",
    end_date: "",
    status: PROJECT_STATUSES.ACTIVE,
  });

  // fetch projects from backend
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const response = await get('/projects');

        if (response.success){
          setProjects(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch projects:', error);
        setError(error.message || 'Failed to load projects');
      } finally { setLoading(false); }
    };

    fetchProjects();

  }, []);

  const handleEditClick = () => {
    setMode("edit");
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
      alert('Please fill in project name and location');
      return;
    }

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
        alert(`Project ${newProject.project_name} created successfully!`);
        setNewProject({
          project_name: "",
          site_location: "",
          start_date: "",
          end_date: "",
          status: PROJECT_STATUSES.ACTIVE,
        });
        setMode('view');
      }
    } catch (error) {
      console.error('Create project error:', error);
      alert(error.message || 'Failed to create project');
    } finally { setActionLoading(false); }
  };

  // update project
  const handleSaveProject = async (project) => {
    if (!project.project_name || !project.site_location) {
      alert('Please fill in project name and location');
      return;
    }

    const confirmUpdate = window.confirm(`Save changes to "${project.project_name}"?`);
    if (!confirmUpdate) return;

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
        alert(`Project "${project.project_name}" updated successfully!`);
      }
    } catch (error) {
      console.error('Update project error:', error);
      alert(error.message || 'Failed to update project');
    } finally { setActionLoading(false); }
  };

  // delete project
  const handleDeleteProject = async (id) => {
    const project = projects.find(p => p.id === id);
    const confirmDelete = window.confirm(`Are you sure you want to delete "${project?.project_name}"? This action cannot be undone.`);

    if (!confirmDelete) return;

    try {
      setActionLoading(true);

      const response = await del(`/projects/${id}`);

      if (response.success) {
        setProjects(prev => prev.filter(p => p.id !== id));
        alert('Project deleted successfully');
      }
    } catch (error) {
      console.error('Delete project error:', error);
      alert(error.message || 'Failed to delete project');
    } finally { setActionLoading(false); }
  };

  const handleFieldChange = (id, field, value) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
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
              onClick={() => window.location.reload()}
              className="bg-[#990100] text-white px-4 py-2 rounded"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  let cardDescriptors;

  if (mode === "add") {
    const existing = projects.slice(0, 5);
    cardDescriptors = [
      { type: "new" },
      ...existing.map((p) => ({ type: "view", project: p })),
    ];
  } else if (mode === "edit") {
    cardDescriptors = projects.slice(0, 6).map((p) => ({
      type: "edit",
      project: p,
    }));
  } else {
    cardDescriptors = projects.slice(0, 6).map((p) => ({
      type: "view",
      project: p,
    }));
  }

  return (
    <div>
      <Navbar />

      <div className="p-7 lg:mx-18 md:mx-10">
        <div className="md:flex justify-between items-center w-full">
          <h1 className="lg:text-3xl text-2xl text-[#990100] font-bold md:mb-0 mb-5">
            Projects
          </h1>
          <div className="flex items=center justify-end md:gap-4 gap-3">
            <DropDownFilter />
            <div className="relative text-gray-600 border border-[#990100] rounded-lg">
              <input
                type="search"
                name="search"
                placeholder="Search"
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
              <button className="generate-report-button">
                Generate Report
              </button>
              <button
                className="green-button"
                onClick={handleEditClick}
              >
                Edit Projects
              </button>
              <button
                className="mustard-button"
                onClick={handleAddClick}
              >
                Add New Project
              </button>
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
            <button
              className="bg-[#16A34A] text-white lg:px-6 md:py-[7px] px-5 py-[6px] lg:text-sm text-xs rounded-md hover:bg-[#15803D] hover:scale-105 transition duration-300 ease-in-out"
              onClick={() => setMode("view")}
            >
              Done Editing
            </button>
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

        {projects.length === 0 && mode === "view" ? (
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
            {cardDescriptors.map((item, index) => {
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
                  onClick={() => navigate(`/projects/${item.project.id}`)}
                />
              );
            })}
          </div>
        )}

        {projects.length > 0 && (
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
        )}
      </div>
    </div>
  );
}

export default Projects;