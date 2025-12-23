import React, { useEffect, useState } from "react";
import Navbar from "../components/navbar";
import DropDownFilter from "../components/dropdownfilter";
import { get } from "../../services/api.js";
import ReactPaginate from 'react-paginate';

function DepartmentsLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDepartmentLogs = async () => {
    try {
      setLoading(true);

      // pull department audit logs
      const response = await get("/audit-logs/table/departments");

      if (response.success) {
        setLogs(response.data);
      }
    } catch (err) {
      console.error("Failed to fetch department logs:", err);
      setError("Failed to load department audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartmentLogs();
  }, []);

  //REACT-PAGINATE

  const [itemOffset, setItemOffset] = useState(0);
  const itemsPerPage = 20;
  const endOffset = itemOffset + itemsPerPage;
  const currentLogs = logs.slice(itemOffset, endOffset);
  const pageCount = Math.ceil(logs.length / itemsPerPage);

  const handlePageClick = (event) => {
    const newOffset = (event.selected * itemsPerPage);
    setItemOffset(newOffset);
  };

  return (
    <div>
      <Navbar />

      <div className="p-7 lg:mx-18 md:mx-10">
        {/* HEADER */}
        <div className="md:flex justify-between items-center w-full">
          <h1 className="lg:text-3xl text-2xl text-[#990100] font-bold">
            Departments
          </h1>

          <div className="flex items-center gap-3">
            <DropDownFilter />

            <div className="relative text-gray-600 border border-[#990100] rounded-lg">
              <input
                type="search"
                placeholder="Search"
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
          <button className="generate-report-button">
            Generate Report
          </button>
        </div>

        {/* LOADING */}
        {loading && (
          <div className="py-20 text-center text-gray-600">
            Loading department audit logs...
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div className="bg-red-100 text-red-700 px-4 py-3 rounded mt-5">
            {error}
          </div>
        )}

        {/* TABLE */}
        {!loading && !error && (
          <div className="div-table">
            <table className="table-style">
              <thead className="thead-style">
                <tr>
                  <th className="th-style rounded-tl-lg rounded-bl-lg">
                    Date | Time
                  </th>
                  <th className="th-style">Email</th>
                  <th className="th-style">Action</th>
                  <th className="th-style hidden sm:table-cell rounded-tr-lg rounded-br-lg">
                    Changes
                  </th>
                </tr>
              </thead>

              <tbody className="tbody-style">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                      No department logs found
                    </td>
                  </tr>
                ) : (
                  currentLogs.map((log) => {
                    const date = new Date(log.timestamp);

                    return (
                      <tr key={log.id} className="tr-style">
                        <td className="td-style-nobtn">
                          {date.toLocaleDateString()} |{" "}
                          {date.toLocaleTimeString()}
                        </td>

                        <td className="td-style-nobtn font-medium">
                          {log.users?.email || "N/A"}
                        </td>

                        <td className="td-style-nobtn">
                          {log.action_type}
                        </td>

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

            <div className="lg:flex items-center lg:justify-between">
              {/* AYUSIN MO DIN TO LA */}
              <p className="lg:text-md text-sm">
                Showing <b>{logs.length}</b> log{logs.length !== 1 ? "s" : ""}
              </p>

              <div className="flex items-center space-x-2 md:pt-0 pt-4">
                {/*<span className="text-[#990100] hover:underline cursor-pointer">
                  &lt;
                </span>
                <span className="text-sm font-medium">1</span>
                <span className="text-sm">to {logs.length}</span>
                <span className="text-[#990100] hover:underline cursor-pointer">
                  &gt;
                </span>*/}
                <ReactPaginate
                  breakLabel="..."
                  nextLabel=">"
                  onPageChange={handlePageClick}
                  pageRangeDisplayed={2}
                  pageCount={pageCount}
                  previousLabel="<"
                  renderOnZeroPageCount={null}
                  marginPagesDisplayed={2}
                  pageClassName=""
                  pageLinkClassName="cursor-pointer hover:text-gray-500 hover:underline"
                  previousClassName="cursor-pointer hover:text-gray-500 hover:underline"
                  previousLinkClassName="page-link"
                  nextClassName="cursor-pointer hover:text-gray-500 hover:underline"
                  nextLinkClassName="page-link"
                  breakClassName="page-item"
                  breakLinkClassName="page-link"
                  containerClassName="flex items-center space-x-2 md:pt-0 pt-4 text-[#990100]"
                  activeClassName="underline font-medium"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DepartmentsLogs;
