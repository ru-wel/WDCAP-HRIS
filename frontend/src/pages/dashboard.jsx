import Navbar from "./components/navbar";
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import '../assets/styles/calendar.css';
import React from 'react'

{/* CARDS */}
function Cards({ title, icon, value }) {
    return (
        <div className="bg-[#EDEDED] w-full max-w-sm rounded-lg px-5 py-4 mx-auto hover:scale-105 transition duration-300 ease-in-out shadow-lg mt-6 lg:mt-0 md:mt-0">
            <h2 className="lg:text-[21px] md:text-[20px] text-[#990100] font-medium ">{title}</h2>
            <div className="flex pt-2 gap-6 items-center">
                <img src={icon} className="lg:h-9 lg:w-9 h-8 w-8" alt={`${title} icon`} />
                <p className="text-2xl font-medium ">{value}</p>
            </div>
        </div>
    );
}

{/* GREETING */}

function Greeting(){
    var currentDate = new Date();
    var hour = currentDate.getHours();
    var greeting;

    if (hour < 12){
        greeting = "Morning"
    }
    else if (hour >= 12 && hour <=17){
        greeting = "Afternoon";
    }
    else if (hour >= 17 && hour <= 24){
        greeting = "Evening"
    }

    return <span>{greeting}</span>
        
}

function Dashboard() {
    return(
        <div>
            <Navbar />

            <div className="p-7 lg:mx-18 md:mx-10">
                <h1 className="lg:text-3xl md:text-2xl text-xl text-[#990100] font-bold">Good <Greeting />, Reuel Christian!</h1>


                {/* FIRST ROW */}

                <div className="pt-7 lg:flex gap-4 justify-center">

                    <div className="flex justify-center items-center" id = "calendar">
                        <Calendar className={`p-3 shadow-lg justify-center items-center hover:scale-105 transition duration-300 ease-in-out lg:w-[24%] `}/>
                    </div>

                    <div className="md:grid md:grid-cols-2 gap-4 lg:w-[41%] md:pt-2 lg:pt-0 ">
                        <Cards title="Employees" icon="icons/red-employees.png" value="20" />
                        <Cards title="Ongoing Projects" icon="icons/red-projects.png" value="5" />
                        <Cards title="Leave Requests" icon="icons/red-leave.png" value="8" />
                        <Cards title="Total Departments" icon="icons/red-departments.png" value="12" />
                    </div>
                    

                    <div className="bg-[#EDEDED] lg:w-[35%] rounded-lg hover:scale-105 transition duration-300 ease-in-out shadow-lg px-5 py-4 mt-6 md:mt-8 lg:mt-0 ">
                        <h2 className="lg:text-2xl md:text-xl text-[#990100] font-medium pb-2">Pending Evaluations</h2>
                        <div className="grid grid-cols-2 bg-[#ad3332] md:px-5 px-3 py-1 rounded-lg">
                            <p className="text-white lg:text-md text-sm">Name</p>
                            <p className="text-white lg:text-md text-sm text-center">Position</p>
                        </div>
                        <div className="grid grid-cols-2 lg:px-5 px-3 py-2">
                            <p className="lg:text-md md:text-sm text-[10px]">Lance Cabe</p>
                            <p className="text-center lg:text-md md:text-sm text-xs">Web Developer</p>
                        </div>
                        <hr className="text-[#990100]"/>
                    </div>
                </div>

                {/* SECOND ROW */}

                <div className="lg:pt-7 lg:flex gap-4 justify-center mt-6 md:mt-8 lg:mt-0 ">
                    
                    <div className="bg-[#EDEDED] lg:w-[35%] rounded-lg shadow-lg hover:scale-105 transition duration-300 ease-in-out px-5 py-4 h-[350px]">
                        <h2 className="lg:text-2xl md:text-xl text-[#990100] font-medium pb-2">Employee Headcount</h2>
                    </div>

                    <div className="bg-[#EDEDED] lg:w-[35%] rounded-lg shadow-lg hover:scale-105 transition duration-300 ease-in-out px-5 py-4 mt-6 md:mt-8 lg:mt-0 ">
                        <h2 className="lg:text-2xl md:text-xl text-[#990100] font-medium pb-2">Project Summary</h2>

                        <div className="grid grid-cols-2 bg-[#ad3332] md:px-5 px-3 py-1 rounded-lg">
                            <p className="text-white lg:text-md text-sm">Project Name</p>
                            <p className="text-white lg:text-md text-sm text-center">Headcount</p>
                        </div>
                        <div className="grid grid-cols-2 md:px-5 px-3 py-2">
                            <p className="lg:text-md md:text-sm text-xs">Project #1</p>
                            <p className="text-center lg:text-md md:text-sm text-xs">10</p>
                        </div>
                        <hr className="text-[#990100]"/>
                    </div>

                    <div className="bg-[#EDEDED] lgw-[30%] rounded-lg shadow-lg hover:scale-105 transition duration-300 ease-in-out px-5 py-4 mt-6 md:mt-8 lg:mt-0">
                        <h2 className="lg:text-2xl md:text-xl text-[#990100] font-medium pb-2">Audit Logs</h2>
                        <div className="grid grid-cols-2 bg-[#ad3332] md:px-5 px-3 py-1 rounded-lg">
                            <p className="text-white lg:text-md text-sm">Email</p>
                            <p className="text-white lg:text-md text-sm text-center">Action</p>
                        </div>
                        <div className="grid grid-cols-2 md:px-5 px-3 py-2 items-center">
                            <p className="md:text-sm text-[10px]">r.sundiam@acdc.ph</p>
                            <p className="text-center md:text-sm text-xs">Onboarding</p>
                        </div>
                        <hr className="text-[#990100]"/>

                        <div className="grid grid-cols-2 md:px-5 px-3 py-2 items-center">
                            <p className="md:text-sm text-[10px]">g.delossantos@acdc.ph</p>
                            <p className="text-center md:text-sm text-xs">Logged in</p>
                        </div>
                        <hr className="text-[#990100]"/>
                    </div>
                </div>
                
            </div>

            

            
        </div>
    )
}

export default Dashboard;