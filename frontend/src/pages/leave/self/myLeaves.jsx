import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";


function MyLeaves() {

  return (
    <div>
        <div className="p-7 lg:mx-18 md:mx-10">
            <div className="md:flex justify-between items-center w-full">
                <div className="">
                    <h1 className="lg:text-3xl text-2xl text-[#990100] font-bold md:mb-0 mb-5">
                        My Leaves
                    </h1>
                </div>

                <div className="flex items-center justify-end md:gap-4 gap-3">
                    <div className="relative text-gray-600 border border-[#990100] rounded-lg ">
                        <input
                            type="search"
                            name="search"
                            placeholder="Search"
                            className="bg-white lg:h-10 md:h-9 h-8 px-2 lg:pr-10 md:pr-5 pr-5 md:w-auto w-35 rounded-lg text-sm focus:outline-none"
                        />
                        <button
                            type="submit"
                            className="absolute right-0 top-0 md:mt-3 mt-2 lg:mr-3 mr-2 items-center cursor-pointer"
                        >
                            <img
                            src="/icons/red-search.png"
                            className="lg:w-5 lg:h-5 w-4 h-4 items-center"
                            type="submit"
                            />
                        </button>
                    </div>
                </div>
            </div>

            <hr className="text-[#990100] mt-6 " />

            
        </div>
    </div>
  )
}

export default MyLeaves;