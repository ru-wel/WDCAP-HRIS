import React from 'react'
import Navbar from './components/navbar';
import { useState } from "react";


function DropDownFilter(){
    {/* NEEDS TO TRANSFER - TOP NAVBAR */}
    
        const [isOpen, setIsOpen] = useState(false);
    
        function profileDropdown() {
            setIsOpen(!isOpen);
        };
    
        return (
            <div>
    
                {/* BUTTON */}
                <div className="text-gray-600 border border-[#990100] rounded-lg">
                    <div className="flex justify-end">
                        <button  onClick={profileDropdown} className="flex items-center bg-white h-10 px-3  rounded-lg py-2  cursor-pointer">
                            <p className="lg:px-3 md:px-2 px-1 md:text-sm text-xs text-[#990100] mr-10">Filter By</p>
                            <img src = "icons/red-dropdown.png" width={"10px"} height={"10px"} className={`${isOpen ? "rotate-180" : "" }`} />
                        </button>
                    </div>
                </div>
    
                {/* DROPDOWN */}
                
    
                {isOpen && (
                    <div className="origin-top-right absolute right-0 md:w-50 w-27 rounded-md shadow-lg bg-white border-[1px] border-[#990100] lg:mr-82 md:mr-5 mr-2 z-1000 mt-1" role="menu">
    
                        <div className="md:py-1 py-0" role="none">
    
                            <a href="#" className="block px-4 pt-2 md:text-sm text-xs hover:font-medium" role="menuitem">
                                <p className='pb-2 text-[#990100] hover:underline '>MY PROFILE</p>
                                <hr /> 
                            </a>
    
                            <a href="#" className="block px-4 py-2 md:text-sm text-xs hover:font-medium" role="menuitem">
                                <p className='text-[#990100] hover:underline'>LOGOUT</p>
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
                <div className="flex justify-between items-center w-full">

                    <div className="">
                        <h1 className='md:text-3xl text-xl text-[#990100] font-bold'>Employees</h1>
                    </div>
                    
                    <div className="flex items-center gap-4"> 

                        
                            <DropDownFilter />
                        


                        <div className="relative text-gray-600 border border-[#990100] rounded-lg">
                            <input type="search" name="search" placeholder="Search" className="bg-white h-10 px-3 pr-10 rounded-lg text-sm focus:outline-none" />
                            <button type="submit" className="absolute right-0 top-0 mt-3 mr-4 items-center cursor-pointer">
                                
                               <img src = "icons/red-search.png" className="w-5 h-5 items-center" type="submit" />
                            </button>
                        </div>

                    </div> 
                </div>
                <hr className='text-[#990100] mt-6 '/>
            </div>
            
        </div>
    )
}

export default Employees;