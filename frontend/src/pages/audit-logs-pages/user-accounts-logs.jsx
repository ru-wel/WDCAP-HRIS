import React, { useEffect, useState } from "react";
import Navbar from "../components/navbar";
import DropDownFilter from "../components/dropdownfilter";
import { get } from "../../services/api.js";
import ReactPaginate from 'react-paginate';

function UserAccountsLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // fetch audit logs (users only)
  const fetchAuditLogs = async () => {
    try {
      setLoading(true);

      // pull only USER logs
      const response = await get("/audit-logs/table/users");

      if (response.success) {
        setLogs(response.data);
      }
    } catch (err) {
      console.error("Failed to fetch audit logs:", err);
      setError(err.message || "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  //REACT-PAGINATE
  
    const [itemOffset, setItemOffset] = useState(0);
    const itemsPerPage = 15;
    const endOffset = itemOffset + itemsPerPage;
    const currentLogs = logs.slice(itemOffset, endOffset);
    const pageCount = Math.ceil(logs.length / itemsPerPage);
    const multiPages = pageCount > 1;
  
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
            User Accounts
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
          <div className="flex justify-center py-20">
            <p className="text-gray-600">Loading audit logs...</p>
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mt-5">
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
                      No audit logs found
                    </td>
                  </tr>
                ) : (
                  currentLogs.map((log) => {
                    const dateObj = new Date(log.timestamp);

                    return (
                      <tr key={log.id} className="tr-style">
                        <td className="td-style-nobtn">
                          {dateObj.toLocaleDateString()} |{" "}
                          {dateObj.toLocaleTimeString()}
                        </td>

                        <td className="td-style-nobtn font-medium">
                          {log.users?.email || "N/A"}
                        </td>

                        <td className="td-style-nobtn">
                          {log.action_type}
                        </td>

                        <td className="td-style-nobtn hidden sm:table-cell">
                          {log.new_values
                            ? JSON.stringify(log.new_values)
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
              <p className="lg:text-md text-sm">
                Showing <b>{currentLogs.length}</b> of <b>{logs.length}</b> log{logs.length !== 1 ? "s" : ""}
              </p>

              <div className=" ">
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default UserAccountsLogs;
