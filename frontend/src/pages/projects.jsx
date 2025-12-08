import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./components/navbar";
import DropDownFilter from "./components/dropdownfilter";

const initialProjects = [
  {
    id: 1,
    name: "Project #1",
    location: "Pampanga",
    startDate: "06/06/25",
    endDate: "01/06/26",
    status: "ONGOING",
  },
  {
    id: 2,
    name: "Project #2",
    location: "Pampanga",
    startDate: "06/06/25",
    endDate: "01/06/26",
    status: "ONGOING",
  },
  {
    id: 3,
    name: "Project #3",
    location: "Pampanga",
    startDate: "06/06/25",
    endDate: "01/06/26",
    status: "ONGOING",
  },
  {
    id: 4,
    name: "Project #4",
    location: "Pampanga",
    startDate: "06/06/25",
    endDate: "01/06/26",
    status: "ONGOING",
  },
  {
    id: 5,
    name: "Project #5",
    location: "Pampanga",
    startDate: "06/06/25",
    endDate: "01/06/26",
    status: "ONGOING",
  },
  {
    id: 6,
    name: "Project #6",
    location: "Pampanga",
    startDate: "06/06/25",
    endDate: "01/06/26",
    status: "ONGOING",
  },
];

function ViewProjectCard({ project, index, onClick }) {
  const dateRange = `${project.startDate} to ${project.endDate}`;

  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left w-full hover:scale-105 transition duration-300 ease-in-out"
    >
      <div className="bg-[#FFFFFF] border border-gray-300 rounded-lg shadow-lg px-6 py-5 min-h-[170px] flex flex-col justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#990100] mb-3">
            {project.name || `Project #${index + 1}`}
          </h2>

          <div className="flex items-center text-base mb-2 gap-2">
            <img
              src="icons/red-location.png"
              alt="location"
              className="w-4 h-4"
            />
            <span>{project.location}</span>
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
          <span className={`inline-block  px-6 py-2 rounded-xl text-sm font-semibold"
            ${project.status === "ONGOING" ? "bg-[#C8C8FF] text-[#0000FF]" : ""}
            ${project.status === "COMPLETED" ? "text-[#198C19] bg-[#198C19]/25" : ""}
            ${project.status === "ON HOLD" ? "bg-[#FFA500]/25 text-[#FFA500]" : ""}`}>
              {project.status}
          </span>
        </div>
      </div>
    </button>
  );
}

function EditableProjectCard({ project, index, onChange, onDelete }) {
  const handleChange = (field, value) => {
    onChange(project.id, field, value);
  };

  return (
    <div className="bg-[#EDEDED] rounded-lg shadow-lg px-6 py-5 min-h-[170px] flex flex-col justify-between">
      <h2 className="text-xl font-bold text-[#990100] mb-2">
        {project.name || `Project #${index + 1}`}
      </h2>

      {/* PROJECT NAME INPUT */}
      <div className="mb-3">
        <label className="block text-sm font-semibold mb-1">
          Project Name
        </label>
        <input
          type="text"
          value={project.name}
          onChange={(e) => handleChange("name", e.target.value)}
          className="w-full project-field"
          placeholder="Enter project name"
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
          value={project.location}
          onChange={(e) => handleChange("location", e.target.value)}
          className="flex-1 project-field"
          placeholder="Location"
        />
      </div>

      <div className="mb-3 flex items-center gap-2">
        <img
          src="icons/red-leave.png"
          alt="calendar"
          className="w-4 h-4 mt-[2px]"
        />
        <input
          type="text"
          value={project.startDate}
          onChange={(e) => handleChange("startDate", e.target.value)}
          className="project-field w-[40%]"
          placeholder="Start Date"
        />
        <span className="text-sm">to</span>
        <input
          type="text"
          value={project.endDate}
          onChange={(e) => handleChange("endDate", e.target.value)}
          className="project-field w-[40%]"
          placeholder="End Date"
        />
      </div>

      <div className="mb-4 flex items-center gap-2">
        <span className="w-4" />
        <select
          value={project.status}
          onChange={(e) => handleChange("status", e.target.value)}
          className="project-field w-40"
        >
          <option value="ONGOING">ONGOING</option>
          <option value="COMPLETED">COMPLETED</option>
          <option value="ON HOLD">ON HOLD</option>
        </select>
      </div>

      <div className="flex justify-center">
        <button
          onClick={() => onDelete(project.id)}
          className="bg-[#CC0000] text-white px-6 py-2 rounded-full text-sm font-medium hover:bg-[#aa0000] hover:scale-105 transition duration-300 ease-in-out"
        >
          Delete Project
        </button>
      </div>
    </div>
  );
}

function NewProjectCard({ values, displayNumber, onChange }) {
  const handleChange = (field, value) => {
    onChange({ ...values, [field]: value });
  };

  return (
    <div className="bg-[#EDEDED] rounded-lg shadow-lg px-6 py-5 min-h-[170px] flex flex-col justify-between">
      <h2 className="text-xl font-bold text-[#c4bcbc] mb-2">
        {`Project #${displayNumber}`}
      </h2>

      {/* PROJECT NAME INPUT */}
      <div className="mb-3">
        <label className="block text-sm font-semibold mb-1">
          Project Name
        </label>
        <input
          type="text"
          value={values.name}
          onChange={(e) => handleChange("name", e.target.value)}
          className="w-full border border-gray-400 rounded-sm px-2 py-1 text-sm bg-white"
          placeholder="Enter project name"
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
          value={values.location}
          onChange={(e) => handleChange("location", e.target.value)}
          className="flex-1 border border-gray-400 rounded-sm px-2 py-1 text-sm bg-white"
          placeholder="Location"
        />
      </div>

      <div className="mb-3 flex items-center gap-2">
        <img
          src="icons/red-leave.png"
          alt="calendar"
          className="w-4 h-4 mt-[2px]"
        />
        <input
          type="text"
          value={values.startDate}
          onChange={(e) => handleChange("startDate", e.target.value)}
          className="border border-gray-400 rounded-sm px-2 py-1 text-sm bg-white w-[40%]"
          placeholder="Start Date"
        />
        <span className="text-sm">to</span>
        <input
          type="text"
          value={values.endDate}
          onChange={(e) => handleChange("endDate", e.target.value)}
          className="border border-gray-400 rounded-sm px-2 py-1 text-sm bg-white w-[40%]"
          placeholder="End Date"
        />
      </div>

      <div className="mb-1 flex items-center gap-2">
        <span className="w-4" />
        <select
          value={values.status}
          onChange={(e) => handleChange("status", e.target.value)}
          className="border border-gray-400 rounded-sm px-2 py-1 text-sm bg-white w-40"
        >
          <option value="ONGOING">ONGOING</option>
          <option value="COMPLETED">COMPLETED</option>
          <option value="ON HOLD">ON HOLD</option>
        </select>
      </div>
    </div>
  );
}

function Projects() {
  const navigate = useNavigate();

  const [projects, setProjects] = useState(initialProjects);
  const [mode, setMode] = useState("view");

  const [newProject, setNewProject] = useState({
    name: "",
    location: "",
    startDate: "",
    endDate: "",
    status: "ONGOING",
  });

  const handleEditClick = () => {
    setMode("edit");
  };

  const handleAddClick = () => {
    setNewProject({
      name: "",
      location: "",
      startDate: "",
      endDate: "",
      status: "ONGOING",
    });
    setMode("add");
  };

  const handleSaveChanges = () => {
    if (mode === "add") {
      const hasAnyValue =
        newProject.name ||
        newProject.location ||
        newProject.startDate ||
        newProject.endDate ||
        newProject.status !== "ONGOING";

      if (hasAnyValue) {
        setProjects((prev) => [
          ...prev,
          {
            id: prev.length ? Math.max(...prev.map((p) => p.id)) + 1 : 1,
            name: newProject.name || `Project ${prev.length + 1}`,
            location: newProject.location || "Pampanga",
            startDate: newProject.startDate || "06/06/25",
            endDate: newProject.endDate || "01/06/26",
            status: newProject.status || "ONGOING",
          },
        ]);
      }
    }

    setMode("view");
  };

  const handleFieldChange = (id, field, value) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const handleDeleteProject = (id) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

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
              <button className="bg-[#ad3332] text-white lg:px-5 md:py-[7px] px-4 py-[5px] lg:text-sm text-xs rounded-md hover:bg-[#990100] hover:scale-105 transition duration-300 ease-in-out">
                Generate Report
              </button>
              <button
                className="bg-[#22C55E] text-white lg:px-5 md:py-[7px] px-4 py-[5px] lg:text-sm text-xs rounded-md hover:scale-105 transition duration-300 ease-in-out"
                onClick={handleEditClick}
              >
                Edit Projects
              </button>
              <button
                className="bg-[#F59E0B] text-white lg:px-5 md:py-[7px] px-4 py-[5px] lg:text-sm text-xs rounded-md hover:scale-105 transition duration-300 ease-in-out"
                onClick={handleAddClick}
              >
                Add New Project
              </button>
            </>
          )}

          {mode !== "view" && (
            <button
              className="bg-[#16A34A] text-white lg:px-6 md:py-[7px] px-5 py-[6px] lg:text-sm text-xs rounded-md hover:bg-[#15803D] hover:scale-105 transition duration-300 ease-in-out"
              onClick={handleSaveChanges}
            >
              Save Changes
            </button>
          )}
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cardDescriptors.map((item, index) => {
            if (item.type === "new") {
              return (
                <NewProjectCard
                  key="new-project"
                  values={newProject}
                  displayNumber={projects.length + 1}
                  onChange={setNewProject}
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
                />
              );
            }

            return (
              <ViewProjectCard
                key={item.project.id}
                project={item.project}
                index={index}
                onClick={() => navigate(`/projects/${index + 1}`)}
              />
            );
          })}
        </div>


        <div className="flex items-center justify-end mt-10 space-x-2">
          <span className="text-[#990100] hover:underline cursor-pointer mr-3">
                &lt;
          </span>
          <span className="text-sm font-medium mr-3">1</span>
          <span className="text-sm mr-3">to 5</span>
          <span className="text-[#990100] hover:underline cursor-pointer">
            &gt;
          </span>
        </div>
      </div>
    </div>
  );
}

export default Projects;