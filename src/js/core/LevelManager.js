/**
 * LevelManager.js - Level Progression and Story System
 * Manages level progression, story unlocks, achievements, and content delivery
 */

import { EVENTS, PATHS, DEBUG } from '../utils/Constants.js';
import { EventEmitter } from '../utils/EventEmitter.js';

// =============================================================================
// LEVEL MANAGER CLASS
// =============================================================================

export class LevelManager extends EventEmitter {
    constructor(stateManager = null) {
        super();
        
        this.stateManager = stateManager;
        this.gameConfig = null;
        this.levelData = new Map();
        this.storyContent = new Map();
        this.currentLevel = 1;
        this.currentPuzzle = 1;
        this.isInitialized = false;
        this.progressData = {
            unlockedLevels: new Set([1]),
            completedLevels: new Set(),
            completedPuzzles: new Map(), // level -> Set of completed puzzle indices
            storyUnlocks: new Set(),
            achievements: new Set(),
            totalScore: 0,
            bestTimes: new Map(), // level-puzzle -> time
            perfectSolutions: new Set() // level-puzzle combinations solved perfectly
        };
        
        this._initialize();
    }

    // =============================================================================
    // INITIALIZATION
    // =============================================================================

    /**
     * Initialize the level manager
     * @private
     */
    async _initialize() {
        try {
            await this._loadGameConfig();
            await this._loadProgressData();
            
            this.isInitialized = true;
            this.emit(EVENTS.LEVEL_MANAGER_READY);
            
            if (DEBUG.ENABLED) {
                console.debug('LevelManager initialized');
            }
        } catch (error) {
            console.error('Failed to initialize LevelManager:', error);
            this._initializeDefaults();
        }
    }

    /**
     * Load game configuration from JSON
     * @private
     */
    async _loadGameConfig() {
        try {
            const response = await fetch(`${PATHS.CONFIG}game-config.json`);
            if (!response.ok) {
                throw new Error(`Failed to load game config: ${response.status}`);
            }
            
            this.gameConfig = await response.json();
            
            if (DEBUG.ENABLED) {
                console.debug('Game config loaded:', this.gameConfig);
            }
        } catch (error) {
            console.error('Error loading game config:', error);
            this._createDefaultConfig();
        }
    }

    /**
     * Load progress data from state manager
     * @private
     */
    _loadProgressData() {
        if (!this.stateManager) {
            return;
        }
        
        const savedProgress = this.stateManager.loadProgress();
        if (savedProgress) {
            this.currentLevel = savedProgress.currentLevel || 1;
            this.currentPuzzle = savedProgress.currentPuzzle || 1;
            
            // Convert saved data to internal format
            if (savedProgress.unlockedLevels) {
                this.progressData.unlockedLevels = new Set(Object.keys(savedProgress.unlockedLevels).map(Number));
            }
            
            if (savedProgress.completedLevels) {
                this.progressData.completedLevels = new Set(savedProgress.completedLevels);
            }
            
            if (savedProgress.storyUnlocks) {
                this.progressData.storyUnlocks = new Set(savedProgress.storyUnlocks);
            }
            
            if (savedProgress.achievements) {
                this.progressData.achievements = new Set(savedProgress.achievements);
            }
            
            this.progressData.totalScore = savedProgress.totalScore || 0;
        }
    }

    /**
     * Initialize with default values if loading fails
     * @private
     */
    _initializeDefaults() {
        this.gameConfig = this._createDefaultConfig();
        this.progressData = {
            unlockedLevels: new Set([1]),
            completedLevels: new Set(),
            completedPuzzles: new Map(),
            storyUnlocks: new Set(),
            achievements: new Set(),
            totalScore: 0,
            bestTimes: new Map(),
            perfectSolutions: new Set()
        };
        this.isInitialized = true;
    }

    /**
     * Create default game configuration
     * @private
     */
    _createDefaultConfig() {
        return {
            gameInfo: {
                maxLevels: 5,
                puzzlesPerLevel: 9
            },
            levels: {
                1: {
                    name: "Garden Beginnings",
                    description: "Learn the basics in a peaceful garden setting",
                    theme: "garden",
                    difficulty: "easy",
                    puzzleCount: 9,
                    requiredCompletions: 6
                }
            },
            difficulty: {
                easy: { boardSize: 3, maxMoves: 50, shuffleMoves: 20 },
                medium: { boardSize: 4, maxMoves: 80, shuffleMoves: 35 },
                hard: { boardSize: 4, maxMoves: 60, shuffleMoves: 45 }
            }
        };
    }

    // =============================================================================
    // LEVEL DATA MANAGEMENT
    // =============================================================================

    /**
     * Load level data for a specific level
     * @param {number} levelNumber - Level number to load
     * @returns {Promise<object>} Level data
     */
    async loadLevel(levelNumber) {
        // Check cache first
        if (this.levelData.has(levelNumber)) {
            return this.levelData.get(levelNumber);
        }
        
        try {
            const response = await fetch(`${PATHS.LEVELS}level-${levelNumber}.json`);
            if (!response.ok) {
                throw new Error(`Level ${levelNumber} not found`);
            }
            
            const levelData = await response.json();
            
            // Validate level data
            if (!this._validateLevelData(levelData)) {
                throw new Error(`Invalid level data for level ${levelNumber}`);
            }
            
            // Cache the level data
            this.levelData.set(levelNumber, levelData);
            
            if (DEBUG.ENABLED) {
                console.debug(`Level ${levelNumber} loaded:`, levelData);
            }
            
            return levelData;
        } catch (error) {
            console.error(`Failed to load level ${levelNumber}:`, error);
            return this._generateFallbackLevel(levelNumber);
        }
    }

    /**
     * Get level metadata from config
     * @param {number} levelNumber - Level number
     * @returns {object} Level metadata
     */
    getLevelInfo(levelNumber) {
        if (!this.gameConfig?.levels?.[levelNumber]) {
            return this._getDefaultLevelInfo(levelNumber);
        }
        
        return {
            ...this.gameConfig.levels[levelNumber],
            levelNumber,
            isUnlocked: this.isLevelUnlocked(levelNumber),
            isCompleted: this.isLevelCompleted(levelNumber),
            completedPuzzles: this.getCompletedPuzzlesCount(levelNumber),
            totalPuzzles: this.gameConfig.levels[levelNumber].puzzleCount || 9
        };
    }

    /**
     * Get all available levels info
     * @returns {Array} Array of level info objects
     */
    getAllLevelsInfo() {
        const maxLevels = this.gameConfig?.gameInfo?.maxLevels || 5;
        const levels = [];
        
        for (let i = 1; i <= maxLevels; i++) {
            levels.push(this.getLevelInfo(i));
        }
        
        return levels;
    }

    /**
     * Validate level data structure
     * @param {object} levelData - Level data to validate
     * @returns {boolean} True if valid
     * @private
     */
    _validateLevelData(levelData) {
        return levelData &&
               typeof levelData === 'object' &&
               Array.isArray(levelData.puzzles) &&
               levelData.puzzles.length > 0;
    }

    /**
     * Generate fallback level data
     * @param {number} levelNumber - Level number
     * @returns {object} Fallback level data
     * @private
     */
    _generateFallbackLevel(levelNumber) {
        const puzzleCount = this.gameConfig?.levels?.[levelNumber]?.puzzleCount || 9;
        const puzzles = [];
        
        for (let i = 1; i <= puzzleCount; i++) {
            puzzles.push({
                id: i,
                name: `Puzzle ${i}`,
                difficulty: this._getDifficultyForLevel(levelNumber),
                maxMoves: this._getMaxMovesForLevel(levelNumber),
                shuffleMoves: this._getShuffleMovesForLevel(levelNumber)
            });
        }
        
        return {
            level: levelNumber,
            puzzles,
            story: {
                intro: `Welcome to Level ${levelNumber}!`,
                completion: `Level ${levelNumber} completed!`
            }
        };
    }

    // =============================================================================
    // PROGRESSION MANAGEMENT
    // =============================================================================

    /**
     * Set current level and puzzle
     * @param {number} level - Level number
     * @param {number} puzzle - Puzzle number
     */
    setCurrentPosition(level, puzzle = 1) {
        this.currentLevel = level;
        this.currentPuzzle = puzzle;
        
        this.emit(EVENTS.LEVEL_CHANGED, {
            level: this.currentLevel,
            puzzle: this.currentPuzzle,
            levelInfo: this.getLevelInfo(level)
        });
        
        this._saveProgress();
    }

    /**
     * Complete current puzzle and advance
     * @param {object} puzzleStats - Puzzle completion statistics
     * @returns {object} Progression result
     */
    completePuzzle(puzzleStats) {
        const level = this.currentLevel;
        const puzzle = this.currentPuzzle;
        const puzzleKey = `${level}-${puzzle}`;
        
        // Record completion
        if (!this.progressData.completedPuzzles.has(level)) {
            this.progressData.completedPuzzles.set(level, new Set());
        }
        this.progressData.completedPuzzles.get(level).add(puzzle);
        
        // Record best time
        const previousBest = this.progressData.bestTimes.get(puzzleKey);
        if (!previousBest || puzzleStats.elapsedTime < previousBest) {
            this.progressData.bestTimes.set(puzzleKey, puzzleStats.elapsedTime);
        }
        
        // Check for perfect solution
        if (puzzleStats.efficiency >= 0.9) { // 90% efficiency or better
            this.progressData.perfectSolutions.add(puzzleKey);
        }
        
        // Calculate score
        const score = this._calculatePuzzleScore(puzzleStats, level);
        this.progressData.totalScore += score;
        
        // Check for level completion
        const levelCompletion = this._checkLevelCompletion(level);
        
        // Prepare result
        const result = {
            level,
            puzzle,
            score,
            totalScore: this.progressData.totalScore,
            newBestTime: !previousBest || puzzleStats.elapsedTime < previousBest,
            perfectSolution: this.progressData.perfectSolutions.has(puzzleKey),
            levelCompleted: levelCompletion.completed,
            newAchievements: [],
            storyUnlocks: []
        };
        
        // Handle level completion
        if (levelCompletion.completed && !this.progressData.completedLevels.has(level)) {
            result.newAchievements.push(...this._handleLevelCompletion(level));
            result.storyUnlocks.push(...this._unlockStoryContent(level));
        }
        
        // Advance to next puzzle or level
        const advancement = this._advancePosition();
        result.nextLevel = advancement.level;
        result.nextPuzzle = advancement.puzzle;
        result.gameCompleted = advancement.gameCompleted;
        
        // Check achievements
        result.newAchievements.push(...this._checkAchievements(puzzleStats, level, puzzle));
        
        this._saveProgress();
        
        this.emit(EVENTS.PUZZLE_COMPLETED, result);
        
        if (DEBUG.ENABLED) {
            console.debug('Puzzle completed:', result);
        }
        
        return result;
    }

    /**
     * Advance to next puzzle or level
     * @returns {object} New position
     * @private
     */
    _advancePosition() {
        const levelInfo = this.getLevelInfo(this.currentLevel);
        const maxPuzzles = levelInfo.totalPuzzles;
        
        if (this.currentPuzzle < maxPuzzles) {
            // Next puzzle in same level
            this.currentPuzzle++;
            return {
                level: this.currentLevel,
                puzzle: this.currentPuzzle,
                gameCompleted: false
            };
        } else {
            // Next level
            const maxLevels = this.gameConfig?.gameInfo?.maxLevels || 5;
            if (this.currentLevel < maxLevels) {
                this.currentLevel++;
                this.currentPuzzle = 1;
                this._unlockLevel(this.currentLevel);
                
                return {
                    level: this.currentLevel,
                    puzzle: this.currentPuzzle,
                    gameCompleted: false
                };
            } else {
                // Game completed!
                return {
                    level: this.currentLevel,
                    puzzle: this.currentPuzzle,
                    gameCompleted: true
                };
            }
        }
    }

    /**
     * Check if level is completed
     * @param {number} level - Level number
     * @returns {object} Completion status
     * @private
     */
    _checkLevelCompletion(level) {
        const levelInfo = this.getLevelInfo(level);
        const completedCount = this.getCompletedPuzzlesCount(level);
        const requiredCompletions = levelInfo.requiredCompletions || levelInfo.totalPuzzles;
        
        return {
            completed: completedCount >= requiredCompletions,
            completedCount,
            requiredCount: requiredCompletions,
            totalCount: levelInfo.totalPuzzles
        };
    }

    /**
     * Handle level completion
     * @param {number} level - Completed level
     * @returns {Array} New achievements
     * @private
     */
    _handleLevelCompletion(level) {
        this.progressData.completedLevels.add(level);
        
        const achievements = [];
        const levelCompletionKey = `level_${level}_completed`;
        
        if (!this.progressData.achievements.has(levelCompletionKey)) {
            this.progressData.achievements.add(levelCompletionKey);
            achievements.push({
                id: levelCompletionKey,
                name: `Level ${level} Master`,
                description: `Completed all required puzzles in Level ${level}`,
                type: 'level_completion',
                level
            });
        }
        
        // Check for perfect level completion
        const levelInfo = this.getLevelInfo(level);
        const perfectCount = this._getPerfectSolutionsInLevel(level);
        if (perfectCount === levelInfo.totalPuzzles) {
            const perfectKey = `level_${level}_perfect`;
            if (!this.progressData.achievements.has(perfectKey)) {
                this.progressData.achievements.add(perfectKey);
                achievements.push({
                    id: perfectKey,
                    name: `Perfect ${level}`,
                    description: `Solved all puzzles in Level ${level} with perfect efficiency`,
                    type: 'perfect_level',
                    level
                });
            }
        }
        
        this.emit(EVENTS.LEVEL_COMPLETE, {
            level,
            achievements,
            progressData: this.getProgressSummary()
        });
        
        return achievements;
    }

    // =============================================================================
    // STORY AND CONTENT MANAGEMENT
    // =============================================================================

    /**
     * Unlock story content for a level
     * @param {number} level - Level number
     * @returns {Array} Unlocked story content
     * @private
     */
    _unlockStoryContent(level) {
        const levelInfo = this.getLevelInfo(level);
        const unlockedContent = [];
        
        if (levelInfo.storyUnlocks) {
            for (const storyKey of levelInfo.storyUnlocks) {
                if (!this.progressData.storyUnlocks.has(storyKey)) {
                    this.progressData.storyUnlocks.add(storyKey);
                    unlockedContent.push({
                        key: storyKey,
                        content: this._getStoryContent(storyKey)
                    });
                }
            }
        }
        
        return unlockedContent;
    }

    /**
     * Get story content by key
     * @param {string} storyKey - Story content key
     * @returns {object} Story content
     * @private
     */
    _getStoryContent(storyKey) {
        // This would typically load from story-config.json
        // For now, return placeholder content
        return {
            title: this._formatStoryTitle(storyKey),
            content: `Story content for ${storyKey}...`,
            image: null
        };
    }

    /**
     * Format story title from key
     * @param {string} key - Story key
     * @returns {string} Formatted title
     * @private
     */
    _formatStoryTitle(key) {
        return key.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    // =============================================================================
    // ACHIEVEMENT SYSTEM
    // =============================================================================

    /**
     * Check for achievements based on puzzle completion
     * @param {object} puzzleStats - Puzzle statistics
     * @param {number} level - Level number
     * @param {number} puzzle - Puzzle number
     * @returns {Array} New achievements
     * @private
     */
    _checkAchievements(puzzleStats, level, puzzle) {
        const achievements = [];
        
        // Fast completion achievement
        if (puzzleStats.elapsedTime < 60000) { // Under 1 minute
            const speedKey = 'speed_demon';
            if (!this.progressData.achievements.has(speedKey)) {
                this.progressData.achievements.add(speedKey);
                achievements.push({
                    id: speedKey,
                    name: 'Speed Demon',
                    description: 'Complete a puzzle in under 1 minute',
                    type: 'speed'
                });
            }
        }
        
        // Efficiency achievements
        if (puzzleStats.efficiency >= 1.0) { // Perfect efficiency
            const perfectKey = 'perfectionist';
            if (!this.progressData.achievements.has(perfectKey)) {
                this.progressData.achievements.add(perfectKey);
                achievements.push({
                    id: perfectKey,
                    name: 'Perfectionist',
                    description: 'Complete a puzzle with perfect efficiency',
                    type: 'efficiency'
                });
            }
        }
        
        // Total puzzles milestone achievements
        const totalCompleted = this._getTotalCompletedPuzzles();
        const milestones = [10, 25, 50, 100];
        
        for (const milestone of milestones) {
            const milestoneKey = `puzzles_${milestone}`;
            if (totalCompleted >= milestone && !this.progressData.achievements.has(milestoneKey)) {
                this.progressData.achievements.add(milestoneKey);
                achievements.push({
                    id: milestoneKey,
                    name: `${milestone} Puzzles`,
                    description: `Complete ${milestone} puzzles`,
                    type: 'milestone'
                });
            }
        }
        
        return achievements;
    }

    /**
     * Get all unlocked achievements
     * @returns {Array} Array of achievement objects
     */
    getUnlockedAchievements() {
        return Array.from(this.progressData.achievements).map(id => {
            return this._getAchievementData(id);
        });
    }

    /**
     * Get achievement data by ID
     * @param {string} id - Achievement ID
     * @returns {object} Achievement data
     * @private
     */
    _getAchievementData(id) {
        // This would typically come from a achievements config file
        // For now, return basic data based on ID
        return {
            id,
            name: this._formatStoryTitle(id),
            description: `Achievement: ${id}`,
            unlockedAt: Date.now()
        };
    }

    // =============================================================================
    // PROGRESS QUERIES
    // =============================================================================

    /**
     * Check if level is unlocked
     * @param {number} level - Level number
     * @returns {boolean} True if unlocked
     */
    isLevelUnlocked(level) {
        return this.progressData.unlockedLevels.has(level);
    }

    /**
     * Check if level is completed
     * @param {number} level - Level number
     * @returns {boolean} True if completed
     */
    isLevelCompleted(level) {
        return this.progressData.completedLevels.has(level);
    }

    /**
     * Get completed puzzles count for a level
     * @param {number} level - Level number
     * @returns {number} Number of completed puzzles
     */
    getCompletedPuzzlesCount(level) {
        const completed = this.progressData.completedPuzzles.get(level);
        return completed ? completed.size : 0;
    }

    /**
     * Get total completed puzzles across all levels
     * @returns {number} Total completed puzzles
     * @private
     */
    _getTotalCompletedPuzzles() {
        let total = 0;
        for (const puzzleSet of this.progressData.completedPuzzles.values()) {
            total += puzzleSet.size;
        }
        return total;
    }

    /**
     * Get perfect solutions count for a level
     * @param {number} level - Level number
     * @returns {number} Number of perfect solutions
     * @private
     */
    _getPerfectSolutionsInLevel(level) {
        let count = 0;
        for (const puzzleKey of this.progressData.perfectSolutions) {
            if (puzzleKey.startsWith(`${level}-`)) {
                count++;
            }
        }
        return count;
    }

    /**
     * Get progress summary
     * @returns {object} Progress summary
     */
    getProgressSummary() {
        const totalLevels = this.gameConfig?.gameInfo?.maxLevels || 5;
        const unlockedCount = this.progressData.unlockedLevels.size;
        const completedCount = this.progressData.completedLevels.size;
        const totalPuzzlesCompleted = this._getTotalCompletedPuzzles();
        const achievementCount = this.progressData.achievements.size;
        
        return {
            currentLevel: this.currentLevel,
            currentPuzzle: this.currentPuzzle,
            totalLevels,
            unlockedLevels: unlockedCount,
            completedLevels: completedCount,
            totalScore: this.progressData.totalScore,
            totalPuzzlesCompleted,
            achievementCount,
            progressPercentage: Math.round((completedCount / totalLevels) * 100)
        };
    }

    // =============================================================================
    // UTILITY METHODS
    // =============================================================================

    /**
     * Unlock a specific level
     * @param {number} level - Level to unlock
     */
    _unlockLevel(level) {
        this.progressData.unlockedLevels.add(level);
        this.emit(EVENTS.LEVEL_UNLOCKED, { level });
    }

    /**
     * Calculate score for puzzle completion
     * @param {object} stats - Puzzle statistics
     * @param {number} level - Level number
     * @returns {number} Calculated score
     * @private
     */
    _calculatePuzzleScore(stats, level) {
        const baseScore = 100;
        const efficiencyBonus = Math.floor(stats.efficiency * 100);
        const timeBonus = Math.max(0, 60 - Math.floor(stats.elapsedTime / 1000));
        const levelMultiplier = 1 + (level - 1) * 0.1;
        
        return Math.floor((baseScore + efficiencyBonus + timeBonus) * levelMultiplier);
    }

    /**
     * Get difficulty configuration for level
     * @param {number} level - Level number
     * @returns {string} Difficulty name
     * @private
     */
    _getDifficultyForLevel(level) {
        if (level <= 2) return 'easy';
        if (level <= 5) return 'medium';
        return 'hard';
    }

    /**
     * Get max moves for level
     * @param {number} level - Level number
     * @returns {number} Max moves
     * @private
     */
    _getMaxMovesForLevel(level) {
        const difficulty = this._getDifficultyForLevel(level);
        return this.gameConfig?.difficulty?.[difficulty]?.maxMoves || 80;
    }

    /**
     * Get shuffle moves for level
     * @param {number} level - Level number
     * @returns {number} Shuffle moves
     * @private
     */
    _getShuffleMovesForLevel(level) {
        const difficulty = this._getDifficultyForLevel(level);
        return this.gameConfig?.difficulty?.[difficulty]?.shuffleMoves || 35;
    }

    /**
     * Get default level info
     * @param {number} levelNumber - Level number
     * @returns {object} Default level info
     * @private
     */
    _getDefaultLevelInfo(levelNumber) {
        return {
            levelNumber,
            name: `Level ${levelNumber}`,
            description: `Challenge level ${levelNumber}`,
            theme: 'default',
            difficulty: this._getDifficultyForLevel(levelNumber),
            puzzleCount: 9,
            requiredCompletions: 6,
            isUnlocked: this.isLevelUnlocked(levelNumber),
            isCompleted: this.isLevelCompleted(levelNumber),
            completedPuzzles: this.getCompletedPuzzlesCount(levelNumber),
            totalPuzzles: 9
        };
    }

    /**
     * Save progress to state manager
     * @private
     */
    _saveProgress() {
        if (!this.stateManager) return;
        
        const progressToSave = {
            currentLevel: this.currentLevel,
            currentPuzzle: this.currentPuzzle,
            unlockedLevels: Object.fromEntries(
                Array.from(this.progressData.unlockedLevels).map(level => [level, true])
            ),
            completedLevels: Array.from(this.progressData.completedLevels),
            storyUnlocks: Array.from(this.progressData.storyUnlocks),
            achievements: Array.from(this.progressData.achievements),
            totalScore: this.progressData.totalScore,
            totalPuzzlesSolved: this._getTotalCompletedPuzzles()
        };
        
        this.stateManager.updateProgress(progressToSave);
    }

    // =============================================================================
    // PUBLIC API
    // =============================================================================

    /**
     * Get current level and puzzle
     * @returns {object} Current position
     */
    getCurrentPosition() {
        return {
            level: this.currentLevel,
            puzzle: this.currentPuzzle,
            levelInfo: this.getLevelInfo(this.currentLevel)
        };
    }

    /**
     * Start a specific level
     * @param {number} level - Level to start
     * @returns {Promise<object>} Level data
     */
    async startLevel(level) {
        if (!this.isLevelUnlocked(level)) {
            throw new Error(`Level ${level} is not unlocked`);
        }
        
        this.setCurrentPosition(level, 1);
        return await this.loadLevel(level);
    }

    /**
     * Get next puzzle data
     * @returns {Promise<object>} Next puzzle data
     */
    async getNextPuzzle() {
        const levelData = await this.loadLevel(this.currentLevel);
        const puzzleIndex = this.currentPuzzle - 1;
        
        if (puzzleIndex >= levelData.puzzles.length) {
            throw new Error('No more puzzles in current level');
        }
        
        return {
            level: this.currentLevel,
            puzzle: this.currentPuzzle,
            puzzleData: levelData.puzzles[puzzleIndex],
            levelInfo: this.getLevelInfo(this.currentLevel)
        };
    }

    /**
     * Reset all progress (for testing or fresh start)
     */
    resetAllProgress() {
        this.progressData = {
            unlockedLevels: new Set([1]),
            completedLevels: new Set(),
            completedPuzzles: new Map(),
            storyUnlocks: new Set(),
            achievements: new Set(),
            totalScore: 0,
            bestTimes: new Map(),
            perfectSolutions: new Set()
        };
        
        this.currentLevel = 1;
        this.currentPuzzle = 1;
        
        this._saveProgress();
        
        this.emit(EVENTS.PROGRESS_RESET);
        
        if (DEBUG.ENABLED) {
            console.debug('All progress reset');
        }
    }

    /**
     * Cleanup resources
     */
    destroy() {
        this.levelData.clear();
        this.storyContent.clear();
        this.stateManager = null;
        this.removeAllListeners();
        
        if (DEBUG.ENABLED) {
            console.debug('LevelManager destroyed');
        }
    }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create a new LevelManager instance
 * @param {StateManager} stateManager - State manager instance
 * @returns {LevelManager} New LevelManager instance
 */
export function createLevelManager(stateManager = null) {
    return new LevelManager(stateManager);
}

// =============================================================================
// EXPORTS
// =============================================================================

export default LevelManager;