import React, { useState } from "react";

export default function Sidenav({
  initialActive = "Dashboard",
  initialSub = "Onboarding",
}) {
  const [activeMain, setActiveMain] = useState(initialActive);
  const [activeSub, setActiveSub] = useState(initialSub);
  const [openGroup, setOpenGroup] = useState(initialActive);
  const [isHovered, setIsHovered] = useState(false);

  const items = [
    { label: "Dashboard", 
      icon: "dashboard", 
      type: "item" 
    },
    {
      label: "Employees",
      icon: "employees",
      type: "dropdown",
      children: [
        { label: "Onboarding" },
        { label: "User Accounts" },
        { label: "201 Files" },
        { label: "Departments" },
      ],
    },
    {
      label: "Projects",
      icon: "projects",
      type: "item",
    },
    {
      label: "Leave",
      icon: "leave",
      type: "dropdown",
      children: [
        { label: "Leave Request" },
        { label: "Leave Credits" },
        { label: "Leave History" },
      ],
    },
    {
      label: "Evaluation",
      icon: "evaluation",
      type: "dropdown",
      children: [
        { label: "Evaluate History" },
      ],
    },
    { label: "Analytics",
      icon: "analytics",
      type: "item"
    },
    {
      label: "Audit Logs",
      icon: "audit",
      type: "group",
      children: [
        { label: "User Accounts" },
        { label: "Employees" },
        { label: "Departments" },
        { label: "Projects" },
        { label: "Leave" },
        { label: "Evaluation" },
        { label: "Reports" },
      ],
    },
  ];

  const handleMainClick = (item) => {
    setActiveMain(item.label);

    if (item.type === "group" || item.type === "dropdown") {
      setOpenGroup(openGroup === item.label ? null : item.label);
      if (!item.children.some((c) => c.label === activeSub)) {
        setActiveSub(item.children[0]?.label ?? null);
      }
    } else {
      setOpenGroup(null);
      setActiveSub(null);
    }
  };

  const handleSubClick = (parentLabel, childLabel) => {
    setActiveMain(parentLabel);
    setOpenGroup(parentLabel);
    setActiveSub(childLabel);
  };

  const handleDropdownMainClick = (item) => {
    setActiveMain(item.label);
    setOpenGroup(openGroup === item.label ? null : item.label);
    if (item.children && item.children.length > 0) {
      setActiveSub(item.children[0].label);
    }
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
          <img 
            src="./tab-logo.png"
            alt="Arise logo"
            className="w-8 h-8 object-contain"
          />
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-3">
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
                onMainClick={() => handleDropdownMainClick(item)}
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
      <main className="bg-white text-gray-900 overflow-y-auto h-full ml-20">
        {children}
      </main>
    </div>
  );
}

function NavItem({ label, icon, active, onClick, isHovered }) {
  const base =
    "flex items-center gap-3 px-3 py-2 text-[14px] w-full rounded-xl transition-colors";

  const activeClasses = active
    ? "bg-white text-[#9b0000] font-medium shadow-sm"
    : "text-white/90 hover:text-white";

  const iconColor = active ? "red" : "white";
  const iconPath = `./icons/sidenav/${iconColor}-${icon}.png`;

  return (
    <button 
      className={`${base} ${activeClasses} ${!isHovered ? "justify-center" : ""}`} 
      onClick={onClick}
      title={!isHovered ? label : ""}
    >
      <img 
        src={iconPath}
        alt={`${label} icon`}
        className="h-5 w-5 object-contain"
      />
      {isHovered && <span>{label}</span>}
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
  onSubClick,
  isHovered,
}) {
  const getIconPath = (iconName, isActive) => {
    const color = isActive ? "red" : "white";
    return `./icons/sidenav/${color}-${iconName}.png`;
  };

  if (active) {
    return (
      <div className="bg-[#f8f4f4] rounded-3xl text-[#9b0000] shadow-sm overflow-hidden">
        <button
          className={`flex w-full items-center gap-3 px-4 pt-3 pb-2 text-[14px] font-medium ${
            !isHovered ? "justify-center" : ""
          }`}
          onClick={onMainClick}
          title={!isHovered ? label : ""}
        >
          <img 
            src={getIconPath(icon, true)}
            alt={`${label} icon`}
            className="h-5 w-5 object-contain"
            onError={(e) => {
              console.warn(`Icon not found: ${getIconPath(icon, true)}`);
              e.target.style.display = 'none';
            }}
          />
          {isHovered && (
            <>
              <span className="flex-1 text-left">{label}</span>
              <svg 
                className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </>
          )}
        </button>

        {isOpen && isHovered && (
          <ul className="px-4 pb-3 text-[13px]">
            {items.map((sub, index) => {
              const isSubActive = activeSub === sub.label;
              return (
                <li key={sub.label}>
                  <button
                    className={
                      "flex w-full items-center py-1.5 text-left " +
                      (isSubActive
                        ? "underline underline-offset-2 font-medium"
                        : "") +
                      (index < items.length - 1
                        ? " border-b border-[#d6bcbc]"
                        : "")
                    }
                    onClick={() => onSubClick(label, sub.label)}
                  >
                    {sub.label}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  }
  return (
    <div>
      <button
        className={`flex w-full items-center gap-3 px-3 py-2 text-[14px] text-white/90 hover:text-white ${
          !isHovered ? "justify-center" : ""
        }`}
        onClick={onMainClick}
        title={!isHovered ? label : ""}
      >
        <img 
          src={getIconPath(icon, active)}
          alt={`${label} icon`}
          className="h-5 w-5 object-contain"
          onError={(e) => {
            console.warn(`Icon not found: ${getIconPath(icon, active)}`);
            e.target.style.display = 'none';
          }}
        />
        {isHovered && (
          <>
            <span className="flex-1 text-left">{label}</span>
            <svg 
              className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </>
        )}
      </button>
      {isOpen && isHovered && (
        <ul className="mt-1 pl-9 text-[12px] space-y-1 text-white/80">
          {items.map((sub) => (
            <li key={sub.label}>
              <button
                className="hover:text-white"
                onClick={() => onSubClick(label, sub.label)}
              >
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
  onSubClick,
  isHovered,
}) {
  const getIconPath = (iconName, isActive) => {
    const color = isActive ? "red" : "white";
    return `./icons/sidenav/${color}-${iconName}.png`;
  };
  if (active) {
    return (
      <div className="bg-[#f8f4f4] rounded-3xl text-[#9b0000] shadow-sm overflow-hidden">
        <button
          className={`flex w-full items-center gap-3 px-4 pt-3 pb-2 text-[14px] font-medium ${
            !isHovered ? "justify-center" : ""
          }`}
          onClick={onMainClick}
          title={!isHovered ? label : ""}
        >
          <img 
            src={getIconPath(icon, true)}
            alt={`${label} icon`}
            className="h-5 w-5 object-contain"
            onError={(e) => {
              console.warn(`Icon not found: ${getIconPath(icon, true)}`);
              e.target.style.display = 'none';
            }}
          />
          {isHovered && (
            <>
              <span className="flex-1 text-left">{label}</span>
              <svg 
                className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </>
          )}
        </button>

        {isOpen && isHovered && (
          <ul className="px-4 pb-3 text-[13px]">
            {items.map((sub, index) => {
              const isSubActive = activeSub === sub.label;
              return (
                <li key={sub.label}>
                  <button
                    className={
                      "flex w-full items-center py-1.5 text-left " +
                      (isSubActive
                        ? "underline underline-offset-2 font-medium"
                        : "") +
                      (index < items.length - 1
                        ? " border-b border-[#d6bcbc]"
                        : "")
                    }
                    onClick={() => onSubClick(label, sub.label)}
                  >
                    {sub.label}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  }
  return (
    <div>
      <button
        className={`flex w-full items-center gap-3 px-3 py-2 text-[14px] text-white/90 hover:text-white ${
          !isHovered ? "justify-center" : ""
        }`}
        onClick={onMainClick}
        title={!isHovered ? label : ""}
      >
        <img 
          src={getIconPath(icon, active)}
          alt={`${label} icon`}
          className="h-5 w-5 object-contain"
          onError={(e) => {
            console.warn(`Icon not found: ${getIconPath(icon, active)}`);
            e.target.style.display = 'none';
          }}
        />
        {isHovered && (
          <>
            <span className="flex-1 text-left">{label}</span>
            <svg 
              className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </>
        )}
      </button>
      {isOpen && isHovered && (
        <ul className="mt-1 pl-9 text-[12px] space-y-1 text-white/80">
          {items.map((sub) => (
            <li key={sub.label}>
              <button
                className="hover:text-white"
                onClick={() => onSubClick(label, sub.label)}
              >
                {sub.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}