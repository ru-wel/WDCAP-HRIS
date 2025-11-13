import Navbar from "./components/navbar";
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import '../assets/styles/calendar.css';
import React from 'react'

{/* CARDS */}
function Cards({ title, icon, value }) {
    return (
        <div className="bg-[#EDEDED] w-full max-w-sm rounded-lg px-5 py-4 mx-auto hover:scale-105 shadow-lg">
            <h2 className="text-[22px] text-[#990100] font-medium">{title}</h2>
            <div className="flex pt-2 gap-6 items-center">
                <img src={icon} className="h-9 w-9" alt={`${title} icon`} />
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

            <div className="p-7 mx-18">
                <h1 className="md:text-2xl text-xl text-[#990100] font-bold">Good <Greeting />, Reuel Christian!</h1>


                {/* FIRST ROW */}

                <div className="pt-7 flex gap-4 justify-center">

                    <Calendar className={`p-3 shadow-lg justify-center items-center hover:scale-105`}/>

                    <div className="grid grid-cols-2 gap-4 w-[41%]">
                        <Cards title="Employees" icon="icons/red-employees.png" value="20" />
                        <Cards title="Ongoing Projects" icon="icons/red-projects.png" value="5" />
                        <Cards title="Leave Requests" icon="icons/red-leave.png" value="8" />
                        <Cards title="Total Departments" icon="icons/red-departments.png" value="12" />
                    </div>
                    

                    <div className="bg-[#EDEDED] w-[35%] rounded-lg hover:scale-105 shadow-lg px-5 py-4">
                        <h2 className="text-2xl text-[#990100] font-medium pb-2">Pending Evaluations</h2>
                        <div className="grid grid-cols-2 bg-[#9900009c] px-5 py-1 rounded-lg">
                            <p className="text-white text-md">Name</p>
                            <p className="text-white text-md text-center">Position</p>
                        </div>
                        <div className="grid grid-cols-2 px-5 py-2">
                            <p className="">Lance Cabe</p>
                            <p className="text-center">Web Developer</p>
                        </div>
                        <hr className="text-[#990100]"/>
                    </div>
                </div>

                {/* SECOND ROW */}

                <div className="pt-7 flex gap-4 justify-center ">
                    
                    <div className="bg-[#EDEDED] w-[35%] rounded-lg shadow-lg hover:scale-105 px-5 py-4 h-[350px]">
                        <h2 className="text-2xl text-[#990100] font-medium pb-2">Employee Headcount</h2>
                    </div>

                    <div className="bg-[#EDEDED] w-[35%] rounded-lg shadow-lg hover:scale-105 px-5 py-4">
                        <h2 className="text-2xl text-[#990100] font-medium pb-2">Project Summary</h2>

                        <div className="grid grid-cols-2 bg-[#9900009c] px-5 py-1 rounded-lg">
                            <p className="text-white text-md">Project Name</p>
                            <p className="text-white text-md text-center">No. of Employees</p>
                        </div>
                        <div className="grid grid-cols-2 px-5 py-2">
                            <p className="">Project #1</p>
                            <p className="text-center">10</p>
                        </div>
                        <hr className="text-[#990100]"/>
                    </div>

                    <div className="bg-[#EDEDED] w-[30%] rounded-lg shadow-lg hover:scale-105 px-5 py-4">
                        <h2 className="text-2xl text-[#990100] font-medium pb-2">Audit Logs</h2>
                        <div className="grid grid-cols-2 bg-[#9900009c] px-5 py-1 rounded-lg">
                            <p className="text-white text-md">Email</p>
                            <p className="text-white text-md text-center">Action</p>
                        </div>
                        <div className="grid grid-cols-2 px-5 py-2 items-center">
                            <p className="text-sm">r.sundiam@acdc.ph</p>
                            <p className="text-center text-sm">Onboarding</p>
                        </div>
                        <hr className="text-[#990100]"/>

                        <div className="grid grid-cols-2 px-5 py-2 items-center">
                            <p className="text-sm">g.delossantos@acdc.ph</p>
                            <p className="text-center text-sm">Logged in</p>
                        </div>
                        <hr className="text-[#990100]"/>
                    </div>
                </div>
                
            </div>

            

            
        </div>
    )
}

export default Dashboard;