import React, { useEffect, useMemo, useState } from "react";
import ReactPaginate from "react-paginate";
import { compareDate, compareText } from "../../utils/sort";
import { exportRowsToCsv } from "../../utils/csv.js";
import { exportRowsToXlsx } from "../../utils/excel.js";
import ReportModal from "../../components/report-modal.jsx";
import { filterRowsByDateRange } from "../../utils/reporting.js";

const calendarLogs = [
  {
    time: "9:00 AM PHT",
    date: "12/18/25",
    email: "rcsundiam@acdc.ph",
    action: "Added new Department",
    changes: "Human Resource Department",
  },
  {
    time: "9:00 AM PHT",
    date: "12/18/25",
    email: "gmrdelossantos@acdc.ph",
    action: "Deleted a Deparment",
    changes: "Deleted HR Department",
  },
  {
    time: "9:00 AM PHT",
    date: "12/18/25",
    email: "clpaldeng@acdc.ph",
    action: "Updated Department Name",
    changes: "Human Resource Department to HR Department",
  },
  {
    time: "9:00 AM PHT",
    date: "12/18/25",
    email: "lpcabe@acdc.ph",
    action: "Added new position",
    changes: "Human Resource Department - Added HR Staff",
  },
];

function CalendarLogs (){

    const [reportOpen, setReportOpen] = useState(false);

   /* CHANGE THIS PLS, THIS IS FOR LEAVE LOGS */
    const handleGenerateReport = ({ startDate, endDate, fileType } = {}) => {
        const rowsForExport =
          startDate || endDate
            ? filterRowsByDateRange(
                visibleLogs,
                (log) => log?.timestamp,
                startDate,
                endDate
              )
            : visibleLogs;
    
        const stamp = new Date().toISOString().slice(0, 10);
        const ext = fileType === "XLSX" ? "xlsx" : "csv";
        const filename = `audit-leave-${stamp}.${ext}`;
    
        const columns = [
          {
            header: "Date | Time",
            value: (log) =>
              log?.timestamp ? new Date(log.timestamp).toLocaleString() : "",
          },
          { header: "User", value: (log) => formatActorLabel(log) },
          { header: "Action", value: (log) => getActionLabel(log) },
          { header: "Changes", value: (log) => formatLeaveChanges(log) },
        ];
    
        if (fileType === "XLSX") {
          exportRowsToXlsx({
            filename,
            sheetName: "Leave Logs",
            columns,
            rows: rowsForExport,
          });
        } else {
          exportRowsToCsv({ filename, columns, rows: rowsForExport });
        }
    
        setReportOpen(false);
      };

    //REACT-PAGINATE
    const visibleLogs = calendarLogs;
    const [itemOffset, setItemOffset] = useState(0);
    const itemsPerPage = 15;
    const endOffset = itemOffset + itemsPerPage;
    const currentLogs = visibleLogs.slice(itemOffset, endOffset);
    const pageCount = Math.ceil(visibleLogs.length / itemsPerPage);
    const multiPages = pageCount > 1;
    const currentPage = pageCount ? Math.floor(itemOffset / itemsPerPage) + 1 : 0;
    
    const handlePageClick = (event) => {
        const newOffset = event.selected * itemsPerPage;
        setItemOffset(newOffset);
    };
    
    return(
        <div className="">
            <div className="p-7 lg:mx-[4.5rem] md:mx-10">
               
                <div className="md:flex justify-between items-center w-full mb-5">

                    <div className="">
                        <h1 className='lg:text-3xl text-2xl text-[#990100] font-bold md:mb-0 mb-5'>Calendar</h1>
                    </div>

                    <div className="flex justify-end items-center gap-3"> 
           

                        <div className="relative text-gray-600 border border-[#990100] rounded-lg ">
                            <input type="search" name="search" placeholder="Search" className="bg-white lg:h-10 h-9 px-2 pr-10 rounded-lg text-sm focus:outline-none" />
                            <img
                            src="/icons/red-search.png"
                            className="absolute right-2 top-2 w-5 h-5"
                            alt="search"
                            />
                        </div>
                    </div> 
                </div>

                <hr className='text-[#990100] mt-6 '/>

                <div className="flex justify-end mt-5">
                    <button 
                    className='generate-report-button'
                    onClick={() => setReportOpen(true)}
                    >Generate Report</button>
                </div>
                
                {/* IF EVER CHANGE THIS PLS, THIS IS FOR LEAVE LOGS */}
                <ReportModal
                          open={reportOpen}
                          title="Generate Report - Calendar Logs"
                          onClose={() => setReportOpen(false)}
                          onGenerate={handleGenerateReport}
                          enableDateRange={true}/>

                <div className="div-table">
                    <table className="table-style">
                        <thead className="thead-style">
                            <tr>
                                <th className="th-style rounded-tl-lg rounded-bl-lg">Date | Time</th>
                                <th className="th-style">User</th>
                                <th className="th-style">Action</th>
                                <th className="th-style rounded-tr-lg rounded-br-lg">Changes</th>
                            </tr>
                        </thead>
                        <tbody className='tbody-style'>
                            {currentLogs.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                                        No calendar logs found
                                    </td>
                                </tr>
                            ) : (
                                currentLogs.map((row) => (
                                    <tr key={row.email} className="tr-style">
                                        <td className="td-style-nobtn">
                                            {row.date} | {row.time}
                                        </td>
                                        <td className="td-style-nobtn font-medium">
                                            {row.email}
                                        </td>
                                        <td className="td-style-nobtn">
                                            {row.action}
                                        </td>
                                        <td className="td-style-nobtn ">
                                            {row.changes}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                    <br />
                    <div className="lg:flex items-center lg:justify-between">
                        <p className="lg:text-md text-sm">
                            Showing <b>{currentLogs.length}</b> of <b>{visibleLogs.length}</b>{" "}
                            log{visibleLogs.length !== 1 ? "s" : ""}
                            {pageCount ? (
                            <>
                            {" "}
                            | Page <b>{currentPage}</b> of <b>{pageCount}</b>
                            </>
                        ) : null}
                        </p>

                        {pageCount > 0 && (
                            <div className=" ">
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
                        </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
} export default CalendarLogs;
