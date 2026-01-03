import React, { useMemo, useState } from "react";
import Navbar from "./components/navbar";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { useEffect } from "react";

const COLORS = ["#990100", "#F59E0B", "#22C55E", "#2563EB", "#6B7280"];

function Chip({ label, value }) {
  return (
    <div className="flex items-center gap-2 bg-[#EDEDED] border border-gray-200 rounded-full px-4 py-2">
      <span className="text-xs text-gray-600">{label}</span>
      <span className="text-sm font-semibold text-[#990100]">{value}</span>
    </div>
  );
}

function SectionCard({ title, subtitle, children, right }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-md p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-[#990100]">{title}</h2>
          {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

function Analytics() {
  const summary = useMemo(
    () => ({
      totalEmployees: 128,
      activeProjects: 14,
      pendingLeaves: 9,
    }),
    []
  );

  const employeesByDepartment = [
    { department: "HR", value: 14 },
    { department: "Engineering", value: 46 },
    { department: "Operations", value: 32 },
    { department: "Finance", value: 18 },
    { department: "Admin", value: 18 },
  ];

  const employeeStatusData = [
    { name: "Active", value: 102 },
    { name: "Inactive", value: 26 },
  ];

  const projectsByStatus = [
    { name: "Ongoing", value: 9 },
    { name: "Completed", value: 5 },
  ];

  const leaveStatusData = [
    { name: "Pending", value: 9 },
    { name: "Approved", value: 21 },
    { name: "Rejected", value: 3 },
  ];

  const leaveTypesData = [
    { name: "SIL", value: 14 },
    { name: "VL", value: 7 },
    { name: "SL", value: 9 },
    { name: "Paternity", value: 2 },
    { name: "Maternity", value: 1 },
  ];

  const reportRows = [
    { id: "RP-0001", name: "Employees Report", module: "Employees", generatedBy: "HR", date: "12/18/25", status: "READY" },
    { id: "RP-0002", name: "Projects Report", module: "Projects", generatedBy: "Admin", date: "12/18/25", status: "READY" },
    { id: "RP-0003", name: "Leave Report", module: "Leave", generatedBy: "HR", date: "12/18/25", status: "READY" },
    { id: "RP-0004", name: "Departments Report", module: "Departments", generatedBy: "Admin", date: "12/18/25", status: "READY" },
  ];

  const [timeframe, setTimeframe] = useState("Last 6 months");
  const [reportModule, setReportModule] = useState("All");
  const [reportStatus, setReportStatus] = useState("All");
  const [reportSearch, setReportSearch] = useState("");

  // PAGE TITLE
    useEffect(() => {
      document.title = "ARISE | ANALYTICS"; 
    }, []);

  const filteredReports = useMemo(() => {
    return reportRows.filter((r) => {
      const matchModule = reportModule === "All" || r.module === reportModule;
      const matchStatus = reportStatus === "All" || r.status === reportStatus;
      const matchSearch = reportSearch
        ? `${r.id} ${r.name} ${r.module} ${r.generatedBy} ${r.date} ${r.status}`
            .toLowerCase()
            .includes(reportSearch.toLowerCase())
        : true;
      return matchModule && matchStatus && matchSearch;
    });
  }, [reportModule, reportStatus, reportSearch]);

  const handleExport = (type) => {
    alert(`${type} export is UI-only for now.`);
  };

  return (
    <div>
      <Navbar />

      <div className="p-7 lg:mx-18 md:mx-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="lg:text-3xl text-2xl text-[#990100] font-bold">
              Analytics
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Timeframe:</span>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="border border-[#990100] rounded-lg px-3 h-9 text-sm text-[#990100] bg-white shadow-sm"
            >
              <option>Last 30 days</option>
              <option>Last 3 months</option>
              <option>Last 6 months</option>
              <option>Year to date</option>
            </select>
          </div>
        </div>

        <hr className="border-[#990100] my-6" />

        <div className="flex flex-wrap gap-3 mb-8">
          <Chip label="Employees" value={summary.totalEmployees} />
          <Chip label="Active Projects" value={summary.activeProjects} />
          <Chip label="Pending Leaves" value={summary.pendingLeaves} />
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <SectionCard
            title="Employee Distribution by Department"
            subtitle="Headcount allocation across departments."
          >
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={employeesByDepartment} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="department" type="category" />
                  <Tooltip />
                  <Bar dataKey="value" fill="#990100" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          <SectionCard
            title="Employee Status Distribution"
            subtitle="Active vs inactive employees."
          >
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={employeeStatusData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                  >
                    {employeeStatusData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          <SectionCard
            title="Projects Overview"
            subtitle="Ongoing vs completed projects."
          >
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectsByStatus}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#990100" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          <SectionCard
            title="Leave Requests by Status"
            subtitle="Pending, approved, and rejected leaves."
          >
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={leaveStatusData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#990100" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          <SectionCard
            title="Leave Type Usage"
            subtitle="Distribution of leave types."
          >
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={leaveTypesData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                  >
                    {leaveTypesData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </div>

        <div className="mt-10">
          <SectionCard
            title="Reports"
            subtitle="Filter and export reports."
            right={
              <div className="flex gap-2">
                <button
                  onClick={() => handleExport("PDF")}
                  className="border border-[#990100] text-[#990100] rounded-lg px-3 h-9 text-sm"
                >
                  Export PDF
                </button>
                <button
                  onClick={() => handleExport("Excel")}
                  className="bg-[#990100] text-white rounded-lg px-3 h-9 text-sm"
                >
                  Export Excel
                </button>
              </div>
            }
          >
            <div className="flex flex-col lg:flex-row gap-3 mb-4">
              <select
                value={reportModule}
                onChange={(e) => setReportModule(e.target.value)}
                className="border border-[#990100] rounded-lg px-3 h-9 text-sm text-[#990100]"
              >
                <option value="All">All Modules</option>
                <option value="Employees">Employees</option>
                <option value="Projects">Projects</option>
                <option value="Leave">Leave</option>
                <option value="Departments">Departments</option>
              </select>

              <select
                value={reportStatus}
                onChange={(e) => setReportStatus(e.target.value)}
                className="border border-[#990100] rounded-lg px-3 h-9 text-sm text-[#990100]"
              >
                <option value="All">All Status</option>
                <option value="READY">READY</option>
                <option value="PROCESSING">PROCESSING</option>
                <option value="FAILED">FAILED</option>
              </select>

              <input
                type="search"
                value={reportSearch}
                onChange={(e) => setReportSearch(e.target.value)}
                placeholder="Search reports..."
                className="border border-[#990100] rounded-lg px-3 h-9 text-sm flex-1"
              />
            </div>

            <div className="div-table">
              <table className="table-style">
                <thead className="thead-style">
                  <tr>
                    <th className="th-style">Report ID</th>
                    <th className="th-style">Report Name</th>
                    <th className="th-style">Module</th>
                    <th className="th-style">Generated By</th>
                    <th className="th-style">Date</th>
                    <th className="th-style">Status</th>
                  </tr>
                </thead>
                <tbody className="tbody-style">
                  {filteredReports.map((row) => (
                    <tr key={row.id} className="tr-style">
                      <td className="td-style-nobtn">{row.id}</td>
                      <td className="td-style-nobtn">{row.name}</td>
                      <td className="td-style-nobtn">{row.module}</td>
                      <td className="td-style-nobtn">{row.generatedBy}</td>
                      <td className="td-style-nobtn">{row.date}</td>
                      <td className="td-style-nobtn">
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#DCFCE7] text-[#166534]">
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

export default Analytics;