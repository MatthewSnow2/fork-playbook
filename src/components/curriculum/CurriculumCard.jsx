import React, { useCallback } from 'react';

/**
 * Curriculum Card component
 * Displays a single curriculum with actions
 */
const CurriculumCard = ({
  curriculum,
  isActive,
  isDefault,
  onSelect,
  onDelete
}) => {
  const handleSelect = useCallback(() => {
    if (onSelect) onSelect(curriculum.id);
  }, [curriculum.id, onSelect]);

  const handleDelete = useCallback((e) => {
    e.stopPropagation();
    if (onDelete) onDelete(curriculum.id);
  }, [curriculum.id, onDelete]);

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div
      onClick={handleSelect}
      className={`relative p-4 border rounded-xl cursor-pointer transition-all
        ${isActive
          ? 'border-navy-500 bg-navy-50 dark:bg-navy-900/30 ring-2 ring-navy-500'
          : 'border-gray-200 dark:border-gray-700 hover:border-navy-300 dark:hover:border-navy-600 bg-white dark:bg-gray-800'
        }`}
    >
      {/* Active Badge */}
      {isActive && (
        <span className="absolute top-2 right-2 px-2 py-0.5 text-xs font-medium
                         bg-navy-500 text-white rounded-full">
          Active
        </span>
      )}

      {/* Default Badge */}
      {isDefault && (
        <span className="absolute top-2 right-2 px-2 py-0.5 text-xs font-medium
                         bg-purple-500 text-white rounded-full">
          Default
        </span>
      )}

      <div className="flex items-start space-x-3">
        {/* Icon */}
        <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center
          ${isDefault
            ? 'bg-purple-100 dark:bg-purple-900/50'
            : 'bg-navy-100 dark:bg-navy-900/50'
          }`}
        >
          <i className={`fas ${isDefault ? 'fa-book' : 'fa-graduation-cap'} text-lg
            ${isDefault
              ? 'text-purple-600 dark:text-purple-400'
              : 'text-navy-600 dark:text-navy-400'
            }`}
          ></i>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 dark:text-white truncate">
            {curriculum.name}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
            {curriculum.topic || 'No topic'}
          </p>
          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-400 dark:text-gray-500">
            <span>
              <i className="fas fa-list-ol mr-1"></i>
              {curriculum.chapterCount} chapters
            </span>
            {curriculum.createdAt && (
              <span>
                <i className="fas fa-calendar mr-1"></i>
                {formatDate(curriculum.createdAt)}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        {!isDefault && (
          <div className="flex-shrink-0">
            <button
              onClick={handleDelete}
              className="p-2 text-gray-400 hover:text-red-500
                         dark:text-gray-500 dark:hover:text-red-400
                         rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20
                         transition-colors"
              title="Delete curriculum"
            >
              <i className="fas fa-trash-alt"></i>
            </button>
          </div>
        )}
      </div>

      {/* Options info */}
      {curriculum.options && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700
                        flex flex-wrap gap-2">
          {curriculum.options.difficulty && (
            <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700
                             text-gray-600 dark:text-gray-400 rounded">
              {curriculum.options.difficulty}
            </span>
          )}
          {curriculum.options.duration && (
            <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700
                             text-gray-600 dark:text-gray-400 rounded">
              {curriculum.options.duration} min/chapter
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default CurriculumCard;
