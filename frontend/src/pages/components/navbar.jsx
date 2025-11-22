// src/pages/components/navbar.jsx
import React, { useEffect, useRef, useState } from 'react';

function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  function profileDropdown() {
    setIsOpen(!isOpen);
  }

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
      {/* BUTTON */}
      <div className="bg-[#EDEDED] md:py-3 lg:pr-15 md:pr-5 py-2 pr-2">
        <div className="flex justify-end">
          <button
            onClick={profileDropdown}
            className="flex items-center bg-white md:py-1 py-[6px] md:px-2 px-3  rounded-lg hover:border hover:border-[#990100] cursor-pointer"
          >
            <img
              src="/icons/account-icon.png"
              className="lg:w-[40px] lg:h-[40px] md:w-[30px] md:h-[30px] w-[25px] h-[25px]"
            />
            <p className="lg:px-3 md:px-2 px-1 md:text-sm text-xs text-[#990100]">
              Reuel Christian Sundiam
            </p>
            <img
              src="/icons/red-dropdown.png"
              width={"10px"}
              height={"10px"}
              className={`${isOpen ? "rotate-180" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* DROPDOWN */}
      {isOpen && (
        <div className="origin-top-right absolute right-0 md:w-50 w-27 rounded-md shadow-lg bg-white border-[1px] border-[#990100] lg:mr-15 md:mr-5 mr-2 z-1000" role="menu">
          <div className="md:py-1 py-0" role="none">
            <a href="#" className="block px-4 pt-2 md:text-sm text-xs hover:font-medium" role="menuitem">
              <p className="pb-2 text-[#990100] hover:underline">MY PROFILE</p>
              <hr />
            </a>
            <a href="#" className="block px-4 py-2 md:text-sm text-xs hover:font-medium" role="menuitem">
              <p className="text-[#990100] hover:underline">LOGOUT</p>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default Navbar;