import { useState, useCallback, useEffect, useMemo } from 'react';

export const useDynamicEvaluationForm = (template) => {

  const scoringScale = template?.scoring_scale || [];
  const maxScoreValue = useMemo(
    () => scoringScale.length > 0 ? Math.max(...scoringScale.map(s => s.value)) : 3,
    [scoringScale]
  );
  const sections = template?.evaluation_template_sections || [];
  const performanceRatings = template?.performance_ratings || [];

  const allItems = useMemo(() => {
    const items = [];
    for (const section of sections) {
      for (const item of (section.evaluation_template_items || [])) {
        items.push({
          sectionId: section.id,
          sectionNumber: section.section_number,
          itemId: item.id,
          itemNumber: item.item_number,
          questionText: item.question_text,
          key: `s${section.section_number}_i${item.item_number}`,
        });
      }
    }
    return items;
  }, [sections]);

  const [formScores, setFormScores] = useState({});

  const [isReliable, setIsReliable] = useState('Oo itutuloy');
  const [memo, setMemo] = useState('');
  const [showFormSection, setShowFormSection] = useState(false);

  useEffect(() => {
    if (allItems.length === 0) return;
    const scores = {};
    for (const item of allItems) {
      scores[item.key] = String(maxScoreValue);
    }
    setFormScores(scores);
  }, [allItems, maxScoreValue]);

  const setItemScore = useCallback((sectionNumber, itemNumber, value) => {
    const key = `s${sectionNumber}_i${itemNumber}`;
    setFormScores(prev => ({ ...prev, [key]: String(value) }));
  }, []);

  const getItemScore = useCallback((sectionNumber, itemNumber) => {
    const key = `s${sectionNumber}_i${itemNumber}`;
    return formScores[key] || String(maxScoreValue);
  }, [formScores, maxScoreValue]);

  const totalScore = useMemo(() => {
    let total = 0;
    for (const val of Object.values(formScores)) {
      total += parseInt(val, 10) || 0;
    }
    return total;
  }, [formScores]);

  const totalPossible = useMemo(
    () => allItems.length * maxScoreValue,
    [allItems.length, maxScoreValue]
  );

  const percentage = useMemo(
    () => totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : 0,
    [totalScore, totalPossible]
  );

  const rating = useMemo(() => {
    if (performanceRatings.length === 0) return null;

    const match = performanceRatings.find(
      r => totalScore >= r.min_score && totalScore <= r.max_score
    );

    if (match) {
      return {
        range: `${match.min_score}-${match.max_score}`,
        label: match.label,
        description: match.description,
        tagalog: match.description,
      };
    }

    const sorted = [...performanceRatings].sort((a, b) => b.max_score - a.max_score);
    const highest = sorted[0];
    return {
      range: `${highest.min_score}-${highest.max_score}`,
      label: highest.label,
      description: highest.description,
      tagalog: highest.description,
    };
  }, [totalScore, performanceRatings]);

  const resetForm = useCallback(() => {
    const scores = {};
    for (const item of allItems) {
      scores[item.key] = String(maxScoreValue);
    }
    setFormScores(scores);
    setIsReliable('Oo itutuloy');
    setMemo('');
  }, [allItems, maxScoreValue]);

  const serializeFormData = useCallback(() => {
    const items = {};
    for (const item of allItems) {
      items[item.key] = parseInt(formScores[item.key], 10) || 0;
    }

    return {
      template_id: template?.id || null,
      items,
      is_reliable: isReliable,
      memo: memo.trim() || null,
      total_score: totalScore,
      total_possible: totalPossible,
      percentage,
      performance_rating: rating?.range || null,
      performance_description: rating?.description || null,
    };
  }, [
    template, allItems, formScores,
    isReliable, memo, totalScore,
    totalPossible, percentage, rating
  ]);

  return {

    templateId: template?.id || null,
    templateName: template?.name || '',
    scoringScale,
    sections,
    allItems,

    formScores,
    setItemScore,
    getItemScore,
    isReliable,
    setIsReliable,
    memo,
    setMemo,
    showFormSection,
    setShowFormSection,

    totalScore,
    totalPossible,
    percentage,
    rating,

    resetForm,
    serializeFormData,
  };
};
