import React, { useState, useEffect } from 'react';
import { getOverallProgress, getTotalPoints } from './data/chapters';
import Dashboard from './components/Dashboard';
import ChapterView from './components/ChapterView';
import ProgressTracker from './components/ProgressTracker';
import AICoach from './components/AICoach';
import Navigation from './components/Navigation';
import { ThemeProvider } from './contexts/ThemeContext';
import { VARKProvider, useVARK } from './contexts/VARKContext';
import { CurriculumProvider, useCurriculum } from './contexts/CurriculumContext';
import { VARKAssessment } from './components/adaptive';
import { CurriculumManager } from './components/curriculum';
import SettingsModal from './components/settings/SettingsModal';
import './index.css';

function App() {
  const { chaptersData, isLoading } = useCurriculum();
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [overallProgress, setOverallProgress] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [showCoach, setShowCoach] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(256); // 16rem in px

  useEffect(() => {
    setOverallProgress(getOverallProgress());
    setTotalPoints(getTotalPoints());
  }, [currentView]);

  // Handle navigation to curricula view
  const handleNavigateToCurricula = () => {
    setCurrentView('curricula');
  };

  const handleChapterSelect = (chapter) => {
    setSelectedChapter(chapter);
    setCurrentView('chapter');
  };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
    setSelectedChapter(null);
  };

  const updateProgress = () => {
    setOverallProgress(getOverallProgress());
    setTotalPoints(getTotalPoints());
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const handleMouseMove = (e) => {
      const newWidth = Math.max(200, Math.min(500, startWidth + e.clientX - startX));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Show loading state while curriculum is loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <i className="fas fa-circle-notch fa-spin text-4xl text-navy-500 mb-4"></i>
          <p className="text-gray-500 dark:text-gray-400">Loading curriculum...</p>
        </div>
      </div>
    );
  }

  return (
      <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors ${focusMode ? 'focus-mode' : ''}`}>
        <Navigation
          currentView={currentView}
          onNavigate={setCurrentView}
          onBack={handleBackToDashboard}
          onNavigateToCurricula={handleNavigateToCurricula}
          focusMode={focusMode}
          onToggleFocus={() => setFocusMode(!focusMode)}
        />

      <div className="flex">
        {!focusMode && (
          <div className="relative">
            <aside 
              className="bg-white dark:bg-gray-800 border-r border-silver-200 dark:border-gray-700 h-screen sticky top-0 overflow-y-auto transition-colors"
              style={{ width: `${sidebarWidth}px` }}
            >
              <ProgressTracker 
                progress={overallProgress}
                points={totalPoints}
                chapters={chaptersData}
                onChapterSelect={handleChapterSelect}
                currentChapter={selectedChapter}
                sidebarWidth={sidebarWidth}
              />
            </aside>
            
            {/* Resize Handle */}
            <div
              className="absolute right-0 top-0 h-full w-2 bg-transparent hover:bg-navy-500/20 cursor-col-resize transition-colors z-10 flex items-center justify-center group"
              onMouseDown={handleMouseDown}
              title="Drag to resize sidebar"
            >
              <div className="w-0.5 h-16 bg-silver-400 group-hover:bg-navy-500 transition-colors rounded-full" />
            </div>
          </div>
        )}

        <main className={`flex-1 ${focusMode ? 'max-w-4xl mx-auto' : ''}`}>
          {currentView === 'dashboard' && (
            <Dashboard 
              chapters={chaptersData}
              onChapterSelect={handleChapterSelect}
              progress={overallProgress}
              points={totalPoints}
            />
          )}

          {currentView === 'chapter' && selectedChapter && (
            <ChapterView
              chapter={selectedChapter}
              onComplete={updateProgress}
              onBack={handleBackToDashboard}
            />
          )}

          {currentView === 'curricula' && (
            <CurriculumManager
              onBack={handleBackToDashboard}
            />
          )}
        </main>
      </div>

      {!focusMode && (
        <AICoach
          isVisible={showCoach}
          onToggle={() => setShowCoach(!showCoach)}
          currentChapter={selectedChapter}
        />
      )}
      </div>
  );
}

/**
 * VARK Assessment Modal Component
 * Rendered inside VARKProvider to access context
 */
function VARKAssessmentModal() {
  const { isAssessmentModalOpen, closeAssessmentModal, completeAssessment } = useVARK();

  if (!isAssessmentModalOpen) return null;

  return (
    <VARKAssessment
      isModal={true}
      onComplete={completeAssessment}
      onSkip={closeAssessmentModal}
    />
  );
}

/**
 * Main App with providers
 */
function AppWithProviders() {
  return (
    <ThemeProvider>
      <CurriculumProvider>
        <VARKProvider>
          <App />
          <VARKAssessmentModal />
          <SettingsModal />
        </VARKProvider>
      </CurriculumProvider>
    </ThemeProvider>
  );
}

export default AppWithProviders;