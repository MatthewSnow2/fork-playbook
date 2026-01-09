import React, { createContext, useContext, useState, useEffect } from 'react';
import { calculateVARKScores, VARK_STORAGE_KEY } from '../utils/varkHelpers';

const VARKContext = createContext();

export const useVARK = () => {
  const context = useContext(VARKContext);
  if (!context) {
    throw new Error('useVARK must be used within a VARKProvider');
  }
  return context;
};

const defaultPreference = {
  primaryStyle: null,
  scores: null,
  percentages: null,
  assessmentCompleted: false,
  manualOverride: false,
  completedAt: null
};

export const VARKProvider = ({ children }) => {
  const [preference, setPreference] = useState(defaultPreference);
  const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(VARK_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setPreference(parsed);
      } catch (e) {
        console.error('Failed to parse VARK preference:', e);
      }
    }
    // Mark as loaded after attempting to read (even if no saved data)
    setIsLoaded(true);
  }, []);

  // Persist to localStorage on change (only after initial load completes)
  useEffect(() => {
    // Prevent race condition: don't save until we've loaded existing data
    if (!isLoaded) {
      return;
    }
    if (preference.primaryStyle !== null) {
      try {
        localStorage.setItem(VARK_STORAGE_KEY, JSON.stringify(preference));
      } catch (error) {
        // Handle quota exceeded or permission errors gracefully
        console.warn('Failed to save VARK preference to localStorage:', error.message);
      }
    }
  }, [preference, isLoaded]);

  /**
   * Manually set learning style (override assessment)
   */
  const setLearningStyle = (style) => {
    setPreference(prev => ({
      ...prev,
      primaryStyle: style,
      manualOverride: true
    }));
  };

  /**
   * Complete assessment with answers and calculate scores
   */
  const completeAssessment = (answers) => {
    const { scores, percentages, primaryStyle } = calculateVARKScores(answers);
    setPreference({
      primaryStyle,
      scores,
      percentages,
      assessmentCompleted: true,
      manualOverride: false,
      completedAt: new Date().toISOString()
    });
    setIsAssessmentModalOpen(false);
  };

  /**
   * Reset preference to defaults
   */
  const resetPreference = () => {
    setPreference(defaultPreference);
    localStorage.removeItem(VARK_STORAGE_KEY);
  };

  /**
   * Open assessment modal
   */
  const openAssessmentModal = () => {
    setIsAssessmentModalOpen(true);
  };

  /**
   * Close assessment modal
   */
  const closeAssessmentModal = () => {
    setIsAssessmentModalOpen(false);
  };

  return (
    <VARKContext.Provider value={{
      preference,
      setLearningStyle,
      completeAssessment,
      resetPreference,
      isAssessmentModalOpen,
      openAssessmentModal,
      closeAssessmentModal
    }}>
      {children}
    </VARKContext.Provider>
  );
};

export default VARKContext;
