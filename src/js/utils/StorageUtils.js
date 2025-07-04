/**
 * StorageUtils.js - Local Storage Wrapper
 * Provides safe, robust local storage operations with error handling and data validation
 */

import { STORAGE_KEYS, DEBUG } from '../utils/Constants.js';

// =============================================================================
// STORAGE UTILITIES
// =============================================================================

/**
 * Check if localStorage is available and working
 * @returns {boolean} True if localStorage is available
 */
export function isStorageAvailable() {
    try {
        const test = '__storage_test__';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Get the current storage usage information
 * @returns {object} Storage usage statistics
 */
export function getStorageInfo() {
    if (!isStorageAvailable()) {
        return { available: false, used: 0, remaining: 0, total: 0 };
    }
    
    try {
        // Estimate storage usage
        let used = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                used += localStorage[key].length + key.length;
            }
        }
        
        // Estimate total storage (typically 5-10MB, but varies by browser)
        // We'll use a conservative estimate of 5MB
        const total = 5 * 1024 * 1024; // 5MB in bytes
        const remaining = total - used;
        
        return {
            available: true,
            used: used,
            remaining: remaining,
            total: total,
            usedMB: (used / (1024 * 1024)).toFixed(2),
            remainingMB: (remaining / (1024 * 1024)).toFixed(2),
            totalMB: (total / (1024 * 1024)).toFixed(2),
            usagePercentage: ((used / total) * 100).toFixed(1)
        };
    } catch (error) {
        console.warn('Error getting storage info:', error);
        return { available: false, used: 0, remaining: 0, total: 0 };
    }
}

// =============================================================================
// BASIC STORAGE OPERATIONS
// =============================================================================

/**
 * Safely set an item in localStorage
 * @param {string} key - Storage key
 * @param {*} value - Value to store (will be JSON stringified)
 * @returns {boolean} True if successful
 */
export function setItem(key, value) {
    if (!isStorageAvailable()) {
        console.warn('localStorage is not available');
        return false;
    }
    
    try {
        const serializedValue = JSON.stringify({
            data: value,
            timestamp: Date.now(),
            version: '1.0.0'
        });
        
        localStorage.setItem(key, serializedValue);
        
        if (DEBUG.ENABLED) {
            console.debug(`Storage: Set item '${key}'`, value);
        }
        
        return true;
    } catch (error) {
        console.error(`Storage: Failed to set item '${key}':`, error);
        
        // Handle quota exceeded error
        if (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
            console.warn('Storage quota exceeded. Attempting cleanup...');
            cleanup();
            
            // Try again after cleanup
            try {
                localStorage.setItem(key, JSON.stringify({
                    data: value,
                    timestamp: Date.now(),
                    version: '1.0.0'
                }));
                return true;
            } catch (retryError) {
                console.error('Storage: Failed to set item after cleanup:', retryError);
            }
        }
        
        return false;
    }
}

/**
 * Safely get an item from localStorage
 * @param {string} key - Storage key
 * @param {*} defaultValue - Default value if key doesn't exist
 * @returns {*} Retrieved value or default value
 */
export function getItem(key, defaultValue = null) {
    if (!isStorageAvailable()) {
        return defaultValue;
    }
    
    try {
        const serializedValue = localStorage.getItem(key);
        
        if (serializedValue === null) {
            return defaultValue;
        }
        
        const parsed = JSON.parse(serializedValue);
        
        // Handle both old format (direct data) and new format (with metadata)
        if (parsed && typeof parsed === 'object' && parsed.hasOwnProperty('data')) {
            if (DEBUG.ENABLED) {
                console.debug(`Storage: Got item '${key}'`, parsed.data);
            }
            return parsed.data;
        } else {
            // Legacy format - migrate to new format
            setItem(key, parsed);
            return parsed;
        }
    } catch (error) {
        console.error(`Storage: Failed to get item '${key}':`, error);
        return defaultValue;
    }
}

/**
 * Remove an item from localStorage
 * @param {string} key - Storage key
 * @returns {boolean} True if successful
 */
export function removeItem(key) {
    if (!isStorageAvailable()) {
        return false;
    }
    
    try {
        localStorage.removeItem(key);
        
        if (DEBUG.ENABLED) {
            console.debug(`Storage: Removed item '${key}'`);
        }
        
        return true;
    } catch (error) {
        console.error(`Storage: Failed to remove item '${key}':`, error);
        return false;
    }
}

/**
 * Check if a key exists in localStorage
 * @param {string} key - Storage key
 * @returns {boolean} True if key exists
 */
export function hasItem(key) {
    if (!isStorageAvailable()) {
        return false;
    }
    
    return localStorage.getItem(key) !== null;
}

/**
 * Clear all localStorage data
 * @returns {boolean} True if successful
 */
export function clear() {
    if (!isStorageAvailable()) {
        return false;
    }
    
    try {
        localStorage.clear();
        
        if (DEBUG.ENABLED) {
            console.debug('Storage: Cleared all data');
        }
        
        return true;
    } catch (error) {
        console.error('Storage: Failed to clear data:', error);
        return false;
    }
}

// =============================================================================
// GAME-SPECIFIC STORAGE OPERATIONS
// =============================================================================

/**
 * Save game progress
 * @param {object} progressData - Game progress data
 * @returns {boolean} True if successful
 */
export function saveGameProgress(progressData) {
    return setItem(STORAGE_KEYS.GAME_PROGRESS, {
        ...progressData,
        lastSaved: Date.now()
    });
}

/**
 * Load game progress
 * @returns {object|null} Game progress data or null if not found
 */
export function loadGameProgress() {
    return getItem(STORAGE_KEYS.GAME_PROGRESS, null);
}

/**
 * Save game settings
 * @param {object} settings - Game settings
 * @returns {boolean} True if successful
 */
export function saveSettings(settings) {
    return setItem(STORAGE_KEYS.SETTINGS, settings);
}

/**
 * Load game settings
 * @param {object} defaultSettings - Default settings to use if none exist
 * @returns {object} Game settings
 */
export function loadSettings(defaultSettings = {}) {
    return getItem(STORAGE_KEYS.SETTINGS, defaultSettings);
}

/**
 * Save high scores
 * @param {Array} scores - Array of high score objects
 * @returns {boolean} True if successful
 */
export function saveHighScores(scores) {
    return setItem(STORAGE_KEYS.HIGH_SCORES, scores);
}

/**
 * Load high scores
 * @returns {Array} Array of high score objects
 */
export function loadHighScores() {
    return getItem(STORAGE_KEYS.HIGH_SCORES, []);
}

/**
 * Save current game state
 * @param {object} gameState - Current game state
 * @returns {boolean} True if successful
 */
export function saveCurrentGame(gameState) {
    return setItem(STORAGE_KEYS.CURRENT_GAME, gameState);
}

/**
 * Load current game state
 * @returns {object|null} Current game state or null if not found
 */
export function loadCurrentGame() {
    return getItem(STORAGE_KEYS.CURRENT_GAME, null);
}

/**
 * Clear current game state (after completing or abandoning)
 * @returns {boolean} True if successful
 */
export function clearCurrentGame() {
    return removeItem(STORAGE_KEYS.CURRENT_GAME);
}

/**
 * Save analytics data
 * @param {object} analyticsData - Analytics data
 * @returns {boolean} True if successful
 */
export function saveAnalytics(analyticsData) {
    return setItem(STORAGE_KEYS.ANALYTICS, analyticsData);
}

/**
 * Load analytics data
 * @returns {object} Analytics data
 */
export function loadAnalytics() {
    return getItem(STORAGE_KEYS.ANALYTICS, {
        totalPuzzlesSolved: 0,
        totalTimePlayed: 0,
        totalMoves: 0,
        averageTime: 0,
        bestTime: null,
        gamesPlayed: 0,
        lastPlayed: null
    });
}

// =============================================================================
// ADVANCED STORAGE OPERATIONS
// =============================================================================

/**
 * Get all keys that match a pattern
 * @param {string} pattern - Pattern to match (simple string matching)
 * @returns {Array} Array of matching keys
 */
export function getKeysByPattern(pattern) {
    if (!isStorageAvailable()) {
        return [];
    }
    
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes(pattern)) {
            keys.push(key);
        }
    }
    
    return keys;
}

/**
 * Get multiple items at once
 * @param {Array} keys - Array of keys to retrieve
 * @returns {object} Object with key-value pairs
 */
export function getMultipleItems(keys) {
    const result = {};
    
    for (const key of keys) {
        result[key] = getItem(key);
    }
    
    return result;
}

/**
 * Set multiple items at once
 * @param {object} items - Object with key-value pairs to set
 * @returns {boolean} True if all successful
 */
export function setMultipleItems(items) {
    let success = true;
    
    for (const [key, value] of Object.entries(items)) {
        if (!setItem(key, value)) {
            success = false;
        }
    }
    
    return success;
}

/**
 * Update an existing item by merging with new data
 * @param {string} key - Storage key
 * @param {object} updates - Updates to merge
 * @returns {boolean} True if successful
 */
export function updateItem(key, updates) {
    const existingData = getItem(key, {});
    
    if (typeof existingData === 'object' && existingData !== null) {
        const mergedData = { ...existingData, ...updates };
        return setItem(key, mergedData);
    } else {
        return setItem(key, updates);
    }
}

// =============================================================================
// DATA VALIDATION AND MIGRATION
// =============================================================================

/**
 * Validate stored data structure
 * @param {string} key - Storage key
 * @param {object} schema - Expected schema
 * @returns {boolean} True if data is valid
 */
export function validateData(key, schema) {
    const data = getItem(key);
    
    if (!data) return false;
    
    try {
        // Simple validation - check if required keys exist
        for (const requiredKey of Object.keys(schema)) {
            if (!(requiredKey in data)) {
                return false;
            }
        }
        return true;
    } catch (error) {
        console.error(`Data validation failed for '${key}':`, error);
        return false;
    }
}

/**
 * Migrate data from old format to new format
 * @param {string} key - Storage key
 * @param {Function} migrationFunction - Function to transform old data to new format
 * @returns {boolean} True if migration successful
 */
export function migrateData(key, migrationFunction) {
    try {
        const oldData = getItem(key);
        if (!oldData) return true; // No data to migrate
        
        const newData = migrationFunction(oldData);
        return setItem(key, newData);
    } catch (error) {
        console.error(`Data migration failed for '${key}':`, error);
        return false;
    }
}

// =============================================================================
// STORAGE MAINTENANCE
// =============================================================================

/**
 * Clean up old or invalid data
 * @param {number} maxAge - Maximum age of data in milliseconds (default: 30 days)
 * @returns {number} Number of items cleaned up
 */
export function cleanup(maxAge = 30 * 24 * 60 * 60 * 1000) {
    if (!isStorageAvailable()) {
        return 0;
    }
    
    let cleanedCount = 0;
    const cutoffTime = Date.now() - maxAge;
    const keysToRemove = [];
    
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key) continue;
            
            try {
                const value = localStorage.getItem(key);
                const parsed = JSON.parse(value);
                
                // Check if this is our format with timestamp
                if (parsed && typeof parsed === 'object' && parsed.timestamp) {
                    if (parsed.timestamp < cutoffTime) {
                        keysToRemove.push(key);
                    }
                }
            } catch (parseError) {
                // If we can't parse it, it might be old format or corrupted
                // Only remove if it's one of our keys
                if (Object.values(STORAGE_KEYS).includes(key)) {
                    keysToRemove.push(key);
                }
            }
        }
        
        // Remove identified keys
        for (const key of keysToRemove) {
            removeItem(key);
            cleanedCount++;
        }
        
        if (DEBUG.ENABLED && cleanedCount > 0) {
            console.debug(`Storage cleanup: Removed ${cleanedCount} old items`);
        }
        
    } catch (error) {
        console.error('Storage cleanup failed:', error);
    }
    
    return cleanedCount;
}

/**
 * Export all game data for backup
 * @returns {object} All game data
 */
export function exportGameData() {
    const gameData = {};
    
    for (const [name, key] of Object.entries(STORAGE_KEYS)) {
        const data = getItem(key);
        if (data !== null) {
            gameData[name] = data;
        }
    }
    
    return {
        exportDate: new Date().toISOString(),
        version: '1.0.0',
        data: gameData
    };
}

/**
 * Import game data from backup
 * @param {object} backupData - Backup data to import
 * @returns {boolean} True if successful
 */
export function importGameData(backupData) {
    if (!backupData || !backupData.data) {
        console.error('Invalid backup data format');
        return false;
    }
    
    try {
        let importedCount = 0;
        
        for (const [name, value] of Object.entries(backupData.data)) {
            const key = STORAGE_KEYS[name];
            if (key && setItem(key, value)) {
                importedCount++;
            }
        }
        
        if (DEBUG.ENABLED) {
            console.debug(`Storage import: Imported ${importedCount} items`);
        }
        
        return importedCount > 0;
    } catch (error) {
        console.error('Storage import failed:', error);
        return false;
    }
}

// =============================================================================
// EVENT SYSTEM FOR STORAGE CHANGES
// =============================================================================

/**
 * Listen for storage changes (from other tabs/windows)
 * @param {Function} callback - Callback function to call on storage change
 * @returns {Function} Cleanup function to remove listener
 */
export function onStorageChange(callback) {
    const handleStorageChange = (event) => {
        if (event.storageArea === localStorage) {
            callback({
                key: event.key,
                oldValue: event.oldValue,
                newValue: event.newValue,
                url: event.url
            });
        }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Return cleanup function
    return () => {
        window.removeEventListener('storage', handleStorageChange);
    };
}

// =============================================================================
// STORAGE STATISTICS AND DEBUGGING
// =============================================================================

/**
 * Get detailed storage statistics
 * @returns {object} Detailed storage statistics
 */
export function getStorageStatistics() {
    const info = getStorageInfo();
    const gameKeys = Object.values(STORAGE_KEYS);
    const gameData = {};
    let totalGameDataSize = 0;
    
    // Analyze game-specific data
    gameKeys.forEach(key => {
        if (hasItem(key)) {
            const value = localStorage.getItem(key);
            const size = value ? value.length : 0;
            gameData[key] = {
                exists: true,
                size: size,
                sizeMB: (size / (1024 * 1024)).toFixed(4)
            };
            totalGameDataSize += size;
        } else {
            gameData[key] = { exists: false, size: 0, sizeMB: '0.0000' };
        }
    });
    
    return {
        ...info,
        gameData,
        totalGameDataSize,
        totalGameDataMB: (totalGameDataSize / (1024 * 1024)).toFixed(4),
        gameDataPercentage: info.used > 0 ? ((totalGameDataSize / info.used) * 100).toFixed(1) : 0
    };
}

/**
 * Log storage statistics to console
 */
export function logStorageStatistics() {
    const stats = getStorageStatistics();
    
    console.group('📊 Storage Statistics');
    console.log('Available:', stats.available);
    console.log('Used:', `${stats.usedMB} MB (${stats.usagePercentage}%)`);
    console.log('Remaining:', `${stats.remainingMB} MB`);
    console.log('Game Data:', `${stats.totalGameDataMB} MB (${stats.gameDataPercentage}% of used)`);
    
    console.group('Game Data Details:');
    Object.entries(stats.gameData).forEach(([key, data]) => {
        if (data.exists) {
            console.log(`${key}:`, `${data.sizeMB} MB`);
        }
    });
    console.groupEnd();
    
    console.groupEnd();
}

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize storage system
 * @returns {boolean} True if initialization successful
 */
export function initializeStorage() {
    if (!isStorageAvailable()) {
        console.warn('Local storage is not available. Game progress will not be saved.');
        return false;
    }
    
    // Run cleanup on initialization
    cleanup();
    
    if (DEBUG.ENABLED) {
        console.debug('Storage system initialized');
        logStorageStatistics();
    }
    
    return true;
}

// Auto-initialize when module is loaded
if (typeof window !== 'undefined') {
    initializeStorage();
}