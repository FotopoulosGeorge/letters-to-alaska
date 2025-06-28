/**
 * GameEngine.js - Main Game Controller
 * Orchestrates all game components and manages overall game flow
 */

import { GAME_STATES, EVENTS, DIFFICULTY, DEBUG } from '../utils/Constants.js';
import { gameEventBus } from '../utils/EventEmitter.js';
import { createPuzzle } from './PuzzleLogic.js';
import { createGameBoard } from '../ui/GameBoard.js';
import { createHUD } from '../ui/HUD.js';

// =============================================================================
// GAME ENGINE CLASS
// =============================================================================

export class GameEngine {
    constructor(gameContainer) {
        this.container = gameContainer;
        this.components = {
            puzzle: null,
            gameBoard: null,
            hud: null
        };
        this.gameState = GAME_STATES.MENU;
        this.gameData = {
            currentLevel: 1,
            currentPuzzle: 1,
            totalLevels: 5,
            puzzlesPerLevel: 9,
            difficulty: DIFFICULTY.MEDIUM,
            score: 0,
            lives: 3
        };
        this.settings = {
            autoSave: true,
            showHints: true,
            enableAnimations: true,
            soundEnabled: true
        };
        this.containers = {};
        
        this._initialize();
    }

    // =============================================================================
    // INITIALIZATION
    // =============================================================================

    /**
     * Initialize the game engine
     * @private
     */
    _initialize() {
        if (!this.container) {
            throw new Error('GameEngine: Game container is required');
        }
        
        this._setupContainers();
        this._initializeComponents();
        this._setupEventListeners();
        this._bindGlobalEvents();
        
        if (DEBUG.ENABLED) {
            console.debug('GameEngine initialized');
        }
    }

    /**
     * Set up container elements for components
     * @private
     */
    _setupContainers() {
        // Find or create HUD container
        this.containers.hud = this.container.querySelector('.game-hud') || 
                             this.container.querySelector('#hud-container');
        
        if (!this.containers.hud) {
            this.containers.hud = document.createElement('div');
            this.containers.hud.id = 'hud-container';
            this.container.appendChild(this.containers.hud);
        }
        
        // Find or create game board container
        this.containers.gameBoard = this.container.querySelector('.puzzle-container') ||
                                   this.container.querySelector('#game-board-container');
        
        if (!this.containers.gameBoard) {
            this.containers.gameBoard = document.createElement('div');
            this.containers.gameBoard.id = 'game-board-container';
            this.container.appendChild(this.containers.gameBoard);
        }
    }

    /**
     * Initialize game components
     * @private
     */
    _initializeComponents() {
        try {
            // Create puzzle instance
            this.components.puzzle = createPuzzle(this.gameData.difficulty.boardSize);
            
            // Create HUD component
            this.components.hud = createHUD(this.containers.hud, this.components.puzzle);
            
            // Create game board component
            this.components.gameBoard = createGameBoard(this.containers.gameBoard, this.components.puzzle);
            
            // Configure initial state
            this._configureComponents();
            
            if (DEBUG.ENABLED) {
                console.debug('Game components initialized');
            }
            
        } catch (error) {
            console.error('Failed to initialize game components:', error);
            throw error;
        }
    }

    /**
     * Configure components with initial settings
     * @private
     */
    _configureComponents() {
        // Configure HUD
        if (this.components.hud) {
            this.components.hud.setLevelInfo(this.gameData.currentLevel, this.gameData.currentPuzzle);
            this.components.hud.setMaxMoves(this.gameData.difficulty.maxMoves);
            this.components.hud.updateSettings({
                enableAnimations: this.settings.enableAnimations
            });
        }
        
        // Configure game board
        if (this.components.gameBoard) {
            this.components.gameBoard.updateSettings({
                showCorrectPositions: false,
                enableAnimations: this.settings.enableAnimations,
                enableHints: this.settings.showHints
            });
        }
    }

    /**
     * Set up component event listeners
     * @private
     */
    _setupEventListeners() {
        // HUD events
        if (this.components.hud) {
            this.components.hud.on(EVENTS.HINT_REQUESTED, this._handleHintRequested.bind(this));
            this.components.hud.on(EVENTS.RESTART_REQUESTED, this._handleRestartRequested.bind(this));
            this.components.hud.on(EVENTS.TIMER_STARTED, this._handleTimerStarted.bind(this));
            this.components.hud.on(EVENTS.TIMER_STOPPED, this._handleTimerStopped.bind(this));
        }
        
        // Game board events
        if (this.components.gameBoard) {
            this.components.gameBoard.on(EVENTS.TILE_MOVED, this._handleTileMoved.bind(this));
            this.components.gameBoard.on(EVENTS.PUZZLE_SOLVED, this._handlePuzzleSolved.bind(this));
            this.components.gameBoard.on(EVENTS.GAME_OVER, this._handleGameOver.bind(this));
        }
        
        // Puzzle events (direct subscription for engine-level handling)
        if (this.components.puzzle) {
            this.components.puzzle.on(EVENTS.PUZZLE_GENERATED, this._handlePuzzleGenerated.bind(this));
            this.components.puzzle.on(EVENTS.INVALID_MOVE, this._handleInvalidMove.bind(this));
        }
    }

    /**
     * Bind global game events
     * @private
     */
    _bindGlobalEvents() {
        // Listen to global game events
        gameEventBus.on(EVENTS.GAME_STATE_CHANGED, this._handleGlobalStateChange.bind(this));
        
        // Window events
        window.addEventListener('beforeunload', this._handleBeforeUnload.bind(this));
        window.addEventListener('blur', this._handleWindowBlur.bind(this));
        window.addEventListener('focus', this._handleWindowFocus.bind(this));
    }

    // =============================================================================
    // GAME STATE MANAGEMENT
    // =============================================================================

    /**
     * Change game state
     * @param {string} newState - New game state
     */
    changeGameState(newState) {
        const previousState = this.gameState;
        this.gameState = newState;
        
        // Emit state change event
        gameEventBus.emit(EVENTS.GAME_STATE_CHANGED, {
            previousState,
            currentState: newState,
            gameData: { ...this.gameData }
        });
        
        // Handle state-specific logic
        this._handleStateChange(previousState, newState);
        
        if (DEBUG.ENABLED) {
            console.debug(`Game state changed: ${previousState} → ${newState}`);
        }
    }

    /**
     * Handle state change logic
     * @param {string} previousState - Previous state
     * @param {string} currentState - Current state
     * @private
     */
    _handleStateChange(previousState, currentState) {
        switch (currentState) {
            case GAME_STATES.PLAYING:
                this._enterPlayingState();
                break;
            case GAME_STATES.PAUSED:
                this._enterPausedState();
                break;
            case GAME_STATES.PUZZLE_COMPLETE:
                this._enterPuzzleCompleteState();
                break;
            case GAME_STATES.GAME_OVER:
                this._enterGameOverState();
                break;
            case GAME_STATES.MENU:
                this._enterMenuState();
                break;
        }
    }

    /**
     * Enter playing state
     * @private
     */
    _enterPlayingState() {
        // Resume timer if paused
        if (this.components.hud) {
            this.components.hud.resumeTimer();
        }
        
        // Enable game board interactions
        if (this.components.gameBoard) {
            this.components.gameBoard.clearHints();
        }
    }

    /**
     * Enter paused state
     * @private
     */
    _enterPausedState() {
        // Pause timer
        if (this.components.hud) {
            this.components.hud.pauseTimer();
        }
        
        // TODO: Show pause overlay in Phase 5
    }

    /**
     * Enter puzzle complete state
     * @private
     */
    _enterPuzzleCompleteState() {
        // Stop timer
        if (this.components.hud) {
            this.components.hud.stopTimer();
        }
        
        // Calculate score
        this._calculateScore();
        
        // TODO: Show completion modal in Phase 5
    }

    /**
     * Enter game over state
     * @private
     */
    _enterGameOverState() {
        // Stop timer
        if (this.components.hud) {
            this.components.hud.stopTimer();
        }
        
        // TODO: Show game over modal in Phase 5
    }

    /**
     * Enter menu state
     * @private
     */
    _enterMenuState() {
        // Reset components
        this._resetGame();
    }

    // =============================================================================
    // GAME FLOW MANAGEMENT
    // =============================================================================

    /**
     * Start a new game
     * @param {object} options - Game options
     */
    startNewGame(options = {}) {
        const gameOptions = {
            level: 1,
            puzzle: 1,
            difficulty: DIFFICULTY.MEDIUM,
            ...options
        };
        
        // Update game data
        this.gameData.currentLevel = gameOptions.level;
        this.gameData.currentPuzzle = gameOptions.puzzle;
        this.gameData.difficulty = gameOptions.difficulty;
        this.gameData.score = 0;
        
        // Generate new puzzle
        this._generateNewPuzzle();
        
        // Update components
        this._updateComponentsForNewGame();
        
        // Change to playing state
        this.changeGameState(GAME_STATES.PLAYING);
        
        if (DEBUG.ENABLED) {
            console.debug('New game started:', gameOptions);
        }
    }

    /**
     * Continue existing game
     * @param {object} saveData - Saved game data
     */
    continueGame(saveData) {
        if (!saveData) {
            console.warn('No save data provided for continue game');
            return;
        }
        
        try {
            // Restore game data
            this.gameData = { ...this.gameData, ...saveData.gameData };
            
            // Restore puzzle state
            if (saveData.puzzleState && this.components.puzzle) {
                this.components.puzzle.importState(saveData.puzzleState);
            }
            
            // Update components
            this._updateComponentsFromSave(saveData);
            
            // Change to playing state
            this.changeGameState(GAME_STATES.PLAYING);
            
            if (DEBUG.ENABLED) {
                console.debug('Game continued from save data');
            }
            
        } catch (error) {
            console.error('Failed to continue game:', error);
            this.startNewGame(); // Fallback to new game
        }
    }

    /**
     * Advance to next puzzle
     */
    nextPuzzle() {
        this.gameData.currentPuzzle++;
        
        // Check if level is complete
        if (this.gameData.currentPuzzle > this.gameData.puzzlesPerLevel) {
            this.nextLevel();
            return;
        }
        
        // Generate next puzzle
        this._generateNewPuzzle();
        this._updateComponentsForNewGame();
        
        this.changeGameState(GAME_STATES.PLAYING);
        
        if (DEBUG.ENABLED) {
            console.debug(`Advanced to puzzle ${this.gameData.currentPuzzle}`);
        }
    }

    /**
     * Advance to next level
     */
    nextLevel() {
        this.gameData.currentLevel++;
        this.gameData.currentPuzzle = 1;
        
        // Check if game is complete
        if (this.gameData.currentLevel > this.gameData.totalLevels) {
            this._handleGameComplete();
            return;
        }
        
        // Increase difficulty slightly
        this._adjustDifficultyForLevel();
        
        // Generate first puzzle of new level
        this._generateNewPuzzle();
        this._updateComponentsForNewGame();
        
        this.changeGameState(GAME_STATES.PLAYING);
        
        if (DEBUG.ENABLED) {
            console.debug(`Advanced to level ${this.gameData.currentLevel}`);
        }
    }

    /**
     * Restart current puzzle
     */
    restartPuzzle() {
        if (this.components.puzzle) {
            this.components.puzzle.reset();
        }
        
        if (this.components.hud) {
            this.components.hud.reset();
        }
        
        this.changeGameState(GAME_STATES.PLAYING);
        
        if (DEBUG.ENABLED) {
            console.debug('Puzzle restarted');
        }
    }

    /**
     * Pause/unpause game
     */
    togglePause() {
        if (this.gameState === GAME_STATES.PLAYING) {
            this.changeGameState(GAME_STATES.PAUSED);
        } else if (this.gameState === GAME_STATES.PAUSED) {
            this.changeGameState(GAME_STATES.PLAYING);
        }
    }

    // =============================================================================
    // PUZZLE MANAGEMENT
    // =============================================================================

    /**
     * Generate a new puzzle based on current game data
     * @private
     */
    _generateNewPuzzle() {
        if (!this.components.puzzle) return;
        
        const shuffleMoves = this.gameData.difficulty.shuffleMoves + 
                            (this.gameData.currentLevel - 1) * 5; // Increase complexity
        const maxMoves = this.gameData.difficulty.maxMoves + 
                        (this.gameData.currentLevel - 1) * 10;
        
        this.components.puzzle.generatePuzzle(shuffleMoves, maxMoves);
    }

    /**
     * Update components for new game/puzzle
     * @private
     */
    _updateComponentsForNewGame() {
        // Update HUD
        if (this.components.hud) {
            this.components.hud.setLevelInfo(this.gameData.currentLevel, this.gameData.currentPuzzle);
            this.components.hud.setMaxMoves(this.gameData.difficulty.maxMoves);
            this.components.hud.reset();
        }
        
        // Update game board
        if (this.components.gameBoard) {
            this.components.gameBoard.render();
        }
    }

    /**
     * Update components from save data
     * @param {object} saveData - Saved game data
     * @private
     */
    _updateComponentsFromSave(saveData) {
        // Update HUD with saved state
        if (this.components.hud && saveData.hudState) {
            this.components.hud.updateState(saveData.hudState);
        }
        
        // Render current puzzle state
        if (this.components.gameBoard) {
            this.components.gameBoard.render();
        }
    }

    /**
     * Adjust difficulty for current level
     * @private
     */
    _adjustDifficultyForLevel() {
        const level = this.gameData.currentLevel;
        
        // Increase board size every few levels
        if (level > 3 && level <= 6) {
            this.gameData.difficulty.boardSize = 4;
            this.gameData.difficulty.shuffleMoves = 40;
            this.gameData.difficulty.maxMoves = 90;
        } else if (level > 6) {
            this.gameData.difficulty.boardSize = 5;
            this.gameData.difficulty.shuffleMoves = 50;
            this.gameData.difficulty.maxMoves = 120;
        }
        
        // Create new puzzle with updated size if needed
        if (this.components.puzzle.size !== this.gameData.difficulty.boardSize) {
            this.components.puzzle = createPuzzle(this.gameData.difficulty.boardSize);
            this.components.hud.setPuzzle(this.components.puzzle);
            this.components.gameBoard.setPuzzle(this.components.puzzle);
        }
    }

    // =============================================================================
    // EVENT HANDLERS
    // =============================================================================

    /**
     * Handle hint requested
     * @private
     */
    _handleHintRequested() {
        if (this.components.gameBoard && this.gameState === GAME_STATES.PLAYING) {
            this.components.gameBoard.showHint();
            
            // Deduct points for using hint
            this.gameData.score = Math.max(0, this.gameData.score - 10);
        }
    }

    /**
     * Handle restart requested
     * @private
     */
    _handleRestartRequested() {
        const confirmed = confirm('Are you sure you want to restart this puzzle? All progress will be lost.');
        if (confirmed) {
            this.restartPuzzle();
        }
    }

    /**
     * Handle timer events
     * @private
     */
    _handleTimerStarted() {
        // TODO: Analytics tracking
    }

    _handleTimerStopped() {
        // TODO: Analytics tracking
    }

    /**
     * Handle tile moved
     * @param {object} moveData - Move event data
     * @private
     */
    _handleTileMoved(moveData) {
        // Update score based on efficiency
        this._updateScore(moveData);
        
        // Auto-save if enabled
        if (this.settings.autoSave) {
            this._autoSave();
        }
    }

    /**
     * Handle puzzle solved
     * @param {object} eventData - Puzzle solved event data
     * @private
     */
    _handlePuzzleSolved(eventData) {
        this.changeGameState(GAME_STATES.PUZZLE_COMPLETE);
        
        // Calculate final score
        this._calculateFinalScore(eventData.stats);
        
        // TODO: Show victory modal in Phase 5
        setTimeout(() => {
            this.nextPuzzle();
        }, 2000);
    }

    /**
     * Handle game over
     * @param {object} eventData - Game over event data
     * @private
     */
    _handleGameOver(eventData) {
        this.changeGameState(GAME_STATES.GAME_OVER);
        
        // TODO: Show game over modal in Phase 5
    }

    /**
     * Handle puzzle generated
     * @param {object} eventData - Puzzle generated event data
     * @private
     */
    _handlePuzzleGenerated(eventData) {
        if (DEBUG.ENABLED) {
            console.debug('New puzzle generated:', eventData);
        }
    }

    /**
     * Handle invalid move
     * @param {object} eventData - Invalid move event data
     * @private
     */
    _handleInvalidMove(eventData) {
        // TODO: Visual/audio feedback in Phase 7
        if (DEBUG.ENABLED) {
            console.debug('Invalid move:', eventData.reason);
        }
    }

    /**
     * Handle global state changes
     * @param {object} eventData - State change event data
     * @private
     */
    _handleGlobalStateChange(eventData) {
        // Sync engine state with global state if needed
        if (eventData.currentState !== this.gameState) {
            this.gameState = eventData.currentState;
        }
    }

    /**
     * Handle window events
     * @private
     */
    _handleBeforeUnload() {
        if (this.settings.autoSave && this.gameState === GAME_STATES.PLAYING) {
            this._autoSave();
        }
    }

    _handleWindowBlur() {
        if (this.gameState === GAME_STATES.PLAYING) {
            this.changeGameState(GAME_STATES.PAUSED);
        }
    }

    _handleWindowFocus() {
        // Allow manual resume rather than auto-resume
    }

    // =============================================================================
    // SCORING SYSTEM
    // =============================================================================

    /**
     * Update score based on move data
     * @param {object} moveData - Move event data
     * @private
     */
    _updateScore(moveData) {
        // Base score per move (efficiency bonus)
        const efficiency = moveData.movesRemaining / this.gameData.difficulty.maxMoves;
        const moveScore = Math.floor(efficiency * 10);
        
        this.gameData.score += Math.max(1, moveScore);
    }

    /**
     * Calculate final score for puzzle completion
     * @param {object} stats - Puzzle statistics
     * @private
     */
    _calculateFinalScore(stats) {
        // Bonus for completing puzzle
        let completionBonus = 100;
        
        // Time bonus (faster = more points)
        const timeBonus = Math.max(0, 50 - Math.floor(stats.elapsedTime / 1000));
        
        // Efficiency bonus
        const efficiencyBonus = Math.floor(stats.efficiency * 100);
        
        const totalBonus = completionBonus + timeBonus + efficiencyBonus;
        this.gameData.score += totalBonus;
        
        if (DEBUG.ENABLED) {
            console.debug('Score calculation:', {
                completionBonus,
                timeBonus,
                efficiencyBonus,
                totalBonus,
                newScore: this.gameData.score
            });
        }
    }

    /**
     * Calculate current score
     * @private
     */
    _calculateScore() {
        // Called when entering puzzle complete state
        if (this.components.puzzle) {
            const stats = this.components.puzzle.getStatistics();
            this._calculateFinalScore(stats);
        }
    }

    // =============================================================================
    // SAVE/LOAD SYSTEM
    // =============================================================================

    /**
     * Auto-save game state
     * @private
     */
    _autoSave() {
        try {
            const saveData = this.exportGameState();
            localStorage.setItem('slidingPuzzle_autoSave', JSON.stringify(saveData));
            
            if (DEBUG.ENABLED) {
                console.debug('Game auto-saved');
            }
        } catch (error) {
            console.warn('Auto-save failed:', error);
        }
    }

    /**
     * Export complete game state
     * @returns {object} Complete game state
     */
    exportGameState() {
        return {
            version: '1.0.0',
            timestamp: Date.now(),
            gameData: { ...this.gameData },
            gameState: this.gameState,
            settings: { ...this.settings },
            puzzleState: this.components.puzzle ? this.components.puzzle.exportState() : null,
            hudState: this.components.hud ? this.components.hud.getStatistics() : null
        };
    }

    // =============================================================================
    // GAME COMPLETION
    // =============================================================================

    /**
     * Handle complete game victory
     * @private
     */
    _handleGameComplete() {
        // TODO: Show final victory screen in Phase 5
        console.log('🎉 Game completed! Final score:', this.gameData.score);
        
        // Reset to first level for replay
        this.gameData.currentLevel = 1;
        this.gameData.currentPuzzle = 1;
        
        this.changeGameState(GAME_STATES.MENU);
    }

    // =============================================================================
    // UTILITIES
    // =============================================================================

    /**
     * Reset game to initial state
     * @private
     */
    _resetGame() {
        // Reset puzzle
        if (this.components.puzzle) {
            this.components.puzzle.reset();
        }
        
        // Reset HUD
        if (this.components.hud) {
            this.components.hud.reset();
        }
        
        // Reset game board
        if (this.components.gameBoard) {
            this.components.gameBoard.render();
        }
    }

    /**
     * Get current game statistics
     * @returns {object} Game statistics
     */
    getGameStatistics() {
        const puzzleStats = this.components.puzzle ? this.components.puzzle.getStatistics() : {};
        const hudStats = this.components.hud ? this.components.hud.getStatistics() : {};
        
        return {
            gameData: { ...this.gameData },
            gameState: this.gameState,
            puzzleStats,
            hudStats,
            settings: { ...this.settings }
        };
    }

    /**
     * Update game settings
     * @param {object} newSettings - New settings to apply
     */
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        
        // Update component settings
        if (this.components.hud) {
            this.components.hud.updateSettings({
                enableAnimations: this.settings.enableAnimations
            });
        }
        
        if (this.components.gameBoard) {
            this.components.gameBoard.updateSettings({
                enableAnimations: this.settings.enableAnimations,
                enableHints: this.settings.showHints
            });
        }
        
        if (DEBUG.ENABLED) {
            console.debug('Game settings updated:', this.settings);
        }
    }

    /**
     * Cleanup game engine resources
     */
    destroy() {
        // Destroy components
        if (this.components.hud) {
            this.components.hud.destroy();
        }
        
        if (this.components.gameBoard) {
            this.components.gameBoard.destroy();
        }
        
        // Clear references
        this.components = {};
        this.containers = {};
        
        // Remove global event listeners
        gameEventBus.removeAllListeners();
        
        if (DEBUG.ENABLED) {
            console.debug('GameEngine destroyed');
        }
    }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create a new GameEngine instance
 * @param {HTMLElement} container - Game container element
 * @returns {GameEngine} New GameEngine instance
 */
export function createGameEngine(container) {
    return new GameEngine(container);
}

// =============================================================================
// EXPORTS
// =============================================================================

export default GameEngine;