import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import ReactPaginate from "react-paginate";

function StatCard({ title, color, value, onClick }) {
  return (
    <section
      type="button"
      onClick={onClick}
      className="w-full text-left focus:outline-none cursor-pointer"
    >
      <div className="relative bg-white rounded-xl border border-gray-200 lg:px-5 px-3 py-4 flex items-center justify-between shadow-sm hover:shadow-md hover:-translate-y-[2px] transition duration-200 ease-in-out">
        <span className="absolute left-0 top-0 h-full w-1 rounded-l-xl" style={{ backgroundColor: color }} />
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            {title}
          </p>
          <p className="mt-2 text-2xl font-semibold text-[#990100]">{value}</p>
        </div>
      </div>
    </section>
  );
}

function RequestLeave ({onClose}){
    return(
        <div>
            <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div
                    className="absolute inset-0 bg-black/20"
                    aria-hidden="true"
                />

                    <div className="relative w-full lg:max-w-xl md:max-w-lg mx-4 bg-white rounded-lg shadow-xl border border-gray-300">
                        <div className="p-4 sm:p-6">
                        <div className="rounded-lg bg-[#990100] flex items-center justify-between py-2 sm:py-3 px-3 sm:px-4">
                            <h1 className="text-white text-sm sm:text-base lg:text-lg font-medium">
                            Leave Request
                            </h1>

                            <button
                            type="button"
                            className="text-white text-2xl font-bold hover:scale-110 transition cursor-pointer"
                            aria-label="Close"
                            onClick={onClose}
                            >
                            ✕
                            </button>
                        </div>
                        <div className="mt-6 flex justify-center">
                            <div className="w-full max-w-md">
                                <div className="space-y-6 text-sm mt-6">
                                    <div className="grid grid-cols-[140px_1fr] gap-4 items-start">
                                        
                                        <label className="text-left font-semibold pt-2 text-[#483D3D]  uppercase">
                                        Leave Type:
                                        </label>
                                        <select className="border border-[#990100] rounded-md px-3 py-2 w-full">
                                            <option value="">Select leave type</option>
                                            <option>SIL</option>
                                            <option>Leave without Pay</option>
                                        </select>

                                        <label className="text-left font-semibold pt-2 text-[#483D3D] uppercase">
                                        Start Date:
                                        </label>
                                        <input
                                        type="date"
                                        className="border border-[#990100] rounded-md px-3 py-2 w-full"
                                        />

                                        <label className="text-left font-semibold pt-2 text-[#483D3D] uppercase">
                                        End Date:
                                        </label>
                                        <input
                                        type="date"
                                        className="border border-[#990100] rounded-md px-3 py-2 w-full"
                                        />

                                        <label className="text-left font-semibold pt-2 text-[#483D3D] uppercase">
                                        Reason:
                                        </label>
                                        <textarea
                                        className="border border-[#990100] rounded-md px-3 py-2 h-28 resize-none w-full"
                                        placeholder="Optional"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end mt-8">
                            <button
                            type="button"
                            className="bg-[#990100] text-white text-sm px-6 py-2 rounded-md hover:bg-[#ad3332] transition disabled:opacity-60"
                            >
                            Submit
                            </button>
                        </div>
                    </div>
                </div>
            </div>  
        </div>
    )
}


function ViewDetails ({ data, onClose }){

    if (!data) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />

      <div className="relative w-full lg:max-w-xl md:max-w-lg mx-4 bg-white rounded-lg shadow-xl border border-gray-300">
        <div className="p-4 sm:p-6">
          
          {/* HEADER */}
          <div className="rounded-lg bg-[#990100] flex items-center justify-between py-2 sm:py-3 px-3 sm:px-4">
            <h2 className="text-white text-sm sm:text-base lg:text-lg font-medium">
              Leave Details
            </h2>
            <button
              onClick={onClose}
              className="text-white text-xl font-bold hover:scale-110 transition"
            >
              ✕
            </button>
          </div>


          <div className="space-y-5 text-sm">
            <div className="grid grid-cols-[140px_1fr] gap-x-6 gap-y-2">


            <div className="font-semibold pt-6">Date Requested:</div>
            <div>{data.dateRequested}</div>

            <div className="font-semibold">Employee Name:</div>
            <div>{data.name}</div>

            <div className="font-semibold">Position:</div>
            <div>{data.position}</div>

            <div className="font-semibold">Leave Type:</div>
            <div>{data.type}</div>

            <div className="font-semibold">Date:</div>
            <div>{data.date}</div>

            <div className="font-semibold">Reason:</div>
            <textarea
                className="border border-gray-300 rounded-md p-3 text-sm h-28 resize-none"
                placeholder="Reason"
                value={data.reason}
                readOnly
            />
            </div>

            <hr className="border-[#990100]" />

            <div className="flex items-center gap-4">
            <div className="font-semibold">Status:</div>
            <StatusPill status={data.status} />
            <select
                className="border border-gray-300 rounded-md px-4 py-2 text-sm bg-white w-full sm:w-56"
            >
                <option value="APPROVED">APPROVED</option>
                <option value="REJECTED">REJECTED</option>
                <option value="PENDING">PENDING</option>
                <option value="CANCELLED">CANCELLED</option>
            </select>
            </div>

            <div className="pt-2">
            <span className="font-semibold">Update Made By:</span>
            </div>

            <div className="flex justify-end pt-3">
            <button
                type="button"
                className="generate-report-button shadow-md px-6"
            >
                Cancel Request
            </button>
            </div>
        </div>

        </div>
      </div>
    </div>
  );
}

function LeaveWOPay ({onClose}){
    return(
        <div>
            <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div
                    className="absolute inset-0 bg-black/20"
                    aria-hidden="true"
                />

                    <div className="relative w-full md:max-w-sm mx-4 bg-white rounded-lg shadow-xl border border-gray-300">
                        <div className="p-6">
                        <div className=" flex items-center justify-between">
                            <p className="text-[#990100] font-semibold uppercase">Leave without Pay</p>
                            <button
                            type="button"
                            className="text-gray-400 hover:text-gray-500 text-lg font-bold hover:scale-110 transition cursor-pointer"
                            aria-label="Close"
                            onClick={onClose}
                            >
                            ✕
                            </button>
                        </div>

                        <div className="flex justify-center pt-4 text-sm">
                            <ul className="list-disc pl-5 space-y-2">
                                <li>This is available to everyone. You may request for a leave without pay.</li>
                            </ul>
                        </div>

                    </div>
                </div>
            </div>  
        </div>
    )
}

function SIL ({onClose}){
    return(
        <div>
            <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div
                    className="absolute inset-0 bg-black/20"
                    aria-hidden="true"
                />

                    <div className="relative w-full md:max-w-sm mx-4 bg-white rounded-lg shadow-xl border border-gray-300">
                        <div className="p-6">
                        <div className=" flex items-center justify-between">
                            <p className="text-[#990100] font-semibold uppercase">Service Incentive Leave (SIL)</p>
                            <button
                            type="button"
                            className="text-gray-400 hover:text-gray-500 text-lg font-bold hover:scale-110 transition cursor-pointer"
                            aria-label="Close"
                            onClick={onClose}
                            >
                            ✕
                            </button>
                        </div>

                        <div className="flex justify-center pt-4 text-sm">
                            <ul className="list-disc pl-5 space-y-2">
                                <li>For employees who already rendered service for at least 1 year in the company.</li>
                                <li>5 days of leave credits annually.</li>
                                <li>Employee can use it for sick or vacation leave.</li>
                                <li>Unused SIL at the end of the year are to be encashed.</li>
                            </ul>
                        </div>

                    </div>
                </div>
            </div>  
        </div>
    )
}

function MaternityLeave ({onClose}){
    return(
        <div>
            <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div
                    className="absolute inset-0 bg-black/20"
                    aria-hidden="true"
                />

                    <div className="relative w-full md:max-w-sm mx-4 bg-white rounded-lg shadow-xl border border-gray-300">
                        <div className="p-6">
                        <div className=" flex items-center justify-between">
                            <p className="text-[#990100] font-semibold uppercase">Maternity Leave</p>
                            <button
                            type="button"
                            className="text-gray-400 hover:text-gray-500 text-lg font-bold hover:scale-110 transition cursor-pointer"
                            aria-label="Close"
                            onClick={onClose}
                            >
                            ✕
                            </button>
                        </div>

                        <div className="flex flex-col justify-center pt-4 text-sm">
                            <p className="font-medium text-[#990100]">INITIAL:</p>
                            <ul className="list-disc pl-5 space-y-2">
                                <li>To file, inform the HR at least 60 days before due date.</li>
                                <li>Submit SSS Maternity Notification Form (MAT 1).</li>
                                <li>Submit Doctor's Certificate (Proof of Pregnancy).</li>
                            </ul>

                            <p className="pt-4 font-medium text-[#990100]">AFTER GIVING BIRTH:</p>
                            <ul className="list-disc pl-5 space-y-2">
                                <li>Submit the SSS Maternity Benefit Application (MAT 2).</li>
                                <li>Submit baby's birth certificate for your employer to process your 105 days of paid leave, ensuring you have at least 3 months of SSS contributions.</li>
                            </ul>
                        </div>

                    </div>
                </div>
            </div>  
        </div>
    )
}

function PaternityLeave ({onClose}){
    return(
        <div>
            <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div
                    className="absolute inset-0 bg-black/20"
                    aria-hidden="true"
                />

                    <div className="relative w-full md:max-w-sm mx-4 bg-white rounded-lg shadow-xl border border-gray-300">
                        <div className="p-6">
                        <div className=" flex items-center justify-between">
                            <p className="text-[#990100] font-semibold uppercase">Paternity Leave</p>
                            <button
                            type="button"
                            className="text-gray-400 hover:text-gray-500 text-lg font-bold hover:scale-110 transition cursor-pointer"
                            aria-label="Close"
                            onClick={onClose}
                            >
                            ✕
                            </button>
                        </div>

                        <div className="flex flex-col justify-center pt-4 text-sm">
                            <ul className="list-disc pl-5 space-y-2">
                                <li>7 days of paid leave to assist your spouse.</li>
                                <li>Only for the deliveries of first four children.</li>
                                <li>Submit a copy of your marriage certificate.</li>
                                <li>Complete the company-specific application or notification form.</li>
                                <li>After childbirth, submit a copy of the birth certificate or medical certificate to the HR department</li>
                            </ul>
                        </div>

                    </div>
                </div>
            </div>  
        </div>
    )
}

function VAWC ({onClose}){
    return(
        <div>
            <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div
                    className="absolute inset-0 bg-black/20"
                    aria-hidden="true"
                />

                    <div className="relative w-full md:max-w-sm mx-4 bg-white rounded-lg shadow-xl border border-gray-300">
                        <div className="p-6">
                        <div className=" flex items-center justify-between gap-2">
                            <p className="text-[#990100] font-semibold uppercase">Victims of Violence Against Women and Their Children (VAWC) Leave</p>
                            <button
                            type="button"
                            className="text-gray-400 hover:text-gray-500 text-lg font-bold hover:scale-110 transition cursor-pointer"
                            aria-label="Close"
                            onClick={onClose}
                            >
                            ✕
                            </button>
                        </div>

                        <div className="flex flex-col justify-center pt-4 text-sm">
                            <ul className="list-disc pl-5 space-y-2">
                                <li>A certification of a filed/pending VAWC case is required to submit, which can be issued by: Punong Barangay/Barangay Kagawad, Prosecutor, or Clerk of Court.</li> 
                                <li>Up to 10 days of paid leave in order to attend to medical and legal issues.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>  
        </div>
    )
}

function SoloParents ({onClose}){
    return(
        <div>
            <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div
                    className="absolute inset-0 bg-black/20"
                    aria-hidden="true"
                />

                    <div className="relative w-full md:max-w-sm mx-4 bg-white rounded-lg shadow-xl border border-gray-300">
                        <div className="p-6">
                        <div className=" flex items-center justify-between">
                            <p className="text-[#990100] font-semibold uppercase">Parental Leave for Solo Parents</p>
                            <button
                            type="button"
                            className="text-gray-400 hover:text-gray-500 text-lg font-bold hover:scale-110 transition cursor-pointer"
                            aria-label="Close"
                            onClick={onClose}
                            >
                            ✕
                            </button>
                        </div>

                        <div className="flex flex-col justify-center pt-4 text-sm">
                            <ul className="list-disc pl-5 space-y-2">
                                <li>7-day paid leave.</li>
                                <li>Submit Solo Parent ID as this is the primary requirement, secured from the Local Social Welfare and Development Office (LSWDO)</li>
                                <li>Must have worked for the company for at least 6 months (continuous or broken).</li>
                                <li>Proper notice should be given when availing the leave.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>  
        </div>
    )
}

function WomenLeave ({onClose}){
    return(
        <div>
            <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div
                    className="absolute inset-0 bg-black/20"
                    aria-hidden="true"
                />

                    <div className="relative w-full md:max-w-sm mx-4 bg-white rounded-lg shadow-xl border border-gray-300">
                        <div className="p-6">
                        <div className=" flex items-center justify-between">
                            <p className="text-[#990100] font-semibold uppercase">Special Leave Benefits for Women</p>
                            <button
                            type="button"
                            className="text-gray-400 hover:text-gray-500 text-lg font-bold hover:scale-110 transition cursor-pointer"
                            aria-label="Close"
                            onClick={onClose}
                            >
                            ✕
                            </button>
                        </div>

                        <div className="flex flex-col justify-center pt-4 text-sm">
                            <ul className="list-disc pl-5 space-y-2">
                                <li>Female employees are mandated to request a 2-month leave benefit (with full payment based on their gross monthly income) due to surgery for gynecological disorders</li>
                                <li>Regardless of age or civil status but the employee must have rendered at least 6 months of continuous aggregate.</li>
                                <li>Submit duly accomplished Special Leave Benefit for Women request form.</li>
                                <li>Submit your Medical Certificate from a physician specializing in gynecological disorders.</li>
                                <li>Submit your Clinical Summary/Discharge Summary.</li>
                                <li>Submit your Histopathological Report.</li>
                                <li>Submit your Operating Room Record. </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>  
        </div>
    )
}

// FRO THE TABLE - STATUS OF LEAVE
function StatusPill({ status }) {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "APPROVED") {
    return (
      <span className="inline-flex min-w-fit px-3 py-1 whitespace-nowrap rounded-full text-xs font-semibold bg-green-200 text-green-700">
        APPROVED
      </span>
    );
  }
  if (normalized === "REJECTED") {
    return (
      <span className="bg-red-200 text-red-600 inline-flex min-w-fit px-3 py-1 whitespace-nowrap rounded-full text-xs font-semibold">
        REJECTED
      </span>
    );
  }
  if (normalized === "CANCELLED") {
    return (
      <span className="bg-[#C8C8FF] text-[#0000FF] inline-flex min-w-fit px-3 py-1 whitespace-nowrap rounded-full text-xs font-semibold">
        CANCELLED
      </span>
    );
  }
  return (
    <span className=" bg-[#FFE1A3] text-[#805200] inline-flex min-w-fit px-3 py-1 whitespace-nowrap rounded-full text-xs font-semibold">
      {normalized || "PENDING"}
    </span>
  );
}


const leaveReq = [
  {
    id: "AC-00019",
    name: "Gabrielle Delos Santos",
    leaveType: "SIL",
    date: "12/10/25",
    status: "CANCELLED",
  },
  {
    id: "AC-00019",
    name: "Gabrielle Delos Santos",
    leaveType: "SIL",
    date: "02/4/26",
    status: "PENDING",
  },
];





function MyLeaves() {
    const [showLeaves, setShowLeaves] = useState(false);
    const [showRequestLeave, setShowRequestLeave] = useState(false);
    const [showPayWOLeave, setShowPayWOLeave] = useState(false);
    const [showSIL, setShowSIL] = useState(false)
    const [showMaternity, setShowMaternity] = useState(false)
    const [showPaternity, setShowPaternity] = useState(false)
    const [showVAWC, setShowVAWC] = useState(false)
    const [showSoloParent, setShowSoloParent] = useState(false)
    const [showWomenLeave, setShowWomenLeave] = useState(false)
    const [rows, setRows] = useState(leaveReq);
    const [showViewDetails, setShowViewDetails] = useState(false);

    // REACT PAGINATE
    const [itemOffset, setItemOffset] = useState(0);
    const itemsPerPage = 5;

    const endOffset = itemOffset + itemsPerPage;
    const currentRows = rows.slice(itemOffset, endOffset);
    const pageCount = Math.ceil(rows.length / itemsPerPage);
    const currentPage = Math.floor(itemOffset / itemsPerPage) + 1;
    const multiPages = pageCount > 1;

    const handlePageClick = (event) => {
    const newOffset = event.selected * itemsPerPage;
    setItemOffset(newOffset);
    };


    return (
        <div>
            <div className="p-7 lg:mx-18 md:mx-10">
                <div className="md:flex justify-between items-center w-full">
                    <div className="">
                        <h1 className="lg:text-3xl text-2xl text-[#990100] font-bold md:mb-0 mb-5">
                            My Leaves
                        </h1>
                    </div>
                </div>

                <hr className="text-[#990100] my-6 " />

                <div className="flex justify-end mb-6">
                    <button
                        className="generate-report-button font-medium"
                        onClick={() => setShowRequestLeave(true)}
                    >
                        Request Leave
                    </button>
                </div>

                {/* ALL LEAVE FOR AN EMPLOYEE */}

                <div className="border border-gray-300 p-5 rounded-lg shadow-md overflow-y-auto">
                    <div className="flex items-center justify-between">
                        <div className="">
                            <h2 className="text-[#990100] md:text-2xl text-xl">All Leaves</h2>
                            <p className="text-xs text-gray-400">Click the boxes to know the requirements or how each leave works.</p>
                        </div>
                        
                        <button 
                            className="text-[#990100] hover:underline"
                            onClick={() => setShowLeaves(!showLeaves)}
                        >
                            {showLeaves ? 'Hide' : 'Show All'}
                        </button>
                    </div>

                    <div className="px-4 pt-4 ">
                        
                        <div className="grid lg:grid-cols-4 md:grid-cols-2 grid-cols-1 gap-4">
                            <StatCard
                                title="Leave without Pay"
                                value="-"
                                color = "#FE7F2D"
                                onClick={() => setShowPayWOLeave(true)}
                            />
                            {/* KINDLY PUT HERE NA LANG SIL LEAVE NI USER */}
                            <StatCard
                                title="Service Incentive Leave"
                                value="5"
                                color = "#7ADAA5"
                                onClick={() => setShowSIL(true)}
                            />
                            <StatCard
                                title="Maternity Leave"
                                value="By request"
                                color = "#FF0087"
                                onClick={() => setShowMaternity(true)}
                            />
                            <StatCard
                                title="Paternity Leave"
                                value="By request"
                                color = "#3F9AAE"
                                onClick={() => setShowPaternity(true)}
                            />
                        </div>

                    </div>

                    <div  className={`overflow-hidden transition-all duration-300 ${showLeaves ? "max-h-auto pt-4 px-4 pb-4 " : "max-h-0"}`}>
                        <div className="grid lg:grid-cols-4 md:grid-cols-2 grid-cols-1 gap-4">
                            <StatCard
                                title="VAWC Leave"
                                value="By request"
                                color = "#B45253"
                                onClick={() => setShowVAWC(true)}
                            />
                            <StatCard
                                title="Parental Leave for Solo Parents"
                                value="By request"
                                color = "#8AA624"
                                onClick={() => setShowSoloParent(true)}
                            />
                            <StatCard
                                title="Special Leave Benefits for Women"
                                value="By request"
                                color = "#A376A2"
                                onClick={() => setShowWomenLeave(true)}
                            />
                        </div>

                    </div>
                </div>

                {/* LEAVE HISTORY */}

                <div className="div-table shadow-md md:mt-8 mt-5">
                    <table className="table-style">
                        <thead className="thead-style">
                            <tr>
                                <th className="th-style rounded-tl-lg rounded-bl-lg">Employee ID</th>
                                <th className="th-style">Name</th>
                                <th className="th-style">Leave Type</th>
                                <th className="th-style">Date</th>
                                <th className="th-style">Status</th>
                                <th className="th-style rounded-tr-lg rounded-br-lg">Actions</th>
                            </tr>
                        </thead>
                        
                        <tbody className="tbody-style">
                        {currentRows.length === 0 ? (
                            <tr>
                            <td colSpan="6" className="td-style text-center text-gray-400">
                                No records found
                            </td>
                            </tr>
                        ) : (
                            currentRows.map((row, index) => (
                            <tr key={index} className="tr-style">
                                <td className="td-style font-medium">{row.id}</td>
                                <td className="td-style font-medium">{row.name}</td>
                                <td className="td-style font-medium">{row.leaveType}</td>
                                <td className="td-style font-medium">{row.date}</td>
                                <td className="td-style font-medium">
                                <StatusPill status={row.status} />
                                </td>
                                <td className="td-style">
                                <button
                                    type="button"
                                    className="bg-[#990100] text-white text-sm px-4 py-[5px] rounded-lg hover:bg-[#ad3332]"
                                    onClick={() => setShowViewDetails(row)}
                                >
                                    View Details
                                </button>
                                </td>
                            </tr>
                            ))
                        )}
                        </tbody>
                    </table>

                    <br />

                    <div className="lg:flex items-center lg:justify-between">
                        <p className="lg:text-md text-sm">
                            Showing <b>{currentRows.length}</b> of <b>{rows.length}</b> record
                            {rows.length !== 1 ? "s" : ""}
                            {pageCount ? (
                                <>
                                {" "} | Page <b>{currentPage}</b> of <b>{pageCount}</b>
                                </>
                            ) : null}
                        </p>
            
                        {pageCount > 0 && (
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
                            previousClassName={
                                multiPages
                                ? "cursor-pointer hover:text-gray-500 hover:underline"
                                : "text-gray-400 cursor-not-allowed pointer-events-none"
                            }
                            previousLinkClassName="page-link"
                            nextClassName={
                                multiPages
                                ? "cursor-pointer hover:text-gray-500 hover:underline"
                                : "text-gray-400 cursor-not-allowed pointer-events-none"
                            }
                            nextLinkClassName="page-link"
                            breakClassName="page-item"
                            breakLinkClassName="page-link"
                            containerClassName="flex items-center space-x-2 lg:pt-0 pt-4 text-[#990100]"
                            activeClassName="underline font-medium"
                            />
                        )}
                    </div>
                </div>
            </div>

        {/* CALLING THE MODALS ABOVE */}

        {showRequestLeave && ( <RequestLeave onClose={() => setShowRequestLeave(false)} /> )}
        {showPayWOLeave && ( <LeaveWOPay onClose={() => setShowPayWOLeave(false)} /> )}
        {showSIL && ( <SIL onClose={() => setShowSIL(false)} /> )}
        {showMaternity && ( <MaternityLeave onClose={() => setShowMaternity(false)} /> )}
        {showPaternity && ( <PaternityLeave onClose={() => setShowPaternity(false)} /> )}
        {showVAWC && ( <VAWC onClose={() => setShowVAWC(false)} /> )}
        {showSoloParent && ( <SoloParents onClose={() => setShowSoloParent(false)} /> )}
        {showWomenLeave && ( <WomenLeave onClose={() => setShowWomenLeave(false)} /> )}    
        {showViewDetails && ( <ViewDetails data={showViewDetails} onClose={() => setShowViewDetails(null)}/>)}
        </div>
    )
}

export default MyLeaves;