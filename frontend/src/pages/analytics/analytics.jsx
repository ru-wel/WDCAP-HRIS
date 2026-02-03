import React, { useEffect, useMemo, useState } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { get } from "../../services/api";
import ReactPaginate from "react-paginate";
import { exportRowsToCsv } from "../../utils/csv";
import { exportRowsToXlsx } from "../../utils/excel.js";
import ReportModal from "../../components/report-modal.jsx";
import { filterRowsByDateRange } from "../../utils/reporting.js";

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
  const [summary, setSummary] = useState({
    totalEmployees: 0,
    activeProjects: 0,
    pendingLeaves: 0,
  });
  const [employeesByDepartment, setEmployeesByDepartment] = useState([]);
  const [employeeStatusData, setEmployeeStatusData] = useState([]);
  const [projectsByStatus, setProjectsByStatus] = useState([]);
  const [leaveStatusData, setLeaveStatusData] = useState([]);
  const [leaveTypesData, setLeaveTypesData] = useState([]);
  const [reportRows, setReportRows] = useState([]);
  const [_loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [timeframe, setTimeframe] = useState("Last 6 months");
  const [reportModule, setReportModule] = useState("All");
  const [reportStatus, setReportStatus] = useState("All");
  const [reportSearch, setReportSearch] = useState("");
  const [excelExportOpen, setExcelExportOpen] = useState(false);


  useEffect(() => {
    let cancelled = false;
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await get("/analytics/summary");
        if (!res?.success) throw new Error(res?.message || "Failed to load analytics");

        const data = res?.data || {};
        if (cancelled) return;

        const s = data.summary || {};
        setSummary({
          totalEmployees: Number(s.totalEmployees) || 0,
          activeProjects: Number(s.activeProjects) || 0,
          pendingLeaves: Number(s.pendingLeaves) || 0,
        });

        setEmployeesByDepartment(Array.isArray(data.employeesByDepartment) ? data.employeesByDepartment : []);
        setEmployeeStatusData(Array.isArray(data.employeeStatusData) ? data.employeeStatusData : []);
        setProjectsByStatus(Array.isArray(data.projectsByStatus) ? data.projectsByStatus : []);
        setLeaveStatusData(Array.isArray(data.leaveStatusData) ? data.leaveStatusData : []);
        setLeaveTypesData(Array.isArray(data.leaveTypesData) ? data.leaveTypesData : []);
        setReportRows(Array.isArray(data.reportRows) ? data.reportRows : []);
      } catch (e) {
        if (!cancelled) setError(e?.message || "Failed to load data overview");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchAnalytics();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredReports = useMemo(() => {
    const norm = (v) => String(v || '').trim().toLowerCase();
    return reportRows.filter((r) => {
      const matchModule = reportModule === "All" || norm(r.module) === norm(reportModule);
      const matchStatus = reportStatus === "All" || norm(r.status) === norm(reportStatus);
      const matchSearch = reportSearch
        ? `${r.id} ${r.name} ${r.module} ${r.generatedBy} ${r.date} ${r.status}`
            .toLowerCase()
            .includes(reportSearch.toLowerCase())
        : true;
      return matchModule && matchStatus && matchSearch;
    });
  }, [reportRows, reportModule, reportStatus, reportSearch]);

  // Reports pagination
  const [reportOffset, setReportOffset] = useState(0);
  const reportsPerPage = 10;
  const reportEndOffset = reportOffset + reportsPerPage;
  const currentReports = filteredReports.slice(reportOffset, reportEndOffset);
  const reportsPageCount = Math.ceil(filteredReports.length / reportsPerPage);
  const reportsMultiPages = reportsPageCount > 1;

  const handleReportsPageClick = (event) => {
    const newOffset = event.selected * reportsPerPage;
    setReportOffset(newOffset);
  };

  useEffect(() => {
    setReportOffset(0);
  }, [reportModule, reportStatus, reportSearch, reportRows.length]);

  const handleExcelExport = ({ startDate, endDate, fileType } = {}) => {
    const rowsForExport = (startDate || endDate)
      ? filterRowsByDateRange(filteredReports, (r) => r?.date, startDate, endDate)
      : filteredReports;

    const columns = [
      { header: "Report ID", value: (r) => r?.id || "" },
      { header: "Report Name", value: (r) => r?.name || "" },
      { header: "Module", value: (r) => r?.module || "" },
      { header: "Generated By", value: (r) => r?.generatedBy || "" },
      { header: "Date", value: (r) => formatReportDate(r?.date) },
      { header: "Status", value: (r) => r?.status || "" },
    ];

    const stamp = new Date().toISOString().slice(0, 10);
    if (fileType === 'CSV') {
      exportRowsToCsv({ filename: `analytics-reports-${stamp}.csv`, columns, rows: rowsForExport });
    } else {
      exportRowsToXlsx({ filename: `analytics-reports-${stamp}.xlsx`, sheetName: 'Reports', columns, rows: rowsForExport });
    }

    setExcelExportOpen(false);
  };

  const formatReportDate = (value) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString();
  };

  if (_loading) {
    return (
      <div className="flex min-h-screen items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#990100] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Data Overview...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="p-7 lg:mx-[4.5rem] md:mx-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="lg:text-3xl text-2xl text-[#990100] font-bold">
              Data Overview
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

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

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

        {/*<div className="mt-10">
          <SectionCard
            title="Reports"
            subtitle="Filter and export reports."
            right={
              <button
                type="button"
                onClick={() => setExcelExportOpen(true)}
                className="generate-report-button"
              >
                Generate Report
              </button>
            }
          >
            <ReportModal
              open={excelExportOpen}
              title="Generate Report - Analytics (Reports)"
              onClose={() => setExcelExportOpen(false)}
              onGenerate={handleExcelExport}
              enableDateRange={true}
            />
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
                <option value="Users">Users</option>
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
                  {currentReports.map((row) => (
                    <tr key={row.id} className="tr-style">
                      <td className="td-style-nobtn">{row.id}</td>
                      <td className="td-style-nobtn">{row.name}</td>
                      <td className="td-style-nobtn">{row.module}</td>
                      <td className="td-style-nobtn">{row.generatedBy}</td>
                      <td className="td-style-nobtn">{formatReportDate(row.date)}</td>
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

            <br />
            <div className="lg:flex items-center lg:justify-between">
              <p className="lg:text-md text-sm">
                Showing <b>{currentReports.length}</b> of <b>{filteredReports.length}</b> report{filteredReports.length !== 1 ? "s" : ""}
                {reportsPageCount > 0 && (
                  <>
                    {" "}| Page <b>{Math.floor(reportOffset / reportsPerPage) + 1}</b> of <b>{reportsPageCount}</b>
                  </>
                )}
              </p>

              {reportsPageCount > 0 && (
                <div>
                  <ReactPaginate
                    breakLabel="..."
                    nextLabel=">"
                    onPageChange={handleReportsPageClick}
                    pageRangeDisplayed={2}
                    pageCount={reportsPageCount}
                    previousLabel="<"
                    renderOnZeroPageCount={null}
                    marginPagesDisplayed={2}
                    pageClassName=""
                    pageLinkClassName="cursor-pointer hover:text-gray-500 hover:underline"
                    previousClassName={reportsMultiPages ? "cursor-pointer hover:text-gray-500 hover:underline" : "text-gray-400 cursor-not-allowed pointer-events-none"}
                    previousLinkClassName="page-link"
                    nextClassName={reportsMultiPages ? "cursor-pointer hover:text-gray-500 hover:underline" : "text-gray-400 cursor-not-allowed pointer-events-none"}
                    nextLinkClassName="page-link"
                    breakClassName="page-item"
                    breakLinkClassName="page-link"
                    containerClassName="flex items-center space-x-2 lg:pt-0 pt-4 text-[#990100]"
                    activeClassName="underline font-medium"
                    forcePage={Math.floor(reportOffset / reportsPerPage)}
                  />
                </div>
              )}
            </div>
          </SectionCard>
        </div>*/}
      </div>
    </div>
  );
}

export default Analytics;