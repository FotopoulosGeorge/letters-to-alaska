/**
 * StateManager.js - Game State Management
 * Handles saving, loading, and managing all game state and progress
 */

import { EVENTS, GAME_STATES, DEBUG, DEFAULT_SETTINGS } from '../utils/Constants.js';
import {
    isStorageAvailable,
    saveGameProgress,
    loadGameProgress,
    saveSettings,
    loadSettings,
    saveCurrentGame,
    loadCurrentGame,
    clearCurrentGame,
    saveAnalytics,
    loadAnalytics,
    updateItem,
    validateData,
    migrateData,
    onStorageChange
} from '../utils/StorageUtils.js';
import { EventEmitter } from '../utils/EventEmitter.js';

// =============================================================================
// STATE MANAGER CLASS
// =============================================================================

export class StateManager extends EventEmitter {
    constructor(gameEngine = null) {
        super();
        
        this.gameEngine = gameEngine;
        this.isInitialized = false;
        this.autoSaveEnabled = true;
        this.autoSaveInterval = 30000; // 30 seconds
        this.autoSaveTimer = null;
        this.storageAvailable = false;
        this.lastSaveTime = null;
        this.storageChangeListener = null;
        
        // State schemas for validation
        this.schemas = {
            gameProgress: {
                currentLevel: 'number',
                currentPuzzle: 'number',
                totalPuzzlesSolved: 'number',
                totalTimePlayed: 'number',
                highestLevelReached: 'number',
                unlockedLevels: 'object'
            },
            settings: {
                soundEnabled: 'boolean',
                musicEnabled: 'boolean',
                animationsEnabled: 'boolean',
                showHints: 'boolean',
                autoSave: 'boolean'
            },
            currentGame: {
                gameData: 'object',
                puzzleState: 'object',
                timestamp: 'number'
            }
        };
        
        this._initialize();
    }

    // =============================================================================
    // INITIALIZATION
    // =============================================================================

    /**
     * Initialize the state manager
     * @private
     */
    _initialize() {
        this.storageAvailable = isStorageAvailable();
        
        if (!this.storageAvailable) {
            console.warn('StateManager: Local storage not available. Game state will not persist.');
            this.autoSaveEnabled = false;
        }
        
        // Set up storage change listener for multi-tab synchronization
        if (this.storageAvailable) {
            this.storageChangeListener = onStorageChange(this._handleStorageChange.bind(this));
        }
        
        // Migrate any old data
        this._migrateOldData();
        
        // Start auto-save if enabled
        if (this.autoSaveEnabled) {
            this._startAutoSave();
        }
        
        this.isInitialized = true;
        
        if (DEBUG.ENABLED) {
            console.debug('StateManager initialized');
        }
    }

    /**
     * Set the game engine reference
     * @param {GameEngine} gameEngine - Game engine instance
     */
    setGameEngine(gameEngine) {
        this.gameEngine = gameEngine;
        
        if (gameEngine) {
            // Listen to game events for auto-save triggers
            gameEngine.on(EVENTS.TILE_MOVED, this._handleGameAction.bind(this));
            gameEngine.on(EVENTS.PUZZLE_SOLVED, this._handlePuzzleSolved.bind(this));
            gameEngine.on(EVENTS.LEVEL_COMPLETE, this._handleLevelComplete.bind(this));
        }
    }

    // =============================================================================
    // GAME PROGRESS MANAGEMENT
    // =============================================================================

    /**
     * Save game progress
     * @param {object} progressData - Progress data to save
     * @returns {boolean} True if successful
     */
    saveProgress(progressData = null) {
        if (!this.storageAvailable) {
            return false;
        }
        
        try {
            let dataToSave = progressData;
            
            // If no data provided, get from game engine
            if (!dataToSave && this.gameEngine) {
                dataToSave = this._extractProgressFromEngine();
            }
            
            if (!dataToSave) {
                console.warn('StateManager: No progress data to save');
                return false;
            }
            
            // Add metadata
            const progressWithMetadata = {
                ...dataToSave,
                lastSaved: Date.now(),
                version: '1.0.0'
            };
            
            const success = saveGameProgress(progressWithMetadata);
            
            if (success) {
                this.lastSaveTime = Date.now();
                this.emit(EVENTS.PROGRESS_SAVED, progressWithMetadata);
                
                if (DEBUG.ENABLED) {
                    console.debug('Game progress saved:', progressWithMetadata);
                }
            }
            
            return success;
        } catch (error) {
            console.error('StateManager: Failed to save progress:', error);
            return false;
        }
    }

    /**
     * Load game progress
     * @returns {object|null} Loaded progress data or null if not found
     */
    loadProgress() {
        if (!this.storageAvailable) {
            return null;
        }
        
        try {
            const progressData = loadGameProgress();
            
            if (!progressData) {
                return null;
            }
            
            // Validate data structure
            if (!this._validateProgressData(progressData)) {
                console.warn('StateManager: Invalid progress data format, resetting');
                return this._createDefaultProgress();
            }
            
            this.emit(EVENTS.PROGRESS_LOADED, progressData);
            
            if (DEBUG.ENABLED) {
                console.debug('Game progress loaded:', progressData);
            }
            
            return progressData;
        } catch (error) {
            console.error('StateManager: Failed to load progress:', error);
            return this._createDefaultProgress();
        }
    }

    /**
     * Reset game progress to defaults
     * @returns {boolean} True if successful
     */
    resetProgress() {
        const defaultProgress = this._createDefaultProgress();
        const success = this.saveProgress(defaultProgress);
        
        if (success) {
            this.emit(EVENTS.PROGRESS_RESET, defaultProgress);
            
            if (DEBUG.ENABLED) {
                console.debug('Game progress reset');
            }
        }
        
        return success;
    }

    /**
     * Update specific progress data
     * @param {object} updates - Progress updates
     * @returns {boolean} True if successful
     */
    updateProgress(updates) {
        if (!this.storageAvailable) {
            return false;
        }
        
        try {
            const currentProgress = this.loadProgress() || this._createDefaultProgress();
            const updatedProgress = { ...currentProgress, ...updates };
            
            return this.saveProgress(updatedProgress);
        } catch (error) {
            console.error('StateManager: Failed to update progress:', error);
            return false;
        }
    }

    // =============================================================================
    // SETTINGS MANAGEMENT
    // =============================================================================

    /**
     * Save game settings
     * @param {object} settings - Settings to save
     * @returns {boolean} True if successful
     */
    saveGameSettings(settings) {
        if (!this.storageAvailable) {
            return false;
        }
        
        try {
            const settingsToSave = {
                ...DEFAULT_SETTINGS,
                ...settings,
                lastUpdated: Date.now()
            };
            
            const success = saveSettings(settingsToSave);
            
            if (success) {
                this.emit(EVENTS.SETTINGS_CHANGED, settingsToSave);
                
                // Update auto-save setting
                if (settingsToSave.hasOwnProperty('autoSave')) {
                    this.setAutoSave(settingsToSave.autoSave);
                }
                
                if (DEBUG.ENABLED) {
                    console.debug('Game settings saved:', settingsToSave);
                }
            }
            
            return success;
        } catch (error) {
            console.error('StateManager: Failed to save settings:', error);
            return false;
        }
    }

    /**
     * Load game settings
     * @returns {object} Loaded settings
     */
    loadGameSettings() {
        if (!this.storageAvailable) {
            return { ...DEFAULT_SETTINGS };
        }
        
        try {
            const settings = loadSettings(DEFAULT_SETTINGS);
            
            // Validate settings
            const validatedSettings = this._validateAndFixSettings(settings);
            
            if (DEBUG.ENABLED) {
                console.debug('Game settings loaded:', validatedSettings);
            }
            
            return validatedSettings;
        } catch (error) {
            console.error('StateManager: Failed to load settings:', error);
            return { ...DEFAULT_SETTINGS };
        }
    }

    /**
     * Reset settings to defaults
     * @returns {boolean} True if successful
     */
    resetSettings() {
        return this.saveGameSettings(DEFAULT_SETTINGS);
    }

    // =============================================================================
    // CURRENT GAME STATE MANAGEMENT
    // =============================================================================

    /**
     * Save current game state (for resume functionality)
     * @param {object} gameState - Current game state
     * @returns {boolean} True if successful
     */
    saveCurrentGameState(gameState = null) {
        if (!this.storageAvailable || !this.autoSaveEnabled) {
            return false;
        }
        
        try {
            let stateToSave = gameState;
            
            // If no state provided, get from game engine
            if (!stateToSave && this.gameEngine) {
                stateToSave = this._extractCurrentStateFromEngine();
            }
            
            if (!stateToSave) {
                return false;
            }
            
            const stateWithMetadata = {
                ...stateToSave,
                timestamp: Date.now(),
                version: '1.0.0'
            };
            
            const success = saveCurrentGame(stateWithMetadata);
            
            if (success && DEBUG.ENABLED) {
                console.debug('Current game state saved');
            }
            
            return success;
        } catch (error) {
            console.error('StateManager: Failed to save current game state:', error);
            return false;
        }
    }

    /**
     * Load current game state
     * @returns {object|null} Current game state or null if not found
     */
    loadCurrentGameState() {
        if (!this.storageAvailable) {
            return null;
        }
        
        try {
            const gameState = loadCurrentGame();
            
            if (!gameState) {
                return null;
            }
            
            // Validate state
            if (!this._validateCurrentGameState(gameState)) {
                console.warn('StateManager: Invalid current game state, clearing');
                clearCurrentGame();
                return null;
            }
            
            if (DEBUG.ENABLED) {
                console.debug('Current game state loaded');
            }
            
            return gameState;
        } catch (error) {
            console.error('StateManager: Failed to load current game state:', error);
            return null;
        }
    }

    /**
     * Clear current game state (when game is completed or abandoned)
     * @returns {boolean} True if successful
     */
    clearCurrentGameState() {
        const success = clearCurrentGame();
        
        if (success && DEBUG.ENABLED) {
            console.debug('Current game state cleared');
        }
        
        return success;
    }

    /**
     * Check if there's a saved game to continue
     * @returns {boolean} True if saved game exists
     */
    hasSavedGame() {
        return this.loadCurrentGameState() !== null;
    }

    // =============================================================================
    // ANALYTICS AND STATISTICS
    // =============================================================================

    /**
     * Update analytics data
     * @param {object} data - Analytics data to update
     * @returns {boolean} True if successful
     */
    updateAnalytics(data) {
        if (!this.storageAvailable) {
            return false;
        }
        
        try {
            const currentAnalytics = loadAnalytics();
            const updatedAnalytics = {
                ...currentAnalytics,
                ...data,
                lastUpdated: Date.now()
            };
            
            return saveAnalytics(updatedAnalytics);
        } catch (error) {
            console.error('StateManager: Failed to update analytics:', error);
            return false;
        }
    }

    /**
     * Get analytics data
     * @returns {object} Analytics data
     */
    getAnalytics() {
        if (!this.storageAvailable) {
            return {};
        }
        
        return loadAnalytics();
    }

    /**
     * Record puzzle completion for analytics
     * @param {object} puzzleStats - Puzzle completion statistics
     */
    recordPuzzleCompletion(puzzleStats) {
        const analytics = this.getAnalytics();
        
        const updates = {
            totalPuzzlesSolved: (analytics.totalPuzzlesSolved || 0) + 1,
            totalTimePlayed: (analytics.totalTimePlayed || 0) + puzzleStats.elapsedTime,
            totalMoves: (analytics.totalMoves || 0) + puzzleStats.moveCount,
            lastPlayed: Date.now()
        };
        
        // Update best time if this is better
        if (!analytics.bestTime || puzzleStats.elapsedTime < analytics.bestTime) {
            updates.bestTime = puzzleStats.elapsedTime;
        }
        
        // Calculate running average
        updates.averageTime = updates.totalTimePlayed / updates.totalPuzzlesSolved;
        
        this.updateAnalytics(updates);
    }

    // =============================================================================
    // AUTO-SAVE FUNCTIONALITY
    // =============================================================================

    /**
     * Enable or disable auto-save
     * @param {boolean} enabled - Whether to enable auto-save
     */
    setAutoSave(enabled) {
        this.autoSaveEnabled = enabled && this.storageAvailable;
        
        if (this.autoSaveEnabled) {
            this._startAutoSave();
        } else {
            this._stopAutoSave();
        }
        
        if (DEBUG.ENABLED) {
            console.debug('Auto-save', enabled ? 'enabled' : 'disabled');
        }
    }

    /**
     * Set auto-save interval
     * @param {number} interval - Interval in milliseconds
     */
    setAutoSaveInterval(interval) {
        this.autoSaveInterval = Math.max(5000, interval); // Minimum 5 seconds
        
        if (this.autoSaveEnabled) {
            this._startAutoSave(); // Restart with new interval
        }
    }

    /**
     * Trigger manual save
     * @returns {boolean} True if successful
     */
    manualSave() {
        if (!this.gameEngine) {
            return false;
        }
        
        // Save both progress and current state
        const progressSaved = this.saveProgress();
        const stateSaved = this.saveCurrentGameState();
        
        if (progressSaved || stateSaved) {
            this.emit(EVENTS.MANUAL_SAVE_COMPLETED);
            return true;
        }
        
        return false;
    }

    /**
     * Start auto-save timer
     * @private
     */
    _startAutoSave() {
        this._stopAutoSave(); // Clear existing timer
        
        if (!this.autoSaveEnabled) {
            return;
        }
        
        this.autoSaveTimer = setInterval(() => {
            if (this.gameEngine && this.gameEngine.gameState === GAME_STATES.PLAYING) {
                this.saveCurrentGameState();
            }
        }, this.autoSaveInterval);
        
        if (DEBUG.ENABLED) {
            console.debug(`Auto-save started with ${this.autoSaveInterval / 1000}s interval`);
        }
    }

    /**
     * Stop auto-save timer
     * @private
     */
    _stopAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
            this.autoSaveTimer = null;
        }
    }

    // =============================================================================
    // EVENT HANDLERS
    // =============================================================================

    /**
     * Handle game actions that should trigger auto-save
     * @param {object} eventData - Event data
     * @private
     */
    _handleGameAction(eventData) {
        // Debounce auto-save to avoid too frequent saves
        if (this.lastSaveTime && Date.now() - this.lastSaveTime < 5000) {
            return;
        }
        
        this.saveCurrentGameState();
    }

    /**
     * Handle puzzle solved event
     * @param {object} eventData - Event data
     * @private
     */
    _handlePuzzleSolved(eventData) {
        // Record completion in analytics
        this.recordPuzzleCompletion(eventData.stats);
        
        // Update progress
        this.updateProgress({
            totalPuzzlesSolved: (this.loadProgress()?.totalPuzzlesSolved || 0) + 1
        });
        
        // Save current state
        this.saveCurrentGameState();
    }

    /**
     * Handle level complete event
     * @param {object} eventData - Event data
     * @private
     */
    _handleLevelComplete(eventData) {
        const currentProgress = this.loadProgress() || this._createDefaultProgress();
        
        this.updateProgress({
            currentLevel: eventData.level,
            highestLevelReached: Math.max(currentProgress.highestLevelReached || 1, eventData.level),
            unlockedLevels: {
                ...currentProgress.unlockedLevels,
                [eventData.level]: true
            }
        });
    }

    /**
     * Handle storage changes from other tabs
     * @param {object} changeData - Storage change data
     * @private
     */
    _handleStorageChange(changeData) {
        // Emit event so UI can react to changes from other tabs
        this.emit(EVENTS.STORAGE_CHANGED, changeData);
        
        if (DEBUG.ENABLED) {
            console.debug('Storage changed in another tab:', changeData.key);
        }
    }

    // =============================================================================
    // DATA EXTRACTION FROM GAME ENGINE
    // =============================================================================

    /**
     * Extract progress data from game engine
     * @returns {object} Progress data
     * @private
     */
    _extractProgressFromEngine() {
        if (!this.gameEngine) {
            return null;
        }
        
        const gameData = this.gameEngine.gameData;
        const currentProgress = this.loadProgress() || this._createDefaultProgress();
        
        return {
            ...currentProgress,
            currentLevel: gameData.currentLevel,
            currentPuzzle: gameData.currentPuzzle,
            highestLevelReached: Math.max(currentProgress.highestLevelReached || 1, gameData.currentLevel),
            lastPlayed: Date.now()
        };
    }

    /**
     * Extract current state from game engine
     * @returns {object} Current game state
     * @private
     */
    _extractCurrentStateFromEngine() {
        if (!this.gameEngine) {
            return null;
        }
        
        return {
            gameData: this.gameEngine.gameData,
            gameState: this.gameEngine.gameState,
            puzzleState: this.gameEngine.components.puzzle ? 
                        this.gameEngine.components.puzzle.exportState() : null,
            hudState: this.gameEngine.components.hud ? 
                      this.gameEngine.components.hud.getStatistics() : null
        };
    }

    // =============================================================================
    // DATA VALIDATION AND MIGRATION
    // =============================================================================

    /**
     * Validate progress data structure
     * @param {object} data - Progress data to validate
     * @returns {boolean} True if valid
     * @private
     */
    _validateProgressData(data) {
        if (!data || typeof data !== 'object') {
            return false;
        }
        
        const requiredFields = ['currentLevel', 'currentPuzzle', 'totalPuzzlesSolved'];
        return requiredFields.every(field => data.hasOwnProperty(field));
    }

    /**
     * Validate and fix settings data
     * @param {object} settings - Settings to validate
     * @returns {object} Validated settings
     * @private
     */
    _validateAndFixSettings(settings) {
        const validatedSettings = { ...DEFAULT_SETTINGS };
        
        // Validate each setting
        Object.keys(DEFAULT_SETTINGS).forEach(key => {
            if (settings.hasOwnProperty(key) && 
                typeof settings[key] === typeof DEFAULT_SETTINGS[key]) {
                validatedSettings[key] = settings[key];
            }
        });
        
        return validatedSettings;
    }

    /**
     * Validate current game state
     * @param {object} state - State to validate
     * @returns {boolean} True if valid
     * @private
     */
    _validateCurrentGameState(state) {
        if (!state || typeof state !== 'object') {
            return false;
        }
        
        return state.hasOwnProperty('gameData') && 
               state.hasOwnProperty('timestamp') &&
               Date.now() - state.timestamp < 7 * 24 * 60 * 60 * 1000; // Not older than 7 days
    }

    /**
     * Create default progress data
     * @returns {object} Default progress data
     * @private
     */
    _createDefaultProgress() {
        return {
            currentLevel: 1,
            currentPuzzle: 1,
            totalPuzzlesSolved: 0,
            totalTimePlayed: 0,
            highestLevelReached: 1,
            unlockedLevels: { 1: true },
            firstPlayed: Date.now(),
            lastPlayed: Date.now()
        };
    }

    /**
     * Migrate old data to new format
     * @private
     */
    _migrateOldData() {
        // TODO: Implement migration logic if needed when data format changes
        if (DEBUG.ENABLED) {
            console.debug('Data migration check completed');
        }
    }

    // =============================================================================
    // CLEANUP AND DESTRUCTION
    // =============================================================================

    /**
     * Cleanup state manager resources
     */
    destroy() {
        // Stop auto-save
        this._stopAutoSave();
        
        // Remove storage change listener
        if (this.storageChangeListener) {
            this.storageChangeListener();
        }
        
        // Unsubscribe from game engine events
        if (this.gameEngine) {
            this.gameEngine.off(EVENTS.TILE_MOVED, this._handleGameAction);
            this.gameEngine.off(EVENTS.PUZZLE_SOLVED, this._handlePuzzleSolved);
            this.gameEngine.off(EVENTS.LEVEL_COMPLETE, this._handleLevelComplete);
        }
        
        // Clear references
        this.gameEngine = null;
        
        // Remove all event listeners
        this.removeAllListeners();
        
        if (DEBUG.ENABLED) {
            console.debug('StateManager destroyed');
        }
    }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create a new StateManager instance
 * @param {GameEngine} gameEngine - Game engine instance (optional)
 * @returns {StateManager} New StateManager instance
 */
export function createStateManager(gameEngine = null) {
    return new StateManager(gameEngine);
}

// =============================================================================
// EXPORTS
// =============================================================================

export default StateManager;