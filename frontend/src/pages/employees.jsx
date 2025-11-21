import React, { useEffect, useRef } from 'react'
import Navbar from './components/navbar';
import DropDownFilter from './components/dropdownfilter';
import { useState } from "react";

function ModalEmployees({isOpen, onClose}){
    if (!isOpen) return null;

    return(
        <div className="fixed inset-0 flex items-center justify-center z-1000 bg-[#EDEDED]/50">
            <div className="bg-white rounded-lg shadow-lg p-6 w-150 h-120">
                <div className="rounded-lg bg-[#990100] flex items-center justify-between py-3 px-4">
                    <h1 className='text-white text-lg font-medium'>Information of AC-00001</h1>
                    <button className="text-white text-lg font-medium hover:scale-105 transition duration-300 ease-in-out" onClick={onClose}> ✕ </button>
                </div>

                <div className="pt-3 text-left pl-3 pr-3">
                    <p className='text-md'><b>Employee ID:</b> AC-40001</p>
                </div>
            </div>
        </div>
    )
}

function Employees(){
    
    const [isModalOpen, setModalOpen] = useState(false);
    const handleOpen = () => setModalOpen(true);
    const handleClose = () => setModalOpen(false);
    
    return(
        <div className="">
            <Navbar />

            <div className="p-7 lg:mx-18 md:mx-10">

                {/* HEADER */}
                <div className="md:flex justify-between items-center w-full">

                    <div className="">
                        <h1 className='lg:text-3xl text-2xl text-[#990100] font-bold md:mb-0 mb-5'>Employees</h1>
                    </div>
                    
                    <div className="flex items-center justify-end md:gap-4 gap-3"> 

                        <DropDownFilter />

                        <div className="relative text-gray-600 border border-[#990100] rounded-lg ">
                            <input type="search" name="search" placeholder="Search" className="bg-white lg:h-10 md:h-9 h-8 px-2 lg:pr-10 md:pr-5 pr-5 md:w-auto w-35 rounded-lg text-sm focus:outline-none" />
                            <button type="submit" className="absolute right-0 top-0 md:mt-3 mt-2 lg:mr-3 mr-2 items-center cursor-pointer">
                               <img src = "icons/red-search.png" className="lg:w-5 lg:h-5 w-4 h-4 items-center" type="submit" />
                            </button>
                        </div>

                    </div> 
                </div>
                <hr className='text-[#990100] mt-6 '/>

                <div className="flex justify-end mt-5">
                    <button className='bg-[#ad3332] lg:px-5 md:py-[7px] px-4 py-[5px] lg:text-md text-sm rounded-md text-white hover:bg-[#990100] hover:scale-105 transition duration-300 ease-in-out'>Generate Report</button>
                </div>

                {/* TABLE */}

                <div className="overflow-x-auto bg-white border rounded-lg overflow-hidden mt-5 shadow-lg px-8 py-10">
                    <table className="min-w-full text-center">
                        <thead className="bg-[#990100] text-white ">
                            <tr>
                                <th className="px-6 py-3 text-xs tracking-wider rounded-tl-lg rounded-bl-lg">Employee ID</th>
                                <th className="px-6 py-3 text-xs tracking-wider">Name</th>
                                <th className="px-6 py-3 text-xs tracking-wider">Position</th>
                                <th className="px-6 py-3 text-xs tracking-wider">Hire Date</th>
                                <th className="px-6 py-3 text-xs tracking-wider">Personnel Type</th>
                                <th className="px-6 py-3 text-xs tracking-wider rounded-tr-lg rounded-br-lg">Actions</th>
                            </tr>
                        </thead>
                        <tbody className='divide-y divide-[#990100]'>
                            <tr className='odd:bg-transparent even:bg-bg-gray-100 hover:bg-[#f4e5e5]'>
                                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900 font-medium">AC-00001</td>
                                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">Reuel Christian Sundiam</td>
                                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">Web Developer</td>
                                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">10/20/25</td>
                                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">Regular</td>
                                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">
                                    <button href="#" className='bg-[#990100] text-white text-sm px-4 py-[5px] rounded-lg text-sm hover:bg-[#ad3332] hover:scale-105 transition duration-300 ease-in-out' onClick={handleOpen}>View Details</button>
                                    <ModalEmployees isOpen={isModalOpen} onClose={handleClose} />
                                </td>                   
                            </tr>

                            <tr className='odd:bg-transparent even:bg-gray-100 hover:bg-[#f4e5e5]'>
                                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900 font-medium">AC-00002</td>
                                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">Reuel Christian Sundiam</td>
                                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">Web Developer</td>
                                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">10/20/25</td>
                                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">Regular</td>
                                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">
                                    <button href="#" className='bg-[#990100] text-white text-sm px-4 py-[5px] rounded-lg text-sm hover:bg-[#ad3332] hover:scale-105 transition duration-300 ease-in-out'>View Details</button>
                                </td>                   
                            </tr>

                            <tr className='odd:bg-transparent even:bg-gray-100 hover:bg-[#f4e5e5]'>
                                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900 font-medium">AC-00003</td>
                                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">Reuel Christian Sundiam</td>
                                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">Web Developer</td>
                                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">10/20/25</td>
                                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">Regular</td>
                                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">
                                    <button href="#" className='bg-[#990100] text-white text-sm px-4 py-[5px] rounded-lg text-sm hover:bg-[#ad3332] hover:scale-105 transition duration-300 ease-in-out'>View Details</button>
                                </td>                   
                            </tr>

                            <tr className='odd:bg-transparent even:bg-gray-100 hover:bg-[#f4e5e5]'>
                                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900 font-medium">AC-00004</td>
                                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">Reuel Christian Sundiam</td>
                                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">Web Developer</td>
                                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">10/20/25</td>
                                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">Regular</td>
                                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">
                                    <button href="#" className='bg-[#990100] text-white text-sm px-4 py-[5px] rounded-lg text-sm hover:bg-[#ad3332] hover:scale-105 transition duration-300 ease-in-out'>View Details</button>
                                </td>                   
                            </tr>

                            <tr className='odd:bg-transparent even:bg-gray-100 hover:bg-[#f4e5e5]'>
                                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900 font-medium">AC-00005</td>
                                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">Reuel Christian Sundiam</td>
                                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">Web Developer</td>
                                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">10/20/25</td>
                                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">Regular</td>
                                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">
                                    <button href="#" className='bg-[#990100] text-white text-sm px-4 py-[5px] rounded-lg text-sm hover:bg-[#ad3332] hover:scale-105 transition duration-300 ease-in-out'>View Details</button>
                                </td>                   
                            </tr>

                            <tr className='odd:bg-transparent even:bg-gray-100 hover:bg-[#f4e5e5]'>
                                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900 font-medium">AC-00006</td>
                                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">Reuel Christian Sundiam</td>
                                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">Web Developer</td>
                                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">10/20/25</td>
                                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">Regular</td>
                                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">
                                    <button href="#" className='bg-[#990100] text-white text-sm px-4 py-[5px] rounded-lg text-sm hover:bg-[#ad3332] hover:scale-105 transition duration-300 ease-in-out'>View Details</button>
                                </td>                   
                            </tr>

                            <tr className='odd:bg-transparent even:bg-gray-100 hover:bg-[#f4e5e5]'>
                                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900 font-medium">AC-00007</td>
                                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">Reuel Christian Sundiam</td>
                                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">Web Developer</td>
                                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">10/20/25</td>
                                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">Regular</td>
                                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">
                                    <button href="#" className='bg-[#990100] text-white text-sm px-4 py-[5px] rounded-lg text-sm hover:bg-[#ad3332] hover:scale-105 transition duration-300 ease-in-out'>View Details</button>
                                </td>                   
                            </tr>

                            <tr className='odd:bg-transparent even:bg-gray-100 hover:bg-[#f4e5e5]'>
                                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900 font-medium">AC-00008</td>
                                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">Reuel Christian Sundiam</td>
                                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">Web Developer</td>
                                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">10/20/25</td>
                                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">Regular</td>
                                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">
                                    <button href="#" className='bg-[#990100] text-white text-sm px-4 py-[5px] rounded-lg text-sm hover:bg-[#ad3332] hover:scale-105 transition duration-300 ease-in-out'>View Details</button>
                                </td>                   
                            </tr>

                            <tr className='odd:bg-transparent even:bg-gray-100 hover:bg-[#f4e5e5]'>
                                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900 font-medium">AC-00009</td>
                                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">Reuel Christian Sundiam</td>
                                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">Web Developer</td>
                                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">10/20/25</td>
                                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">Regular</td>
                                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">
                                    <button href="#" className='bg-[#990100] text-white text-sm px-4 py-[5px] rounded-lg text-sm hover:bg-[#ad3332] hover:scale-105 transition duration-300 ease-in-out'>View Details</button>
                                </td>                   
                            </tr>
                        </tbody>
                    </table>
                    <br />

                    <div className="flex items-center justify-between w-full">
                        <p>Showing <b>9</b> out of 200 employees</p>
                        
                        <form >
                            <div className="flex items-center space-x-2">
                                <span className='text-[#990100] hover:underline'><a href = "#"> &lt; </a></span>
                                <span className="text-sm font-medium text-body">1</span>
                                {/*<input type="tel" id="visitors" className="bg-neutral-secondary-medium w-10 border border-default-medium text-heading text-sm rounded-base focus:ring-brand focus:border-brand block px-2.5 py-1 shadow-xs placeholder:text-body" placeholder="99" required pattern="[0-9]*" />*/}
                                <span className="text-sm text-body">to 10</span>
                                <span className='text-[#990100] hover:underline'><a href = "#"> &gt; </a></span>
                            </div>
                        </form>                        
                    </div>


                </div>
                {/*

                    <div className="bg-white border border-1 mt-5 rounded-lg shadow-lg">
                        <div className="py-8 px-6">
                            <div className="grid grid-cols-6 bg-[#990100] md:px-5 px-3 py-2 rounded-lg">
                                <p className="text-white lg:text-md text-sm text-center">Employee ID</p>
                                <p className="text-white lg:text-md text-sm text-center">Name</p>
                                <p className="text-white lg:text-md text-sm text-center">Position</p>
                                <p className="text-white lg:text-md text-sm text-center">Hire Date</p>
                                <p className="text-white lg:text-md text-sm text-center">Personnel Type</p>
                                <p className="text-white lg:text-md text-sm text-center">Actions</p>
                            </div>

                            <div className="grid grid-cols-6 lg:px-5 px-3 py-2">
                                <p className="text-center lg:text-md md:text-sm text-[10px] font-medium">AC-00001</p>
                                <p className="text-center lg:text-md md:text-sm text-xs">Reuel Christian Sundiam</p>
                                <p className="text-center lg:text-md md:text-sm text-xs">Web Developer</p>
                                <p className="text-center lg:text-md md:text-sm text-xs">10/20/25</p>
                                <p className="text-center lg:text-md md:text-sm text-xs">Regular</p>
                                <p className="text-center lg:text-md md:text-sm text-xs">Reuel Christian Sundiam</p>
                            </div>
                            <hr className="text-[#990100] mt-1"/>

                            <div className="grid grid-cols-6 lg:px-5 px-3 py-2">
                                <p className="text-center lg:text-md md:text-sm text-[10px] font-medium">AC-00001</p>
                                <p className="text-center lg:text-md md:text-sm text-xs">Reuel Christian Sundiam</p>
                                <p className="text-center lg:text-md md:text-sm text-xs">Web Developer</p>
                                <p className="text-center lg:text-md md:text-sm text-xs">10/20/25</p>
                                <p className="text-center lg:text-md md:text-sm text-xs">Regular</p>
                                <p className="text-center lg:text-md md:text-sm text-xs">Reuel Christian Sundiam</p>
                            </div>
                            <hr className="text-[#990100] mt-1"/>
                        </div>
                    </div>
                
                */}

                

            </div>

            
            
        </div>
    )
}

export default Employees;