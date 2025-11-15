/*import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'*/
import React from 'react';
import './App.css';
import { Routes, Route, Navigate, Outlet, BrowserRouter } from 'react-router-dom';
import { NavSide } from "./pages/components/sidenav";
import Login from "./pages/login";
import Dashboard from './pages/dashboard';
import Employees from './pages/employees';



function App() {
  return (
    <React.StrictMode>
      <BrowserRouter>
        <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<LayoutWithSidebar />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/Employees" element={<Employees />} />
        </Route>
      </Routes>
      </BrowserRouter>
    </React.StrictMode>
    
  )
}


function LayoutWithSidebar() {
  return (
    <NavSide>
      <Outlet />
    </NavSide>
  )
}

export default App;
