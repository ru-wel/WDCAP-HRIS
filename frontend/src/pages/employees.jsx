import React, { useEffect, useRef } from 'react'
import Navbar from './components/navbar';
import { useState } from "react";


function DropDownFilter(){
    
        const [isOpen, setIsOpen] = useState(false);
        const dropdownRef = useRef(null);
        
    
        function profileDropdown() {
            setIsOpen(!isOpen);
        };

        useEffect(() => {
            function handleClickOutside(e) {
                if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                    setIsOpen(false);
                }
            }

            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }, []);
            
    
        return (
            <div ref={dropdownRef}>
                {/* FILTER BUTTON */}
                <div className="text-gray-600 border border-[#990100] rounded-lg">
                    <div className="flex justify-end">
                        <button  onClick={profileDropdown} className="flex items-center bg-white lg:h-10 md:h-9 h-8 rounded-lg py-1 cursor-pointer px-3 md:text-sm text-xs text-[#990100] md:gap-8 gap-4">
                            Filter By
                            <img src = "icons/red-dropdown.png" width={"10px"} height={"10px"} className={`${isOpen ? "rotate-180" : "" }`} />
                        </button>
                    </div>
                </div>
    
                {/* FILTER DROPDOWN */}
                
    
                {isOpen && (
                    <div className="origin-top-right absolute right-0 md:w-50 w-27 rounded-md shadow-lg bg-white border-[1px] border-[#990100] lg:mr-82 md:mr-68 mr-45 z-1000 mt-1" role="menu">
    
                        <div className="md:py-1 py-0" role="none">
    
                            <a href="#" className="block px-4 pt-2 md:text-sm text-xs hover:font-medium hover:bg-[#EDEDED]" role="menuitem">
                                <p className='pb-2 text-[#990100] '>A - Z</p>
                                <hr /> 
                            </a>

                            <a href="#" className="block px-4 pt-2 md:text-sm text-xs hover:font-medium hover:bg-[#EDEDED]" role="menuitem">
                                <p className='pb-2 text-[#990100] '>Z - A</p>
                                <hr /> 
                            </a>

                            <a href="#" className="block px-4 pt-2 md:text-sm text-xs hover:font-medium hover:bg-[#EDEDED]" role="menuitem">
                                <p className='pb-2 text-[#990100] '>A - Z</p>
                                <hr /> 
                            </a>

                            <a href="#" className="block px-4 pt-2 md:text-sm text-xs hover:font-medium hover:bg-[#EDEDED]" role="menuitem">
                                <p className='pb-2 text-[#990100] '>A - Z</p>
                                
                            </a>
    
                        </div>
                    </div>
                )}
    
            </div>
        )
}

function Employees(){
    
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
                    <button className='bg-[#ad3332] lg:px-5 md:py-[7px] px-4 py-[5px] lg:text-md md:text-sm text-xs rounded-md text-white hover:bg-[#990100] hover:scale-105 transition duration-300 ease-in-out'>Generate Report</button>
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
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">AC-00001</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Reuel Christian Sundiam</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Web Developer</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">10/20/25</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Regular</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    <button href="#" className='bg-[#990100] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#ad3332] hover:scale-105 transition duration-300 ease-in-out'>View Details</button>
                                </td>                   
                            </tr>

                            <tr className='odd:bg-transparent even:bg-gray-100 hover:bg-[#f4e5e5]'>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">AC-00001</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Reuel Christian Sundiam</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Web Developer</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">10/20/25</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Regular</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    <button href="#" className='bg-[#990100] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#ad3332] hover:scale-105 transition duration-300 ease-in-out'>View Details</button>
                                </td>                   
                            </tr>

                            <tr className='odd:bg-transparent even:bg-gray-100 hover:bg-[#f4e5e5]'>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">AC-00001</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Reuel Christian Sundiam</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Web Developer</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">10/20/25</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Regular</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    <button href="#" className='bg-[#990100] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#ad3332] hover:scale-105 transition duration-300 ease-in-out'>View Details</button>
                                </td>                   
                            </tr>

                            <tr className='odd:bg-transparent even:bg-gray-100 hover:bg-[#f4e5e5]'>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">AC-00001</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Reuel Christian Sundiam</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Web Developer</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">10/20/25</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Regular</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    <button href="#" className='bg-[#990100] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#ad3332] hover:scale-105 transition duration-300 ease-in-out'>View Details</button>
                                </td>                   
                            </tr>

                            <tr className='odd:bg-transparent even:bg-gray-100 hover:bg-[#f4e5e5]'>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">AC-00001</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Reuel Christian Sundiam</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Web Developer</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">10/20/25</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Regular</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    <button href="#" className='bg-[#990100] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#ad3332] hover:scale-105 transition duration-300 ease-in-out'>View Details</button>
                                </td>                   
                            </tr>

                            <tr className='odd:bg-transparent even:bg-gray-100 hover:bg-[#f4e5e5]'>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">AC-00001</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Reuel Christian Sundiam</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Web Developer</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">10/20/25</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Regular</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    <button href="#" className='bg-[#990100] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#ad3332] hover:scale-105 transition duration-300 ease-in-out'>View Details</button>
                                </td>                   
                            </tr>

                            <tr className='odd:bg-transparent even:bg-gray-100 hover:bg-[#f4e5e5]'>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">AC-00001</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Reuel Christian Sundiam</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Web Developer</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">10/20/25</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Regular</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    <button href="#" className='bg-[#990100] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#ad3332] hover:scale-105 transition duration-300 ease-in-out'>View Details</button>
                                </td>                   
                            </tr>

                            <tr className='odd:bg-transparent even:bg-gray-100 hover:bg-[#f4e5e5]'>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">AC-00001</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Reuel Christian Sundiam</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Web Developer</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">10/20/25</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Regular</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    <button href="#" className='bg-[#990100] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#ad3332] hover:scale-105 transition duration-300 ease-in-out'>View Details</button>
                                </td>                   
                            </tr>

                            <tr className='odd:bg-transparent even:bg-gray-100 hover:bg-[#f4e5e5]'>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">AC-00001</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Reuel Christian Sundiam</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Web Developer</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">10/20/25</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Regular</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    <button href="#" className='bg-[#990100] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#ad3332] hover:scale-105 transition duration-300 ease-in-out'>View Details</button>
                                </td>                   
                            </tr>

                        </tbody>
                    </table>
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