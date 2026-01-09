/**
 * VARK Learning Style Helper Utilities
 *
 * Provides scoring, calculation, and storage utilities for the
 * VARK (Visual, Auditory, Read/Write, Kinesthetic) assessment system.
 */

/**
 * Calculate VARK scores from assessment answers
 * @param {Record<number, string>} answers - Map of questionIndex to style
 * @returns {{ scores, percentages, primaryStyle }}
 */
export const calculateVARKScores = (answers) => {
  const scores = {
    visual: 0,
    auditory: 0,
    readWrite: 0,
    kinesthetic: 0
  };

  // Count answers for each style
  Object.values(answers).forEach(style => {
    if (Object.prototype.hasOwnProperty.call(scores, style)) {
      scores[style]++;
    }
  });

  const total = Object.values(scores).reduce((sum, val) => sum + val, 0);

  // Calculate percentages
  const percentages = {
    visual: total > 0 ? Math.round((scores.visual / total) * 100) : 0,
    auditory: total > 0 ? Math.round((scores.auditory / total) * 100) : 0,
    readWrite: total > 0 ? Math.round((scores.readWrite / total) * 100) : 0,
    kinesthetic: total > 0 ? Math.round((scores.kinesthetic / total) * 100) : 0
  };

  // Find primary style (highest score)
  const primaryStyle = Object.entries(scores).reduce((max, [style, score]) =>
    score > scores[max] ? style : max
  , 'visual');

  return { scores, percentages, primaryStyle };
};

/**
 * Storage key for VARK preferences
 */
export const VARK_STORAGE_KEY = 'ai_playbook_vark_preference';

/**
 * Get VARK preference from localStorage
 * @returns {Object | null}
 */
export const getStoredVARKPreference = () => {
  try {
    const stored = localStorage.getItem(VARK_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

/**
 * Save VARK preference to localStorage
 * @param {Object} preference - VARK preference object
 */
export const saveVARKPreference = (preference) => {
  try {
    localStorage.setItem(VARK_STORAGE_KEY, JSON.stringify(preference));
  } catch (e) {
    console.error('Failed to save VARK preference:', e);
  }
};

/**
 * Clear VARK preference from localStorage
 */
export const clearVARKPreference = () => {
  try {
    localStorage.removeItem(VARK_STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear VARK preference:', e);
  }
};

/**
 * Check if user has completed VARK assessment
 * @returns {boolean}
 */
export const hasCompletedVARK = () => {
  const pref = getStoredVARKPreference();
  return pref?.assessmentCompleted === true;
};

/**
 * Get the user's primary learning style
 * @returns {string | null}
 */
export const getPrimaryStyle = () => {
  const pref = getStoredVARKPreference();
  return pref?.primaryStyle || null;
};

export default {
  calculateVARKScores,
  getStoredVARKPreference,
  saveVARKPreference,
  clearVARKPreference,
  hasCompletedVARK,
  getPrimaryStyle,
  VARK_STORAGE_KEY
};
