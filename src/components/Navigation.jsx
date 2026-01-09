import React from 'react';
import { chaptersData, getChapterProgress, getOverallProgress, getTotalPoints } from '../data/chapters';
import { useTheme } from '../contexts/ThemeContext';
import { useVARK } from '../contexts/VARKContext';
import { styleConfig } from '../data/vark-questions';

const Navigation = ({ currentView, onNavigate, onBack, focusMode, onToggleFocus }) => {
  const { isDark, toggleTheme } = useTheme();
  const { preference, openAssessmentModal } = useVARK();

  // Get current style config
  const currentStyleConfig = preference.primaryStyle ? styleConfig[preference.primaryStyle] : null;
  
  const handleExportProgress = () => {
    try {
      // Collect all progress data
      const exportData = {
        exportDate: new Date().toISOString(),
        overallProgress: getOverallProgress(),
        totalPoints: getTotalPoints(),
        chapters: chaptersData.map(chapter => {
          const progress = getChapterProgress(chapter.id);
          return {
            id: chapter.id,
            title: chapter.title,
            number: chapter.number,
            completed: progress.completed,
            sectionsRead: progress.sectionsRead,
            exercisesCompleted: progress.exercisesCompleted || [],
            quizScore: progress.quizScore || 0,
            videoWatched: progress.videoWatched || false,
            notes: localStorage.getItem(`chapter_${chapter.id}_notes`) || ''
          };
        })
      };

      // Create and download JSON file
      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `ai-consulting-playbook-progress-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      
      // Show success feedback (optional)
      console.log('Progress exported successfully');
    } catch (error) {
      console.error('Failed to export progress:', error);
      alert('Failed to export progress. Please try again.');
    }
  };

  return (
    <header className="bg-navy-800 dark:bg-gray-800 text-white sticky top-0 z-50 transition-colors">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-3">
              <i className="fas fa-book text-2xl"></i>
              <h1 className="text-xl font-bold">AI Consulting Playbook</h1>
            </div>

            {currentView === 'chapter' && (
              <button 
                onClick={onBack}
                className="flex items-center space-x-2 text-silver-300 hover:text-white transition-colors"
              >
                <i className="fas fa-arrow-left"></i>
                <span>Back to Dashboard</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={toggleTheme}
              className="px-3 py-1 rounded-lg bg-navy-700 dark:bg-gray-700 hover:bg-navy-600 dark:hover:bg-gray-600 transition-colors flex items-center space-x-2"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              <i className={`fas ${isDark ? 'fa-sun' : 'fa-moon'}`}></i>
              <span className="text-sm">{isDark ? 'Light' : 'Dark'}</span>
            </button>

            {/* VARK Learning Style Button */}
            <button
              onClick={openAssessmentModal}
              className={`px-3 py-1 rounded-lg transition-colors flex items-center space-x-2 ${
                currentStyleConfig
                  ? `${currentStyleConfig.bgColor} ${currentStyleConfig.textColor}`
                  : 'bg-navy-700 dark:bg-gray-700 hover:bg-navy-600 dark:hover:bg-gray-600'
              }`}
              title="Learning Style Settings"
            >
              <i className={`fas ${currentStyleConfig ? currentStyleConfig.icon : 'fa-brain'}`}></i>
              <span className="text-sm hidden md:inline">
                {currentStyleConfig ? currentStyleConfig.name : 'Set Style'}
              </span>
            </button>

            <button
              onClick={onToggleFocus}
              className="px-3 py-1 rounded-lg bg-navy-700 dark:bg-gray-700 hover:bg-navy-600 dark:hover:bg-gray-600 transition-colors flex items-center space-x-2"
              title={focusMode ? "Exit Focus Mode" : "Enter Focus Mode"}
            >
              <i className={`fas ${focusMode ? 'fa-expand' : 'fa-compress'}`}></i>
              <span className="text-sm">{focusMode ? 'Exit' : ''} Focus Mode</span>
            </button>

            <button 
              onClick={handleExportProgress}
              className="px-3 py-1 rounded-lg bg-navy-700 dark:bg-gray-700 hover:bg-navy-600 dark:hover:bg-gray-600 transition-colors"
              title="Export your learning progress as JSON file"
            >
              <i className="fas fa-download mr-2"></i>
              Export Progress
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navigation;