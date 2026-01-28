import React, { useState, useEffect } from 'react';
import { get, upload } from '../../../services/api';
import { ONBOARDING_STATUSES, STORAGE_KEYS } from '../../../constants/config.js';
import Navbar from '../../../components/navbar.jsx';
import ConfirmModal from '../../../components/confirm-modal.jsx';

function MyDocuments() {

	// PAGE TITLE
	useEffect(() => {
	document.title = "ARISE | MY DOCUMENTS"; 
	}, []);

	const [checklist, setChecklist] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [uploadingDocId, setUploadingDocId] = useState(null);

	// modal state
	const [confirmState, setConfirmState] = useState({
		open: false,
		title: 'Success',
		message: '',
		confirmText: 'OK',
		cancelText: null,
		onConfirmAction: null,
	});

	const openConfirm = ({ title = 'Success', message = '', onConfirmAction = null } = {}) => {
		setConfirmState({
			open: true,
			title,
			message,
			confirmText: 'OK',
			cancelText: null,
			onConfirmAction,
		});
	};

	const closeConfirm = () => {
		setConfirmState((prev) => ({ ...prev, open: false }));
	};

	const handleConfirm = async () => {
		const action = confirmState.onConfirmAction;
		closeConfirm(); // Close modal immediately

		if (action) {
			await action(); // Then execute the action in background
		}
	};

	useEffect(() => {
		fetchMyChecklist();
	}, []);

	const fetchMyChecklist = async () => {
		try {
			setLoading(true);
			setError(null);

			// get current user info from localStorage
			const userStr = localStorage.getItem(STORAGE_KEYS.USER);
			if (!userStr) {
				throw new Error('User not logged in');
			}

			const user = JSON.parse(userStr);
			const employeeId = user.employee_db_id || user.id; // get the employee ID from user object

			if (!employeeId) {
				throw new Error('No employee record found for current user');
			}

			// fetch checklist using employee ID
			const response = await get(`/onboarding/employee/${employeeId}/checklist`);

			if (response.success) {
				setChecklist(response.data);
			}
		} catch (err) {
			setError(err.message || 'Failed to fetch your checklist');
			console.error('Failed to fetch checklist:', err);
		} finally {
			setLoading(false);
		}
	};

	const handleFileUpload = async (checklistItem, file) => {
		if (!file) return;

		try {
			setUploadingDocId(checklistItem.id);

			// get employee ID from localStorage
			const userStr = localStorage.getItem(STORAGE_KEYS.USER);
			const user = JSON.parse(userStr);
			const employeeId = user.employee_db_id || user.id; // get employee ID from user object

			if (!employeeId) {
				throw new Error('No employee record found for current user');
			}

			const formData = new FormData();
			formData.append('file', file);
			formData.append('employee_id', employeeId);
			formData.append('document_name', checklistItem.onboarding_items.item_name);
			formData.append('checklist_item_id', checklistItem.id);

			// upload file
			const response = await upload('/documents/upload', formData);

			if (response.success) {
				// show success modal first, then refresh after user clicks OK
			openConfirm({
				title: 'Upload Successful',
				message: `${checklistItem.onboarding_items.item_name} uploaded successfully!`,
				onConfirmAction: async () => {
					await fetchMyChecklist();
				}
			});
			}
		} catch (error) {
			console.error('Upload error:', error);
			openConfirm({
				title: 'Upload Failed',
				message: error.message || 'Failed to upload document'
			});
		} finally {
			setUploadingDocId(null);
		}
	};

	const handleDownload = async (documentId, fileName) => {
		if (!documentId) {
			openConfirm({
				title: 'Download Failed',
				message: 'No document available to download'
			});
			return;
		}

		try {
			setLoading(true);

			const response = await get(`/documents/${documentId}/download`);

			if (response.success && response.data.signedUrl) {
				// open download URL in new tab
				window.open(response.data.signedUrl, '_blank');
			} else {
				openConfirm({
					title: 'Download Failed',
					message: 'Failed to generate download link'
				});
			}
		} catch (error) {
			console.error('Download error:', error);
			openConfirm({
				title: 'Download Failed',
				message: error.message || 'Failed to download document'
			});
		} finally {
			setLoading(false);
		}
	};

	// STATUS PILLS STYLES
	const getStatusBadge = (status) => {
		const statusConfig = {
			[ONBOARDING_STATUSES.PENDING]: {
				bg: 'bg-gray-100',
				text: 'text-gray-700',
				border: 'border border-gray-300',
				label: 'Pending Upload'
			},
			[ONBOARDING_STATUSES.SUBMITTED]: {
				bg: 'bg-yellow-100',
				text: 'text-yellow-700',
				border: 'border border-yellow-300',
				label: 'Under Review'
			},
			[ONBOARDING_STATUSES.APPROVED]: {
				bg: 'bg-green-100',
				text: 'text-green-700',
				border: 'border border-green-300',
				label: 'Approved'
			},
			[ONBOARDING_STATUSES.REJECTED]: {
				bg: 'bg-red-100',
				text: 'text-red-700',
				border: 'border border-red-300',
				label: 'Rejected'
			}
		};

		const config = statusConfig[status] || statusConfig[ONBOARDING_STATUSES.PENDING];

		return (
			<span className={`iinline-flex min-w-fit px-3 py-1 whitespace-nowrap rounded-full text-xs font-semibold ${config.bg} ${config.text} ${config.border} whitespace-nowrap`}>
				{config.label}
			</span>
		);
	};

	const formatDate = (dateString) => {
		if (!dateString) return '-';
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	};

	if (loading) {
		return (
			<div>
				<Navbar />
				<div className="p-7 lg:mx-18 md:mx-10">
					<div className="flex items-center justify-center py-12">
						<div className="text-center">
							<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#990100] mx-auto mb-4"></div>
							<p className="text-lg text-gray-600">Loading your documents...</p>
						</div>
					</div>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div>
				<Navbar />
				<div className="p-7 lg:mx-18 md:mx-10">
					<div className="flex items-center justify-center py-12">
						<div className="text-center">
							<div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
								<p className="text-xl text-red-600 mb-4">Error: {error}</p>
								<button onClick={fetchMyChecklist} className="bg-[#990100] text-white px-6 py-2 rounded-lg hover:bg-[#7a0100] transition">
									Retry
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div>
			<Navbar />
			<div className="p-7 lg:mx-18 md:mx-10">
				{/* Header */}
				<div className="mb-6">
					<h1 className="lg:text-3xl text-2xl text-[#990100] font-bold md:mb-0 mb-5">My Onboarding Documents</h1>
					<hr className='text-[#990100] mt-6' />
				</div>

				{/* Documents List */}
				<div className="div-table">
					<table className="table-style">
						<thead className="thead-style">
							<tr>
								<th className="th-style rounded-tl-lg rounded-bl-lg">Document Name</th>
								<th className="th-style hidden md:table-cell">Required</th>
								<th className="th-style">Status</th>
								<th className="th-style">Current File</th>
								<th className="th-style">Submitted</th>
								<th className="th-style">Remarks</th>
								<th className="th-style rounded-tr-lg rounded-br-lg">Action</th>
							</tr>
						</thead>
						<tbody className="tbody-style">
							{checklist.length === 0 ? (
								<tr>
									<td colSpan="7" className="px-6 py-8 text-center text-gray-500">
										No documents found
									</td>
								</tr>
							) : (
								checklist.map((item) => (
									<tr key={item.id} className="tr-style">
										<td className="td-style">
											<div className="flex items-center justify-center">
												<span className="font-medium">
													{item.onboarding_items.item_name}
												</span>
												{item.is_required && (
													<span className="ml-2 text-red-500">*</span>
												)}
											</div>
										</td>
										<td className="td-style hidden md:table-cell">
											<span className={`${item.is_required ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
												{item.is_required ? 'Required' : 'Optional'}
											</span>
										</td>
										<td className="td-style">
											{getStatusBadge(item.status)}
										</td>
										<td className="td-style">
											{item.documents?.file_name ? (
												<button
													onClick={() => handleDownload(item.documents.id, item.documents.file_name)}
													disabled={loading}
													className="text-[#990100] hover:underline lg:text-sm text-xs disabled:opacity-50 disabled:cursor-not-allowed max-w-xs truncate cursor-pointer"
													title={`Click to download: ${item.documents.file_name}`}
												>
													{item.documents.file_name}
												</button>
											) : (
												<span className="text-gray-400 italic">No file uploaded</span>
											)}
										</td>
										<td className="td-style">
											{formatDate(item.submitted_at)}
										</td>
										<td className="td-style">
											{item.status === ONBOARDING_STATUSES.APPROVED ? (
												<p className="text-gray-600 font-medium">DONE!</p>
											) : item.remarks ? (
												<div>
													{item.status === ONBOARDING_STATUSES.REJECTED && (
														<p className="text-red-600 font-medium mb-1">Reason:</p>
													)}
													<p className={item.status === ONBOARDING_STATUSES.REJECTED ? 'text-red-600' : 'text-gray-600'}>
														{item.remarks}
													</p>
												</div>
											) : (
												<span className="text-gray-400">-</span>
											)}
										</td>
										<td className="td-style">
											{item.status === ONBOARDING_STATUSES.APPROVED ? (
												<span className="text-green-600 font-medium">✓ Approved</span>
											) : item.status === ONBOARDING_STATUSES.SUBMITTED ? (
												<span className="text-yellow-600 font-medium">Under Review</span>
											) : (
												<div>
													<input type="file" id={`file-${item.id}`} className="hidden"
														onChange={(e) => {
															const file = e.target.files[0];
															if (file) {
																handleFileUpload(item, file);
															}
														}}
														disabled={uploadingDocId === item.id}
														accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
													/>
													<label htmlFor={`file-${item.id}`}
														className={`inline-flex items-center px-4 py-[5px] border border-transparent lg:text-sm text-xs font-medium rounded-lg shadow-md text-white ${uploadingDocId === item.id
																? 'bg-gray-400 cursor-not-allowed'
																: 'bg-[#990100] hover:bg-[#ad3332] cursor-pointer hover:scale-105 transition duration-300 ease-in-out'
															}`}
													>
														{uploadingDocId === item.id ? (
															<>
																<svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
																	<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
																	<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
																</svg>
																Uploading...
															</>
														) : (
															<>
																{item.status === ONBOARDING_STATUSES.REJECTED ? 'Resubmit' : 'Upload'}
															</>
														)}
													</label>
												</div>
											)}
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>

			<ConfirmModal
				open={confirmState.open}
				title={confirmState.title}
				message={confirmState.message}
				confirmText={confirmState.confirmText}
				cancelText={confirmState.cancelText}
				onConfirm={handleConfirm}
				onCancel={closeConfirm}
			/>
		</div>
	);
}

export default MyDocuments;