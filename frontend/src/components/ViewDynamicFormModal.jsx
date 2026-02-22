import React from 'react';
import { ARISE_FORM_ITEMS } from '../constants/ariseFormData.js';

function ViewDynamicFormModal({ open, onClose, formData, employeeName, evaluationType, evaluationDate, template }) {
  if (!open || !formData) return null;

  const isLegacy = !template;

  const items = formData?.items || {};
  const totalScore = formData?.total_score || 0;
  const totalPossible = formData?.total_possible || 0;
  const percentage = formData?.percentage || 0;
  const ratingRange = formData?.performance_rating || '';
  const ratingDescription = formData?.performance_description || '';
  const isReliable = formData?.is_reliable || '';
  const memo = formData?.memo || '';

  const scoringScale = isLegacy
    ? ARISE_FORM_ITEMS.scoringScale
    : (template.scoring_scale || []);

  const scoringGuidelines = isLegacy
    ? ARISE_FORM_ITEMS.scoringGuidelines
    : (template.scoring_scale || []);

  const sections = isLegacy
    ? ARISE_FORM_ITEMS.sections
    : (template.evaluation_template_sections || []);

  const getScoreLabel = (score) => {
    const val = parseInt(score);
    const match = scoringScale.find(s => s.value === val);
    if (!match) return score;
    return `${match.tagalog || match.label} (${val})`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const getItemScoreKey = (section, item) => {
    if (isLegacy) return `item_${item.number}`;
    return `s${section.section_number}_i${item.item_number}`;
  };

  const templateName = isLegacy
    ? 'ARISE Performance Evaluation Form'
    : (template.name || 'Performance Evaluation Form');

  let globalItemNumber = 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-4" role="dialog" aria-modal="true" aria-label="View Evaluation Form" data-lenis-prevent>
      <div className="w-full max-w-5xl h-[90vh] rounded-2xl bg-white shadow-xl border border-gray-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-3 bg-[#990100] flex items-center justify-between gap-3 flex-shrink-0 m-4 rounded-lg">
          <h2 className="text-white text-base font-semibold tracking-wide">
            {templateName} - {employeeName}
          </h2>
          <button type="button" onClick={onClose} className="text-white/90 hover:text-white text-2xl font-bold leading-none">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 overflow-y-auto flex-1 min-h-0 bg-gray-50" data-lenis-prevent>
          {/* Evaluation Info */}
          <div className="mb-4 p-3 bg-white rounded border border-gray-200">
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <span className="font-semibold text-gray-600">Employee:</span>
                <p className="text-gray-800">{employeeName}</p>
              </div>
              <div>
                <span className="font-semibold text-gray-600">Evaluation Type:</span>
                <p className="text-gray-800">{evaluationType}</p>
              </div>
              <div>
                <span className="font-semibold text-gray-600">Date:</span>
                <p className="text-gray-800">{formatDate(evaluationDate)}</p>
              </div>
            </div>
          </div>

          {/* Scoring Guidelines */}
          {scoringGuidelines.length > 0 && (
            <div className="border border-gray-300 rounded bg-white p-4 mb-6">
              <div className="text-sm font-semibold text-gray-900 mb-3">Alituntunin:</div>
              <div className="space-y-2">
                {scoringGuidelines.map((g) => (
                  <div key={g.value} className="text-xs text-gray-800">
                    <span className="font-bold">{g.value} {g.title || g.label}</span>
                    {(g.text || g.description) && <> - {g.text || g.description}</>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sections + Items */}
          <div className="space-y-6">
            {sections.map((section) => {
              const sectionItems = isLegacy
                ? (section.items || [])
                : (section.evaluation_template_items || []);

              return (
                <div key={section.id} className="border-t pt-6">
                  <h4 className="font-bold text-gray-900 mb-4 text-base">{section.title}</h4>
                  <div className="space-y-3">
                    {sectionItems.map((item) => {
                      globalItemNumber++;
                      const scoreKey = getItemScoreKey(section, item);
                      const itemScore = items[scoreKey] || 0;
                      const questionText = isLegacy ? item.text : item.question_text;

                      return (
                        <div key={item.id || item.number || globalItemNumber} className="border border-gray-300 rounded p-3 bg-white">
                          <div className="flex gap-4 items-start">
                            <div className="flex-1">
                              <label className="block text-sm font-medium text-gray-800">
                                {globalItemNumber}. {questionText}
                              </label>
                            </div>
                            <div className="w-48">
                              <div className="input-select w-full bg-gray-100 cursor-not-allowed">
                                {getScoreLabel(itemScore)}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary Section */}
          <div className="border-t pt-6 mt-6 bg-white rounded p-4 border border-gray-300">
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

            {/* Employment Continuation */}
            {isReliable && (
              <div className="mb-6 p-4 border border-gray-300 rounded bg-blue-50">
                <label className="block text-sm font-medium text-gray-800 mb-3">
                  Itutuloy ba ang employment? (Bilugan, i-shade o i-tsek ang kasagutan)
                </label>
                <div className="flex flex-wrap gap-6">
                  {['Oo itutuloy', 'Hindi na Itutuloy'].map((option) => (
                    <label key={option} className="flex items-center gap-2">
                      <input type="radio" name="employment_status_view" value={option} checked={isReliable === option} disabled className="w-4 h-4" />
                      <span className="text-sm text-gray-800">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Performance Rating */}
            {ratingRange && (
              <div className="mb-6 p-4 border border-gray-300 rounded bg-yellow-50">
                <label className="block text-sm font-medium text-gray-800 mb-2 font-bold">
                  Performance Rating: {ratingRange}
                </label>
                <p className="text-xs text-gray-700 italic">{ratingDescription}</p>
              </div>
            )}

            {/* Comments */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-800 mb-2 font-bold">
                Komento / Rekomendasyon / Pagpapaunlad:
              </label>
              <div className="input-select w-full min-h-32 bg-gray-100 cursor-not-allowed whitespace-pre-wrap">
                {memo || '—'}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-200 flex justify-end flex-shrink-0 bg-white">
          <button type="button" onClick={onClose} className="px-6 py-2 rounded-md text-sm font-medium text-white bg-[#990100] hover:bg-[#ad3332] transition">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default ViewDynamicFormModal;
