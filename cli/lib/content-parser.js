/**
 * Safe Content Parser
 *
 * Parses curriculum content files (JS modules or JSON) without using eval().
 * Uses dynamic import() for JS files which is safe and sandboxed.
 */

import fs from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';

/**
 * Safely parse a content file (JS module or JSON).
 *
 * @param {string} filePath - Path to the content file
 * @param {string} exportName - Name of the export to extract (default: 'fullChapterContent')
 * @returns {Promise<Object>} - Parsed content object
 * @throws {Error} - If file cannot be parsed
 */
export async function parseContentFile(filePath, exportName = 'fullChapterContent') {
  const resolvedPath = path.resolve(filePath);

  // Check file exists
  try {
    await fs.access(resolvedPath);
  } catch {
    throw new Error(`File not found: ${filePath}`);
  }

  if (filePath.endsWith('.js') || filePath.endsWith('.mjs')) {
    return parseJSModule(resolvedPath, exportName);
  } else if (filePath.endsWith('.json')) {
    return parseJSONFile(resolvedPath, exportName);
  } else {
    // Try JSON first, then JS module
    try {
      return await parseJSONFile(resolvedPath, exportName);
    } catch {
      return await parseJSModule(resolvedPath, exportName);
    }
  }
}

/**
 * Parse a JavaScript module using dynamic import (safe).
 *
 * @param {string} filePath - Absolute path to the JS file
 * @param {string} exportName - Name of the export to extract
 * @returns {Promise<Object>} - Parsed content object
 */
async function parseJSModule(filePath, exportName) {
  try {
    // Convert to file URL for cross-platform compatibility
    const fileUrl = pathToFileURL(filePath).href;

    // Add cache-busting query param to force fresh import
    const urlWithCacheBust = `${fileUrl}?t=${Date.now()}`;

    const module = await import(urlWithCacheBust);

    // Try the specific export name first
    if (module[exportName]) {
      return module[exportName];
    }

    // Try default export
    if (module.default) {
      // Default might be the object directly or contain the named export
      if (typeof module.default === 'object' && module.default[exportName]) {
        return module.default[exportName];
      }
      return module.default;
    }

    // Check for common alternative export names
    const alternatives = [
      'fullChapterContent',
      'adaptiveFullChapterContent',
      'chapters',
      'content',
      'data'
    ];

    for (const alt of alternatives) {
      if (module[alt]) {
        return module[alt];
      }
    }

    throw new Error(
      `Could not find export '${exportName}' in ${filePath}. ` +
      `Available exports: ${Object.keys(module).join(', ')}`
    );
  } catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND') {
      throw new Error(`Module not found: ${filePath}`);
    }
    if (error.message.includes('Could not find export')) {
      throw error;
    }
    throw new Error(`Failed to import JS module: ${error.message}`);
  }
}

/**
 * Parse a JSON file.
 *
 * @param {string} filePath - Absolute path to the JSON file
 * @param {string} exportName - Property name to extract (optional)
 * @returns {Promise<Object>} - Parsed content object
 */
async function parseJSONFile(filePath, exportName) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const json = JSON.parse(content);

    // If exportName exists as a property, return it
    if (exportName && json[exportName]) {
      return json[exportName];
    }

    // Otherwise return the whole object
    return json;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in ${filePath}: ${error.message}`);
    }
    throw new Error(`Failed to read JSON file: ${error.message}`);
  }
}

export default parseContentFile;
