import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { ROLES } from "../constants/config.js";
import gsap from 'gsap';
import ConfirmModal from "./confirm-modal.jsx";
import Preloader from "./preloader.jsx";
import { get } from "../services/api.js";

export default function Sidenav({
  initialActive = "Dashboard",
  initialSub = "Onboarding",
  mobileOpen,
  setMobileOpen,
}) {
  const { user, logout } = useAuth();
  const role = user?.role;
  const isEmployee = role === ROLES.EMPLOYEE;
  const isHr = role === ROLES.HR;
  const isAdmin = role === ROLES.ADMIN;
  const navigate = useNavigate();
  const location = useLocation();
  const [openGroup, setOpenGroup] = useState(initialActive);
  const [isHovered, setIsHovered] = useState(false);
  const didAutoOpenRef = useRef(false);

  const closeMobile = () => setMobileOpen?.(false);

  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [isProjectBased, setIsProjectBased] = useState(false);

  const desktopWidthClass = isHovered ? "md:w-44" : "md:w-20";
  const mobileTranslateClass = mobileOpen ? "translate-x-0" : "-translate-x-full";

  const handleLogout = () => {
    setLogoutConfirmOpen(true);
  };

  const confirmLogout = async () => {
    try {
      setLogoutConfirmOpen(false);
      setLoggingOut(true);
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
      setLoggingOut(false);
    }
  };

  const getActiveStatesFromPath = () => {
    const path = location.pathname;
    if (path.startsWith("/projects/")) {
      return { main: "Projects", sub: null };
    }
    if (isEmployee) {
      if (path.startsWith("/employees/201-files")) return { main: "Employees", sub: "201 Files" };
      if (path.startsWith("/employees/departments")) return { main: "Employees", sub: "Departments" };
      if (path.startsWith("/profile")) return { main: "Employees", sub: "User Account" };
    } else {
      if (path.startsWith("/employees/departments/")) {
        return { main: "Employees", sub: "Departments" };
      }
    }
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
      "/evaluation/history": { main: "Evaluation", sub: "Evaluation History" },
      "/evaluation/upload": { main: "Evaluation", sub: "Upload Result" },

      "/departments": { main: "Departments", sub: null },
      "/profile": { main: "Employees", sub: "User Account" },

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

  // For employees: ensure the Employees dropdown is open by default
  useEffect(() => {
    if (!isEmployee) return;
    if (didAutoOpenRef.current) return;
    didAutoOpenRef.current = true;
    setOpenGroup("Employees");
  }, [isEmployee]);

  // For employees: detect personnel_type to optionally hide Projects
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!isEmployee) {
        setIsProjectBased(false);
        return;
      }
      try {
        const res = await get('/employees/me');
        const personnel = String(res?.data?.personnel_type || '').trim().toLowerCase();
        if (!cancelled) setIsProjectBased(personnel === 'project-based' || personnel === 'project based');
      } catch {
        if (!cancelled) setIsProjectBased(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [isEmployee]);

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
        ...(isAdmin ? [{ label: "User Accounts", path: "/employees/user-accounts" }] : []),
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
      children: [
        { label: "Evaluation History", path: "/evaluation/history" },
        ...(!isEmployee ? [{ label: "Upload Result", path: "/evaluation/upload" }] : []),
      ],
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
      path: null,
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

  const hrHiddenLabels = new Set(["Audit Logs"]);

  const finalVisibleItems = isEmployee
    ? [
        { label: "Dashboard", icon: "dashboard", type: "item", path: "/dashboard" },
        {
          label: "Employees",
          icon: "employees",
          type: "dropdown",
          path: null,
          children: [
            { label: "201 Files", path: "/employees/201-files" },
            { label: "Departments", path: "/employees/departments" },
            { label: "User Account", path: "/profile" },
          ],
        },
        ...items.filter((item) => {
          if (item.label === "Dashboard") return false;
          if (item.label === "Employees") return false;
          if (item.label === "Analytics") return false;
          if (item.label === "Audit Logs") return false;
          if (isProjectBased && item.label === "Projects") return false;
          return true;
        }),
      ]
    : items.filter((item) => {
        if (isHr && hrHiddenLabels.has(item.label)) return false;
        return true;
      });

  const handleMainClick = (item) => {
    if (item.path) {
      navigate(item.path);
      closeMobile();
    } else if (item.type === "group" || item.type === "dropdown") {
      setOpenGroup((prev) => (prev === item.label ? null : item.label));
    }
  };

  const handleToggle = (label) => {
    setOpenGroup((prev) => (prev === label ? null : label));
  };

  const handleSubClick = (parentLabel, childItem) => {
    setOpenGroup(parentLabel);
    navigate(childItem.path);
    closeMobile();
  };

  return (
    <>
      {loggingOut ? <Preloader fullScreen text="LOGGING OUT…" /> : null}
      <ConfirmModal
        open={logoutConfirmOpen}
        title="Logout"
        message="Do you want to log out?"
        confirmText="Logout"
        cancelText="Cancel"
        onConfirm={confirmLogout}
        onCancel={() => setLogoutConfirmOpen(false)}
        confirmDisabled={loggingOut}
      />

      {mobileOpen ? (
        <div
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
          onClick={closeMobile}
          aria-hidden="true"
        />
      ) : null}

      <aside
        className={`peer fixed inset-y-0 left-0 z-30 bg-[#9b0000] text-white flex flex-col items-stretch py-4 rounded-tr-[32px] transition-all duration-300 ease-in-out w-64 ${desktopWidthClass} ${mobileTranslateClass} md:translate-x-0`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="md:hidden px-3 pb-2 flex items-center justify-end">
          <button
            type="button"
            className="rounded-md px-2 py-1 text-white/90 hover:text-white hover:bg-white/10"
            onClick={closeMobile}
            aria-label="Close navigation"
            title="Close"
          >
            ✕
          </button>
        </div>

        <div className="px-3 mb-5 flex items-center justify-start">
          <div className="bg-white rounded-2xl w-12 h-12 flex items-center justify-center overflow-hidden">
            <a href="/dashboard">
              <img src="/tab-logo.png" alt="Arise logo" className="w-8 h-8 object-contain" />
            </a>
          </div>
        </div>

        <nav className="flex-1 min-h-0 px-3 space-y-2 overflow-y-auto pb-3">
          {finalVisibleItems.map((item) => {
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
                  onMainClick={() => handleMainClick(item)}
                  onToggleClick={() => handleToggle(item.label)}
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
                onMainClick={() => handleMainClick(item)}
                onToggleClick={() => handleToggle(item.label)}
                onSubClick={handleSubClick}
                isHovered={isHovered}
              />
            );
          })}
        </nav>

        <div className="px-3 mt-3 space-y-2">
          <button
            type="button"
            className={`flex items-center gap-3 w-full rounded-lg transition-colors text-white/90 hover:text-white hover:bg-white/10 ${
              !isHovered ? "justify-center px-3 py-2" : "px-3 py-2"
            }`}
            onClick={() => {
              navigate('/profile');
              closeMobile();
            }}
            title={!isHovered ? 'My Profile' : ''}
          >
            <img
              src="/icons/account-icon.png"
              alt="My Profile"
              className="h-5 w-5 object-contain brightness-0 invert"
            />
            {isHovered && <span className="text-left text-[14px]">My Profile</span>}
          </button>

          <button
            type="button"
            className={`flex items-center gap-3 w-full rounded-lg transition-colors text-white/90 hover:text-white hover:bg-white/10 ${
              !isHovered ? "justify-center px-3 py-2" : "px-3 py-2"
            }`}
            onClick={handleLogout}
            title={!isHovered ? 'Logout' : ''}
          >
            <img
              src="/icons/account-icon.png"
              alt="Logout"
              className="h-5 w-5 object-contain brightness-0 invert"
            />
            {isHovered && <span className="text-left text-[14px]">Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}

export function NavSide({ children }) {
  const location = useLocation();
  const contentRef = useRef(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useLayoutEffect(() => {
    if (!contentRef.current) return;

    gsap.fromTo(
      contentRef.current,
      { autoAlpha: 0, y: 10 },
      { autoAlpha: 1, y: 0, duration: 0.35, ease: 'power2.out' }
    );
  }, [location.pathname]);

  return (
    <div className={`min-h-screen w-full bg-[#EDEDED] relative ${mobileOpen ? "overflow-hidden" : ""}`}>
      <Sidenav mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <main
        data-lenis-wrapper
        className="bg-white text-gray-900 overflow-x-hidden min-h-screen ml-0 md:ml-20 md:peer-hover:ml-44 min-w-0 w-full transition-[margin] duration-300"
      >
        <div className="md:hidden sticky top-0 z-10 bg-white border-b border-gray-200">
          <div className="px-4 py-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-md px-2 py-1 text-[#990100] hover:bg-gray-100"
              aria-label="Open navigation"
              title="Menu"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 6H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M4 12H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M4 18H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            <div className="text-sm font-medium text-gray-700">Menu</div>
          </div>
        </div>

        <div data-lenis-content ref={contentRef} className="min-h-screen">
          {children}
        </div>
      </main>
    </div>
  );
}

function NavItem({ label, icon, active, onClick, isHovered }) {
  const base = "flex items-center gap-3 w-full rounded-lg transition-colors";
  const activeClasses = active
    ? "bg-white text-[#9b0000] font-medium shadow-sm"
    : "text-white/90 hover:text-white";

  const iconColor = active ? "red" : "white";
  const iconPath = `/icons/sidenav/${iconColor}-${icon}.png`;

  return (
    <button
      className={`${base} ${activeClasses} ${
        !isHovered ? "justify-center px-3 py-2" : "px-3 py-2"
      }`}
      onClick={onClick}
      title={!isHovered ? label : ""}
    >
      <img src={iconPath} alt={`${label} icon`} className="h-5 w-5 object-contain" />
      {isHovered && <span className="text-left text-[14px]">{label}</span>}
    </button>
  );
}

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
    return `/icons/sidenav/${color}-${iconName}.png`;
  };

  const isHighlighted = active || isOpen;

  const HeaderInner = ({ isActiveLike }) => (
    <div className={`flex w-full items-center ${!isHovered ? "justify-center px-3 py-2" : "px-3 py-2"}`}>
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
    <div className="bg-[#f8f4f4] rounded-lg text-[#9b0000] shadow-sm overflow-hidden">
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
    return `/icons/sidenav/${color}-${iconName}.png`;
  };

  const isHighlighted = active || isOpen;

  const HeaderInner = ({ isActiveLike }) => (
    <div className={`flex w-full items-center ${!isHovered ? "justify-center px-3 py-2" : "px-3 py-2"}`}>
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
    <div className="bg-[#f8f4f4] rounded-lg text-[#9b0000] shadow-sm overflow-hidden">
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
