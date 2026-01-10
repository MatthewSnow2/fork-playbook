import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  getCurriculaMetadata,
  getActiveCurriculumId,
  setActiveCurriculumId,
  loadCurriculum,
  saveCurriculum,
  deleteCurriculum,
  clearAllCurricula,
  getApiKey,
  saveApiKey,
  clearApiKey as clearStoredApiKey,
  DEFAULT_CURRICULUM_ID,
  generateCurriculumId
} from '../utils/curriculumStorage';

// Import default curriculum data
import { chaptersData as defaultChaptersData } from '../data/chapters';
import defaultFullChapterContent from '../data/fullChapters';

const CurriculumContext = createContext();

export const useCurriculum = () => {
  const context = useContext(CurriculumContext);
  if (!context) {
    throw new Error('useCurriculum must be used within a CurriculumProvider');
  }
  return context;
};

export const CurriculumProvider = ({ children }) => {
  // Current curriculum data
  const [chaptersData, setChaptersData] = useState(defaultChaptersData);
  const [fullChapterContent, setFullChapterContent] = useState(defaultFullChapterContent);

  // Curriculum management state
  const [activeCurriculumId, setActiveCurriculumIdState] = useState(DEFAULT_CURRICULUM_ID);
  const [curricula, setCurricula] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // API key state
  const [apiKey, setApiKeyState] = useState(null);
  const [isKeyValid, setIsKeyValid] = useState(null);

  // Settings modal state
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Load initial data on mount
  useEffect(() => {
    const initializeData = async () => {
      try {
        // Load API key
        const storedKey = getApiKey();
        if (storedKey) {
          setApiKeyState(storedKey);
        }

        // Load curricula metadata
        const metadata = await getCurriculaMetadata();
        setCurricula(metadata);

        // Load active curriculum
        const activeId = await getActiveCurriculumId();
        if (activeId && activeId !== DEFAULT_CURRICULUM_ID) {
          const content = await loadCurriculum(activeId);
          if (content) {
            setChaptersData(content.chaptersData);
            setFullChapterContent(content.fullChapterContent);
            setActiveCurriculumIdState(activeId);
          } else {
            // Curriculum not found, reset to default
            await setActiveCurriculumId(DEFAULT_CURRICULUM_ID);
            setActiveCurriculumIdState(DEFAULT_CURRICULUM_ID);
          }
        }
      } catch (error) {
        console.error('Failed to initialize curriculum data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, []);

  // Switch to a different curriculum
  const switchCurriculum = useCallback(async (curriculumId) => {
    if (curriculumId === activeCurriculumId) return;

    setIsLoading(true);
    try {
      if (curriculumId === DEFAULT_CURRICULUM_ID) {
        setChaptersData(defaultChaptersData);
        setFullChapterContent(defaultFullChapterContent);
      } else {
        const content = await loadCurriculum(curriculumId);
        if (!content) {
          throw new Error('Curriculum not found');
        }
        setChaptersData(content.chaptersData);
        setFullChapterContent(content.fullChapterContent);
      }

      await setActiveCurriculumId(curriculumId);
      setActiveCurriculumIdState(curriculumId);
    } catch (error) {
      console.error('Failed to switch curriculum:', error);
      // Reset to default on error
      setChaptersData(defaultChaptersData);
      setFullChapterContent(defaultFullChapterContent);
      setActiveCurriculumIdState(DEFAULT_CURRICULUM_ID);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [activeCurriculumId]);

  // Save a new curriculum
  const addCurriculum = useCallback(async (curriculumData) => {
    const id = generateCurriculumId();
    const curriculum = {
      id,
      ...curriculumData
    };

    const metadata = await saveCurriculum(curriculum);

    // Update local state
    setCurricula(prev => [...prev, metadata]);

    return { id, metadata };
  }, []);

  // Remove a curriculum
  const removeCurriculum = useCallback(async (curriculumId) => {
    await deleteCurriculum(curriculumId);

    // Update local state
    setCurricula(prev => prev.filter(c => c.id !== curriculumId));

    // Switch to default if we deleted the active curriculum
    if (curriculumId === activeCurriculumId) {
      await switchCurriculum(DEFAULT_CURRICULUM_ID);
    }
  }, [activeCurriculumId, switchCurriculum]);

  // Clear all generated curricula
  const clearCurricula = useCallback(async () => {
    await clearAllCurricula();
    setCurricula([]);
    await switchCurriculum(DEFAULT_CURRICULUM_ID);
  }, [switchCurriculum]);

  // API key management
  const setApiKey = useCallback((key) => {
    if (key) {
      saveApiKey(key);
    } else {
      clearStoredApiKey();
    }
    setApiKeyState(key);
    setIsKeyValid(null); // Reset validation status
  }, []);

  const clearApiKey = useCallback(() => {
    clearStoredApiKey();
    setApiKeyState(null);
    setIsKeyValid(null);
  }, []);

  // Validate API key with a test request
  const validateApiKey = useCallback(async (keyToValidate) => {
    const key = keyToValidate || apiKey;
    if (!key) {
      setIsKeyValid(false);
      return false;
    }

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hi' }]
        })
      });

      // 200 = success, 401 = invalid key
      const valid = response.ok;
      setIsKeyValid(valid);
      return valid;
    } catch (error) {
      console.error('API key validation error:', error);
      // Network error - can't determine validity
      setIsKeyValid(null);
      return null;
    }
  }, [apiKey]);

  // Settings modal controls
  const openSettingsModal = useCallback(() => {
    setIsSettingsModalOpen(true);
  }, []);

  const closeSettingsModal = useCallback(() => {
    setIsSettingsModalOpen(false);
  }, []);

  // Get current curriculum info
  const getCurrentCurriculumInfo = useCallback(() => {
    if (activeCurriculumId === DEFAULT_CURRICULUM_ID) {
      return {
        id: DEFAULT_CURRICULUM_ID,
        name: 'AI Consulting Playbook',
        topic: 'AI Consulting',
        isDefault: true,
        chapterCount: defaultChaptersData.length
      };
    }

    const meta = curricula.find(c => c.id === activeCurriculumId);
    return meta ? { ...meta, isDefault: false } : null;
  }, [activeCurriculumId, curricula]);

  return (
    <CurriculumContext.Provider value={{
      // Curriculum data
      chaptersData,
      fullChapterContent,

      // Curriculum management
      activeCurriculumId,
      curricula,
      isLoading,
      switchCurriculum,
      addCurriculum,
      removeCurriculum,
      clearCurricula,
      getCurrentCurriculumInfo,
      DEFAULT_CURRICULUM_ID,

      // API key
      apiKey,
      setApiKey,
      clearApiKey,
      isKeyValid,
      validateApiKey,

      // Settings modal
      isSettingsModalOpen,
      openSettingsModal,
      closeSettingsModal
    }}>
      {children}
    </CurriculumContext.Provider>
  );
};

export default CurriculumContext;
