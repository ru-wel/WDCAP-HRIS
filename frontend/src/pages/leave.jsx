// src/pages/leave.jsx
import React from "react";
import Navbar from "./components/navbar";
import DropDownFilter from "./components/dropdownfilter";

const leaveCards = [
  {
    id: 1,
    dateLabel: "01, Monday",
    description: "Special Non-Working Day",
    badgeColor: "bg-[#E2C6FF] text-[#5A1A8A]",
  },
  {
    id: 2,
    dateLabel: "05, Friday",
    description: "Reuel Christian Sundiam - SIL",
    badgeColor: "bg-[#FFE1A3] text-[#805200]",
  },
  {
    id: 3,
    dateLabel: "11, Thursday",
    description: "Reuel Christian Sundiam - SIL",
    badgeColor: "bg-[#FFE1A3] text-[#805200]",
  },
  {
    id: 4,
    dateLabel: "24, Wednesday",
    description: "Reuel Christian Sundiam - SIL",
    badgeColor: "bg-[#FFE1A3] text-[#805200]",
  },
];

function Leave() {
  return (
    <div>
      <Navbar />

      <div className="p-7 lg:mx-18 md:mx-10">
        <div className="md:flex justify-between items-center w-full">
          <h1 className="lg:text-3xl text-2xl text-[#990100] font-bold md:mb-0 mb-5">
            Leave
          </h1>
          <div className="flex items=center justify-end md:gap-4 gap-3">
            <DropDownFilter />
            <div className="relative text-gray-600 border border-[#990100] rounded-lg">
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
                  src="icons/red-search.png"
                  className="lg:w-5 lg:h-5 w-4 h-4 items-center"
                  alt="search"
                />
              </button>
            </div>
          </div>
        </div>

        {/* RED SEPARATOR LINE */}
        <hr className="mt-6 border-t border-[#990100]" />

        {/* MAIN BODY */}
        <div className="mt-10 flex flex-col lg:flex-row gap-10">
          {/* LEFT SIDE –   + CARDS */}
          <div className="flex-1">
            <h2 className="text-[24px] lg:text-[28px] font-bold text-[#990100] mb-8">
              JANUARY
            </h2>

            {/* Cards row – 4 cards, equal spacing */}
            <div className="flex flex-wrap gap-6 lg:gap-8">
              {leaveCards.map((card) => (
                <div
                  key={card.id}
                  className="w-full sm:w-[260px] lg:w-[270px] h-[170px] bg-[#F4F4F4] rounded-xl shadow-md px-6 py-5 flex flex-col justify-between hover:scale-[1.02] transition duration-300 ease-in-out"
                >
                  <p className="text-[18px] lg:text-[20px] font-semibold text-[#990100]">
                    {card.dateLabel}
                  </p>

                  <div className="mt-5">
                    <span
                      className={`inline-block px-4 py-2 rounded-md text-[12px] lg:text-[13px] font-medium ${card.badgeColor}`}
                    >
                      {card.description}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT SIDE – CALENDARS LEGEND */}
          <div className="w-full lg:w-[260px] xl:w-[280px]">
            <div className="bg-white rounded-xl shadow-md border border-[#E0E0E0] h-[430px] flex flex-col">
              {/* Title */}
              <div className="px-6 pt-6">
                <h3 className="text-[20px] lg:text-[22px] font-bold text-[#990100]">
                  Calendars
                </h3>
                <hr className="mt-2 border-t border-[#990100]" />
              </div>

              {/* Legend items */}
              <div className="px-6 pt-8 space-y-6 text-[13px]">
                <div className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-sm bg-[#6D28D9]" />
                  <span>Holiday</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-sm bg-[#F59E0B]" />
                  <span>SIL</span>
                </div>
              </div>

              {/* extra space at bottom like screenshot */}
              <div className="flex-1" />
            </div>
          </div>
        </div>

        {/* PAGINATION – bottom right */}
        <div className="flex justify-end items-center mt-10 text-[13px]">
          <button className="text-[#990100] mr-4 hover:underline">&lt;</button>
          <span className="border border-[#990100] rounded-md px-2 py-1 mr-3 text-[#990100]">
            1
          </span>
          <span className="mr-3">to 12</span>
          <button className="text-[#990100] hover:underline">&gt;</button>
        </div>
      </div>
    </div>
  );
}

export default Leave;