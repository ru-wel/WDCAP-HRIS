import React, { useEffect, useState } from "react";
import Navbar from "../components/navbar";
import DropDownFilter from "../components/dropdownfilter";
import { get } from "../../services/api.js";

function EvaluationLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch evaluation audit logs from backend
  const fetchEvalLogs = async () => {
    try {
      setLoading(true);
      const response = await get("/audit-logs/table/evaluations"); 

      if (response.success) {
        setLogs(response.data);
      } else {
        setError("Failed to load evaluation audit logs");
      }
    } catch (err) {
      console.error("Failed to fetch evaluation logs:", err);
      setError("Failed to load evaluation audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvalLogs();
  }, []);

  // Filter logs based on search input
  const filteredLogs = logs.filter(
    (log) =>
      log.users?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.old_values && JSON.stringify(log.old_values).toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.new_values && JSON.stringify(log.new_values).toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div>
      <Navbar />

      <div className="p-7 lg:mx-18 md:mx-10">
        {/* HEADER */}
        <div className="md:flex justify-between items-center w-full mb-5">
          <h1 className="lg:text-3xl text-2xl text-[#990100] font-bold">Evaluation</h1>

          <div className="flex items-center gap-3">
            <DropDownFilter />

            <div className="relative text-gray-600 border border-[#990100] rounded-lg">
              <input
                type="search"
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white lg:h-10 h-9 px-2 pr-10 rounded-lg text-sm focus:outline-none"
              />
              <img
                src="/icons/red-search.png"
                className="absolute right-2 top-2 w-5 h-5"
                alt="search"
              />
            </div>
          </div>
        </div>

        <hr className="text-[#990100] mt-6" />

        <div className="flex justify-end mt-5">
          <button className="generate-report-button">Generate Report</button>
        </div>

        {/* LOADING */}
        {loading && (
          <div className="py-20 text-center text-gray-600">
            Loading evaluation audit logs...
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div className="bg-red-100 text-red-700 px-4 py-3 rounded mt-5">{error}</div>
        )}

        {/* TABLE */}
        {!loading && !error && (
          <div className="div-table">
            <table className="table-style">
              <thead className="thead-style">
                <tr>
                  <th className="th-style rounded-tl-lg rounded-bl-lg">Date | Time</th>
                  <th className="th-style">Email</th>
                  <th className="th-style">Action</th>
                  <th className="th-style hidden sm:table-cell rounded-tr-lg rounded-br-lg">Changes</th>
                </tr>
              </thead>

              <tbody className="tbody-style">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                      No evaluation logs found
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => {
                    const date = new Date(log.timestamp);

                    return (
                      <tr key={log.id} className="tr-style">
                        <td className="td-style-nobtn">
                          {date.toLocaleDateString()} | {date.toLocaleTimeString()}
                        </td>

                        <td className="td-style-nobtn font-medium">
                          {log.users?.email || "N/A"}
                        </td>

                        <td className="td-style-nobtn">{log.action_type}</td>

                        <td className="td-style-nobtn hidden sm:table-cell">
                          {log.old_values || log.new_values
                            ? `${JSON.stringify(log.old_values)} → ${JSON.stringify(log.new_values)}`
                            : "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            <br />

            <p className="text-sm">
              Showing <b>{filteredLogs.length}</b> log{filteredLogs.length !== 1 ? "s" : ""}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default EvaluationLogs;
