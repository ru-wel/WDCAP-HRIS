/*
import React from "react";
import Navbar from "../components/navbar";
import DropDownFilter from "../components/dropdownfilter";

const deptLogs = [
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

function DepartmentsLogs (){
    return(
        <div className="">

            <Navbar />

            <div className="p-7 lg:mx-18 md:mx-10">
               
                <div className="md:flex justify-between items-center w-full">

                    <div className="">
                        <h1 className='lg:text-3xl text-2xl text-[#990100] font-bold md:mb-0 mb-5'>Departments</h1>
                    </div>

                    <div className="flex items-center justify-end md:gap-4 gap-3"> 
                        <DropDownFilter />

                        <div className="relative text-gray-600 border border-[#990100] rounded-lg ">
                            <input type="search" name="search" placeholder="Search" className="bg-white lg:h-10 md:h-9 h-8 px-2 lg:pr-10 md:pr-5 pr-5 md:w-auto w-35 rounded-lg text-sm focus:outline-none" />
                            <button
                                type="submit"
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

                <hr className='text-[#990100] mt-6 '/>

                <div className="flex justify-end mt-5">
                    <button className='generate-report-button'>Generate Report</button>
                </div>

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
                        <tbody className='tbody-style'>
                            {deptLogs.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                                        No employees found
                                    </td>
                                </tr>
                            ) : (
                                deptLogs.map((row) => (
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
                                        <td className="td-style-nobtn hidden sm:table-cell">
                                            {row.changes}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                    <br />
                    <div className="lg:flex items-center lg:justify-between">
                        <p className='lg:text-md text-sm'>Showing <b>{deptLogs.length}</b> employee{deptLogs.length !== 1 ? 's' : ''}</p>
                        
                        <div className="flex items-center space-x-2 md:pt-0 pt-4">
                            <span className='text-[#990100] hover:underline'><a href = "#"> &lt; </a></span>
                            <span className="text-sm font-medium text-body">1</span>
                            <span className="text-sm text-body">to 10</span>
                            <span className='text-[#990100] hover:underline'><a href = "#"> &gt; </a></span>
                        </div>                       
                    </div>
                </div>
            </div>
        </div>
    )
} export default DepartmentsLogs;*/
