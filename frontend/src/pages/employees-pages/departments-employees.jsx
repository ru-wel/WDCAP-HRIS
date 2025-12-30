import React, { useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/navbar";
import DropDownFilter from "../components/dropdownfilter";
import ReactPaginate from "react-paginate";

const demoEmployees = [
  {
    id: "AC-00001",
    name: "Reuel Christian Sundiam",
    position: "Talent Acquisition",
    hireDate: "10/20/25",
    type: "Regular",
    deptId: 1,
  },
  {
    id: "AC-00002",
    name: "Lance Paolo Cabe",
    position: "Accountant",
    hireDate: "10/20/25",
    type: "Regular",
    deptId: 2,
  },
  {
    id: "AC-00003",
    name: "Gabrielle Delos Santos",
    position: "HR Specialist",
    hireDate: "10/20/25",
    type: "Regular",
    deptId: 1,
  },
  {
    id: "AC-00004",
    name: "Carl Paldeng",
    position: "IT Senior",
    hireDate: "10/20/25",
    type: "Regular",
    deptId: 3,
  },
  {
    id: "AC-00005",
    name: "John Dayrit",
    position: "HR Assistant",
    hireDate: "10/20/25",
    type: "Regular",
    deptId: 1,
  },
];

export default function DepartmentEmployees() {
  const navigate = useNavigate();
  const { departmentId } = useParams();
  const location = useLocation();

  const deptFromState = location.state?.department;
  const departmentName = deptFromState?.name || "Department";
  const deptIdNum = Number(departmentId);

  const [tab, setTab] = useState("employees");
  const [search, setSearch] = useState("");

  const employees = useMemo(() => {
    const byDept = demoEmployees.filter((e) => e.deptId === deptIdNum);
    if (!search.trim()) return byDept;

    const s = search.toLowerCase();
    return byDept.filter(
      (e) =>
        e.id.toLowerCase().includes(s) ||
        e.name.toLowerCase().includes(s) ||
        e.position.toLowerCase().includes(s) ||
        e.type.toLowerCase().includes(s)
    );
  }, [deptIdNum, search]);

  const [itemOffset, setItemOffset] = useState(0);
  const itemsPerPage = 10;
  const endOffset = itemOffset + itemsPerPage;
  const currentEmployees = employees.slice(itemOffset, endOffset);
  const pageCount = Math.ceil(employees.length / itemsPerPage);

  const handlePageClick = (event) => {
    setItemOffset(event.selected * itemsPerPage);
  };

  return (
    <div>
      <Navbar />

      <div className="p-7 lg:mx-18 md:mx-10">
        <div className="md:flex justify-between items-center w-full">
          <div className="flex items-center gap-3">
            <h1 className="lg:text-3xl text-2xl text-[#990100] font-bold">
              {departmentName}
            </h1>
          </div>

          <div className="flex items-center justify-end md:gap-4 gap-3 md:mt-0 mt-5">
            <DropDownFilter />

            <div className="relative text-gray-600 border border-[#990100] rounded-lg">
              <input
                type="search"
                placeholder="Search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setItemOffset(0);
                }}
                className="bg-white lg:h-10 md:h-9 h-8 px-2 lg:pr-10 md:pr-5 pr-5 md:w-auto w-35 rounded-lg text-sm focus:outline-none"
              />
              <button
                type="button"
                className="absolute right-0 top-0 md:mt-3 mt-2 lg:mr-3 mr-2 items-center cursor-pointer"
              >
                <img
                  src="/icons/red-search.png"
                  className="lg:w-5 lg:h-5 w-4 h-4 items-center"
                  alt="search"
                />
              </button>
            </div>
          </div>
        </div>

        <hr className="text-[#990100] mt-6" />

        <div className="mt-6">
          <div className="flex">
            <button
              type="button"
              onClick={() => setTab("employees")}
              className={`px-8 py-3 font-medium rounded-t-lg transition duration-200
                ${
                  tab === "employees"
                    ? "bg-[#990100] text-white"
                    : "bg-[#D9D9D9] text-black hover:bg-gray-300"
                }`}
            >
              Employees
            </button>

            <button
              type="button"
              onClick={() => setTab("positions")}
              className={`px-8 py-3 font-medium rounded-t-lg ml-1 transition duration-200
                ${
                  tab === "positions"
                    ? "bg-[#990100] text-white"
                    : "bg-[#D9D9D9] text-black hover:bg-gray-300"
                }`}
            >
              Positions
            </button>
          </div>

          <div className="border border-gray-300 rounded-b-lg rounded-tr-lg p-6 shadow-lg bg-white">
            {tab === "employees" ? (
              <>
                <div className="div-table">
                  <table className="table-style">
                    <thead className="thead-style">
                      <tr>
                        <th className="th-style rounded-tl-lg rounded-bl-lg">
                          Employee ID
                        </th>
                        <th className="th-style">Name</th>
                        <th className="th-style">Position</th>
                        <th className="th-style">Hire Date</th>
                        <th className="th-style rounded-tr-lg rounded-br-lg">
                          Personnel Type
                        </th>
                      </tr>
                    </thead>

                    <tbody className="tbody-style">
                      {currentEmployees.map((row) => (
                        <tr key={row.id} className="tr-style">
                          <td className="td-style font-medium">{row.id}</td>
                          <td className="td-style">{row.name}</td>
                          <td className="td-style">{row.position}</td>
                          <td className="td-style">{row.hireDate}</td>
                          <td className="td-style">{row.type}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end mt-6 text-[#990100]">
                  <ReactPaginate
                    previousLabel="<"
                    nextLabel=">"
                    pageCount={pageCount}
                    onPageChange={handlePageClick}
                    containerClassName="flex gap-3"
                    activeClassName="underline font-bold"
                  />
                </div>
              </>
            ) : (
              <div className="text-gray-500">
                Positions tab (hook this to your positions data next)
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}