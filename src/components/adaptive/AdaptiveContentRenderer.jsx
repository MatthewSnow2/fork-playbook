import React from 'react';
import ChapterContent from '../ChapterContent';
import { styleConfig } from '../../data/vark-questions';

/**
 * AdaptiveContentRenderer Component
 *
 * Displays chapter content based on user's selected learning style.
 * Falls back to default content when adaptive variant is not available.
 */
const AdaptiveContentRenderer = ({
  chapterId,
  sectionIndex,
  style,
  adaptiveContent,
  defaultContent,
  fallbackContent
}) => {
  /**
   * Get content based on selected style with fallback behavior:
   * 1. Try adaptive content for selected style
   * 2. Fall back to default adaptive content
   * 3. Fall back to original chapter content
   */
  const getContent = () => {
    // If no style selected, use default content
    if (!style) {
      const content = defaultContent?.[sectionIndex]?.content || fallbackContent;
      return {
        content,
        isAdaptive: false,
        styleUsed: null
      };
    }

    // Try to get adaptive content for selected style
    const adaptiveSection = adaptiveContent?.[style]?.sections?.[sectionIndex];

    if (adaptiveSection?.content) {
      return {
        content: adaptiveSection.content,
        isAdaptive: true,
        styleUsed: style
      };
    }

    // Fallback to default adaptive content
    const defaultAdaptive = adaptiveContent?.default?.sections?.[sectionIndex];
    if (defaultAdaptive?.content) {
      return {
        content: defaultAdaptive.content,
        isAdaptive: false,
        styleUsed: null
      };
    }

    // Fallback to original chapter content
    return {
      content: defaultContent?.[sectionIndex]?.content || fallbackContent,
      isAdaptive: false,
      styleUsed: null
    };
  };

  const { content, isAdaptive, styleUsed } = getContent();

  if (!content) {
    return (
      <div className="text-silver-500 dark:text-silver-400 italic p-4 text-center">
        Content not available for this section.
      </div>
    );
  }

  return (
    <div className="adaptive-content">
      {/* Style indicator badge */}
      {isAdaptive && styleUsed && styleConfig[styleUsed] && (
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm mb-4 ${styleConfig[styleUsed].bgColor}`}>
          <i className={`fas ${styleConfig[styleUsed].icon} mr-2 ${styleConfig[styleUsed].textColor}`}></i>
          <span className={styleConfig[styleUsed].textColor}>
            {styleConfig[styleUsed].name} Mode
          </span>
        </div>
      )}

      {/* Fallback notice */}
      {!isAdaptive && style && styleConfig[style] && (
        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm flex items-center">
          <i className="fas fa-info-circle text-yellow-600 dark:text-yellow-400 mr-2"></i>
          <span className="text-yellow-800 dark:text-yellow-200">
            {styleConfig[style].name} content not available. Showing standard content.
          </span>
        </div>
      )}

      {/* Render content using existing ChapterContent */}
      <ChapterContent content={content} />
    </div>
  );
};

export default AdaptiveContentRenderer;
