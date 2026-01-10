/**
 * Curriculum Storage - IndexedDB wrapper for storing generated curricula
 * Uses idb-keyval for simple key-value storage
 */
import { get, set, del, keys, clear } from 'idb-keyval';

// Storage keys
const STORAGE_PREFIX = 'curriculum_';
const METADATA_KEY = 'curriculum_metadata';
const ACTIVE_KEY = 'curriculum_active';
const API_KEY_STORAGE = 'anthropic_api_key';

// Default curriculum ID
export const DEFAULT_CURRICULUM_ID = 'default';

/**
 * Generate a unique ID for new curricula
 */
export const generateCurriculumId = () => {
  return `curriculum_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Get metadata for all stored curricula
 * @returns {Promise<Array>} Array of curriculum metadata objects
 */
export async function getCurriculaMetadata() {
  try {
    const metadata = await get(METADATA_KEY);
    return metadata || [];
  } catch (error) {
    console.error('Failed to get curricula metadata:', error);
    return [];
  }
}

/**
 * Save curriculum metadata
 * @param {Array} metadata - Array of curriculum metadata objects
 */
async function saveCurriculaMetadata(metadata) {
  try {
    await set(METADATA_KEY, metadata);
  } catch (error) {
    console.error('Failed to save curricula metadata:', error);
    throw error;
  }
}

/**
 * Get the active curriculum ID
 * @returns {Promise<string>} Active curriculum ID or 'default'
 */
export async function getActiveCurriculumId() {
  try {
    const active = await get(ACTIVE_KEY);
    return active || DEFAULT_CURRICULUM_ID;
  } catch (error) {
    console.error('Failed to get active curriculum:', error);
    return DEFAULT_CURRICULUM_ID;
  }
}

/**
 * Set the active curriculum ID
 * @param {string} curriculumId - The curriculum ID to set as active
 */
export async function setActiveCurriculumId(curriculumId) {
  try {
    await set(ACTIVE_KEY, curriculumId);
  } catch (error) {
    console.error('Failed to set active curriculum:', error);
    throw error;
  }
}

/**
 * Save a complete curriculum (metadata + content)
 * @param {Object} curriculum - Full curriculum object
 * @param {string} curriculum.id - Unique ID
 * @param {string} curriculum.name - Display name
 * @param {string} curriculum.topic - Original topic
 * @param {Array} curriculum.chaptersData - Chapter metadata
 * @param {Object} curriculum.fullChapterContent - Full content by chapter ID
 * @param {Object} curriculum.options - Generation options used
 */
export async function saveCurriculum(curriculum) {
  const { id, name, topic, chaptersData, fullChapterContent, options } = curriculum;

  if (!id || !chaptersData || !fullChapterContent) {
    throw new Error('Invalid curriculum: missing required fields');
  }

  try {
    // Save the full content
    await set(`${STORAGE_PREFIX}${id}`, {
      chaptersData,
      fullChapterContent
    });

    // Update metadata list
    const metadata = await getCurriculaMetadata();
    const existingIndex = metadata.findIndex(m => m.id === id);

    const metadataEntry = {
      id,
      name: name || topic,
      topic,
      chapterCount: chaptersData.length,
      createdAt: existingIndex >= 0 ? metadata[existingIndex].createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      options
    };

    if (existingIndex >= 0) {
      metadata[existingIndex] = metadataEntry;
    } else {
      metadata.push(metadataEntry);
    }

    await saveCurriculaMetadata(metadata);

    return metadataEntry;
  } catch (error) {
    console.error('Failed to save curriculum:', error);
    throw error;
  }
}

/**
 * Load a curriculum's content by ID
 * @param {string} curriculumId - The curriculum ID to load
 * @returns {Promise<Object|null>} The curriculum content or null if not found
 */
export async function loadCurriculum(curriculumId) {
  if (curriculumId === DEFAULT_CURRICULUM_ID) {
    return null; // Default curriculum is imported statically
  }

  try {
    const content = await get(`${STORAGE_PREFIX}${curriculumId}`);
    return content || null;
  } catch (error) {
    console.error('Failed to load curriculum:', error);
    return null;
  }
}

/**
 * Delete a curriculum
 * @param {string} curriculumId - The curriculum ID to delete
 */
export async function deleteCurriculum(curriculumId) {
  if (curriculumId === DEFAULT_CURRICULUM_ID) {
    throw new Error('Cannot delete default curriculum');
  }

  try {
    // Delete content
    await del(`${STORAGE_PREFIX}${curriculumId}`);

    // Update metadata list
    const metadata = await getCurriculaMetadata();
    const filtered = metadata.filter(m => m.id !== curriculumId);
    await saveCurriculaMetadata(filtered);

    // If this was active, switch to default
    const active = await getActiveCurriculumId();
    if (active === curriculumId) {
      await setActiveCurriculumId(DEFAULT_CURRICULUM_ID);
    }
  } catch (error) {
    console.error('Failed to delete curriculum:', error);
    throw error;
  }
}

/**
 * Clear all stored curricula (except default)
 */
export async function clearAllCurricula() {
  try {
    const allKeys = await keys();
    const curriculumKeys = allKeys.filter(k =>
      typeof k === 'string' && k.startsWith(STORAGE_PREFIX)
    );

    for (const key of curriculumKeys) {
      await del(key);
    }

    await saveCurriculaMetadata([]);
    await setActiveCurriculumId(DEFAULT_CURRICULUM_ID);
  } catch (error) {
    console.error('Failed to clear curricula:', error);
    throw error;
  }
}

/**
 * Export a curriculum as JSON for download
 * @param {string} curriculumId - The curriculum ID to export
 * @returns {Promise<Object>} The full curriculum data
 */
export async function exportCurriculum(curriculumId) {
  const metadata = await getCurriculaMetadata();
  const meta = metadata.find(m => m.id === curriculumId);

  if (!meta) {
    throw new Error('Curriculum not found');
  }

  const content = await loadCurriculum(curriculumId);

  return {
    ...meta,
    ...content,
    exportedAt: new Date().toISOString()
  };
}

/**
 * Import a curriculum from JSON
 * @param {Object} data - The curriculum data to import
 * @returns {Promise<Object>} The saved curriculum metadata
 */
export async function importCurriculum(data) {
  const { name, topic, chaptersData, fullChapterContent, options } = data;

  if (!chaptersData || !fullChapterContent) {
    throw new Error('Invalid curriculum data: missing required fields');
  }

  const id = generateCurriculumId();

  return saveCurriculum({
    id,
    name: name || topic || 'Imported Curriculum',
    topic: topic || 'Unknown',
    chaptersData,
    fullChapterContent,
    options: options || {}
  });
}

// API Key storage (simple localStorage, not IndexedDB)
// Kept separate since it's small and needs sync access

/**
 * Get the stored API key
 * @returns {string|null} The API key or null
 */
export function getApiKey() {
  try {
    return localStorage.getItem(API_KEY_STORAGE);
  } catch {
    return null;
  }
}

/**
 * Save the API key
 * @param {string} apiKey - The API key to save
 */
export function saveApiKey(apiKey) {
  try {
    localStorage.setItem(API_KEY_STORAGE, apiKey);
  } catch (error) {
    console.warn('Failed to save API key:', error.message);
    throw error;
  }
}

/**
 * Clear the API key
 */
export function clearApiKey() {
  try {
    localStorage.removeItem(API_KEY_STORAGE);
  } catch {
    // Ignore errors
  }
}

/**
 * Check if storage is available and working
 * @returns {Promise<Object>} Storage status
 */
export async function checkStorageStatus() {
  const status = {
    indexedDB: false,
    localStorage: false,
    estimatedQuota: null
  };

  // Check localStorage
  try {
    localStorage.setItem('test', 'test');
    localStorage.removeItem('test');
    status.localStorage = true;
  } catch {
    status.localStorage = false;
  }

  // Check IndexedDB
  try {
    await set('storage_test', true);
    await del('storage_test');
    status.indexedDB = true;
  } catch {
    status.indexedDB = false;
  }

  // Check quota if available
  if (navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      status.estimatedQuota = {
        usage: estimate.usage,
        quota: estimate.quota,
        percentUsed: ((estimate.usage / estimate.quota) * 100).toFixed(2)
      };
    } catch {
      // Quota API not available
    }
  }

  return status;
}
