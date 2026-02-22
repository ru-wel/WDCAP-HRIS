import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactPaginate from 'react-paginate';
import ConfirmModal from '../../components/confirm-modal.jsx';
import { del, get, post, put } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { compareText } from '../../utils/sort.js';
import { downloadTemplateSpreadsheet, parseTemplateSpreadsheet } from '../../utils/templateImport.js';
import { ARISE_FORM_ITEMS } from '../../constants/ariseFormData.js';

function ModalShell({ open, title, onClose, wide, children }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} data-lenis-prevent>
      <div className="absolute inset-0 bg-black/20 z-0" aria-hidden="true" />

      <div className={`relative ${wide ? 'max-w-4xl' : 'max-w-2xl'} w-full mx-4 bg-white rounded-lg shadow-xl border border-gray-300 z-10 max-h-[90vh] flex flex-col`}>
        <div className="p-4 sm:p-6 flex flex-col flex-1 min-h-0">
          <div className="rounded-lg bg-[#990100] flex items-center justify-between py-2 sm:py-3 px-3 sm:px-4 flex-shrink-0">
            <h1 className="text-white text-sm sm:text-base lg:text-lg font-medium">
              {title}
            </h1>
            <button type="button" onClick={onClose} className="text-white text-2xl font-bold hover:scale-110 transition cursor-pointer" aria-label="Close">
              &#10005;
            </button>
          </div>

          <div className="md:pt-6 pt-4 overflow-y-auto flex-1 min-h-0" data-lenis-prevent>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
};

const defaultScoringScale = () =>
  ARISE_FORM_ITEMS.scoringGuidelines.map((g) => ({
    value: g.value,
    label: g.title,
    description: g.text,
  }));

const defaultPerformanceRatings = () =>
  ARISE_FORM_ITEMS.performanceRating.map((r) => {
    const [min, max] = r.range.split('-').map(Number);
    return { min_score: min, max_score: max, label: r.tagalog, description: '' };
  });

const defaultSections = () =>
  ARISE_FORM_ITEMS.sections.map((sec) => ({
    _key: crypto.randomUUID(),
    section_number: sec.id,
    title: sec.title,
    description: '',
    items: sec.items.map((item) => ({
      _key: crypto.randomUUID(),
      item_number: item.number,
      question_text: item.text,
    })),
  }));

const blankSection = (num) => ({
  _key: crypto.randomUUID(),
  section_number: num,
  title: '',
  description: '',
  items: [{ _key: crypto.randomUUID(), item_number: 1, question_text: '' }],
});

const blankForm = () => ({
  name: '',
  description: '',
  scoring_scale: defaultScoringScale(),
  performance_ratings: defaultPerformanceRatings(),
  sections: defaultSections(),
});

function TemplateFormModal({ open, onClose, editingTemplate, importedData, onSaved, onSuccess, onError }) {
  const [form, setForm] = useState(blankForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (!open) {
      setIsDirty(false);
      return;
    }
    setError('');
    setSaving(false);

    if (editingTemplate) {
      const t = editingTemplate;
      setForm({
        name: t.name || '',
        description: t.description || '',
        scoring_scale: Array.isArray(t.scoring_scale) && t.scoring_scale.length ? t.scoring_scale : defaultScoringScale(),
        performance_ratings: Array.isArray(t.performance_ratings) && t.performance_ratings.length ? t.performance_ratings : defaultPerformanceRatings(),
        sections: (t.evaluation_template_sections || []).map((sec) => ({
          _key: sec.id || crypto.randomUUID(),
          id: sec.id,
          section_number: sec.section_number,
          title: sec.title || '',
          description: sec.description || '',
          items: (sec.evaluation_template_items || []).map((it) => ({
            _key: it.id || crypto.randomUUID(),
            id: it.id,
            item_number: it.item_number,
            question_text: it.question_text || '',
          })),
        })),
      });
      setIsDirty(false);
    } else if (importedData) {
      setForm({
        name: importedData.name || '',
        description: importedData.description || '',
        scoring_scale: importedData.scoring_scale || defaultScoringScale(),
        performance_ratings: importedData.performance_ratings || defaultPerformanceRatings(),
        sections: importedData.sections || [blankSection(1)],
      });
      setIsDirty(true);
    } else {
      setForm(blankForm());
      setIsDirty(false);
    }
  }, [open, editingTemplate, importedData]);

  const updateField = (field, value) => {
    setForm((p) => ({ ...p, [field]: value }));
    setIsDirty(true);
  };

  const updateScaleRow = (idx, field, value) => {
    setForm((p) => {
      const next = [...p.scoring_scale];
      next[idx] = { ...next[idx], [field]: field === 'value' ? Number(value) || 0 : value };
      return { ...p, scoring_scale: next };
    });
    setIsDirty(true);
  };
  const addScaleRow = () => {
    setForm((p) => ({ ...p, scoring_scale: [...p.scoring_scale, { value: 0, label: '', description: '' }] }));
    setIsDirty(true);
  };
  const removeScaleRow = (idx) => {
    setForm((p) => ({ ...p, scoring_scale: p.scoring_scale.filter((_, i) => i !== idx) }));
    setIsDirty(true);
  };

  const updateRatingRow = (idx, field, value) => {
    setForm((p) => {
      const next = [...p.performance_ratings];
      next[idx] = { ...next[idx], [field]: ['min_score', 'max_score'].includes(field) ? Number(value) || 0 : value };
      return { ...p, performance_ratings: next };
    });
    setIsDirty(true);
  };
  const addRatingRow = () => {
    setForm((p) => ({ ...p, performance_ratings: [...p.performance_ratings, { min_score: 0, max_score: 0, label: '', description: '' }] }));
    setIsDirty(true);
  };
  const removeRatingRow = (idx) => {
    setForm((p) => ({ ...p, performance_ratings: p.performance_ratings.filter((_, i) => i !== idx) }));
    setIsDirty(true);
  };

  const updateSection = (sIdx, field, value) => {
    setForm((p) => {
      const next = [...p.sections];
      next[sIdx] = { ...next[sIdx], [field]: value };
      return { ...p, sections: next };
    });
    setIsDirty(true);
  };
  const addSection = () => {
    setForm((p) => ({
      ...p,
      sections: [...p.sections, blankSection(p.sections.length + 1)],
    }));
    setIsDirty(true);
  };
  const removeSection = (sIdx) => {
    setForm((p) => {
      const next = p.sections.filter((_, i) => i !== sIdx).map((s, i) => ({ ...s, section_number: i + 1 }));
      return { ...p, sections: next };
    });
    setIsDirty(true);
  };

  const updateItem = (sIdx, iIdx, field, value) => {
    setForm((p) => {
      const sections = [...p.sections];
      const items = [...sections[sIdx].items];
      items[iIdx] = { ...items[iIdx], [field]: value };
      sections[sIdx] = { ...sections[sIdx], items };
      return { ...p, sections };
    });
    setIsDirty(true);
  };
  const addItem = (sIdx) => {
    setForm((p) => {
      const sections = [...p.sections];
      const items = [...sections[sIdx].items, { _key: crypto.randomUUID(), item_number: sections[sIdx].items.length + 1, question_text: '' }];
      sections[sIdx] = { ...sections[sIdx], items };
      return { ...p, sections };
    });
    setIsDirty(true);
  };
  const removeItem = (sIdx, iIdx) => {
    setForm((p) => {
      const sections = [...p.sections];
      const items = sections[sIdx].items.filter((_, i) => i !== iIdx).map((it, i) => ({ ...it, item_number: i + 1 }));
      sections[sIdx] = { ...sections[sIdx], items };
      return { ...p, sections };
    });
    setIsDirty(true);
  };

  const validate = () => {
    if (!form.name.trim()) return 'Template name is required.';
    if (form.scoring_scale.length === 0) return 'At least one scoring scale entry is required.';
    for (const s of form.scoring_scale) {
      if (!s.label.trim()) return 'All scoring scale entries need a label.';
    }
    if (form.performance_ratings.length === 0) return 'At least one performance rating is required.';
    for (const r of form.performance_ratings) {
      if (!r.label.trim()) return 'All performance rating entries need a label.';
    }
    if (form.sections.length === 0) return 'At least one section is required.';
    for (const sec of form.sections) {
      if (!sec.title.trim()) return `Section ${sec.section_number} needs a title.`;
      if (!sec.items || sec.items.length === 0) return `Section "${sec.title}" needs at least one item.`;
      for (const it of sec.items) {
        if (!it.question_text.trim()) return `Item ${it.item_number} in "${sec.title}" needs question text.`;
      }
    }
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }

    setSaving(true);
    setError('');

    try {
      if (editingTemplate) {
        const tid = editingTemplate.id;
        const t = editingTemplate;

        const metaChanged =
          form.name.trim() !== (t.name || '') ||
          (form.description.trim() || null) !== (t.description || null) ||
          JSON.stringify(form.scoring_scale) !== JSON.stringify(t.scoring_scale) ||
          JSON.stringify(form.performance_ratings) !== JSON.stringify(t.performance_ratings);

        if (metaChanged) {
          await put(`/evaluation-templates/${tid}`, {
            name: form.name.trim(),
            description: form.description.trim() || null,
            scoring_scale: form.scoring_scale,
            performance_ratings: form.performance_ratings,
          });
        }

        const existingSections = t.evaluation_template_sections || [];
        const existingById = new Map(existingSections.map((s) => [s.id, s]));
        const formSectionIds = new Set(form.sections.filter((s) => s.id).map((s) => s.id));

        for (const es of existingSections) {
          if (!formSectionIds.has(es.id)) {
            await del(`/evaluation-templates/${tid}/sections/${es.id}`);
          }
        }

        for (const sec of form.sections) {
          if (sec.id && existingById.has(sec.id)) {
            const orig = existingById.get(sec.id);

            const secChanged =
              sec.section_number !== orig.section_number ||
              sec.title.trim() !== (orig.title || '') ||
              (sec.description.trim() || null) !== (orig.description || null);

            if (secChanged) {
              await put(`/evaluation-templates/${tid}/sections/${sec.id}`, {
                section_number: sec.section_number,
                title: sec.title.trim(),
                description: sec.description.trim() || null,
              });
            }

            const existingItems = orig.evaluation_template_items || [];
            const existingItemById = new Map(existingItems.map((i) => [i.id, i]));
            const formItemIds = new Set(sec.items.filter((i) => i.id).map((i) => i.id));

            for (const ei of existingItems) {
              if (!formItemIds.has(ei.id)) {
                await del(`/evaluation-templates/${tid}/sections/${sec.id}/items/${ei.id}`);
              }
            }

            for (const it of sec.items) {
              if (it.id && existingItemById.has(it.id)) {
                const origItem = existingItemById.get(it.id);
                const itemChanged =
                  it.item_number !== origItem.item_number ||
                  it.question_text.trim() !== (origItem.question_text || '');

                if (itemChanged) {
                  await put(`/evaluation-templates/${tid}/sections/${sec.id}/items/${it.id}`, {
                    item_number: it.item_number,
                    question_text: it.question_text.trim(),
                  });
                }
              } else {
                await post(`/evaluation-templates/${tid}/sections/${sec.id}/items`, {
                  item_number: it.item_number,
                  question_text: it.question_text.trim(),
                });
              }
            }
          } else {
            await post(`/evaluation-templates/${tid}/sections`, {
              section_number: sec.section_number,
              title: sec.title.trim(),
              description: sec.description.trim() || null,
              items: sec.items.map((it) => ({
                item_number: it.item_number,
                question_text: it.question_text.trim(),
              })),
            });
          }
        }
      } else {
        await post('/evaluation-templates', {
          name: form.name.trim(),
          description: form.description.trim() || null,
          scoring_scale: form.scoring_scale,
          performance_ratings: form.performance_ratings,
          sections: form.sections.map((sec) => ({
            section_number: sec.section_number,
            title: sec.title.trim(),
            description: sec.description.trim() || null,
            items: sec.items.map((it) => ({
              item_number: it.item_number,
              question_text: it.question_text.trim(),
            })),
          })),
        });
      }

      onSaved?.();
      setIsDirty(false);
      onClose();
      onSuccess?.(isEditing
        ? `Template "${form.name.trim()}" updated successfully!`
        : `Template "${form.name.trim()}" created successfully!`
      );
    } catch (e) {
      console.error('Failed to save template:', e);
      setError(e?.message || 'Failed to save template');
      onError?.(e?.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (isDirty) {
      if (!window.confirm('You have unsaved changes. Are you sure you want to close without saving?')) {
        return;
      }
    }
    onClose();
  };

  const isEditing = Boolean(editingTemplate);

  return (
    <ModalShell open={open} title={isEditing ? `Edit Template: ${editingTemplate?.name || ''}` : 'Create New Template'} onClose={handleClose} wide>
      <div className="space-y-6">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-sm">
            {error}
          </div>
        )}

        {/* Metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Template Name *</label>
            <input type="text" value={form.name} onChange={(e) => updateField('name', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#990100]" placeholder="e.g. ARISE Performance Evaluation"/>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
            <input type="text" value={form.description} onChange={(e) => updateField('description', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#990100]" placeholder="Optional description"/>
          </div>
        </div>

        {/* Scoring Scale */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-700">Scoring Scale *</h3>
            <button type="button" onClick={addScaleRow} className="text-xs text-[#990100] hover:underline cursor-pointer">
              + Add Row
            </button>
          </div>
          <div className="space-y-2">
            {form.scoring_scale.map((row, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input type="number" value={row.value} onChange={(e) => updateScaleRow(idx, 'value', e.target.value)} className="w-16 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none" placeholder="Value"/>
                <input type="text" value={row.label} onChange={(e) => updateScaleRow(idx, 'label', e.target.value)} className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none" placeholder="Label"/>
                <input type="text" value={row.description || ''} onChange={(e) => updateScaleRow(idx, 'description', e.target.value)} className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none" placeholder="Description (optional)"/>
                {form.scoring_scale.length > 1 && (
                  <button type="button" onClick={() => removeScaleRow(idx)} className="text-red-500 hover:text-red-700 text-lg cursor-pointer" title="Remove">
                    &times;
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Performance Ratings */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-700">Performance Ratings *</h3>
            <button type="button" onClick={addRatingRow} className="text-xs text-[#990100] hover:underline cursor-pointer">
              + Add Row
            </button>
          </div>
          <div className="space-y-2">
            {form.performance_ratings.map((row, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input type="number" value={row.min_score} onChange={(e) => updateRatingRow(idx, 'min_score', e.target.value)} className="w-16 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none" placeholder="Min"/>
                <span className="text-sm text-gray-500">-</span>
                <input type="number" value={row.max_score} onChange={(e) => updateRatingRow(idx, 'max_score', e.target.value)} className="w-16 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none" placeholder="Max"/>
                <input type="text" value={row.label} onChange={(e) => updateRatingRow(idx, 'label', e.target.value)} className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none" placeholder="Label"/>
                <input type="text" value={row.description || ''} onChange={(e) => updateRatingRow(idx, 'description', e.target.value)} className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none" placeholder="Description (optional)"
                />
                {form.performance_ratings.length > 1 && (
                  <button type="button" onClick={() => removeRatingRow(idx)} className="text-red-500 hover:text-red-700 text-lg cursor-pointer" title="Remove">
                    &times;
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Sections + Items */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Sections & Items *</h3>
            <button type="button" onClick={addSection} className="text-xs text-[#990100] hover:underline cursor-pointer">
              + Add Section
            </button>
          </div>

          <div className="space-y-4">
            {form.sections.map((sec, sIdx) => (
              <div key={sec._key} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-0.5">Section {sec.section_number} Title *</label>
                      <input type="text" value={sec.title} onChange={(e) => updateSection(sIdx, 'title', e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none" placeholder="Section title"/>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-0.5">Description</label>
                      <input type="text" value={sec.description} onChange={(e) => updateSection(sIdx, 'description', e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none" placeholder="Optional"/>
                    </div>
                  </div>
                  {form.sections.length > 1 && (
                    <button type="button" onClick={() => removeSection(sIdx)} className="text-red-500 hover:text-red-700 text-sm mt-4 cursor-pointer" title="Remove section">
                      Remove
                    </button>
                  )}
                </div>

                <div className="space-y-2 ml-2">
                  {sec.items.map((it, iIdx) => (
                    <div key={it._key} className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-6 text-right">{it.item_number}.</span>
                      <input type="text" value={it.question_text} onChange={(e) => updateItem(sIdx, iIdx, 'question_text', e.target.value)} className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none" placeholder="Question text"/>
                      {sec.items.length > 1 && (
                        <button type="button" onClick={() => removeItem(sIdx, iIdx)} className="text-red-500 hover:text-red-700 text-lg cursor-pointer" title="Remove item">
                          &times;
                        </button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={() => addItem(sIdx)} className="text-xs text-[#990100] hover:underline ml-8 cursor-pointer">
                    + Add Item
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-200">
          <button type="button" onClick={handleClose} disabled={saving} className="px-5 py-2 rounded-lg text-sm bg-gray-200 text-gray-900 hover:bg-gray-300 transition cursor-pointer">
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={saving} className="green-button px-6 py-2 rounded-lg text-sm disabled:opacity-50 disabled:pointer-events-none">
            {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Template'}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function ImportModal({ open, onClose, onImported, onError }) {
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [fileName, setFileName] = useState('');

  useEffect(() => {
    if (!open) {
      setFileName('');
      setParsing(false);
      setDragOver(false);
    }
  }, [open]);

  const processFile = async (file) => {
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'xlsx') {
      onError?.('Please upload an .xlsx file. Use the "Download Template" button below to get the correct format.');
      return;
    }

    setFileName(file.name);
    setParsing(true);
    try {
      const parsed = await parseTemplateSpreadsheet(file);
      onImported?.(parsed);
      onClose();
    } catch (err) {
      console.error('Failed to parse spreadsheet:', err);
      onError?.(err?.message || 'Failed to parse the spreadsheet. Check the format and try again.');
      setFileName('');
    } finally {
      setParsing(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = '';
    processFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    processFile(file);
  };

  return (
    <ModalShell open={open} title="Import Template from Spreadsheet" onClose={onClose}>
      <div className="space-y-5">
        {/* Instructions */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">How to use</h3>
          <ol className="text-sm text-gray-700 space-y-1.5 list-decimal list-inside">
            <li>Download the template spreadsheet using the button below. It comes <b>pre-filled with the default ARISE evaluation form</b> as a guide.</li>
            <li>Open the file in Excel or Google Sheets. It has <b>2 sheets</b>:
              <ul className="ml-5 mt-1 space-y-0.5 text-xs text-gray-600 list-disc list-inside">
                <li><b>Template Info</b> — template name and description</li>
                <li><b>Sections & Questions</b> — your evaluation sections and questions (section title + question per row)</li>
              </ul>
            </li>
            <li>Edit, add, or remove rows as needed. Questions with the same section title are grouped together automatically. You can leave the section title blank if it's the same as the row above.</li>
            <li>Save the file as <b>.xlsx</b> and upload it below.</li>
            <li>Review the imported data in the form builder. You can adjust the <b>scoring scale</b>, <b>performance ratings</b>, and other details there before saving.</li>
            <li>Assign the newly created template to the desired positions.</li>
          </ol>
        </div>

        {/* Download template button */}
        <div className="flex items-center gap-3">
          <button type="button" onClick={downloadTemplateSpreadsheet} className="bg-white border border-[#990100] text-[#990100] px-4 py-2 rounded-lg text-sm hover:bg-[#990100]/10 transition cursor-pointer inline-flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Template (.xlsx)
          </button>
          <span className="text-xs text-gray-500">Pre-filled with example data</span>
        </div>

        {/* Upload area */}
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-2">Upload your filled template</h3>
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition cursor-pointer ${
              dragOver
                ? 'border-[#990100] bg-[#990100]/5'
                : 'border-gray-300 hover:border-[#990100]/50 hover:bg-gray-50'
            }`}
            onClick={() => !parsing && fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            {parsing ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#990100]"></div>
                <span className="text-sm text-gray-600">Parsing {fileName}...</span>
              </div>
            ) : (
              <>
                <svg className="w-8 h-8 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-sm text-gray-600">
                  <span className="text-[#990100] font-medium">Click to browse</span> or drag and drop
                </p>
                <p className="text-xs text-gray-400 mt-1">Only .xlsx files are supported</p>
              </>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={handleFileChange}/>
        </div>

        {/* Close */}
        <div className="flex justify-end pt-2 border-t border-gray-200">
          <button type="button" onClick={onClose} disabled={parsing} className="px-5 py-2 rounded-lg text-sm bg-gray-200 text-gray-900 hover:bg-gray-300 transition cursor-pointer" >
            Close
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function PositionSearchDropdown({ positions, assignmentMap, value, onChange, placeholder = "Select position..." }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef(null);

  // close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredPositions = useMemo(() => {
    if (!search.trim()) return positions;
    const searchLower = search.toLowerCase();
    return positions.filter(p =>
      p.position_title.toLowerCase().includes(searchLower)
    );
  }, [positions, search]);

  const selectedPosition = positions.find(p => p.id === value);

  return (
    <div ref={dropdownRef} className="relative w-full">
      {/* Dropdown Button */}
      <button type="button" onClick={() => setIsOpen(!isOpen)} className="w-full px-3 py-2 text-left border border-gray-300 rounded-lg bg-white flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-[#990100] text-sm">
        <span className={selectedPosition ? '' : 'text-gray-400'}>
          {selectedPosition ? selectedPosition.position_title : placeholder}
        </span>
        <svg className={`w-4 h-4 transition-transform flex-shrink-0 ml-2 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-hidden">
          {/* Search Input */}
          <div className="p-2 border-b border-gray-200 sticky top-0 bg-white">
            <input type="text" placeholder="Search positions..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#990100]" autoFocus onClick={(e) => e.stopPropagation()} />
          </div>

          {/* Options List */}
          <div className="overflow-y-auto max-h-64">
            {filteredPositions.length === 0 ? (
              <div className="px-3 py-4 text-gray-500 text-center text-sm">No positions found</div>
            ) : (
              filteredPositions.map(pos => {
                const assignment = assignmentMap[pos.id];
                return (
                  <button
                    key={pos.id}
                    type="button"
                    onClick={() => {
                      onChange(pos.id);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={`w-full px-3 py-2 text-left hover:bg-gray-100 transition ${
                      pos.id === value ? 'bg-gray-100 font-semibold' : ''
                    }`}
                  >
                    <div className="text-sm">{pos.position_title}</div>
                    {assignment && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        assigned: {assignment?.evaluation_templates?.name || '—'}
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TemplateAssignModal({ open, onClose, template, onSuccess, onError }) {
  const [positions, setPositions] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [positionId, setPositionId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !template) return;
    setError('');
    setSaving(false);
    setPositionId('');

    const fetchData = async () => {
      setLoading(true);
      try {
        const [posRes, assignRes] = await Promise.all([
          get('/positions'),
          get('/evaluation-templates/assignments'),
        ]);
        setPositions(Array.isArray(posRes?.data) ? posRes.data : []);

        const allAssignments = Array.isArray(assignRes?.data) ? assignRes.data : [];
        const templateAssignments = allAssignments.filter(a => a.template_id === template.id);
        setAssignments(templateAssignments);
      } catch (e) {
        console.error('Failed to load positions/assignments:', e);
        setError(e?.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [open, template]);

  const assignmentMap = useMemo(() => {
    const map = {};
    for (const a of assignments) {
      map[a.position_id] = a;
    }
    return map;
  }, [assignments]);

  const handleAssign = async () => {
    if (!positionId) {
      setError('Please select a position.');
      return;
    }

    const selectedPos = positions.find(p => p.id === positionId);

    setSaving(true);
    setError('');
    try {
      await put('/evaluation-templates/assignments/assign', { positionId, templateId: template.id });

      const assignRes = await get('/evaluation-templates/assignments');
      const allAssignments = Array.isArray(assignRes?.data) ? assignRes.data : [];
      const templateAssignments = allAssignments.filter(a => a.template_id === template.id);
      setAssignments(templateAssignments);

      setPositionId('');
      onSuccess?.(`Template "${template.name}" assigned to "${selectedPos?.position_title || 'position'}" successfully!`);
    } catch (e) {
      console.error('Failed to assign template:', e);
      setError(e?.message || 'Failed to assign template');
      onError?.(e?.message || 'Failed to assign template');
    } finally {
      setSaving(false);
    }
  };

  const handleUnassign = async (pid) => {
    const assignment = assignments.find(a => a.position_id === pid);
    const posTitle = assignment?.positions?.position_title || 'position';

    setSaving(true);
    setError('');
    try {
      await del(`/evaluation-templates/assignments/position/${pid}`);
      setAssignments((prev) => prev.filter((a) => a.position_id !== pid));
      onSuccess?.(`Template unassigned from "${posTitle}" successfully!`);
    } catch (e) {
      console.error('Failed to unassign:', e);
      setError(e?.message || 'Failed to unassign template');
      onError?.(e?.message || 'Failed to unassign template');
    } finally {
      setSaving(false);
    }
  };

  if (!template) return null;

  return (
    <ModalShell open={open} title={`Assign "${template.name}"`} onClose={onClose}>
      <div className="space-y-5">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-gray-500">Loading positions...</p>
        ) : (
          <>
            {/* Current assignments for this template */}
            {assignments.length > 0 && (
              <div className="border border-gray-200 rounded-lg">
                <div className="bg-gray-50 px-4 py-3 rounded-t-lg border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700">
                    Currently Assigned To ({assignments.length})
                  </h3>
                </div>
                <div className="p-4 space-y-2 max-h-48 overflow-y-auto">
                  {assignments.map((a) => (
                    <div key={a.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2">
                      <span className="text-sm font-medium">{a.positions?.position_title || 'Unknown Position'}</span>
                      <button type="button" onClick={() => handleUnassign(a.position_id)} disabled={saving} className="text-xs text-red-600 hover:underline cursor-pointer disabled:opacity-50">
                        Unassign
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Assign to new position */}
            <div className={assignments.length > 0 ? 'pt-4 border-t border-gray-200' : ''}>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                {assignments.length > 0 ? 'Assign to Additional Position' : 'Assign to Position'}
              </h3>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Position</label>
                <PositionSearchDropdown positions={positions} assignmentMap={assignmentMap} value={positionId} onChange={setPositionId} placeholder="✓ Select position..." />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-200">
              <button type="button" onClick={onClose} disabled={saving} className="px-5 py-2 rounded-lg text-sm bg-gray-200 text-gray-900 hover:bg-gray-300 transition cursor-pointer" >
                Close
              </button>
              <button type="button" onClick={handleAssign} disabled={saving || !positionId} className="bg-[#990100] text-white px-6 py-2 rounded-lg text-sm hover:bg-[#ad3332] transition cursor-pointer disabled:opacity-50 disabled:pointer-events-none" >
                {saving ? 'Assigning...' : 'Assign'}
              </button>
            </div>
          </>
        )}
      </div>
    </ModalShell>
  );
}

export default function EvaluationTemplates() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [templates, setTemplates] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // modals
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [importedData, setImportedData] = useState(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [assigningTemplate, setAssigningTemplate] = useState(null);

  // confirm modal (deactivate)
  const [confirmState, setConfirmState] = useState({
    open: false,
    title: '',
    message: '',
    confirmText: 'OK',
    cancelText: 'Cancel',
    onConfirm: null,
    loading: false,
  });

  const closeConfirm = () => setConfirmState((p) => ({ ...p, open: false, onConfirm: null, loading: false }));

  const showSuccess = (message) => {
    setConfirmState({
      open: true,
      title: 'Success',
      message,
      confirmText: 'OK',
      cancelText: null,
      onConfirm: null,
      loading: false,
    });
  };

  const showError = (message) => {
    setConfirmState({
      open: true,
      title: 'Error',
      message,
      confirmText: 'OK',
      cancelText: null,
      onConfirm: null,
      loading: false,
    });
  };

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await get('/evaluation-templates/all');
      setTemplates(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      console.error('Failed to load templates:', e);
      setError(e?.message || 'Failed to load templates');
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter((t) => {
      const name = String(t.name || '').toLowerCase();
      const desc = String(t.description || '').toLowerCase();
      return name.includes(q) || desc.includes(q);
    });
  }, [templates, searchTerm]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => compareText(a.name, b.name));
  }, [filtered]);

  // pagination
  const [itemOffset, setItemOffset] = useState(0);
  const itemsPerPage = 10;
  const endOffset = itemOffset + itemsPerPage;
  const currentRows = sorted.slice(itemOffset, endOffset);
  const pageCount = Math.ceil(sorted.length / itemsPerPage);
  const multiPages = pageCount > 1;
  const currentPage = Math.floor(itemOffset / itemsPerPage) + 1;

  useEffect(() => {
    setItemOffset(0);
  }, [searchTerm, templates.length]);

  const handlePageClick = (event) => {
    setItemOffset(event.selected * itemsPerPage);
  };

  // open edit modal (fetch full template with sections/items)
  const openEdit = async (template) => {
    try {
      const res = await get(`/evaluation-templates/${template.id}`);
      setEditingTemplate(res?.data || template);
      setFormModalOpen(true);
    } catch (e) {
      console.error('Failed to fetch template details:', e);
      setConfirmState({
        open: true,
        title: 'Error',
        message: e?.message || 'Failed to load template details',
        confirmText: 'OK',
        cancelText: null,
        onConfirm: null,
      });
    }
  };

  const openCreate = () => {
    setEditingTemplate(null);
    setImportedData(null);
    setFormModalOpen(true);
  };

  const openDeactivate = (template) => {
    setConfirmState({
      open: true,
      title: 'Deactivate Template',
      message: `Are you sure you want to deactivate "${template.name}"? It will no longer be available for new evaluations.`,
      confirmText: 'Deactivate',
      cancelText: 'Cancel',
      loading: false,
      onConfirm: async () => {
        setConfirmState((p) => ({ ...p, loading: true }));
        try {
          await put(`/evaluation-templates/${template.id}/deactivate`, {});
          closeConfirm();
          fetchTemplates();
          showSuccess(`Template "${template.name}" has been deactivated successfully.`);
        } catch (e) {
          console.error('Failed to deactivate template:', e);
          closeConfirm();
          showError(e?.message || 'Failed to deactivate template');
        }
      },
    });
  };

  const openReactivate = (template) => {
    setConfirmState({
      open: true,
      title: 'Reactivate Template',
      message: `Are you sure you want to reactivate "${template.name}"? It will become available for new evaluations again.`,
      confirmText: 'Reactivate',
      cancelText: 'Cancel',
      loading: false,
      onConfirm: async () => {
        setConfirmState((p) => ({ ...p, loading: true }));
        try {
          await put(`/evaluation-templates/${template.id}/reactivate`, {});
          closeConfirm();
          fetchTemplates();
          showSuccess(`Template "${template.name}" has been reactivated successfully.`);
        } catch (e) {
          console.error('Failed to reactivate template:', e);
          closeConfirm();
          showError(e?.message || 'Failed to reactivate template');
        }
      },
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#990100] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Evaluation Templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-7 lg:mx-[4.5rem] md:mx-10">
      <div className="flex flex-col lg:flex-row justify-between gap-4 mb-4">
        <h1 className="lg:text-3xl text-2xl text-[#990100] font-bold md:mb-0 mb-5">Evaluation Templates</h1>

        <div className="flex items-center justify-end gap-3 flex-wrap">
          <button type="button" onClick={() => setImportModalOpen(true)} className="bg-white border border-[#990100] text-[#990100] lg:h-10 md:h-9 h-8 px-4 rounded-lg text-sm hover:bg-[#990100]/10 transition cursor-pointer">
            Import Template
          </button>

          <button type="button" onClick={openCreate} className="bg-[#990100] text-white lg:h-10 md:h-9 h-8 px-4 rounded-lg text-sm hover:bg-[#ad3332] transition cursor-pointer">
            Create Template
          </button>

          <div className="relative text-gray-600 border border-[#990100] rounded-lg">
            <input type="search" placeholder="Search" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-white lg:h-10 h-9 px-2 pr-10 rounded-lg text-sm focus:outline-none"/>
            <img src="/icons/red-search.png" className="absolute right-2 top-2 w-5 h-5" alt="search" />
          </div>
        </div>
      </div>

      <hr className="text-[#990100] mt-6" />

      <div className="mt-6">
        {error ? (
          <div className="text-sm text-red-700">{error}</div>
        ) : (
          <div className="div-table overflow-x-auto -mx-4 sm:mx-0">
            <table className="table-style">
              <thead className="thead-style">
                <tr>
                  <th className="th-style rounded-tl-lg rounded-bl-lg">Name</th>
                  <th className="th-style">Description</th>
                  <th className="th-style">Status</th>
                  <th className="th-style">Updated</th>
                  <th className="th-style rounded-tr-lg rounded-br-lg">Actions</th>
                </tr>
              </thead>
              <tbody className="tbody-style">
                {sorted.length === 0 ? (
                  <tr className="tr-style">
                    <td className="td-style" colSpan={5}>
                      <span className="text-sm text-gray-600">No templates found.</span>
                    </td>
                  </tr>
                ) : (
                  currentRows.map((t) => (
                    <tr key={t.id} className={`tr-style ${!t.is_active ? 'opacity-60' : ''}`}>
                      <td className="td-style font-medium">{t.name || '—'}</td>
                      <td className="td-style text-gray-600 max-w-[200px] truncate">{t.description || '—'}</td>
                      <td className="td-style">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${t.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}>
                          {t.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="td-style">{formatDate(t.updated_at || t.created_at)}</td>
                      <td className="td-style">
                        <div className="flex items-center justify-center gap-2">
                          <button type="button" onClick={() => openEdit(t)} className="bg-[#990100] text-white lg:text-sm text-xs px-3 py-[5px] rounded-lg hover:bg-[#ad3332] hover:scale-105 transition duration-300 ease-in-out cursor-pointer">
                            Edit
                          </button>
                          {t.is_active ? (
                            <>
                              <button type="button" onClick={() => openDeactivate(t)} className="bg-gray-200 text-gray-700 lg:text-sm text-xs px-3 py-[5px] rounded-lg hover:bg-gray-300 hover:scale-105 transition duration-300 ease-in-out cursor-pointer">
                                Deactivate
                              </button>
                              <button type="button" onClick={() => setAssigningTemplate(t)} className="mustard-button lg:text-sm text-xs px-3 py-[5px] rounded-lg hover:scale-105 transition duration-300 ease-in-out cursor-pointer">
                                Assign
                              </button>
                            </>
                          ) : (
                            <button type="button" onClick={() => openReactivate(t)} className="bg-green-600 text-white lg:text-sm text-xs px-3 py-[5px] rounded-lg hover:bg-green-700 hover:scale-105 transition duration-300 ease-in-out cursor-pointer">
                              Reactivate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <br />

            <div className="lg:flex items-center lg:justify-between">
              <p className="lg:text-md text-sm">
                Showing <b>{currentRows.length}</b> of <b>{sorted.length}</b> template
                {sorted.length !== 1 ? 's' : ''}
                {pageCount ? (
                  <>
                    {' '}
                    | Page <b>{currentPage}</b> of <b>{pageCount}</b>
                  </>
                ) : null}
              </p>

              <div>
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
                        ? 'cursor-pointer hover:text-gray-500 hover:underline'
                        : 'text-gray-400 cursor-not-allowed pointer-events-none'
                    }
                    previousLinkClassName="page-link"
                    nextClassName={
                      multiPages
                        ? 'cursor-pointer hover:text-gray-500 hover:underline'
                        : 'text-gray-400 cursor-not-allowed pointer-events-none'
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
        )}
      </div>

      {/* Create/Edit Modal */}
      <TemplateFormModal
        open={formModalOpen}
        onClose={() => {
          setFormModalOpen(false);
          setEditingTemplate(null);
          setImportedData(null);
        }}
        editingTemplate={editingTemplate}
        importedData={importedData}
        onSaved={fetchTemplates}
        onSuccess={showSuccess}
        onError={showError}
      />

      {/* Import Modal */}
      <ImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImported={(parsed) => {
          setEditingTemplate(null);
          setImportedData(parsed);
          setFormModalOpen(true);
        }}
        onError={(msg) => showError(msg)}
      />

      {/* Template Assign Modal */}
      <TemplateAssignModal
        open={!!assigningTemplate}
        onClose={() => setAssigningTemplate(null)}
        template={assigningTemplate}
        onSuccess={showSuccess}
        onError={showError}
      />

      {/* Confirm Modal (deactivate, errors) */}
      <ConfirmModal
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        confirmLoading={confirmState.loading}
        onConfirm={confirmState.onConfirm || closeConfirm}
        onCancel={closeConfirm}
      />
    </div>
  );
}
