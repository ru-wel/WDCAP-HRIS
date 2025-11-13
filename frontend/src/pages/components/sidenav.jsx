import React from 'react';
import { useState } from "react";

export default function Sidenav ({ active = "Dashboard", defaultCollapsed = false }) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [open, setOpen] = useState({
    Employees: false,
    Projects: false,
    Leave: false,
    Evaluation: false,
    "Audit Logs": false,
  });

  const items = [
    { label: "Dashboard", icon: DashboardIcon },
    {
      label: "Employees",
      icon: UsersIcon,
      caret: true,
      children: [
        { label: "All Employees" },
        { label: "Teams" },
        { label: "Roles" },
      ],
    },
    {
      label: "Projects",
      icon: ProjectsIcon,
      caret: true,
      children: [
        { label: "All Projects" },
        { label: "Create Project" },
      ],
    },
    {
      label: "Leave",
      icon: ClipboardIcon,
      caret: true,
      children: [
        { label: "Requests" },
        { label: "Balances" },
      ],
    },
    {
      label: "Evaluation",
      icon: BadgeIcon,
      caret: true,
      children: [
        { label: "Cycles" },
        { label: "Templates" },
      ],
    },
    { label: "Analytics", icon: ChartIcon },
    {
      label: "Audit Logs",
      icon: AuditIcon,
      caret: true,
      children: [
        { label: "System" },
        { label: "Access" },
      ],
    },
  ];

  return (
    <aside
      className={
        `relative h-screen ${collapsed ? "w-16" : "w-64"} ` +
        "bg-gradient-to-b from-[#8b0000] to-[#7e0000] text-white shadow-inner transition-[width] duration-200 ease-in-out rounded-tr-3xl shadow-lg"
      }
    >

      <div className="flex items-center justify-between px-3 pt-4 pb-3">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="h-9 w-9 rounded-xl bg-white/95 ring-1 ring-black/5 flex items-center justify-center shrink-0 hover:bg-white"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand" : "Collapse"}
        >
          <LogoIcon className="h-5 w-5 text-[#8b0000]" />
        </button>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="ml-2 inline-flex items-center justify-center rounded-xl border border-white/20 px-2 py-1 text-xs hover:bg-white/10"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="mt-2 px-2">
        <ul className="space-y-1">
          {items.map((it) => (
            <li key={it.label}>
              <NavItem
                label={it.label}
                icon={it.icon}
                active={active === it.label}
                caret={it.caret}
                collapsed={collapsed}
                open={open[it.label]}
                onToggle={() =>
                  setOpen((s) => ({ ...s, [it.label]: !s[it.label] }))
                }
              />
              {/* Submenu */}
              {it.children && !collapsed && (
                <div
                  className={`overflow-hidden transition-[grid-template-rows] duration-200 ${
                    open[it.label] ? "grid grid-rows-[1fr]" : "grid grid-rows-[0fr]"
                  }`}
                >
                  <div className="min-h-0">
                    <ul className="ml-10 mt-1 space-y-1 border-l border-white/10 pl-3 text-sm/6 text-white/90">
                      {it.children.map((c) => (
                        <li key={c.label}>
                          <button className="hover:underline">{c.label}</button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </nav>

      <div className="pointer-events-none absolute inset-y-0 left-0 w-[2px] bg-black/50" />
    </aside>
  );
}

function NavItem({ label, icon: Icon, active, caret, collapsed, open, onToggle }) {
  const base =
    "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors select-none";

  const content = (
    <>
      <Icon className={`h-4 w-4 ${active ? "text-[#8b0000]" : "text-white"}`} />
      {!collapsed && <span className="flex-1 truncate">{label}</span>}
      {caret && !collapsed && (
        <CaretDown className={`h-3.5 w-3.5 ${open ? "rotate-180" : ""} transition-transform`} />
      )}
    </>
  );

  if (active) {
    return (
      <div
        className={`${base} bg-white text-[#8b0000] font-medium shadow-sm`}
        role="button"
        title={collapsed ? label : undefined}
        onClick={caret ? onToggle : undefined}
      >
        {content}
      </div>
    );
  }
  return (
    <div
      className={`${base} text-white/90 hover:bg-white/10`}
      role="button"
      title={collapsed ? label : undefined}
      onClick={caret ? onToggle : undefined}
    >
      {content}
    </div>
  );
}

export function NavSide ({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="h-screen w-screen grid grid-cols-[auto_1fr] bg-[#EDEDED]">
      <Sidenav defaultCollapsed={collapsed} />
      <main className="bg-white text-gray-900 overflow-y-auto">
        <div className="">{children}</div>
      </main>
    </div>
  );
}

function LogoIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M4 14l8-8 8 8" />
      <path d="M6 12v8h12v-8" />
    </svg>
  );
}
function DashboardIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" stroke="currentColor" {...props}>
      <path d="M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z" />
    </svg>
  );
}
function UsersIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M16 11c1.657 0 3-1.79 3-4s-1.343-4-3-4-3 1.79-3 4 1.343 4 3 4z" />
      <path d="M22 21v-2a4 4 0 0 0-4-4h-2" />
      <path d="M8 13a4 4 0 0 0-4 4v2" />
      <circle cx="8" cy="7" r="3" />
    </svg>
  );
}
function ProjectsIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M3 7h18M3 12h18M3 17h18" />
    </svg>
  );
}
function ClipboardIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <rect x="7" y="4" width="10" height="16" rx="2" />
      <path d="M9 4h6v2H9zM9 10h6M9 14h6" />
    </svg>
  );
}
function BadgeIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M12 2l3 6 6 .9-4.5 4.2 1 6.7L12 17l-5.5 2.8 1-6.7L3 8.9 9 8z" />
    </svg>
  );
}
function ChartIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M3 3v18h18" />
      <path d="M7 15h2v3H7zM12 10h2v8h-2zM17 6h2v12h-2z" />
    </svg>
  );
}
function AuditIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 7h8M8 11h8M8 15h6" />
    </svg>
  );
}
function CaretDown(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M7 10l5 5 5-5H7z" />
    </svg>
  );
}
function ChevronLeft(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}
function ChevronRight(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}