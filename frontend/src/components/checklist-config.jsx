import React, { useState, useEffect } from 'react';
import { get, put } from '../services/api';

function ChecklistConfig({ employeeId, employeeName, onClose, onUpdate }) {
	const [checklist, setChecklist] = useState([]);
	const [originalChecklist, setOriginalChecklist] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (employeeId) {
			fetchChecklist();
		}
	}, [employeeId]);

	const fetchChecklist = async () => {
		try {
			setLoading(true);
			setError(null);
			const response = await get(`/onboarding/employee/${employeeId}/checklist`);
			if (response.success) {
				setChecklist(response.data);
				setOriginalChecklist(response.data);
			}
		} catch (err) {
			setError(err.message || 'Failed to fetch checklist');
			console.error('Failed to fetch checklist:', err);
		} finally {
			setLoading(false);
		}
	};

	const handleToggleRequired = (checklistItem) => {
		setChecklist(prev => prev.map(item =>
			item.id === checklistItem.id
				? { ...item, is_required: !item.is_required }
				: item
		));
	};

	const hasUnsavedChanges = () => {
		return checklist.some((item, index) =>
			item.is_required !== originalChecklist[index]?.is_required
		);
	};

	const handleSaveChanges = async () => {
		try {
			setSaving(true);

			// Find all items that have changed
			const changedItems = checklist.filter((item, index) =>
				item.is_required !== originalChecklist[index]?.is_required
			);

			if (changedItems.length === 0) {
				alert('No changes to save');
				return;
			}

			// update all changed items
			const updatePromises = changedItems.map(item =>
				put(`/onboarding/checklist/${item.id}`, {
					is_required: item.is_required
				})
			);

			await Promise.all(updatePromises);

			alert(`Successfully updated ${changedItems.length} checklist item(s)`);

			// update original checklist to match current state
			setOriginalChecklist([...checklist]);

			if (onUpdate) {
				onUpdate();
			}
		} catch (err) {
			console.error('Failed to update checklist:', err);
			alert(err.message || 'Failed to save changes');
		} finally {
			setSaving(false);
		}
	};

	const handleCancel = () => {
		if (hasUnsavedChanges()) {
			const confirmDiscard = window.confirm('You have unsaved changes. Discard them?');
			if (!confirmDiscard) return;
		}
		onClose();
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center py-12">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#990100] mx-auto mb-4"></div>
					<p className="text-gray-600">Loading checklist...</p>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="bg-red-50 border border-red-200 rounded-lg p-6">
				<p className="text-red-600 mb-4">{error}</p>
				<button onClick={fetchChecklist} className="bg-[#990100] text-white px-4 py-2 rounded-lg hover:bg-[#7a0100] transition">
					Retry
				</button>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{/* Header */}
			<div className="flex items-center justify-between mb-4">
				<div>
					<h2 className="text-xl font-bold text-[#990100]">
						Configure Checklist Requirements
					</h2>
					{employeeName && (
						<p className="text-sm text-gray-600 mt-1">
							Employee: <span className="font-medium">{employeeName}</span>
						</p>
					)}
				</div>
				{onClose && (
					<button onClick={handleCancel} className="text-gray-500 hover:text-gray-700 transition" disabled={saving}>
						<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				)}
			</div>

			{/* Unsaved Changes Warning */}
			{hasUnsavedChanges() && (
				<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
					<p className="text-sm text-yellow-800 font-medium">
						You have unsaved changes
					</p>
				</div>
			)}

			{/* Checklist Items */}
			<div className="space-y-2">
				{checklist.length === 0 ? (
					<div className="text-center py-8 text-gray-500">
						No checklist items found
					</div>
				) : (
					checklist.map((item) => (
						<div key={item.id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition">
							<div className="flex-1">
								<p className="font-medium text-gray-800">
									{item.onboarding_items?.item_name || 'Unknown Document'}
								</p>
								{item.status && (
									<p className="text-sm text-gray-500 mt-1">
										Status: <span className="capitalize">{item.status}</span>
									</p>
								)}
							</div>

							{/* Toggle Switch */}
							<div className="flex items-center gap-3">
								<span className={`text-sm font-medium ${item.is_required ? 'text-[#990100]' : 'text-gray-500'}`}>
									{item.is_required ? 'Required' : 'Optional'}
								</span>
								<button
									onClick={() => handleToggleRequired(item)}
									disabled={saving}
									className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#990100] focus:ring-offset-2 ${
										saving
											? 'opacity-50 cursor-not-allowed'
											: 'cursor-pointer'
									} ${
										item.is_required ? 'bg-[#990100]' : 'bg-gray-300'
									}`}
								>
									<span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
											item.is_required ? 'translate-x-6' : 'translate-x-1'
										}`}
									/>
								</button>
							</div>
						</div>
					))
				)}
			</div>

			{/* Summary */}
			<div className="border-t border-gray-200 pt-4 mt-4">
				<div className="grid grid-cols-2 gap-4 text-sm mb-4">
					<div>
						<span className="text-gray-600">Total Items:</span>{' '}
						<span className="font-semibold">{checklist.length}</span>
					</div>
					<div>
						<span className="text-gray-600">Required:</span>{' '}
						<span className="font-semibold text-[#990100]">
							{checklist.filter(item => item.is_required).length}
						</span>
					</div>
				</div>

				{/* Action Buttons */}
				<div className="flex gap-3">
					<button
						onClick={handleSaveChanges}
						disabled={saving || !hasUnsavedChanges()}
						className={`flex-1 px-4 py-2 rounded-lg font-medium text-white transition ${
							saving || !hasUnsavedChanges()
								? 'bg-gray-400 cursor-not-allowed'
								: 'bg-[#990100] hover:bg-[#7a0100] hover:scale-105'
						}`}
					>
						{saving ? 'Saving...' : 'Save Changes'}
					</button>
					<button
						onClick={handleCancel}
						disabled={saving}
						className="px-4 py-2 rounded-lg font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{hasUnsavedChanges() ? 'Cancel' : 'Close'}
					</button>
				</div>
			</div>
		</div>
	);
}

export default ChecklistConfig;
