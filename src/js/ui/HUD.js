/**
 * HUD.js - Game Heads-Up Display Component
 * Manages move counter, timer, level info, and game controls
 */

import { EVENTS, DEBUG } from '../utils/Constants.js';
import EventEmitter from '../utils/EventEmitter.js';

// =============================================================================
// HUD CLASS
// =============================================================================

export class HUD extends EventEmitter {
    constructor(containerElement, puzzle = null) {
        super();
        
        this.container = containerElement;
        this.puzzle = puzzle;
        this.elements = {};
        this.timers = {
            gameTimer: null,
            updateInterval: null
        };
        this.state = {
            startTime: null,
            elapsedTime: 0,
            isPaused: false,
            currentLevel: 1,
            currentPuzzle: 1,
            moves: 0,
            maxMoves: 100,
            isGameOver: false,
            isSolved: false
        };
        this.settings = {
            updateInterval: 100, // Update every 100ms for smooth timer
            showMilliseconds: false,
            animateCounters: true
        };
        
        this._initialize();
    }

    // =============================================================================
    // INITIALIZATION
    // =============================================================================

    /**
     * Initialize the HUD component
     * @private
     */
    _initialize() {
        if (!this.container) {
            throw new Error('HUD: Container element is required');
        }
        
        this._createHUDStructure();
        this._cacheElements();
        this._setupEventListeners();
        
        if (this.puzzle) {
            this.setPuzzle(this.puzzle);
        }
        
        this._startUpdateLoop();
        
        if (DEBUG.ENABLED) {
            console.debug('HUD initialized');
        }
    }

    /**
     * Create the HUD HTML structure
     * @private
     */
    _createHUDStructure() {
        this.container.innerHTML = `
            <div class="game-hud" id="game-hud">
                <div class="hud-left">
                    <div class="level-info">
                        <span class="level-label">Level</span>
                        <span id="current-level" class="level-number">1</span>
                        <span class="puzzle-label">Puzzle</span>
                        <span id="current-puzzle" class="puzzle-number">1</span>
                    </div>
                </div>
                
                <div class="hud-center">
                    <div class="moves-counter" id="moves-counter">
                        <span class="moves-label">Moves</span>
                        <span id="moves-count" class="moves-number">0</span>
                        <span class="moves-separator">/</span>
                        <span id="max-moves" class="moves-max">100</span>
                    </div>
                </div>
                
                <div class="hud-right">
                    <div class="timer">
                        <span class="timer-label">Time</span>
                        <span id="game-timer" class="timer-display">00:00</span>
                    </div>
                    
                    <div class="game-controls">
                        <button id="hint-btn" class="btn btn-secondary" title="Show Hint">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                                <line x1="12" y1="17" x2="12" y2="17"></line>
                            </svg>
                            <span class="sr-only">Show Hint</span>
                        </button>
                        
                        <button id="undo-btn" class="btn btn-secondary" title="Undo Last Move" disabled>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M3 7v6h6"></path>
                                <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"></path>
                            </svg>
                            <span class="sr-only">Undo Last Move</span>
                        </button>
                        
                        <button id="restart-btn" class="btn btn-secondary" title="Restart Puzzle">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M1 4v6h6"></path>
                                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                            </svg>
                            <span class="sr-only">Restart Puzzle</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Cache DOM elements for efficient access
     * @private
     */
    _cacheElements() {
        this.elements = {
            hud: document.getElementById('game-hud'),
            currentLevel: document.getElementById('current-level'),
            currentPuzzle: document.getElementById('current-puzzle'),
            movesCount: document.getElementById('moves-count'),
            maxMoves: document.getElementById('max-moves'),
            movesCounter: document.getElementById('moves-counter'),
            gameTimer: document.getElementById('game-timer'),
            hintBtn: document.getElementById('hint-btn'),
            undoBtn: document.getElementById('undo-btn'),
            restartBtn: document.getElementById('restart-btn')
        };
        
        // Verify all elements exist
        for (const [name, element] of Object.entries(this.elements)) {
            if (!element) {
                console.warn(`HUD: Element '${name}' not found`);
            }
        }
    }

    /**
     * Set up event listeners for HUD interactions
     * @private
     */
    _setupEventListeners() {
        // Button click handlers
        if (this.elements.hintBtn) {
            this.elements.hintBtn.addEventListener('click', this._handleHintClick.bind(this));
        }
        
        if (this.elements.undoBtn) {
            this.elements.undoBtn.addEventListener('click', this._handleUndoClick.bind(this));
        }
        
        if (this.elements.restartBtn) {
            this.elements.restartBtn.addEventListener('click', this._handleRestartClick.bind(this));
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', this._handleKeyDown.bind(this));
    }

    // =============================================================================
    // PUZZLE MANAGEMENT
    // =============================================================================

    /**
     * Set the puzzle instance
     * @param {Puzzle} puzzle - Puzzle instance
     */
    setPuzzle(puzzle) {
        // Unsubscribe from old puzzle events
        if (this.puzzle) {
            this.puzzle.off(EVENTS.TILE_MOVED, this._handleTileMoved);
            this.puzzle.off(EVENTS.PUZZLE_SOLVED, this._handlePuzzleSolved);
            this.puzzle.off(EVENTS.GAME_OVER, this._handleGameOver);
            this.puzzle.off(EVENTS.PUZZLE_RESET, this._handlePuzzleReset);
        }
        
        this.puzzle = puzzle;
        
        // Subscribe to new puzzle events
        if (this.puzzle) {
            this.puzzle.on(EVENTS.TILE_MOVED, this._handleTileMoved.bind(this));
            this.puzzle.on(EVENTS.PUZZLE_SOLVED, this._handlePuzzleSolved.bind(this));
            this.puzzle.on(EVENTS.GAME_OVER, this._handleGameOver.bind(this));
            this.puzzle.on(EVENTS.PUZZLE_RESET, this._handlePuzzleReset.bind(this));
        }
        
        this.update();
    }

    // =============================================================================
    // STATE MANAGEMENT
    // =============================================================================

    /**
     * Update HUD state
     * @param {object} newState - State updates to apply
     */
    updateState(newState) {
        const oldState = { ...this.state };
        this.state = { ...this.state, ...newState };
        
        // Handle state transitions
        this._handleStateTransition(oldState, this.state);
        
        // Update display
        this.update();
    }

    /**
     * Handle state transitions
     * @param {object} oldState - Previous state
     * @param {object} newState - New state
     * @private
     */
    _handleStateTransition(oldState, newState) {
        // Start timer on first move
        if (oldState.moves === 0 && newState.moves > 0 && !this.state.startTime) {
            this.startTimer();
        }
        
        // Update moves counter styling
        if (oldState.moves !== newState.moves) {
            this._updateMovesCounterState();
        }
        
        // Handle game over state
        if (!oldState.isGameOver && newState.isGameOver) {
            this.stopTimer();
            this._setGameOverState();
        }
        
        // Handle puzzle solved state
        if (!oldState.isSolved && newState.isSolved) {
            this.stopTimer();
            this._setPuzzleSolvedState();
        }
    }

    /**
     * Reset HUD to initial state
     */
    reset() {
        this.stopTimer();
        
        this.state = {
            startTime: null,
            elapsedTime: 0,
            isPaused: false,
            currentLevel: this.state.currentLevel, // Keep level info
            currentPuzzle: this.state.currentPuzzle,
            moves: 0,
            maxMoves: this.state.maxMoves, // Keep max moves
            isGameOver: false,
            isSolved: false
        };
        
        this._clearHUDStates();
        this.update();
        
        if (DEBUG.ENABLED) {
            console.debug('HUD reset');
        }
    }

    // =============================================================================
    // TIMER MANAGEMENT
    // =============================================================================

    /**
     * Start the game timer
     */
    startTimer() {
        if (this.state.startTime) return; // Already started
        
        this.state.startTime = Date.now() - this.state.elapsedTime;
        this.state.isPaused = false;
        
        this.emit(EVENTS.TIMER_STARTED, { startTime: this.state.startTime });
        
        if (DEBUG.ENABLED) {
            console.debug('Timer started');
        }
    }

    /**
     * Pause the game timer
     */
    pauseTimer() {
        if (!this.state.startTime || this.state.isPaused) return;
        
        this.state.elapsedTime = Date.now() - this.state.startTime;
        this.state.isPaused = true;
        
        this.emit(EVENTS.TIMER_PAUSED, { elapsedTime: this.state.elapsedTime });
        
        if (DEBUG.ENABLED) {
            console.debug('Timer paused');
        }
    }

    /**
     * Resume the game timer
     */
    resumeTimer() {
        if (!this.state.isPaused) return;
        
        this.state.startTime = Date.now() - this.state.elapsedTime;
        this.state.isPaused = false;
        
        this.emit(EVENTS.TIMER_RESUMED, { startTime: this.state.startTime });
        
        if (DEBUG.ENABLED) {
            console.debug('Timer resumed');
        }
    }

    /**
     * Stop the game timer
     */
    stopTimer() {
        if (this.state.startTime && !this.state.isPaused) {
            this.state.elapsedTime = Date.now() - this.state.startTime;
        }
        
        this.state.isPaused = true;
        
        this.emit(EVENTS.TIMER_STOPPED, { 
            elapsedTime: this.state.elapsedTime,
            finalTime: this.getFormattedTime()
        });
        
        if (DEBUG.ENABLED) {
            console.debug('Timer stopped');
        }
    }

    /**
     * Get current elapsed time in milliseconds
     * @returns {number} Elapsed time in milliseconds
     */
    getElapsedTime() {
        if (!this.state.startTime) return this.state.elapsedTime;
        if (this.state.isPaused) return this.state.elapsedTime;
        
        return Date.now() - this.state.startTime;
    }

    /**
     * Get formatted time string
     * @returns {string} Formatted time (MM:SS or MM:SS.mmm)
     */
    getFormattedTime() {
        const elapsed = this.getElapsedTime();
        const totalSeconds = Math.floor(elapsed / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const milliseconds = elapsed % 1000;
        
        if (this.settings.showMilliseconds) {
            return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${Math.floor(milliseconds / 10).toString().padStart(2, '0')}`;
        } else {
            return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    // =============================================================================
    // UPDATE METHODS
    // =============================================================================

    /**
     * Update all HUD elements
     */
    update() {
        this._updateLevelInfo();
        this._updateMovesCounter();
        this._updateTimer();
        this._updateButtonStates();
    }

    /**
     * Update level information display
     * @private
     */
    _updateLevelInfo() {
        if (this.elements.currentLevel) {
            this._animateNumberChange(this.elements.currentLevel, this.state.currentLevel);
        }
        
        if (this.elements.currentPuzzle) {
            this._animateNumberChange(this.elements.currentPuzzle, this.state.currentPuzzle);
        }
    }

    /**
     * Update moves counter display
     * @private
     */
    _updateMovesCounter() {
        if (this.elements.movesCount) {
            this._animateNumberChange(this.elements.movesCount, this.state.moves);
        }
        
        if (this.elements.maxMoves) {
            this._animateNumberChange(this.elements.maxMoves, this.state.maxMoves);
        }
        
        this._updateMovesCounterState();
    }

    /**
     * Update moves counter state styling
     * @private
     */
    _updateMovesCounterState() {
        if (!this.elements.movesCounter) return;
        
        const remainingMoves = this.state.maxMoves - this.state.moves;
        const warningThreshold = Math.floor(this.state.maxMoves * 0.2); // 20% remaining
        const dangerThreshold = Math.floor(this.state.maxMoves * 0.1);  // 10% remaining
        
        // Clear existing state classes
        this.elements.movesCounter.classList.remove('warning', 'danger');
        
        if (remainingMoves <= dangerThreshold) {
            this.elements.movesCounter.classList.add('danger');
        } else if (remainingMoves <= warningThreshold) {
            this.elements.movesCounter.classList.add('warning');
        }
    }

    /**
     * Update timer display
     * @private
     */
    _updateTimer() {
        if (this.elements.gameTimer) {
            this.elements.gameTimer.textContent = this.getFormattedTime();
        }
    }

    /**
     * Update button states
     * @private
     */
    _updateButtonStates() {
        // Undo button
        if (this.elements.undoBtn && this.puzzle) {
            this.elements.undoBtn.disabled = !this.puzzle.canUndo() || this.state.isGameOver || this.state.isSolved;
        }
        
        // Hint button
        if (this.elements.hintBtn) {
            this.elements.hintBtn.disabled = this.state.isGameOver || this.state.isSolved;
        }
        
        // Restart button
        if (this.elements.restartBtn) {
            this.elements.restartBtn.disabled = false; // Always available
        }
    }

    /**
     * Start the update loop for real-time updates
     * @private
     */
    _startUpdateLoop() {
        if (this.timers.updateInterval) {
            clearInterval(this.timers.updateInterval);
        }
        
        this.timers.updateInterval = setInterval(() => {
            if (!this.state.isPaused && this.state.startTime) {
                this._updateTimer();
            }
        }, this.settings.updateInterval);
    }

    // =============================================================================
    // ANIMATION HELPERS
    // =============================================================================

    /**
     * Animate number changes with visual feedback
     * @param {HTMLElement} element - Element to update
     * @param {number} newValue - New value to display
     * @private
     */
    _animateNumberChange(element, newValue) {
        const currentValue = parseInt(element.textContent) || 0;
        
        if (currentValue !== newValue) {
            element.textContent = newValue;
            
            if (this.settings.animateCounters) {
                element.classList.add('number-update');
                setTimeout(() => {
                    element.classList.remove('number-update');
                }, 200);
            }
        }
    }

    // =============================================================================
    // STATE STYLING
    // =============================================================================

    /**
     * Set game over visual state
     * @private
     */
    _setGameOverState() {
        if (this.elements.hud) {
            this.elements.hud.classList.add('game-over');
        }
    }

    /**
     * Set puzzle solved visual state
     * @private
     */
    _setPuzzleSolvedState() {
        if (this.elements.hud) {
            this.elements.hud.classList.add('puzzle-solved');
        }
    }

    /**
     * Clear all special HUD states
     * @private
     */
    _clearHUDStates() {
        if (this.elements.hud) {
            this.elements.hud.classList.remove('game-over', 'puzzle-solved');
        }
        
        if (this.elements.movesCounter) {
            this.elements.movesCounter.classList.remove('warning', 'danger');
        }
    }

    // =============================================================================
    // EVENT HANDLERS
    // =============================================================================

    /**
     * Handle hint button click
     * @private
     */
    _handleHintClick() {
        this.emit(EVENTS.HINT_REQUESTED);
        
        if (DEBUG.ENABLED) {
            console.debug('Hint requested');
        }
    }

    /**
     * Handle undo button click
     * @private
     */
    _handleUndoClick() {
        if (this.puzzle && this.puzzle.canUndo()) {
            this.puzzle.undoLastMove();
        }
    }

    /**
     * Handle restart button click
     * @private
     */
    _handleRestartClick() {
        this.emit(EVENTS.RESTART_REQUESTED);
        
        if (DEBUG.ENABLED) {
            console.debug('Restart requested');
        }
    }

    /**
     * Handle keyboard shortcuts
     * @param {KeyboardEvent} event - Keyboard event
     * @private
     */
    _handleKeyDown(event) {
        // Only handle shortcuts when HUD is visible
        if (!this.container.offsetParent) return;
        
        switch (event.key.toLowerCase()) {
            case 'h':
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    this._handleHintClick();
                }
                break;
            case 'z':
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    this._handleUndoClick();
                }
                break;
            case 'r':
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    this._handleRestartClick();
                }
                break;
        }
    }

    /**
     * Handle tile moved event from puzzle
     * @param {object} moveData - Move event data
     * @private
     */
    _handleTileMoved(moveData) {
        this.updateState({
            moves: moveData.moveNumber
        });
        
        this.emit(EVENTS.TILE_MOVED, moveData);
    }

    /**
     * Handle puzzle solved event
     * @param {object} eventData - Puzzle solved event data
     * @private
     */
    _handlePuzzleSolved(eventData) {
        this.updateState({
            isSolved: true
        });
        
        this.emit(EVENTS.PUZZLE_SOLVED, eventData);
    }

    /**
     * Handle game over event
     * @param {object} eventData - Game over event data
     * @private
     */
    _handleGameOver(eventData) {
        this.updateState({
            isGameOver: true
        });
        
        this.emit(EVENTS.GAME_OVER, eventData);
    }

    /**
     * Handle puzzle reset event
     * @param {object} eventData - Puzzle reset event data
     * @private
     */
    _handlePuzzleReset(eventData) {
        this.reset();
        this.emit(EVENTS.PUZZLE_RESET, eventData);
    }

    // =============================================================================
    // LEVEL AND PUZZLE MANAGEMENT
    // =============================================================================

    /**
     * Set current level and puzzle
     * @param {number} level - Level number
     * @param {number} puzzle - Puzzle number within level
     */
    setLevelInfo(level, puzzle) {
        this.updateState({
            currentLevel: level,
            currentPuzzle: puzzle
        });
    }

    /**
     * Set maximum moves allowed
     * @param {number} maxMoves - Maximum moves
     */
    setMaxMoves(maxMoves) {
        this.updateState({
            maxMoves: maxMoves
        });
    }

    // =============================================================================
    // SETTINGS AND CONFIGURATION
    // =============================================================================

    /**
     * Update HUD settings
     * @param {object} newSettings - New settings to apply
     */
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        
        // Restart update loop if interval changed
        if (newSettings.updateInterval) {
            this._startUpdateLoop();
        }
        
        if (DEBUG.ENABLED) {
            console.debug('HUD settings updated:', this.settings);
        }
    }

    /**
     * Get current HUD statistics
     * @returns {object} HUD statistics
     */
    getStatistics() {
        return {
            elapsedTime: this.getElapsedTime(),
            formattedTime: this.getFormattedTime(),
            moves: this.state.moves,
            maxMoves: this.state.maxMoves,
            movesRemaining: this.state.maxMoves - this.state.moves,
            efficiency: this.state.moves > 0 ? (this.state.maxMoves - this.state.moves) / this.state.maxMoves : 1,
            isTimerRunning: !this.state.isPaused && !!this.state.startTime,
            state: { ...this.state }
        };
    }

    // =============================================================================
    // CLEANUP
    // =============================================================================

    /**
     * Cleanup HUD resources
     */
    destroy() {
        // Stop timers
        if (this.timers.updateInterval) {
            clearInterval(this.timers.updateInterval);
        }
        
        // Unsubscribe from puzzle events
        if (this.puzzle) {
            this.puzzle.off(EVENTS.TILE_MOVED, this._handleTileMoved);
            this.puzzle.off(EVENTS.PUZZLE_SOLVED, this._handlePuzzleSolved);
            this.puzzle.off(EVENTS.GAME_OVER, this._handleGameOver);
            this.puzzle.off(EVENTS.PUZZLE_RESET, this._handlePuzzleReset);
        }
        
        // Clear DOM
        if (this.container) {
            this.container.innerHTML = '';
        }
        
        // Clear references
        this.puzzle = null;
        this.elements = {};
        
        // Remove all event listeners
        this.removeAllListeners();
        
        if (DEBUG.ENABLED) {
            console.debug('HUD destroyed');
        }
    }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create a new HUD instance
 * @param {HTMLElement} container - Container element
 * @param {Puzzle} puzzle - Puzzle instance (optional)
 * @returns {HUD} New HUD instance
 */
export function createHUD(container, puzzle = null) {
    return new HUD(container, puzzle);
}

// =============================================================================
// EXPORTS
// =============================================================================

export default HUD;