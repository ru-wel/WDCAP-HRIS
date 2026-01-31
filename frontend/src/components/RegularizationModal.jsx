import React, { useState, useEffect } from 'react';

function RegularizationModal({ open, onClose, employee, onRegularize, fromPersonnelType = 'Probationary' }) {
  const [regularizationDate, setRegularizationDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // YYYY-MM-DD format
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      const today = new Date();
      setRegularizationDate(today.toISOString().split('T')[0]);
      setError('');
    }
  }, [open]);

  const handleRegularize = async () => {
    if (!regularizationDate) {
      setError('Please select a regularization date');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await onRegularize({
        employeeId: employee?.id,
        regularizationDate,
      });
    } catch (e) {
      setError(e?.message || 'Failed to regularize employee');
      setLoading(false);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  if (!open) return null;

  const employeeName = employee?.name || 'Employee';
  const employeeCode = employee?.employeeCode || employee?.employee_id || '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true" aria-label="Regularize Employee">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3 bg-[#990100] flex items-center justify-between gap-3">
          <h2 className="text-white text-base font-semibold tracking-wide">
            Regularize Employee
          </h2>
          <button type="button" onClick={handleSkip} disabled={loading} className="text-white/90 hover:text-white text-sm font-medium disabled:opacity-50" >
            Close
          </button>
        </div>

        <div className="px-5 py-5">
          {/* Success message */}
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-800 font-medium">
              ✓ {fromPersonnelType} Evaluation Submitted Successfully
            </p>
          </div>

          {/* Info */}
          <p className="text-sm text-gray-700 mb-4">
            This employee has completed their {fromPersonnelType.toLowerCase()} evaluation.
            Would you like to convert <strong>{employeeName}</strong> ({employeeCode}) to a Regular employee now?
          </p>

          {/* Employee details */}
          <div className="mb-5 p-3 bg-gray-50 rounded-md border border-gray-200">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="font-semibold text-gray-600">Employee ID:</span>
                <p className="text-gray-800">{employeeCode}</p>
              </div>
              <div>
                <span className="font-semibold text-gray-600">Name:</span>
                <p className="text-gray-800">{employeeName}</p>
              </div>
              {employee?.position && (
                <div className="col-span-2">
                  <span className="font-semibold text-gray-600">Position:</span>
                  <p className="text-gray-800">{employee.position}</p>
                </div>
              )}
            </div>
          </div>

          {/* Date picker */}
          <div className="mb-5">
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              Regularization Date <span className="text-red-600">*</span>
            </label>
            <input type="date" value={regularizationDate} onChange={(e) => setRegularizationDate(e.target.value)} disabled={loading} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#990100] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"/>
            <p className="text-xs text-gray-500 mt-1">
              This date will be recorded as the employee's regularization date.
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3">
            <button type="button" onClick={handleSkip} disabled={loading} className="px-4 py-2 rounded-md text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed">
              Skip for Now
            </button>
            <button type="button" onClick={handleRegularize} disabled={loading || !regularizationDate} className="px-5 py-2 rounded-md text-sm font-medium text-white bg-[#990100] hover:bg-[#ad3332] transition disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? 'Regularizing...' : 'Regularize Now'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RegularizationModal;
