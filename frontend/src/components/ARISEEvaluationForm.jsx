import React from 'react';
import { ARISE_FORM_ITEMS } from '../constants/ariseFormData.js';

export default function ARISEEvaluationForm({
  formScores,
  setItemScore,
  totalScore,
  totalPossible,
  percentage,
  rating,
  isReliable,
  setIsReliable,
  memo,
  setMemo,
  showFormSection,
  setShowFormSection
}) {
  const renderFormSection = (section) => (
    <div key={section.id} className="border-t pt-6">
      <h4 className="font-bold text-gray-900 mb-4 text-base">{section.title}</h4>
      <div className="space-y-3">
        {section.items.map((item) => (
          <div key={item.number} className="border border-gray-300 rounded p-3 bg-white">
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-800 mb-2">
                  {item.number}. {item.text}
                </label>
              </div>
              <div className="w-32">
                <select
                  className="input-select w-full"
                  value={formScores[`item_${item.number}`] || '3'}
                  onChange={(e) => setItemScore(item.number, e.target.value)}
                >
                  {ARISE_FORM_ITEMS.scoringScale.map((scale) => (
                    <option key={scale.value} value={scale.value}>
                      {scale.tagalog} ({scale.value})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="mt-8 bg-gray-50 rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-[#990100]">ARISE Performance Evaluation Form</h3>
        <button
          type="button"
          className="text-sm text-[#990100] font-medium hover:underline"
          onClick={() => setShowFormSection(!showFormSection)}
        >
          {showFormSection ? 'Hide' : 'Show'} Form
        </button>
      </div>

      {showFormSection && (
        <div className="space-y-6">
          {/* Alituntunin (Scoring Guidelines) */}
          <div className="border border-gray-300 rounded bg-white p-4">
            <div className="text-sm font-semibold text-gray-900 mb-3">Alituntunin:</div>
            <div className="space-y-2">
              {(ARISE_FORM_ITEMS.scoringGuidelines || []).map((g) => (
                <div key={g.value} className="text-xs text-gray-800">
                  <span className="font-bold">{g.value} {g.title}</span> - {g.text}
                </div>
              ))}
            </div>
          </div>

          {/* Form Sections */}
          {ARISE_FORM_ITEMS.sections.map((section) => renderFormSection(section))}

          {/* Summary Section */}
          <div className="border-t pt-6 bg-white rounded p-4 border border-gray-300">
            <h4 className="font-bold text-gray-900 mb-4">Performance Summary</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 bg-gray-100 p-4 rounded">
              <div>
                <div className="text-xs font-semibold text-gray-600">Sub-total:</div>
                <div className="text-2xl font-bold text-[#990100]">{totalScore}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-600">Total Possible:</div>
                <div className="text-2xl font-bold text-gray-700">{totalPossible}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-600">Percentage:</div>
                <div className="text-2xl font-bold text-gray-700">{percentage}%</div>
              </div>
            </div>

            <div className="mb-6 p-4 border border-gray-300 rounded bg-blue-50">
              <label className="block text-sm font-medium text-gray-800 mb-3">
                {ARISE_FORM_ITEMS.summaryFields.reliable}
              </label>
              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4 sm:gap-6">
                {(ARISE_FORM_ITEMS.summaryFields.reliableOptions || []).map((option) => (
                  <label key={option} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="employment_status"
                      value={option}
                      checked={isReliable === option}
                      onChange={(e) => setIsReliable(e.target.value)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-800">{option}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mb-6 p-4 border border-gray-300 rounded bg-yellow-50">
              <label className="block text-sm font-medium text-gray-800 mb-2 font-bold">
                Performance Rating: {rating?.range}
              </label>
              <p className="text-xs text-gray-700 italic">{rating?.tagalog}</p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-800 mb-2 font-bold">
                Komento / Rekomendasyon / Pagpapaunlad:
              </label>
              <textarea
                className="input-select w-full h-32"
                placeholder="Enter comments, recommendations..."
                value={memo}
                onChange={(e) => setMemo(e.target.value.slice(0, 500))}
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">{memo.length}/500 characters</p>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
