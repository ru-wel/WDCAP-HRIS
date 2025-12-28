import React, { useEffect, useState } from "react";
import Navbar from "../components/navbar";
import DropDownFilter from "../components/dropdownfilter";
import { get } from "../../services/api.js";
import ReactPaginate from 'react-paginate';

function EmployeesLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Extract target employee name from log
  const getTargetEmployee = (log) => {
    const { action_type, old_values, new_values } = log;

    // For CREATE and UPDATE, use new_values; for DELETE, use old_values
    const values = new_values || old_values;

    if (!values) return 'N/A';

    const name = [values.first_name, values.middle_name, values.last_name]
      .filter(Boolean)
      .join(' ');

    const employeeId = values.employee_id || 'N/A';

    return `${name} (${employeeId})`;
  };

  // format logs in a readable way
  const formatEmployeeChanges = (log) => {
    const { action_type, old_values, new_values } = log;

    // fields to skip (technical/system fields, nested objects)
    const skipFields = [
      'id', 'user_id',
      'created_at', 'updated_at', 'deleted_at',
      'positions', 'departments', 'users' // nested objects
    ];

    // safely convert value to string
    const formatValue = (value) => {
      if (value === null || value === undefined) return 'N/A';
      if (typeof value === 'object') return '[Complex Data]';
      if (typeof value === 'boolean') return value ? 'Yes' : 'No';
      return String(value);
    };

    // make field names readable
    const humanizeFieldName = (fieldName) => {
      const specialCases = {
        'position_id': 'Position',
        'department_id': 'Department',
        'employment_status': 'Employment Status',
        'personnel_type': 'Personnel Type',
        'hire_date': 'Hire Date',
        'birth_date': 'Birth Date'
      };

      if (specialCases[fieldName]) {
        return specialCases[fieldName];
      }

      return fieldName
        .replace(/_/g, ' ')
        .replace(/\b\w/g, char => char.toUpperCase());
    };

    // CREATE: show employee name and key details
    if (action_type === 'CREATE' && new_values) {
      const name = [new_values.first_name, new_values.middle_name, new_values.last_name]
        .filter(Boolean)
        .join(' ');
      const dept = new_values.department_name || 'N/A';
      const position = new_values.position_title || 'N/A';
      return `${name} - ${dept}, ${position}`;
    }

    // UPDATE: show only changed fields
    if (action_type === 'UPDATE' && old_values && new_values) {
      const changes = [];

      // handle position changes (compare nested objects)
      if (new_values.positions && old_values.positions) {
        if (new_values.positions.id !== old_values.positions.id) {
          changes.push(`Position: ${old_values.positions.position_title} → ${new_values.positions.position_title}`);
        }
      }

      // handle department changes (compare nested objects)
      if (new_values.departments && old_values.departments) {
        if (new_values.departments.id !== old_values.departments.id) {
          changes.push(`Department: ${old_values.departments.department_name} → ${new_values.departments.department_name}`);
        }
      }

      // handle other regular field changes
      for (const key in new_values) {
        // skip technical fields and nested objects
        if (skipFields.includes(key)) continue;

        // check if value actually changed
        const oldVal = old_values[key];
        const newVal = new_values[key];

        //skip if value is an object or if values are the same
        if (typeof newVal === 'object' || oldVal === newVal) continue;

        const formattedOld = formatValue(oldVal);
        const formattedNew = formatValue(newVal);

        if (formattedOld !== formattedNew) {
          changes.push(`${humanizeFieldName(key)}: ${formattedOld} → ${formattedNew}`);
        }
      }

      return changes.length > 0 ? changes.join(', ') : 'No significant changes';
    }

    // DELETE: Show deleted employee name
    if (action_type === 'DELETE' && old_values) {
      const name = [old_values.first_name, old_values.middle_name, old_values.last_name]
        .filter(Boolean)
        .join(' ');
      return `Deleted: ${name}`;
    }

    return '—';
  };

  const fetchEmployeeLogs = async () => {
    try {
      setLoading(true);

      // pull employee audit logs
      const response = await get("/audit-logs/table/employees");

      if (response.success) {
        setLogs(response.data);
      }
    } catch (err) {
      console.error("Failed to fetch employee logs:", err);
      setError("Failed to load employee audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployeeLogs();
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
            Employees
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
            Loading employee audit logs...
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
                  <th className="th-style">User</th>
                  <th className="th-style">Employee</th>
                  <th className="th-style">Action</th>
                  <th className="th-style hidden sm:table-cell rounded-tr-lg rounded-br-lg">
                    Changes
                  </th>
                </tr>
              </thead>

              <tbody className="tbody-style">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                      No employee logs found
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

                        <td className="td-style-nobtn font-medium">
                          {getTargetEmployee(log)}
                        </td>

                        <td className="td-style-nobtn">
                          {log.action_type}
                        </td>

                        <td className="td-style-nobtn hidden sm:table-cell">
                          {formatEmployeeChanges(log)}
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

export default EmployeesLogs;
