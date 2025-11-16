import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function Sidenav({
  initialActive = "Dashboard",
  initialSub = "Onboarding",
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [openGroup, setOpenGroup] = useState(initialActive);
  const [isHovered, setIsHovered] = useState(false);

  const getActiveStatesFromPath = () => {
    const path = location.pathname;

    const pathMappings = {
      "/dashboard": { main: "Dashboard", sub: null },
      "/employees": { main: "Employees", sub: null },
      "/employees/onboarding": { main: "Employees", sub: "Onboarding" },
      "/employees/user-accounts": { main: "Employees", sub: "User Accounts" },
      "/employees/201-files": { main: "Employees", sub: "201 Files" },
      "/employees/departments": { main: "Employees", sub: "Departments" },
      "/projects": { main: "Projects", sub: null },
      "/leave": { main: "Leave", sub: null },
      "/leave/request": { main: "Leave", sub: "Leave Request" },
      "/leave/credits": { main: "Leave", sub: "Leave Credits" },
      "/leave/history": { main: "Leave", sub: "Leave History" },
      "/evaluation": { main: "Evaluation", sub: null },
      "/evaluation/history": { main: "Evaluation", sub: "Evaluate History" },
      "/analytics": { main: "Analytics", sub: null },
      "/audit": { main: "Audit Logs", sub: null },
      "/audit/user-accounts": { main: "Audit Logs", sub: "User Accounts" },
      "/audit/employees": { main: "Audit Logs", sub: "Employees" },
      "/audit/departments": { main: "Audit Logs", sub: "Departments" },
      "/audit/projects": { main: "Audit Logs", sub: "Projects" },
      "/audit/leave": { main: "Audit Logs", sub: "Leave" },
      "/audit/evaluation": { main: "Audit Logs", sub: "Evaluation" },
      "/audit/reports": { main: "Audit Logs", sub: "Reports" },
    };

    return pathMappings[path] || { main: initialActive, sub: initialSub };
  };

  const { main: activeMain, sub: activeSub } = getActiveStatesFromPath();

  const items = [
    {
      label: "Dashboard",
      icon: "dashboard",
      type: "item",
      path: "/dashboard",
    },
    {
      label: "Employees",
      icon: "employees",
      type: "dropdown",
      path: "/employees",
      children: [
        { label: "Onboarding", path: "/employees/onboarding" },
        { label: "User Accounts", path: "/employees/user-accounts" },
        { label: "201 Files", path: "/employees/201-files" },
        { label: "Departments", path: "/employees/departments" },
      ],
    },
    {
      label: "Projects",
      icon: "projects",
      type: "item",
      path: "/projects",
    },
    {
      label: "Leave",
      icon: "leave",
      type: "dropdown",
      path: "/leave",
      children: [
        { label: "Leave Request", path: "/leave/request" },
        { label: "Leave Credits", path: "/leave/credits" },
        { label: "Leave History", path: "/leave/history" },
      ],
    },
    {
      label: "Evaluation",
      icon: "evaluation",
      type: "dropdown",
      path: "/evaluation",
      children: [{ label: "Evaluate History", path: "/evaluation/history" }],
    },
    {
      label: "Analytics",
      icon: "analytics",
      type: "item",
      path: "/analytics",
    },
    {
      label: "Audit Logs",
      icon: "audit",
      type: "group",
      path: null, // Change from "/audit" to null
      children: [
        { label: "User Accounts", path: "/audit/user-accounts" },
        { label: "Employees", path: "/audit/employees" },
        { label: "Departments", path: "/audit/departments" },
        { label: "Projects", path: "/audit/projects" },
        { label: "Leave", path: "/audit/leave" },
        { label: "Evaluation", path: "/audit/evaluation" },
        { label: "Reports", path: "/audit/reports" },
      ],
    },
  ];

  const handleMainClick = (item) => {
    if (item.path) {
      navigate(item.path);
    } else if (item.type === "group" || item.type === "dropdown") {
      setOpenGroup((prev) => (prev === item.label ? null : item.label));
    }
  };

  // CARET BUTTON: the ONLY control that toggles submenus
  const handleToggle = (label) => {
    setOpenGroup((prev) => (prev === label ? null : label));
  };

  const handleSubClick = (parentLabel, childItem) => {
    setOpenGroup(parentLabel);
    navigate(childItem.path);
  };

  return (
    <aside
      className={`h-screen bg-[#9b0000] text-white flex flex-col items-stretch py-4 rounded-tr-[32px] transition-all duration-300 ease-in-out ${
        isHovered ? "w-44" : "w-20"
      } absolute left-0 top-0 z-10`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="px-3 mb-5 flex items-center justify-start">
        <div className="bg-white rounded-2xl w-12 h-12 flex items-center justify-center overflow-hidden">
          <img src="./tab-logo.png" alt="Arise logo" className="w-8 h-8 object-contain" />
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-2">
        {items.map((item) => {
          if (item.type === "item") {
            return (
              <NavItem
                key={item.label}
                label={item.label}
                icon={item.icon}
                active={activeMain === item.label}
                onClick={() => handleMainClick(item)}
                isHovered={isHovered}
              />
            );
          }

          if (item.type === "dropdown") {
            return (
              <NavDropdown
                key={item.label}
                label={item.label}
                icon={item.icon}
                items={item.children}
                isOpen={openGroup === item.label}
                active={activeMain === item.label}
                activeSub={activeSub}
                onMainClick={() => handleMainClick(item)}              // navigate only
                onToggleClick={() => handleToggle(item.label)}         // caret toggles
                onSubClick={handleSubClick}
                isHovered={isHovered}
              />
            );
          }

          return (
            <NavGroup
              key={item.label}
              label={item.label}
              icon={item.icon}
              items={item.children}
              isOpen={openGroup === item.label}
              active={activeMain === item.label}
              activeSub={activeSub}
              onMainClick={() => handleMainClick(item)}                // navigate only
              onToggleClick={() => handleToggle(item.label)}           // caret toggles
              onSubClick={handleSubClick}
              isHovered={isHovered}
            />
          );
        })}
      </nav>
    </aside>
  );
}

export function NavSide({ children }) {
  return (
    <div className="h-screen w-screen bg-[#E0E0E0] relative">
      <Sidenav />
      <main className="bg-white text-gray-900 overflow-y-auto h-full ml-20">{children}</main>
    </div>
  );
}

// ----- Simple Item (no submenu) -----
function NavItem({ label, icon, active, onClick, isHovered }) {
  const base = "flex items-center gap-3 w-full rounded-xl transition-colors";
  const activeClasses = active
    ? "bg-white text-[#9b0000] font-medium shadow-sm"
    : "text-white/90 hover:text-white";
  const iconColor = active ? "red" : "white";
  const iconPath = `./icons/sidenav/${iconColor}-${icon}.png`;

  return (
    <button
      className={`${base} ${activeClasses} ${!isHovered ? "justify-center px-3 py-2" : "px-3 py-2"}`}
      onClick={onClick}
      title={!isHovered ? label : ""}
    >
      <img src={iconPath} alt={`${label} icon`} className="h-5 w-5 object-contain" />
      {isHovered && <span className="text-left text-[14px]">{label}</span>}
    </button>
  );
}

// ----- Group (Audit Logs style) with separate caret -----
function NavGroup({
  label,
  icon,
  items,
  isOpen,
  active,
  activeSub,
  onMainClick,
  onToggleClick,
  onSubClick,
  isHovered,
}) {
  const getIconPath = (iconName, isActive) => {
    const color = isActive ? "red" : "white";
    return `./icons/sidenav/${color}-${iconName}.png`;
  };

  const isHighlighted = active || isOpen; // white header if submenu open

  const HeaderInner = ({ isActiveLike }) => (
    <div
      className={`flex w-full items-center ${!isHovered ? "justify-center px-3 py-2" : "px-3 py-2"}`}
    >
      {/* Main button: navigates only */}
      <button
        className={`flex items-center gap-3 ${isHovered ? "flex-1" : ""} text-[14px] ${
          isActiveLike ? "font-medium" : ""
        }`}
        onClick={onMainClick}
        title={!isHovered ? label : ""}
      >
        <img
          src={getIconPath(icon, isActiveLike)}
          alt={`${label} icon`}
          className="h-5 w-5 object-contain"
          onError={(e) => {
            console.warn(`Icon not found: ${getIconPath(icon, isActiveLike)}`);
            e.target.style.display = "none";
          }}
        />
        {isHovered && <span className="text-left">{label}</span>}
      </button>

      {/* Caret button: toggles only — hover bg turns pure white */}
      {isHovered && (
        <button
          className={`p-1 rounded-md transition-colors ${
            isActiveLike ? "text-[#9b0000]" : "text-white"
          } hover:bg-white hover:text-[#9b0000]`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleClick?.();
          }}
          aria-label="Toggle submenu"
          title="Toggle submenu"
        >
          <svg
            className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}
    </div>
  );

  return isHighlighted ? (
    <div className="bg-[#f8f4f4] rounded-3xl text-[#9b0000] shadow-sm overflow-hidden">
      <HeaderInner isActiveLike />
      {isOpen && isHovered && (
        <ul className="px-3 pb-3 text-[13px]">
          {items.map((sub, index) => {
            const isSubActive = activeSub === sub.label;
            return (
              <li key={sub.label}>
                <button
                  className={
                    "flex w-full items-center py-1.5 text-left " +
                    (isSubActive ? "underline underline-offset-2 font-medium" : "") +
                    (index < items.length - 1 ? " border-b border-[#d6bcbc]" : "")
                  }
                  onClick={() => onSubClick(label, sub)}
                >
                  {sub.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  ) : (
    <div>
      <HeaderInner isActiveLike={false} />
      {isOpen && isHovered && (
        <ul className="mt-1 pl-9 text-[12px] space-y-1 text-white/80">
          {items.map((sub) => (
            <li key={sub.label}>
              <button className="hover:text-white w-full text-left py-1" onClick={() => onSubClick(label, sub)}>
                {sub.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ----- Dropdown (Employees/Leave/Evaluation) with separate caret -----
function NavDropdown({
  label,
  icon,
  items,
  isOpen,
  active,
  activeSub,
  onMainClick,
  onToggleClick,
  onSubClick,
  isHovered,
}) {
  const getIconPath = (iconName, isActive) => {
    const color = isActive ? "red" : "white";
    return `./icons/sidenav/${color}-${iconName}.png`;
  };

  const isHighlighted = active || isOpen; // white header if submenu open

  const HeaderInner = ({ isActiveLike }) => (
    <div
      className={`flex w-full items-center ${!isHovered ? "justify-center px-3 py-2" : "px-3 py-2"}`}
    >
      {/* Main button: navigates only */}
      <button
        className={`flex items-center gap-3 ${isHovered ? "flex-1" : ""} text-[14px] ${
          isActiveLike ? "font-medium" : ""
        }`}
        onClick={onMainClick}
        title={!isHovered ? label : ""}
      >
        <img
          src={getIconPath(icon, isActiveLike)}
          alt={`${label} icon`}
          className="h-5 w-5 object-contain"
          onError={(e) => {
            console.warn(`Icon not found: ${getIconPath(icon, isActiveLike)}`);
            e.target.style.display = "none";
          }}
        />
        {isHovered && <span className="text-left">{label}</span>}
      </button>

      {/* Caret button: toggles only — hover bg turns pure white */}
      {isHovered && (
        <button
          className={`p-1 rounded-md transition-colors ${
            isActiveLike ? "text-[#9b0000]" : "text-white"
          } hover:bg-white hover:text-[#9b0000]`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleClick?.();
          }}
          aria-label="Toggle submenu"
          title="Toggle submenu"
        >
          <svg
            className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}
    </div>
  );

  return isHighlighted ? (
    <div className="bg-[#f8f4f4] rounded-3xl text-[#9b0000] shadow-sm overflow-hidden">
      <HeaderInner isActiveLike />
      {isOpen && isHovered && (
        <ul className="px-3 pb-3 text-[13px]">
          {items.map((sub, index) => {
            const isSubActive = activeSub === sub.label;
            return (
              <li key={sub.label}>
                <button
                  className={
                    "flex w-full items-center py-1.5 text-left " +
                    (isSubActive ? "underline underline-offset-2 font-medium" : "") +
                    (index < items.length - 1 ? " border-b border-[#d6bcbc]" : "")
                  }
                  onClick={() => onSubClick(label, sub)}
                >
                  {sub.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  ) : (
    <div>
      <HeaderInner isActiveLike={false} />
      {isOpen && isHovered && (
        <ul className="mt-1 pl-9 text-[12px] space-y-1 text-white/80">
          {items.map((sub) => (
            <li key={sub.label}>
              <button className="hover:text-white w-full text-left py-1" onClick={() => onSubClick(label, sub)}>
                {sub.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}