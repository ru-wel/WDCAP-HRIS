import { useState, useCallback } from 'react';
import { ARISE_FORM_ITEMS, getTotalPossibleScore, calculatePercentage, getPerformanceRating } from '../constants/ariseFormData.js';

export const useARISEForm = () => {
  // Create state for each of the 20 items dynamically
  const [formScores, setFormScores] = useState(() => {
    const scores = {};
    ARISE_FORM_ITEMS.sections.forEach(section => {
      section.items.forEach(item => {
        scores[`item_${item.number}`] = '3'; // default to Sumasang-ayon (3)
      });
    });
    return scores;
  });

  const [isReliable, setIsReliable] = useState(ARISE_FORM_ITEMS.summaryFields.reliableOptions?.[0] || 'Oo itutuloy');
  const [memo, setMemo] = useState('');
  const [showFormSection, setShowFormSection] = useState(false);

  // Update individual item score
  const setItemScore = useCallback((itemNumber, value) => {
    setFormScores(prev => ({
      ...prev,
      [`item_${itemNumber}`]: String(value)
    }));
  }, []);

  // Get item score
  const getItemScore = useCallback((itemNumber) => {
    return formScores[`item_${itemNumber}`] || '3';
  }, [formScores]);

  // Calculate total score
  const calculateTotalScore = useCallback(() => {
    let total = 0;
    Object.values(formScores).forEach(score => {
      total += parseInt(score, 10);
    });
    return total;
  }, [formScores]);

  const totalScore = calculateTotalScore();
  const totalPossible = getTotalPossibleScore();
  const percentage = calculatePercentage(totalScore);
  const rating = getPerformanceRating(totalScore);

  // Reset form
  const resetForm = useCallback(() => {
    const scores = {};
    ARISE_FORM_ITEMS.sections.forEach(section => {
      section.items.forEach(item => {
        scores[`item_${item.number}`] = '3';
      });
    });
    setFormScores(scores);
    setIsReliable(ARISE_FORM_ITEMS.summaryFields.reliableOptions?.[0] || 'Oo itutuloy');
    setMemo('');
  }, []);

  // Serialize form data for submission
  const serializeFormData = useCallback(() => {
    const data = {
      items: {},
      is_reliable: isReliable,
      memo: memo.trim() || null,
      total_score: totalScore,
      total_possible: totalPossible,
      percentage: percentage,
      performance_rating: rating.range,
      performance_description: rating.tagalog
    };
    
    ARISE_FORM_ITEMS.sections.forEach(section => {
      section.items.forEach(item => {
        data.items[`item_${item.number}`] = parseInt(getItemScore(item.number), 10);
      });
    });
    
    return data;
  }, [isReliable, memo, totalScore, totalPossible, percentage, rating, getItemScore]);

  return {
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
    serializeFormData
  };
};
