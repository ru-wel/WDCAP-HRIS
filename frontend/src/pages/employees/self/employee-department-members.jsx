import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DropDownFilter from '../../../components/dropdownfilter.jsx';
import { get } from '../../../services/api.js';
import { compareText } from '../../../utils/sort.js';

export default function EmployeeDepartmentMembers() {
  const { departmentId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [departmentName, setDepartmentName] = useState('Department');
  const [members, setMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('name_az');

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError('');

      const [deptRes, membersRes] = await Promise.all([
        get(`/departments/${departmentId}`),
        get(`/departments/${departmentId}/members`)
      ]);

      if (deptRes?.success) {
        setDepartmentName(deptRes?.data?.department_name || 'Department');
      }

      const rows = Array.isArray(membersRes?.data) ? membersRes.data : [];
      setMembers(rows);
    } catch (e) {
      console.error('Failed to load department members:', e);
      setError(e?.message || 'Failed to load department members');
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (departmentId) fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departmentId]);

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return members;
    const q = searchTerm.toLowerCase();
    return members.filter((m) => {
      const employeeCode = String(m?.employee_id || '').toLowerCase();
      const name = `${m?.first_name || ''} ${m?.last_name || ''}`.toLowerCase();
      const position = String(m?.positions?.position_title || '').toLowerCase();
      return employeeCode.includes(q) || name.includes(q) || position.includes(q);
    });
  }, [members, searchTerm]);

  const visibleMembers = useMemo(() => {
    const sorted = [...filtered].sort((a, b) => {
      const aName = `${a?.first_name || ''} ${a?.last_name || ''}`.trim();
      const bName = `${b?.first_name || ''} ${b?.last_name || ''}`.trim();

      switch (sortOrder) {
        case 'employee_id_asc':
          return compareText(a?.employee_id, b?.employee_id);
        case 'employee_id_desc':
          return compareText(b?.employee_id, a?.employee_id);
        case 'name_az':
          return compareText(aName, bName);
        case 'name_za':
          return compareText(bName, aName);
        case 'position_az':
          return compareText(a?.positions?.position_title, b?.positions?.position_title);
        case 'position_za':
          return compareText(b?.positions?.position_title, a?.positions?.position_title);
        default:
          return compareText(aName, bName);
      }
    });

    return sorted;
  }, [filtered, sortOrder]);

  return (
    <div className="p-7 lg:mx-[4.5rem] md:mx-10">
      <div className="md:flex justify-between items-center w-full">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/employees/departments')}
            className="text-[#990100] hover:text-[#CC0000] transition-colors flex items-center gap-1 text-sm font-medium cursor-pointer"
          >
            <span className="text-xl">←</span>Back
          </button>
          <span className="text-gray-300">|</span>
          <h1 className="lg:text-3xl text-2xl text-[#990100] font-bold md:mb-0">
            {departmentName} Members
          </h1>
        </div>

        <div className="flex items-center justify-end md:gap-4 gap-3 md:mt-0 mt-5">
          <DropDownFilter
            value={sortOrder}
            onChange={setSortOrder}
            options={[
              { value: 'employee_id_asc', label: 'Employee ID: Ascending' },
              { value: 'employee_id_desc', label: 'Employee ID: Descending' },
              { value: 'name_az', label: 'Name: A - Z' },
              { value: 'name_za', label: 'Name: Z - A' },
              { value: 'position_az', label: 'Position: A - Z' },
              { value: 'position_za', label: 'Position: Z - A' },
            ]}
          />

          <div className="relative text-gray-600 border border-[#990100] rounded-lg">
            <input
              type="search"
              name="search"
              placeholder="Search"
              className="bg-white lg:h-10 md:h-9 h-8 px-2 lg:pr-10 md:pr-5 pr-5 md:w-auto w-35 rounded-lg text-sm focus:outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button
              type="button"
              className="absolute right-0 top-0 md:mt-3 mt-2 lg:mr-3 mr-2 items-center cursor-pointer"
            >
              <img src="/icons/red-search.png" className="lg:w-5 lg:h-5 w-4 h-4 items-center" alt="search" />
            </button>
          </div>
        </div>
      </div>

      <hr className="text-[#990100] mt-6" />

      <div className="mt-6">
        {loading ? (
          <div className="text-sm text-gray-600">Loading members…</div>
        ) : error ? (
          <div className="text-sm text-red-700">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-gray-600">No members found.</div>
        ) : (
          <div className="div-table">
            <table className="table-style">
              <thead className="thead-style">
                <tr>
                  <th className="th-style rounded-tl-lg rounded-bl-lg">Employee ID</th>
                  <th className="th-style">Name</th>
                  <th className="th-style rounded-tr-lg rounded-br-lg">Position</th>
                </tr>
              </thead>
              <tbody className="tbody-style">
                {visibleMembers.map((m) => (
                  <tr key={m.employee_id} className="tr-style">
                    <td className="td-style">{m.employee_id || '—'}</td>
                    <td className="td-style">{`${m.first_name || ''} ${m.last_name || ''}`.trim() || '—'}</td>
                    <td className="td-style">{m.positions?.position_title || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
