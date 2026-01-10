import React, { useState, useCallback } from 'react';
import { useCurriculum } from '../../contexts/CurriculumContext';

/**
 * API Key input component with validation
 */
const ApiKeyInput = ({ onValidationComplete }) => {
  const { apiKey, setApiKey, clearApiKey, isKeyValid, validateApiKey } = useCurriculum();

  const [inputValue, setInputValue] = useState(apiKey || '');
  const [isValidating, setIsValidating] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const handleInputChange = useCallback((e) => {
    setInputValue(e.target.value);
  }, []);

  const handleSave = useCallback(async () => {
    if (!inputValue.trim()) return;

    setIsValidating(true);
    try {
      setApiKey(inputValue.trim());
      const valid = await validateApiKey(inputValue.trim());

      if (onValidationComplete) {
        onValidationComplete(valid);
      }
    } finally {
      setIsValidating(false);
    }
  }, [inputValue, setApiKey, validateApiKey, onValidationComplete]);

  const handleClear = useCallback(() => {
    setInputValue('');
    clearApiKey();
  }, [clearApiKey]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      handleSave();
    }
  }, [handleSave, inputValue]);

  // Determine status icon
  const renderStatus = () => {
    if (isValidating) {
      return (
        <span className="text-gray-400 animate-spin">
          <i className="fas fa-circle-notch"></i>
        </span>
      );
    }

    if (isKeyValid === true) {
      return (
        <span className="text-green-500" title="API key is valid">
          <i className="fas fa-check-circle"></i>
        </span>
      );
    }

    if (isKeyValid === false) {
      return (
        <span className="text-red-500" title="API key is invalid">
          <i className="fas fa-times-circle"></i>
        </span>
      );
    }

    return null;
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Anthropic API Key
      </label>

      <div className="relative">
        <input
          type={showKey ? 'text' : 'password'}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="sk-ant-..."
          className="w-full px-4 py-2 pr-20 border rounded-lg
                     bg-white dark:bg-gray-700
                     text-gray-900 dark:text-gray-100
                     border-gray-300 dark:border-gray-600
                     focus:ring-2 focus:ring-navy-500 focus:border-transparent
                     placeholder-gray-400 dark:placeholder-gray-500"
        />

        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-2">
          {renderStatus()}

          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            title={showKey ? 'Hide key' : 'Show key'}
          >
            <i className={`fas ${showKey ? 'fa-eye-slash' : 'fa-eye'}`}></i>
          </button>
        </div>
      </div>

      <div className="flex space-x-2">
        <button
          onClick={handleSave}
          disabled={!inputValue.trim() || isValidating}
          className="px-4 py-2 text-sm font-medium text-white
                     bg-navy-600 hover:bg-navy-700
                     disabled:bg-gray-400 disabled:cursor-not-allowed
                     rounded-lg transition-colors"
        >
          {isValidating ? 'Validating...' : 'Save & Test'}
        </button>

        {apiKey && (
          <button
            onClick={handleClear}
            className="px-4 py-2 text-sm font-medium
                       text-red-600 hover:text-red-700
                       dark:text-red-400 dark:hover:text-red-300
                       border border-red-300 dark:border-red-600
                       hover:bg-red-50 dark:hover:bg-red-900/20
                       rounded-lg transition-colors"
          >
            Clear Key
          </button>
        )}
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400">
        <i className="fas fa-info-circle mr-1"></i>
        Your API key is stored in your browser's localStorage and never sent to any server except Anthropic's API.
        {' '}
        <a
          href="https://console.anthropic.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-navy-600 dark:text-navy-400 hover:underline"
        >
          Get an API key
        </a>
      </p>
    </div>
  );
};

export default ApiKeyInput;
