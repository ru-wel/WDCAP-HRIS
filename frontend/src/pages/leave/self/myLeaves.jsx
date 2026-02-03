import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import ReactPaginate from "react-paginate";
import { get, post, put } from "../../../services/api.js";
import ConfirmModal from "../../../components/confirm-modal.jsx";

const formatDateShort = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = String(d.getFullYear());
  return `${mm}/${dd}/${yyyy}`;
};

const formatDateTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const dateStr = formatDateShort(iso);
  const timeStr = d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  return `${dateStr} at ${timeStr}`;
};

const formatRange = (startIso, endIso) => {
  const start = formatDateShort(startIso);
  const end = formatDateShort(endIso);
  if (!start && !end) return "";
  if (!end || start === end) return start;
  return `${start} - ${end}`;
};

function StatCard({ title, color, value, onClick }) {
  return (
    <section
      type="button"
      onClick={onClick}
      className="w-full text-left focus:outline-none cursor-pointer"
    >
      <div className="relative bg-white rounded-xl border border-gray-200 lg:px-5 px-3 py-4 flex items-center justify-between shadow-sm hover:shadow-md hover:-translate-y-[2px] transition duration-200 ease-in-out">
        <span className="absolute left-0 top-0 h-full w-1 rounded-l-xl" style={{ backgroundColor: color }} />
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            {title}
          </p>
          <p className="mt-2 text-2xl font-semibold text-[#990100]">{value}</p>
        </div>
      </div>
    </section>
  );
}

function RequestLeave({ onClose, onSuccess, leaveCredits = [] }) {
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [leavePurpose, setLeavePurpose] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [employeeProfile, setEmployeeProfile] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingTypes(true);
        setError(null);

        // fetch employee profile
        try {
          const prof = await get("/employees/me");
          setEmployeeProfile(prof?.data || null);
        } catch {
          setEmployeeProfile(null);
        }

        // fetch leave types
        const resp = await get("/leave/types");
        const types = Array.isArray(resp?.data) ? resp.data : [];
        setLeaveTypes(types);

        const firstEnabled = types.find((t) => isTypeEnabled(t));
        setLeaveTypeId(firstEnabled ? String(firstEnabled.leave_type_id ?? "") : "");
      } catch (e) {
        console.error("Failed to load leave types:", e);
        setError("Failed to load leave types. Please try again.");
        setLeaveTypes([]);
        setLeaveTypeId("");
      } finally {
        setLoadingTypes(false);
      }
    };

    fetchData();
  }, []);

  const isTypeEnabled = (t) => {
    const name = String(t?.leave_type_name || "").toLowerCase();
    const hireDateIso = String(employeeProfile?.hire_date || "").slice(0, 10);
    const personnelType = String(employeeProfile?.personnel_type || "").toLowerCase();

    let probationary = personnelType === "probationary";

    if (probationary && hireDateIso) {
      try {
        const hired = new Date(`${hireDateIso}T00:00:00`);
        const now = new Date();
        const diffDays = Math.floor(
          (now.getTime() - hired.getTime()) / (24 * 60 * 60 * 1000)
        );
        if (diffDays >= 365) probationary = false;
      } catch {
        // ignore
      }
    }

    if (probationary) {
      return name.includes("without pay");
    }

    return true;
  };

  const isSILSelected = useMemo(() => {
    const selectedType = leaveTypes.find((t) =>
      String(t.leave_type_id) === String(leaveTypeId)
    );
    return /service incentive/i.test(selectedType?.leave_type_name || '');
  }, [leaveTypeId, leaveTypes]);

  const selectedLeaveTypeName = useMemo(() => {
    const selectedType = leaveTypes.find((t) =>
      String(t.leave_type_id) === String(leaveTypeId)
    );
    return selectedType?.leave_type_name || '';
  }, [leaveTypeId, leaveTypes]);

  const currentBalance = useMemo(() => {
    const credit = leaveCredits.find((c) =>
      String(c.leave_type_name || "").toLowerCase() === selectedLeaveTypeName.toLowerCase()
    );
    return credit ? credit.current_balance : null;
  }, [leaveCredits, selectedLeaveTypeName]);

  // excludes weekends on leave credit calculation
  const requestedDays = useMemo(() => {
    if (!startDate || !endDate) return 0;
    try {
      const start = new Date(startDate + 'T00:00:00');
      const end = new Date(endDate + 'T00:00:00');

      let count = 0;
      const current = new Date(start);

      while (current <= end) {
        const dayOfWeek = current.getDay();         // 0 = Sunday, 6 = Saturday
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {   // not Sunday or Saturday
          count++;
        }
        current.setDate(current.getDate() + 1);
      }

      return Math.max(0, count);
    } catch {
      return 0;
    }
  }, [startDate, endDate]);

  const hasInsufficientBalance = useMemo(() => {
    if (currentBalance === null) return false;
    return requestedDays > currentBalance;
  }, [currentBalance, requestedDays]);

  useEffect(() => {
    if (!isSILSelected && leavePurpose) {
      setLeavePurpose("");
    }
  }, [isSILSelected, leavePurpose]);

  const canSubmit = Boolean(
    leaveTypeId &&
    startDate &&
    endDate &&
    (!isSILSelected || leavePurpose)
  );

  const toApiLeaveTypeId = (value) => {
    const v = String(value || "").trim();
    if (!v) return "";
    if (/^\d+$/.test(v)) return Number(v);
    return v;
  };

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;

    try {
      setSubmitting(true);
      setError(null);

      await post(
        "/leave/requests",
        {
          leave_type_id: toApiLeaveTypeId(leaveTypeId),
          start_date: startDate,
          end_date: endDate,
          reason: reason || null,
          leave_purpose: isSILSelected ? leavePurpose : null,
        },
        true,
        60000
      );

      onSuccess?.();
      onClose?.();
    } catch (e) {
      console.error("Failed to create leave request:", e);
      setError(e?.message || "Failed to submit leave request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/20" aria-hidden="true" />

        <div className="relative w-full lg:max-w-xl md:max-w-lg mx-4 bg-white rounded-lg shadow-xl border border-gray-300">
          <div className="p-4 sm:p-6">
            <div className="rounded-lg bg-[#990100] flex items-center justify-between py-2 sm:py-3 px-3 sm:px-4">
              <h1 className="text-white text-sm sm:text-base lg:text-lg font-medium">
                Leave Request
              </h1>

              <button type="button" className="text-white text-2xl font-bold hover:scale-110 transition cursor-pointer" aria-label="Close" onClick={onClose}>
                ✕
              </button>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
                {error}
              </div>
            )}

            <div className="mt-6 flex justify-center">
              <div className="w-full max-w-md">
                <div className="space-y-6 text-sm mt-6">
                  <div className="grid grid-cols-[140px_1fr] gap-4 items-start">
                    <label className="text-left font-semibold pt-2 text-[#483D3D] uppercase">
                      Leave Type:
                    </label>
                    <select className="border border-[#990100] rounded-md px-3 py-2 w-full bg-white" value={leaveTypeId} onChange={(e) => setLeaveTypeId(e.target.value)} disabled={loadingTypes || submitting}>
                      {loadingTypes ? (
                        <option value="">Loading…</option>
                      ) : leaveTypes.length ? (
                        leaveTypes.map((t) => (
                          <option key={String(t.leave_type_id)} value={String(t.leave_type_id)} disabled={!isTypeEnabled(t)}>
                            {t.leave_type_name}
                          </option>
                        ))
                      ) : (
                        <option value="">No leave types available</option>
                      )}
                    </select>

                    {currentBalance !== null && (
                      <div className="col-span-2">
                        <div className={`flex items-center justify-between px-3 py-2 rounded-md border ${hasInsufficientBalance ? 'bg-red-50 border-red-300' : 'bg-green-50 border-green-300'}`}>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-600">
                              Available:
                            </span>
                            <span className={`text-lg font-bold ${hasInsufficientBalance ? 'text-red-600' : 'text-green-600'}`}>
                              {currentBalance} {currentBalance === 1 ? 'day' : 'days'}
                            </span>
                          </div>
                          {requestedDays > 0 && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-gray-600">
                                Requesting:
                              </span>
                              <span className="text-lg font-bold text-gray-700">
                                {requestedDays} {requestedDays === 1 ? 'day' : 'days'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {hasInsufficientBalance && (
                      <div className="col-span-2 p-2 bg-yellow-100 border border-yellow-400 text-yellow-800 rounded text-xs">
                        Warning: Requested days ({requestedDays}) exceed available balance ({currentBalance})
                      </div>
                    )}

                    <label className="text-left font-semibold pt-2 text-[#483D3D] uppercase">
                      Start Date:
                    </label>
                    <input type="date" className="border border-[#990100] rounded-md px-3 py-2 w-full" value={startDate} onChange={(e) => setStartDate(e.target.value)} disabled={submitting}/>

                    <label className="text-left font-semibold pt-2 text-[#483D3D] uppercase">
                      End Date:
                    </label>
                    <input type="date" className="border border-[#990100] rounded-md px-3 py-2 w-full" value={endDate} onChange={(e) => setEndDate(e.target.value)} disabled={submitting} min={startDate || undefined}/>

                    {isSILSelected && (
                      <>
                        <label className="text-left font-semibold pt-2 text-[#483D3D] uppercase">
                          Leave Purpose:
                        </label>
                        <select className="border border-[#990100] rounded-md px-3 py-2 w-full bg-white" value={leavePurpose} onChange={(e) => setLeavePurpose(e.target.value)} disabled={submitting}>
                          <option value="">Select purpose</option>
                          <option value="vacation">Vacation</option>
                          <option value="sick">Sick</option>
                        </select>
                      </>
                    )}

                    <label className="text-left font-semibold pt-2 text-[#483D3D] uppercase">
                      Reason:
                    </label>
                    <textarea className="border border-[#990100] rounded-md px-3 py-2 h-28 resize-none w-full" placeholder="Optional" value={reason} onChange={(e) => setReason(e.target.value)} disabled={submitting}/>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end mt-8">
              <button type="button" className="bg-[#990100] text-white text-sm px-6 py-2 rounded-md hover:bg-[#ad3332] transition disabled:opacity-60 disabled:cursor-not-allowed" onClick={handleSubmit} disabled={!canSubmit || submitting || loadingTypes}>
                {submitting ? "Submitting…" : "Submit"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


function ViewDetails ({ data, onClose, onCancel }){

    if (!data) return null;

    const status = String(data.status || "").toUpperCase();
    const canCancel = status === "PENDING" || status === "APPROVED";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />

      <div className="relative w-full lg:max-w-xl md:max-w-lg mx-4 bg-white rounded-lg shadow-xl border border-gray-300">
        <div className="p-4 sm:p-6">
          
          {/* HEADER */}
          <div className="rounded-lg bg-[#990100] flex items-center justify-between py-2 sm:py-3 px-3 sm:px-4">
            <h2 className="text-white text-sm sm:text-base lg:text-lg font-medium">
              Leave Details
            </h2>
            <button
              onClick={onClose}
              className="text-white text-xl font-bold hover:scale-110 transition"
            >
              ✕
            </button>
          </div>


          <div className="space-y-5 text-sm">
            <div className="grid grid-cols-[140px_1fr] gap-x-6 gap-y-2 pt-6 px-3">

            <div className="font-semibold text-[#483D3D] uppercase">Date Requested:</div>
            <div>{data.dateRequested}</div>

            <div className="font-semibold text-[#483D3D] uppercase">Employee Name:</div>
            <div>{data.name}</div>

            <div className="font-semibold text-[#483D3D] uppercase">Position:</div>
            <div>{data.position}</div>

            <div className="font-semibold text-[#483D3D] uppercase">Leave Type:</div>
            <div>
              {data.type}
              {data.leave_purpose && (
                <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                  {data.leave_purpose === 'vacation' ? '🏖️ Vacation' : '🏥 Sick'}
                </span>
              )}
            </div>

            <div className="font-semibold text-[#483D3D] uppercase">Date:</div>
            <div>{data.date}</div>

            <div className="font-semibold text-[#483D3D] uppercase">Reason:</div>
            <textarea
                className="border border-gray-300 rounded-md p-3 text-sm h-28 resize-none"
                placeholder="Reason"
                value={data.reason}
                readOnly
            />
            </div>

            <hr className="border-[#990100]" />

            <div className="flex items-center gap-4 px-3">
            <div className="font-semibold text-[#483D3D] uppercase">Status:</div>
            <StatusPill status={data.status} />
            </div>

            {data.updated_by && data.updated_at && (
              <div className="pt-2 px-3">
                <span className="font-semibold text-[#483D3D] uppercase">Update Made By: </span>
                <span className="text-gray-700">
                  {data.updated_by} on {formatDateTime(data.updated_at)}
                </span>
              </div>
            )}

            <div className="flex justify-end pt-3">
            {canCancel ? (
              <button type="button" className="bg-[#990100] hover:bg-red-700 text-white text-sm px-6 py-2 rounded-md transition shadow-md" onClick={() => onCancel?.(data)}>
                Cancel Request
              </button>
            ) : (
              <button type="button" className="bg-gray-600 hover:bg-gray-700 text-white text-sm px-6 py-2 rounded-md transition shadow-md" onClick={onClose}>
                Close
              </button>
            )}
            </div>
        </div>

        </div>
      </div>
    </div>
  );
}

function LeaveWOPay ({onClose}){
    return(
        <div>
            <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div
                    className="absolute inset-0 bg-black/20"
                    aria-hidden="true"
                />

                    <div className="relative w-full md:max-w-lg mx-4 bg-white rounded-lg shadow-xl border border-gray-300">
                        <div className="p-6">
                        <div className=" flex items-center justify-between">
                            <p className="text-[#990100] text-lg font-semibold uppercase">Leave without Pay</p>
                            <button
                            type="button"
                            className="text-gray-400 hover:text-gray-500 text-lg font-bold hover:scale-110 transition cursor-pointer"
                            aria-label="Close"
                            onClick={onClose}
                            >
                            ✕
                            </button>
                        </div>

                        <div className="flex justify-center pt-4 ">
                            <ul className="list-disc pl-5 space-y-2">
                                <li>This is available to everyone. You may request for a leave without pay.</li>
                            </ul>
                        </div>

                    </div>
                </div>
            </div>  
        </div>
    )
}

function SIL ({onClose}){
    return(
        <div>
            <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div
                    className="absolute inset-0 bg-black/20"
                    aria-hidden="true"
                />

                    <div className="relative w-full md:max-w-lg mx-4 bg-white rounded-lg shadow-xl border border-gray-300">
                        <div className="p-6">
                        <div className=" flex items-center justify-between">
                            <p className="text-[#990100] text-lg font-semibold uppercase">Service Incentive Leave (SIL)</p>
                            <button
                            type="button"
                            className="text-gray-400 hover:text-gray-500 text-lg font-bold hover:scale-110 transition cursor-pointer"
                            aria-label="Close"
                            onClick={onClose}
                            >
                            ✕
                            </button>
                        </div>

                        <div className="flex justify-center pt-4">
                            <ul className="list-disc pl-5 space-y-2">
                                <li>For employees who already rendered service for at least 1 year in the company.</li>
                                <li>5 days of leave credits annually.</li>
                                <li>Employee can use it for sick or vacation leave.</li>
                                <li>Unused SIL at the end of the year are to be encashed.</li>
                            </ul>
                        </div>

                    </div>
                </div>
            </div>  
        </div>
    )
}

function MaternityLeave ({onClose}){
    return(
        <div>
            <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div
                    className="absolute inset-0 bg-black/20"
                    aria-hidden="true"
                />

                    <div className="relative w-full md:max-w-lg mx-4 bg-white rounded-lg shadow-xl border border-gray-300">
                        <div className="p-6">
                        <div className=" flex items-center justify-between">
                            <p className="text-[#990100] text-lg font-semibold uppercase">Maternity Leave</p>
                            <button
                            type="button"
                            className="text-gray-400 hover:text-gray-500 text-lg font-bold hover:scale-110 transition cursor-pointer"
                            aria-label="Close"
                            onClick={onClose}
                            >
                            ✕
                            </button>
                        </div>

                        <div className="flex flex-col justify-center pt-4">
                            <p className="font-medium text-[#990100]">INITIAL:</p>
                            <ul className="list-disc pl-5 space-y-2">
                                <li>To file, inform the HR at least 60 days before due date.</li>
                                <li>Submit SSS Maternity Notification Form (MAT 1).</li>
                                <li>Submit Doctor's Certificate (Proof of Pregnancy).</li>
                            </ul>

                            <p className="pt-4 font-medium text-[#990100]">AFTER GIVING BIRTH:</p>
                            <ul className="list-disc pl-5 space-y-2">
                                <li>Submit the SSS Maternity Benefit Application (MAT 2).</li>
                                <li>Submit baby's birth certificate for your employer to process your 105 days of paid leave, ensuring you have at least 3 months of SSS contributions.</li>
                            </ul>
                        </div>

                    </div>
                </div>
            </div>  
        </div>
    )
}

function PaternityLeave ({onClose}){
    return(
        <div>
            <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div
                    className="absolute inset-0 bg-black/20"
                    aria-hidden="true"
                />

                    <div className="relative w-full md:max-w-lg mx-4 bg-white rounded-lg shadow-xl border border-gray-300">
                        <div className="p-6">
                        <div className=" flex items-center justify-between">
                            <p className="text-[#990100] text-lg font-semibold uppercase">Paternity Leave</p>
                            <button
                            type="button"
                            className="text-gray-400 hover:text-gray-500 text-lg font-bold hover:scale-110 transition cursor-pointer"
                            aria-label="Close"
                            onClick={onClose}
                            >
                            ✕
                            </button>
                        </div>

                        <div className="flex flex-col justify-center pt-4">
                            <ul className="list-disc pl-5 space-y-2">
                                <li>7 days of paid leave to assist your spouse.</li>
                                <li>Only for the deliveries of first four children.</li>
                                <li>Submit a copy of your marriage certificate.</li>
                                <li>Complete the company-specific application or notification form.</li>
                                <li>After childbirth, submit a copy of the birth certificate or medical certificate to the HR department</li>
                            </ul>
                        </div>

                    </div>
                </div>
            </div>  
        </div>
    )
}

function VAWC ({onClose}){
    return(
        <div>
            <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div
                    className="absolute inset-0 bg-black/20"
                    aria-hidden="true"
                />

                    <div className="relative w-full md:max-w-lg mx-4 bg-white rounded-lg shadow-xl border border-gray-300">
                        <div className="p-6">
                        <div className=" flex items-center justify-between gap-2">
                            <p className="text-[#990100] text-lg font-semibold uppercase">Victims of Violence Against Women and Their Children (VAWC) Leave</p>
                            <button
                            type="button"
                            className="text-gray-400 hover:text-gray-500 text-lg font-bold hover:scale-110 transition cursor-pointer"
                            aria-label="Close"
                            onClick={onClose}
                            >
                            ✕
                            </button>
                        </div>

                        <div className="flex flex-col justify-center pt-4">
                            <ul className="list-disc pl-5 space-y-2">
                                <li>A certification of a filed/pending VAWC case is required to submit, which can be issued by: Punong Barangay/Barangay Kagawad, Prosecutor, or Clerk of Court.</li> 
                                <li>Up to 10 days of paid leave in order to attend to medical and legal issues.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>  
        </div>
    )
}

function SoloParents ({onClose}){
    return(
        <div>
            <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div
                    className="absolute inset-0 bg-black/20"
                    aria-hidden="true"
                />

                    <div className="relative w-full md:max-w-lg mx-4 bg-white rounded-lg shadow-xl border border-gray-300">
                        <div className="p-6">
                        <div className=" flex items-center justify-between">
                            <p className="text-[#990100] text-lg font-semibold uppercase">Parental Leave for Solo Parents</p>
                            <button
                            type="button"
                            className="text-gray-400 hover:text-gray-500 text-lg font-bold hover:scale-110 transition cursor-pointer"
                            aria-label="Close"
                            onClick={onClose}
                            >
                            ✕
                            </button>
                        </div>

                        <div className="flex flex-col justify-center pt-4 ">
                            <ul className="list-disc pl-5 space-y-2">
                                <li>7-day paid leave.</li>
                                <li>Submit Solo Parent ID as this is the primary requirement, secured from the Local Social Welfare and Development Office (LSWDO)</li>
                                <li>Must have worked for the company for at least 6 months (continuous or broken).</li>
                                <li>Proper notice should be given when availing the leave.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>  
        </div>
    )
}

function WomenLeave ({onClose}){
    return(
        <div>
            <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div
                    className="absolute inset-0 bg-black/20"
                    aria-hidden="true"
                />

                    <div className="relative w-full md:max-w-lg mx-4 bg-white rounded-lg shadow-xl border border-gray-300">
                        <div className="p-6">
                        <div className=" flex items-center justify-between">
                            <p className="text-[#990100] text-lg font-semibold uppercase">Special Leave Benefits for Women</p>
                            <button
                            type="button"
                            className="text-gray-400 hover:text-gray-500 text-lg font-bold hover:scale-110 transition cursor-pointer"
                            aria-label="Close"
                            onClick={onClose}
                            >
                            ✕
                            </button>
                        </div>

                        <div className="flex flex-col justify-center pt-4">
                            <ul className="list-disc pl-5 space-y-2">
                                <li>Female employees are mandated to request a 2-month leave benefit (with full payment based on their gross monthly income) due to surgery for gynecological disorders</li>
                                <li>Regardless of age or civil status but the employee must have rendered at least 6 months of continuous aggregate.</li>
                                <li>Submit duly accomplished Special Leave Benefit for Women request form.</li>
                                <li>Submit your Medical Certificate from a physician specializing in gynecological disorders.</li>
                                <li>Submit your Clinical Summary/Discharge Summary.</li>
                                <li>Submit your Histopathological Report.</li>
                                <li>Submit your Operating Room Record. </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>  
        </div>
    )
}

// FOR THE TABLE - STATUS OF LEAVE
function StatusPill({ status }) {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "APPROVED") {
    return (
      <span className="inline-flex min-w-fit px-3 py-1 whitespace-nowrap rounded-full text-xs font-semibold bg-green-200 text-green-700">
        APPROVED
      </span>
    );
  }
  if (normalized === "REJECTED") {
    return (
      <span className="bg-red-200 text-red-600 inline-flex min-w-fit px-3 py-1 whitespace-nowrap rounded-full text-xs font-semibold">
        REJECTED
      </span>
    );
  }
  if (normalized === "CANCELLED") {
    return (
      <span className="bg-[#C8C8FF] text-[#0000FF] inline-flex min-w-fit px-3 py-1 whitespace-nowrap rounded-full text-xs font-semibold">
        CANCELLED
      </span>
    );
  }
  return (
    <span className=" bg-[#FFE1A3] text-[#805200] inline-flex min-w-fit px-3 py-1 whitespace-nowrap rounded-full text-xs font-semibold">
      {normalized || "PENDING"}
    </span>
  );
}


function MyLeaves() {
    const [showLeaves, setShowLeaves] = useState(false);
    const [showRequestLeave, setShowRequestLeave] = useState(false);
    const [showPayWOLeave, setShowPayWOLeave] = useState(false);
    const [showSIL, setShowSIL] = useState(false)
    const [showMaternity, setShowMaternity] = useState(false)
    const [showPaternity, setShowPaternity] = useState(false)
    const [showVAWC, setShowVAWC] = useState(false)
    const [showSoloParent, setShowSoloParent] = useState(false)
    const [showWomenLeave, setShowWomenLeave] = useState(false)
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showViewDetails, setShowViewDetails] = useState(false);
    const [leaveCredits, setLeaveCredits] = useState([]);
    const [confirmState, setConfirmState] = useState({
      open: false,
      title: "",
      message: "",
      onConfirm: null,
    });
    const [confirmBusy, setConfirmBusy] = useState(false);

    const openConfirm = ({ title = "", message = "", onConfirm }) => {
      setConfirmState({ open: true, title, message, onConfirm });
    };

    const closeConfirm = () => {
      setConfirmState({ open: false, title: "", message: "", onConfirm: null });
    };

    const handleConfirm = async () => {
      const fn = confirmState.onConfirm;
      if (!fn) {
        closeConfirm();
        return;
      }

      try {
        setConfirmBusy(true);
        await fn();
        closeConfirm();
      } catch (e) {
        openConfirm({
          title: "Error",
          message: e?.message || "Action failed",
          onConfirm: null,
        });
      } finally {
        setConfirmBusy(false);
      }
    };

    const fetchLeaveCredits = async () => {
      try {
        const resp = await get("/leave/credits/me");
        const apiCredits = Array.isArray(resp?.data) ? resp.data : [];
        setLeaveCredits(apiCredits);
      } catch (e) {
        console.error("Failed to load leave credits:", e);
        setLeaveCredits([]);
      }
    };

    const fetchMyLeaves = async () => {
      try {
        setLoading(true);
        const resp = await get("/leave/requests/me");
        const apiRows = Array.isArray(resp?.data) ? resp.data : [];

        const mapped = apiRows.map((r) => ({
          leave_request_id: r.leave_request_id,
          id: r.employee_code || r.employee_id,
          name: r.employee_name || "",
          type: r.leave_type_name || "",
          leave_purpose: r.leave_purpose || null,
          date: formatRange(r.start_date, r.end_date),
          dateRequested: formatDateShort(r.created_at),
          status: r.status || "PENDING",
          position: r.position_title || "",
          reason: r.reason || "",
          updated_by: r.updated_by_name || r.updated_by || "",
          updated_at: r.updated_at || r.created_at,
        }));

        setRows(mapped);
      } catch (e) {
        console.error("Failed to load leave requests:", e);
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      fetchMyLeaves();
      fetchLeaveCredits();
    }, []);

    const handleCancelRequest = (row) => {
      if (!row?.leave_request_id) return;

      // check if request can be cancelled
      const status = String(row.status || "").toUpperCase();
      if (status !== "PENDING" && status !== "APPROVED") {
        openConfirm({
          title: "Cannot Cancel",
          message: "Only pending or approved leave requests can be cancelled.",
          onConfirm: null,
        });
        return;
      }

      const computeDays = (r) => {
        try {
          if (!r?.date) return null;
          const parts = String(r.date).split(" - ");
          if (parts.length === 2) {
            const start = new Date(parts[0]);
            const end = new Date(parts[1]);
            const diffTime = Math.abs(end - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            return diffDays;
          }
          return 1;
        } catch {
          return null;
        }
      };

      const days = computeDays(row);

      openConfirm({
        title: "Confirm Cancellation",
        message: `Are you sure you want to cancel this ${row.type} request?${
          days ? `\n\nThis request is for ${days} day${days !== 1 ? "s" : ""}.` : ""
        }\n\nCancelling may restore your leave credits.`,
        onConfirm: async () => {
          try {
            await put(`/leave/requests/${row.leave_request_id}/cancel`, {});

            // refresh data
            await fetchMyLeaves();
            await fetchLeaveCredits();

            // close details modal
            setShowViewDetails(false);

            // show success
            openConfirm({
              title: "Success",
              message: "Leave request cancelled successfully.",
              onConfirm: null,
            });
          } catch (e) {
            console.error("Failed to cancel leave request:", e);
            openConfirm({
              title: "Error",
              message: e?.message || "Failed to cancel leave request",
              onConfirm: null,
            });
          }
        },
      });
    };

    // REACT PAGINATE
    const [itemOffset, setItemOffset] = useState(0);
    const itemsPerPage = 5;

    const endOffset = itemOffset + itemsPerPage;
    const currentRows = rows.slice(itemOffset, endOffset);
    const pageCount = Math.ceil(rows.length / itemsPerPage);
    const currentPage = Math.floor(itemOffset / itemsPerPage) + 1;
    const multiPages = pageCount > 1;

    const handlePageClick = (event) => {
    const newOffset = event.selected * itemsPerPage;
    setItemOffset(newOffset);
    };

    const getLeaveBalance = (leaveTypeName) => {
      const credit = leaveCredits.find((c) =>
        String(c.leave_type_name || "").toLowerCase().includes(leaveTypeName.toLowerCase())
      );
      return credit ? credit.current_balance : 0;
    };

    const silBalance = useMemo(() => getLeaveBalance("service incentive"), [leaveCredits]);
    const lwpBalance = useMemo(() => getLeaveBalance("without pay"), [leaveCredits]);
    const maternityBalance = useMemo(() => getLeaveBalance("maternity"), [leaveCredits]);
    const paternityBalance = useMemo(() => getLeaveBalance("paternity"), [leaveCredits]);
    const vawcBalance = useMemo(() => getLeaveBalance("vawc"), [leaveCredits]);
    const soloParentBalance = useMemo(() => getLeaveBalance("solo parent"), [leaveCredits]);
    const womenBalance = useMemo(() => getLeaveBalance("women"), [leaveCredits]);


  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#990100] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading My Leaves...</p>
        </div>
      </div>
    );
  }

    return (
        <div>
            <div className="p-7 lg:mx-18 md:mx-10">
                <div className="md:flex justify-between items-center w-full">
                    <div className="">
                        <h1 className="lg:text-3xl text-2xl text-[#990100] font-bold md:mb-0 mb-5">
                            My Leaves
                        </h1>
                    </div>
                </div>

                <hr className="text-[#990100] my-6 " />

                <div className="flex justify-end mb-6">
                    <button
                        className="generate-report-button font-medium"
                        onClick={() => setShowRequestLeave(true)}
                    >
                        Request Leave
                    </button>
                </div>

                {/* ALL LEAVE FOR AN EMPLOYEE */}

                <div className="border border-gray-300 p-5 rounded-lg shadow-md overflow-y-auto">
                    <div className="flex items-center justify-between">
                        <div className="">
                            <h2 className="text-[#990100] md:text-2xl text-xl">All Leaves</h2>
                            <p className="text-xs text-gray-400">Click the boxes to know the requirements or how each leave works.</p>
                        </div>
                        
                        <button 
                            className="text-[#990100] hover:underline"
                            onClick={() => setShowLeaves(!showLeaves)}
                        >
                            {showLeaves ? 'Hide' : 'Show All'}
                        </button>
                    </div>

                    <div className="px-4 pt-4 ">
                        
                        <div className="grid lg:grid-cols-4 md:grid-cols-2 grid-cols-1 gap-4">
                            <StatCard
                                title="Leave without Pay"
                                value="-"
                                color = "#FE7F2D"
                                onClick={() => setShowPayWOLeave(true)}
                            />
                            <StatCard
                                title="Service Incentive Leave"
                                value={silBalance || 0}
                                color = "#7ADAA5"
                                onClick={() => setShowSIL(true)}
                            />
                            <StatCard
                                title="Maternity Leave"
                                value={maternityBalance > 0 ? maternityBalance : "By request"}
                                color = "#FF0087"
                                onClick={() => setShowMaternity(true)}
                            />
                            <StatCard
                                title="Paternity Leave"
                                value={paternityBalance > 0 ? paternityBalance : "By request"}
                                color = "#3F9AAE"
                                onClick={() => setShowPaternity(true)}
                            />
                        </div>

                    </div>

                    <div  className={`overflow-hidden transition-all duration-300 ${showLeaves ? "max-h-auto pt-4 px-4 pb-4 " : "max-h-0"}`}>
                        <div className="grid lg:grid-cols-4 md:grid-cols-2 grid-cols-1 gap-4">
                            <StatCard
                                title="VAWC Leave"
                                value={vawcBalance > 0 ? vawcBalance : "By request"}
                                color = "#B45253"
                                onClick={() => setShowVAWC(true)}
                            />
                            <StatCard
                                title="Parental Leave for Solo Parents"
                                value={soloParentBalance > 0 ? soloParentBalance : "By request"}
                                color = "#8AA624"
                                onClick={() => setShowSoloParent(true)}
                            />
                            <StatCard
                                title="Special Leave Benefits for Women"
                                value={womenBalance > 0 ? womenBalance : "By request"}
                                color = "#A376A2"
                                onClick={() => setShowWomenLeave(true)}
                            />
                        </div>

                    </div>
                </div>

                {/* LEAVE HISTORY */}

                <div className="div-table shadow-md md:mt-8 mt-5">
                    <table className="table-style">
                        <thead className="thead-style">
                            <tr>
                                <th className="th-style rounded-tl-lg rounded-bl-lg">Employee ID</th>
                                <th className="th-style">Name</th>
                                <th className="th-style">Leave Type</th>
                                <th className="th-style">Date</th>
                                <th className="th-style">Status</th>
                                <th className="th-style rounded-tr-lg rounded-br-lg">Actions</th>
                            </tr>
                        </thead>
                        
                        <tbody className="tbody-style">
                        {loading ? (
                            <tr>
                            <td colSpan="6" className="td-style text-center text-gray-400">
                              Loading...
                            </td>
                            </tr>
                        ) : currentRows.length === 0 ? (
                            <tr>
                            <td colSpan="6" className="td-style text-center text-gray-400">
                                No records found
                            </td>
                            </tr>
                        ) : (
                            currentRows.map((row, index) => (
                            <tr key={row.leave_request_id || index} className="tr-style">
                                <td className="td-style font-medium">{row.id}</td>
                                <td className="td-style font-medium">{row.name}</td>
                                <td className="td-style font-medium">{row.type}</td>
                                <td className="td-style font-medium">{row.date}</td>
                                <td className="td-style font-medium">
                                <StatusPill status={row.status} />
                                </td>
                                <td className="td-style">
                                <button
                                    type="button"
                                    className="bg-[#990100] text-white text-sm px-4 py-[5px] rounded-lg hover:bg-[#ad3332]"
                                    onClick={() => setShowViewDetails(row)}
                                >
                                    View Details
                                </button>
                                </td>
                            </tr>
                            ))
                        )}
                        </tbody>
                    </table>

                    <br />

                    <div className="lg:flex items-center lg:justify-between">
                        <p className="lg:text-md text-sm">
                            Showing <b>{currentRows.length}</b> of <b>{rows.length}</b> record
                            {rows.length !== 1 ? "s" : ""}
                            {pageCount ? (
                                <>
                                {" "} | Page <b>{currentPage}</b> of <b>{pageCount}</b>
                                </>
                            ) : null}
                        </p>
            
                        {pageCount > 0 && (
                            <ReactPaginate
                            breakLabel="..."
                            nextLabel=">"
                            onPageChange={handlePageClick}
                            pageRangeDisplayed={2}
                            pageCount={pageCount}
                            forcePage={Math.floor(itemOffset / itemsPerPage)}
                            previousLabel="<"
                            renderOnZeroPageCount={null}
                            marginPagesDisplayed={2}
                            pageClassName=""
                            pageLinkClassName="cursor-pointer hover:text-gray-500 hover:underline"
                            previousClassName={
                                multiPages
                                ? "cursor-pointer hover:text-gray-500 hover:underline"
                                : "text-gray-400 cursor-not-allowed pointer-events-none"
                            }
                            previousLinkClassName="page-link"
                            nextClassName={
                                multiPages
                                ? "cursor-pointer hover:text-gray-500 hover:underline"
                                : "text-gray-400 cursor-not-allowed pointer-events-none"
                            }
                            nextLinkClassName="page-link"
                            breakClassName="page-item"
                            breakLinkClassName="page-link"
                            containerClassName="flex items-center space-x-2 lg:pt-0 pt-4 text-[#990100]"
                            activeClassName="underline font-medium"
                            />
                        )}
                    </div>
                </div>
            </div>

        {/* CALLING THE MODALS ABOVE */}

        {showRequestLeave && (
          <RequestLeave
            onClose={() => setShowRequestLeave(false)}
            onSuccess={() => {
              fetchMyLeaves();
              fetchLeaveCredits();
              setShowRequestLeave(false);
            }}
            leaveCredits={leaveCredits}
          />
        )}
        {showPayWOLeave && ( <LeaveWOPay onClose={() => setShowPayWOLeave(false)} /> )}
        {showSIL && ( <SIL onClose={() => setShowSIL(false)} /> )}
        {showMaternity && ( <MaternityLeave onClose={() => setShowMaternity(false)} /> )}
        {showPaternity && ( <PaternityLeave onClose={() => setShowPaternity(false)} /> )}
        {showVAWC && ( <VAWC onClose={() => setShowVAWC(false)} /> )}
        {showSoloParent && ( <SoloParents onClose={() => setShowSoloParent(false)} /> )}
        {showWomenLeave && ( <WomenLeave onClose={() => setShowWomenLeave(false)} /> )}    
        {showViewDetails && (
          <ViewDetails
            data={showViewDetails}
            onClose={() => setShowViewDetails(null)}
            onCancel={handleCancelRequest}
          />
        )}

        <ConfirmModal
          open={confirmState.open}
          title={confirmState.title}
          message={confirmState.message}
          confirmText={confirmBusy ? "Processing…" : "OK"}
          cancelText={confirmState.onConfirm ? "Cancel" : null}
          onConfirm={handleConfirm}
          onCancel={closeConfirm}
          confirmDisabled={confirmBusy}
        />
        </div>
    )
}

export default MyLeaves;