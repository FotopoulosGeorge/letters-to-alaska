/**
 * GameBoard.js - Visual Puzzle Board Component
 * Handles puzzle board rendering, animations, and user interactions
 */

import { EVENTS, MECHANICS, ANIMATIONS, DEBUG } from '../utils/Constants.js';
import { findEmptyPosition, areAdjacent } from '../utils/ArrayUtils.js';
import EventEmitter from '../utils/EventEmitter.js';

// =============================================================================
// GAME BOARD CLASS
// =============================================================================

export class GameBoard extends EventEmitter {
    constructor(containerElement, puzzle = null) {
        super();
        
        this.container = containerElement;
        this.puzzle = puzzle;
        this.boardElement = null;
        this.tileElements = new Map(); // Map tile values to DOM elements
        this.size = 4;
        this.isAnimating = false;
        this.animationQueue = [];
        this.settings = {
            showCorrectPositions: false,
            enableAnimations: true,
            enableHints: true,
            touchEnabled: 'ontouchstart' in window
        };
        
        this._initialize();
    }

    // =============================================================================
    // INITIALIZATION
    // =============================================================================

    /**
     * Initialize the game board
     * @private
     */
    _initialize() {
        if (!this.container) {
            throw new Error('GameBoard: Container element is required');
        }
        
        this._createBoardStructure();
        this._setupEventListeners();
        
        if (this.puzzle) {
            this.setPuzzle(this.puzzle);
        }
        
        if (DEBUG.ENABLED) {
            console.debug('GameBoard initialized');
        }
    }

    /**
     * Create the basic board HTML structure
     * @private
     */
    _createBoardStructure() {
        // Clear container
        this.container.innerHTML = '';
        
        // Create puzzle container
        const puzzleContainer = document.createElement('div');
        puzzleContainer.className = 'puzzle-container';
        
        // Create board element
        this.boardElement = document.createElement('div');
        this.boardElement.className = 'puzzle-board';
        this.boardElement.id = 'puzzle-board';
        
        // Create progress indicator
        const progressIndicator = document.createElement('div');
        progressIndicator.className = 'progress-indicator';
        progressIndicator.innerHTML = `
            <div class="progress-bar">
                <div id="puzzle-progress" class="progress-fill"></div>
            </div>
            <span id="progress-text" class="progress-text">0% Complete</span>
        `;
        
        // Assemble structure
        puzzleContainer.appendChild(this.boardElement);
        puzzleContainer.appendChild(progressIndicator);
        this.container.appendChild(puzzleContainer);
    }

    /**
     * Set up event listeners for board interactions
     * @private
     */
    _setupEventListeners() {
        // Handle clicks and touches
        this.boardElement.addEventListener('click', this._handleBoardClick.bind(this));
        
        if (this.settings.touchEnabled) {
            this.boardElement.addEventListener('touchstart', this._handleTouchStart.bind(this), { passive: false });
            this.boardElement.addEventListener('touchend', this._handleTouchEnd.bind(this), { passive: false });
        }
        
        // Handle keyboard navigation
        this.boardElement.addEventListener('keydown', this._handleKeyDown.bind(this));
        
        // Make board focusable for keyboard navigation
        this.boardElement.setAttribute('tabindex', '0');
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
            this.puzzle.off(EVENTS.INVALID_MOVE, this._handleInvalidMove);
        }
        
        this.puzzle = puzzle;
        this.size = puzzle ? puzzle.size : 4;
        
        // Subscribe to new puzzle events
        if (this.puzzle) {
            this.puzzle.on(EVENTS.TILE_MOVED, this._handleTileMoved.bind(this));
            this.puzzle.on(EVENTS.PUZZLE_SOLVED, this._handlePuzzleSolved.bind(this));
            this.puzzle.on(EVENTS.INVALID_MOVE, this._handleInvalidMove.bind(this));
        }
        
        this.render();
    }

    /**
     * Get current puzzle state
     * @returns {Array<Array>|null} Current puzzle state
     */
    getPuzzleState() {
        return this.puzzle ? this.puzzle.getCurrentState() : null;
    }

    // =============================================================================
    // RENDERING
    // =============================================================================

    /**
     * Render the complete puzzle board
     */
    render() {
        if (!this.puzzle) {
            this._renderEmptyBoard();
            return;
        }
        
        this._updateBoardSize();
        this._renderTiles();
        this._updateProgress();
        
        if (DEBUG.ENABLED) {
            console.debug('GameBoard rendered');
        }
    }

    /**
     * Render empty board (no puzzle loaded)
     * @private
     */
    _renderEmptyBoard() {
        this.boardElement.innerHTML = `
            <div class="empty-board-message">
                <p>No puzzle loaded</p>
            </div>
        `;
        this.boardElement.className = 'puzzle-board empty';
    }

    /**
     * Update board size classes
     * @private
     */
    _updateBoardSize() {
        this.boardElement.className = `puzzle-board size-${this.size}`;
    }

    /**
     * Render all puzzle tiles
     * @private
     */
    _renderTiles() {
        const puzzleState = this.puzzle.getCurrentState();
        
        // Clear existing tiles
        this.boardElement.innerHTML = '';
        this.tileElements.clear();
        
        // Create tiles
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                const value = puzzleState[row][col];
                const tileElement = this._createTileElement(value, row, col);
                
                this.boardElement.appendChild(tileElement);
                
                if (value !== MECHANICS.EMPTY_TILE) {
                    this.tileElements.set(value, tileElement);
                }
            }
        }
    }

    /**
     * Create a single tile element
     * @param {number} value - Tile value
     * @param {number} row - Tile row
     * @param {number} col - Tile column
     * @returns {HTMLElement} Tile element
     * @private
     */
    _createTileElement(value, row, col) {
        const tile = document.createElement('div');
        
        if (value === MECHANICS.EMPTY_TILE) {
            tile.className = 'puzzle-tile empty-tile';
        } else {
            tile.className = 'puzzle-tile';
            tile.textContent = value;
            tile.setAttribute('tabindex', '0');
            tile.setAttribute('role', 'button');
            tile.setAttribute('aria-label', `Tile ${value}, row ${row + 1}, column ${col + 1}`);
        }
        
        // Store position data
        tile.dataset.value = value;
        tile.dataset.row = row;
        tile.dataset.col = col;
        tile.dataset.tileIndex = (row * this.size) + col;
        
        // Add correct position indicator if enabled
        if (this.settings.showCorrectPositions && this._isCorrectPosition(value, row, col)) {
            tile.classList.add('correct-position');
        }
        
        return tile;
    }

    /**
     * Check if tile is in correct position
     * @param {number} value - Tile value
     * @param {number} row - Current row
     * @param {number} col - Current column
     * @returns {boolean} True if in correct position
     * @private
     */
    _isCorrectPosition(value, row, col) {
        if (value === MECHANICS.EMPTY_TILE) {
            return row === this.size - 1 && col === this.size - 1;
        }
        
        const expectedRow = Math.floor((value - 1) / this.size);
        const expectedCol = (value - 1) % this.size;
        
        return row === expectedRow && col === expectedCol;
    }

    // =============================================================================
    // ANIMATIONS
    // =============================================================================

    /**
     * Animate tile movement
     * @param {number} tileValue - Value of tile to animate
     * @param {object} fromPos - Starting position {row, col}
     * @param {object} toPos - Ending position {row, col}
     * @returns {Promise} Promise that resolves when animation completes
     */
    async animateTileMove(tileValue, fromPos, toPos) {
        if (!this.settings.enableAnimations) {
            return Promise.resolve();
        }
        
        const tileElement = this.tileElements.get(tileValue);
        if (!tileElement) return Promise.resolve();
        
        // Determine animation direction
        const direction = this._getAnimationDirection(fromPos, toPos);
        
        // Add animation class
        tileElement.classList.add('moving', `slide-${direction}`);
        
        return new Promise(resolve => {
            setTimeout(() => {
                tileElement.classList.remove('moving', `slide-${direction}`);
                resolve();
            }, ANIMATIONS.TILE_MOVE_DURATION);
        });
    }

    /**
     * Get animation direction between two positions
     * @param {object} from - Starting position
     * @param {object} to - Ending position
     * @returns {string} Direction (up, down, left, right)
     * @private
     */
    _getAnimationDirection(from, to) {
        if (from.row > to.row) return 'up';
        if (from.row < to.row) return 'down';
        if (from.col > to.col) return 'left';
        if (from.col < to.col) return 'right';
        return 'up'; // fallback
    }

    /**
     * Show invalid move animation
     * @param {HTMLElement} tileElement - Tile element to animate
     */
    showInvalidMoveAnimation(tileElement) {
        if (!this.settings.enableAnimations || !tileElement) return;
        
        tileElement.classList.add('invalid-move');
        
        setTimeout(() => {
            tileElement.classList.remove('invalid-move');
        }, 300);
    }

    /**
     * Show puzzle completion animation
     */
    showCompletionAnimation() {
        if (!this.settings.enableAnimations) return;
        
        this.boardElement.classList.add('completed');
        
        // Add staggered tile animations
        this.boardElement.querySelectorAll('.puzzle-tile:not(.empty-tile)').forEach((tile, index) => {
            tile.style.setProperty('--tile-index', index);
        });
        
        setTimeout(() => {
            this.boardElement.classList.remove('completed');
        }, 1000);
    }

    // =============================================================================
    // HINT SYSTEM
    // =============================================================================

    /**
     * Show hint highlighting valid moves
     */
    showHint() {
        if (!this.settings.enableHints || !this.puzzle) return;
        
        const validMoves = this.puzzle.getValidMoves();
        
        // Clear existing hints
        this.clearHints();
        
        // Highlight valid moves
        validMoves.forEach(move => {
            const tileElement = this.tileElements.get(move.tileValue);
            if (tileElement) {
                tileElement.classList.add('hint-highlight');
            }
        });
        
        // Auto-clear hints after 3 seconds
        setTimeout(() => {
            this.clearHints();
        }, 3000);
        
        this.emit(EVENTS.HINT_SHOWN, { validMoves });
    }

    /**
     * Clear all hint highlights
     */
    clearHints() {
        this.boardElement.querySelectorAll('.hint-highlight').forEach(tile => {
            tile.classList.remove('hint-highlight');
        });
    }

    // =============================================================================
    // PROGRESS UPDATES
    // =============================================================================

    /**
     * Update progress indicator
     */
    _updateProgress() {
        if (!this.puzzle) return;
        
        const stats = this.puzzle.getStatistics();
        const progressFill = document.getElementById('puzzle-progress');
        const progressText = document.getElementById('progress-text');
        
        if (progressFill && progressText) {
            // Calculate progress based on correct tiles
            const puzzleState = this.puzzle.getCurrentState();
            let correctTiles = 0;
            const totalTiles = this.size * this.size;
            
            for (let row = 0; row < this.size; row++) {
                for (let col = 0; col < this.size; col++) {
                    const value = puzzleState[row][col];
                    if (this._isCorrectPosition(value, row, col)) {
                        correctTiles++;
                    }
                }
            }
            
            const progress = Math.round((correctTiles / totalTiles) * 100);
            
            progressFill.style.width = `${progress}%`;
            progressText.textContent = `${progress}% Complete`;
        }
    }

    // =============================================================================
    // EVENT HANDLERS
    // =============================================================================

    /**
     * Handle board click events
     * @param {MouseEvent} event - Click event
     * @private
     */
    _handleBoardClick(event) {
        if (this.isAnimating) return;
        
        const tileElement = event.target.closest('.puzzle-tile');
        if (!tileElement || tileElement.classList.contains('empty-tile')) return;
        
        const row = parseInt(tileElement.dataset.row);
        const col = parseInt(tileElement.dataset.col);
        
        this._attemptMove(row, col, tileElement);
    }

    /**
     * Handle touch start events
     * @param {TouchEvent} event - Touch event
     * @private
     */
    _handleTouchStart(event) {
        event.preventDefault(); // Prevent scrolling
        this.touchStartElement = event.target.closest('.puzzle-tile');
    }

    /**
     * Handle touch end events
     * @param {TouchEvent} event - Touch event
     * @private
     */
    _handleTouchEnd(event) {
        event.preventDefault();
        
        if (this.isAnimating || !this.touchStartElement) return;
        
        const tileElement = this.touchStartElement;
        this.touchStartElement = null;
        
        if (tileElement.classList.contains('empty-tile')) return;
        
        const row = parseInt(tileElement.dataset.row);
        const col = parseInt(tileElement.dataset.col);
        
        this._attemptMove(row, col, tileElement);
    }

    /**
     * Handle keyboard navigation
     * @param {KeyboardEvent} event - Keyboard event
     * @private
     */
    _handleKeyDown(event) {
        if (this.isAnimating) return;
        
        const focusedTile = document.activeElement;
        if (!focusedTile || !focusedTile.classList.contains('puzzle-tile')) return;
        
        const row = parseInt(focusedTile.dataset.row);
        const col = parseInt(focusedTile.dataset.col);
        
        switch (event.key) {
            case 'Enter':
            case ' ':
                event.preventDefault();
                this._attemptMove(row, col, focusedTile);
                break;
            case 'ArrowUp':
                event.preventDefault();
                this._focusTile(row - 1, col);
                break;
            case 'ArrowDown':
                event.preventDefault();
                this._focusTile(row + 1, col);
                break;
            case 'ArrowLeft':
                event.preventDefault();
                this._focusTile(row, col - 1);
                break;
            case 'ArrowRight':
                event.preventDefault();
                this._focusTile(row, col + 1);
                break;
        }
    }

    /**
     * Focus tile at specific position
     * @param {number} row - Target row
     * @param {number} col - Target column
     * @private
     */
    _focusTile(row, col) {
        if (row < 0 || row >= this.size || col < 0 || col >= this.size) return;
        
        const tiles = this.boardElement.querySelectorAll('.puzzle-tile');
        const targetTile = Array.from(tiles).find(tile => 
            parseInt(tile.dataset.row) === row && parseInt(tile.dataset.col) === col
        );
        
        if (targetTile && !targetTile.classList.contains('empty-tile')) {
            targetTile.focus();
        }
    }

    /**
     * Attempt to move a tile
     * @param {number} row - Tile row
     * @param {number} col - Tile column
     * @param {HTMLElement} tileElement - Tile DOM element
     * @private
     */
    async _attemptMove(row, col, tileElement) {
        if (!this.puzzle || this.isAnimating) return;
        
        // Check if move is valid before sending to puzzle
        const emptyPos = findEmptyPosition(this.puzzle.getCurrentState());
        const tilePos = { row, col };
        
        if (!areAdjacent(tilePos, emptyPos)) {
            this.showInvalidMoveAnimation(tileElement);
            return;
        }
        
        // Set animation flag
        this.isAnimating = true;
        
        try {
            // Attempt the move
            const success = this.puzzle.moveTile(row, col);
            
            if (success) {
                // Animate the move
                const tileValue = parseInt(tileElement.dataset.value);
                await this.animateTileMove(tileValue, tilePos, emptyPos);
                
                // Re-render board after animation
                this.render();
            } else {
                this.showInvalidMoveAnimation(tileElement);
            }
        } finally {
            this.isAnimating = false;
        }
    }

    /**
     * Handle tile moved event from puzzle
     * @param {object} moveData - Move event data
     * @private
     */
    _handleTileMoved(moveData) {
        this._updateProgress();
        this.clearHints(); // Clear hints when user makes a move
        
        this.emit(EVENTS.TILE_MOVED, moveData);
        
        if (DEBUG.ENABLED) {
            console.debug('GameBoard: Tile moved', moveData);
        }
    }

    /**
     * Handle puzzle solved event
     * @param {object} eventData - Puzzle solved event data
     * @private
     */
    _handlePuzzleSolved(eventData) {
        this.showCompletionAnimation();
        this.emit(EVENTS.PUZZLE_SOLVED, eventData);
        
        if (DEBUG.ENABLED) {
            console.debug('GameBoard: Puzzle solved!');
        }
    }

    /**
     * Handle invalid move event
     * @param {object} eventData - Invalid move event data
     * @private
     */
    _handleInvalidMove(eventData) {
        // Visual feedback is already handled in _attemptMove
        this.emit(EVENTS.INVALID_MOVE, eventData);
    }

    // =============================================================================
    // SETTINGS AND CONFIGURATION
    // =============================================================================

    /**
     * Update board settings
     * @param {object} newSettings - New settings to apply
     */
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        
        // Re-render if certain settings changed
        if (newSettings.hasOwnProperty('showCorrectPositions')) {
            this.render();
        }
        
        if (DEBUG.ENABLED) {
            console.debug('GameBoard settings updated:', this.settings);
        }
    }

    /**
     * Get current settings
     * @returns {object} Current settings
     */
    getSettings() {
        return { ...this.settings };
    }

    // =============================================================================
    // UTILITY METHODS
    // =============================================================================

    /**
     * Resize board for different screen sizes
     */
    resize() {
        // CSS handles most responsive behavior, but trigger re-render if needed
        this.render();
    }

    /**
     * Get board statistics
     * @returns {object} Board statistics
     */
    getStatistics() {
        return {
            size: this.size,
            totalTiles: this.size * this.size,
            renderedTiles: this.tileElements.size,
            isAnimating: this.isAnimating,
            settings: this.getSettings()
        };
    }

    /**
     * Cleanup board resources
     */
    destroy() {
        // Unsubscribe from puzzle events
        if (this.puzzle) {
            this.puzzle.off(EVENTS.TILE_MOVED, this._handleTileMoved);
            this.puzzle.off(EVENTS.PUZZLE_SOLVED, this._handlePuzzleSolved);
            this.puzzle.off(EVENTS.INVALID_MOVE, this._handleInvalidMove);
        }
        
        // Clear DOM
        if (this.container) {
            this.container.innerHTML = '';
        }
        
        // Clear references
        this.tileElements.clear();
        this.puzzle = null;
        this.boardElement = null;
        
        // Remove all event listeners
        this.removeAllListeners();
        
        if (DEBUG.ENABLED) {
            console.debug('GameBoard destroyed');
        }
    }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create a new GameBoard instance
 * @param {HTMLElement} container - Container element
 * @param {Puzzle} puzzle - Puzzle instance (optional)
 * @returns {GameBoard} New GameBoard instance
 */
export function createGameBoard(container, puzzle = null) {
    return new GameBoard(container, puzzle);
}

// =============================================================================
// EXPORTS
// =============================================================================

export default GameBoard;