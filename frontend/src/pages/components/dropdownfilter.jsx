import React, { useEffect, useRef } from 'react'
import { useState } from "react";

function DropDownFilter(){
    
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    

    function filterDropdown() {
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
                    <button  onClick={filterDropdown} className="flex items-center bg-white lg:h-10 md:h-9 h-8 rounded-lg py-1 cursor-pointer px-3 md:text-sm text-xs text-[#990100] md:gap-8 gap-4">
                        Filter By
                        <img src = "/icons/red-dropdown.png" width={"10px"} height={"10px"} className={`${isOpen ? "rotate-180" : "" }`} />
                    </button>
                </div>
            </div>

            {/* FILTER DROPDOWN */}
            

            {isOpen && (
                <div className="origin-top-right absolute right-0 md:w-50 w-27 rounded-md shadow-lg bg-white border-[1px] border-[#990100] lg:mr-85 md:mr-68 mr-45 z-1000 mt-1" role="menu">

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

export default DropDownFilter;