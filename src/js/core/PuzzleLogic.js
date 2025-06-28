/**
 * PuzzleLogic - Core Sliding Puzzle Game Mechanics
 * Handles all puzzle operations, validation, and state management
 */

import { MECHANICS, EVENTS, DEBUG } from './Constants.js';
import {
    create2DArray,
    clone2DArray,
    createSolvedPuzzle,
    findEmptyPosition,
    findPosition,
    getValueAt,
    swapPositions,
    getAdjacentPositions,
    areAdjacent,
    isPuzzleSolved,
    isPuzzleSolvable,
    generateSolvablePuzzle,
    arrays2DEqual,
    puzzleToString,
    getManhattanDistance
} from './ArrayUtils.js';
import EventEmitter from './EventEmitter.js';

// =============================================================================
// PUZZLE CLASS
// =============================================================================

export class Puzzle extends EventEmitter {
    constructor(size = 4) {
        super();
        
        this.size = size;
        this.initialState = null;
        this.currentState = null;
        this.solvedState = null;
        this.moveHistory = [];
        this.moveCount = 0;
        this.maxMoves = 100;
        this.startTime = null;
        this.endTime = null;
        this.isComplete = false;
        
        this._initializePuzzle();
    }

    // =============================================================================
    // INITIALIZATION
    // =============================================================================

    /**
     * Initialize puzzle with solved state
     * @private
     */
    _initializePuzzle() {
        this.solvedState = createSolvedPuzzle(this.size);
        this.currentState = clone2DArray(this.solvedState);
        this.initialState = clone2DArray(this.solvedState);
        
        if (DEBUG.ENABLED) {
            console.debug('Puzzle initialized:', puzzleToString(this.currentState));
        }
    }

    /**
     * Generate a new shuffled puzzle
     * @param {number} shuffleMoves - Number of shuffle moves to make
     * @param {number} maxMoves - Maximum moves allowed to solve
     */
    generatePuzzle(shuffleMoves = 50, maxMoves = 100) {
        this.maxMoves = maxMoves;
        this.currentState = generateSolvablePuzzle(this.size, shuffleMoves);
        this.initialState = clone2DArray(this.currentState);
        this.moveHistory = [];
        this.moveCount = 0;
        this.startTime = null;
        this.endTime = null;
        this.isComplete = false;
        
        this.emit(EVENTS.PUZZLE_GENERATED, {
            puzzle: clone2DArray(this.currentState),
            maxMoves: this.maxMoves,
            difficulty: this._calculateDifficulty()
        });
        
        if (DEBUG.ENABLED) {
            console.debug('New puzzle generated:', puzzleToString(this.currentState));
            console.debug('Solvable:', isPuzzleSolvable(this.currentState));
        }
    }

    /**
     * Set puzzle to a specific state
     * @param {Array<Array>} puzzleState - 2D array representing puzzle state
     * @param {number} maxMoves - Maximum moves allowed
     */
    setPuzzleState(puzzleState, maxMoves = 100) {
        if (!Array.isArray(puzzleState) || puzzleState.length !== this.size) {
            throw new Error('Invalid puzzle state');
        }
        
        if (!isPuzzleSolvable(puzzleState)) {
            throw new Error('Puzzle state is not solvable');
        }
        
        this.currentState = clone2DArray(puzzleState);
        this.initialState = clone2DArray(puzzleState);
        this.maxMoves = maxMoves;
        this.moveHistory = [];
        this.moveCount = 0;
        this.startTime = null;
        this.endTime = null;
        this.isComplete = false;
        
        this.emit(EVENTS.PUZZLE_STATE_SET, {
            puzzle: clone2DArray(this.currentState),
            maxMoves: this.maxMoves
        });
    }

    // =============================================================================
    // MOVE OPERATIONS
    // =============================================================================

    /**
     * Attempt to move a tile at specified position
     * @param {number} row - Row of tile to move
     * @param {number} col - Column of tile to move
     * @returns {boolean} True if move was successful
     */
    moveTile(row, col) {
        if (this.isComplete) {
            return false;
        }
        
        // Start timer on first move
        if (this.startTime === null) {
            this.startTime = Date.now();
        }
        
        // Check if position is valid
        if (row < 0 || row >= this.size || col < 0 || col >= this.size) {
            this.emit(EVENTS.INVALID_MOVE, { 
                reason: 'Position out of bounds',
                position: { row, col }
            });
            return false;
        }
        
        // Find empty tile position
        const emptyPos = findEmptyPosition(this.currentState);
        const tilePos = { row, col };
        
        // Check if tile is adjacent to empty space
        if (!areAdjacent(tilePos, emptyPos)) {
            this.emit(EVENTS.INVALID_MOVE, {
                reason: 'Tile not adjacent to empty space',
                position: tilePos,
                emptyPosition: emptyPos
            });
            return false;
        }
        
        // Perform the move
        const moveData = this._executeMove(tilePos, emptyPos);
        
        // Check if puzzle is solved
        if (isPuzzleSolved(this.currentState)) {
            this._handlePuzzleComplete();
        } else if (this.moveCount >= this.maxMoves) {
            this._handleGameOver();
        }
        
        return true;
    }

    /**
     * Move tile by clicking on it
     * @param {number} tileValue - Value of the tile to move
     * @returns {boolean} True if move was successful
     */
    moveTileByValue(tileValue) {
        if (tileValue === MECHANICS.EMPTY_TILE) {
            return false;
        }
        
        const tilePos = findPosition(this.currentState, tileValue);
        if (!tilePos) {
            return false;
        }
        
        return this.moveTile(tilePos.row, tilePos.col);
    }

    /**
     * Execute a move and update game state
     * @private
     * @param {object} tilePos - Position of tile to move
     * @param {object} emptyPos - Position of empty space
     * @returns {object} Move data
     */
    _executeMove(tilePos, emptyPos) {
        const tileValue = getValueAt(this.currentState, tilePos.row, tilePos.col);
        const previousState = clone2DArray(this.currentState);
        
        // Swap tile with empty space
        this.currentState = swapPositions(this.currentState, tilePos, emptyPos);
        
        // Update move tracking
        this.moveCount++;
        
        const moveData = {
            moveNumber: this.moveCount,
            tileValue: tileValue,
            from: tilePos,
            to: emptyPos,
            previousState: previousState,
            currentState: clone2DArray(this.currentState),
            movesRemaining: this.maxMoves - this.moveCount,
            timestamp: Date.now()
        };
        
        // Add to move history
        this.moveHistory.push(moveData);
        
        // Emit move event
        this.emit(EVENTS.TILE_MOVED, moveData);
        
        if (DEBUG.ENABLED) {
            console.debug(`Move ${this.moveCount}: Tile ${tileValue} moved from (${tilePos.row},${tilePos.col}) to (${emptyPos.row},${emptyPos.col})`);
            console.debug('Current state:\n' + puzzleToString(this.currentState));
        }
        
        return moveData;
    }

    // =============================================================================
    // UNDO FUNCTIONALITY
    // =============================================================================

    /**
     * Undo the last move
     * @returns {boolean} True if undo was successful
     */
    undoLastMove() {
        if (this.moveHistory.length === 0 || this.isComplete) {
            return false;
        }
        
        const lastMove = this.moveHistory.pop();
        this.currentState = lastMove.previousState;
        this.moveCount--;
        
        this.emit(EVENTS.MOVE_UNDONE, {
            undoneMove: lastMove,
            currentState: clone2DArray(this.currentState),
            moveCount: this.moveCount
        });
        
        if (DEBUG.ENABLED) {
            console.debug(`Undid move ${lastMove.moveNumber}`);
        }
        
        return true;
    }

    /**
     * Check if undo is available
     * @returns {boolean} True if undo is possible
     */
    canUndo() {
        return this.moveHistory.length > 0 && !this.isComplete;
    }

    // =============================================================================
    // GAME STATE QUERIES
    // =============================================================================

    /**
     * Get current puzzle state
     * @returns {Array<Array>} Deep copy of current puzzle state
     */
    getCurrentState() {
        return clone2DArray(this.currentState);
    }

    /**
     * Get solved state
     * @returns {Array<Array>} Deep copy of solved puzzle state
     */
    getSolvedState() {
        return clone2DArray(this.solvedState);
    }

    /**
     * Check if puzzle is currently solved
     * @returns {boolean} True if puzzle is solved
     */
    isSolved() {
        return isPuzzleSolved(this.currentState);
    }

    /**
     * Get number of moves made
     * @returns {number} Number of moves
     */
    getMoveCount() {
        return this.moveCount;
    }

    /**
     * Get remaining moves
     * @returns {number} Moves remaining
     */
    getMovesRemaining() {
        return Math.max(0, this.maxMoves - this.moveCount);
    }

    /**
     * Get move history
     * @returns {Array} Array of move objects
     */
    getMoveHistory() {
        return [...this.moveHistory];
    }

    /**
     * Get empty tile position
     * @returns {object} Position {row, col} of empty tile
     */
    getEmptyPosition() {
        return findEmptyPosition(this.currentState);
    }

    /**
     * Get valid moves (tiles that can be moved)
     * @returns {Array} Array of positions that can be moved
     */
    getValidMoves() {
        const emptyPos = findEmptyPosition(this.currentState);
        return getAdjacentPositions(emptyPos.row, emptyPos.col, this.size);
    }

    // =============================================================================
    // DIFFICULTY AND ANALYSIS
    // =============================================================================

    /**
     * Calculate puzzle difficulty based on Manhattan distance
     * @private
     * @returns {string} Difficulty level
     */
    _calculateDifficulty() {
        const manhattanDistance = getManhattanDistance(this.currentState, this.size);
        const maxPossibleDistance = this.size * this.size * 2; // Rough estimate
        
        const difficultyRatio = manhattanDistance / maxPossibleDistance;
        
        if (difficultyRatio < 0.3) return 'Easy';
        if (difficultyRatio < 0.6) return 'Medium';
        return 'Hard';
    }

    /**
     * Get puzzle statistics
     * @returns {object} Puzzle statistics
     */
    getStatistics() {
        const currentTime = this.endTime || Date.now();
        const elapsedTime = this.startTime ? currentTime - this.startTime : 0;
        
        return {
            size: this.size,
            moveCount: this.moveCount,
            maxMoves: this.maxMoves,
            movesRemaining: this.getMovesRemaining(),
            elapsedTime: elapsedTime,
            isComplete: this.isComplete,
            isSolved: this.isSolved(),
            difficulty: this._calculateDifficulty(),
            manhattanDistance: getManhattanDistance(this.currentState, this.size),
            efficiency: this.moveCount > 0 ? (this.maxMoves - this.moveCount) / this.maxMoves : 1
        };
    }

    // =============================================================================
    // GAME COMPLETION HANDLING
    // =============================================================================

    /**
     * Handle puzzle completion
     * @private
     */
    _handlePuzzleComplete() {
        this.isComplete = true;
        this.endTime = Date.now();
        
        const stats = this.getStatistics();
        
        this.emit(EVENTS.PUZZLE_SOLVED, {
            stats: stats,
            moveHistory: this.getMoveHistory(),
            solvedState: clone2DArray(this.currentState)
        });
        
        if (DEBUG.ENABLED) {
            console.debug('Puzzle solved!', stats);
        }
    }

    /**
     * Handle game over (out of moves)
     * @private
     */
    _handleGameOver() {
        this.endTime = Date.now();
        
        const stats = this.getStatistics();
        
        this.emit(EVENTS.GAME_OVER, {
            reason: 'Out of moves',
            stats: stats,
            moveHistory: this.getMoveHistory(),
            currentState: clone2DArray(this.currentState)
        });
        
        if (DEBUG.ENABLED) {
            console.debug('Game over - out of moves', stats);
        }
    }

    // =============================================================================
    // RESET AND RESTART
    // =============================================================================

    /**
     * Reset puzzle to initial state
     */
    reset() {
        this.currentState = clone2DArray(this.initialState);
        this.moveHistory = [];
        this.moveCount = 0;
        this.startTime = null;
        this.endTime = null;
        this.isComplete = false;
        
        this.emit(EVENTS.PUZZLE_RESET, {
            resetState: clone2DArray(this.currentState)
        });
        
        if (DEBUG.ENABLED) {
            console.debug('Puzzle reset to initial state');
        }
    }

    /**
     * Create a completely new puzzle
     * @param {number} shuffleMoves - Number of shuffle moves
     */
    restart(shuffleMoves = 50) {
        this.generatePuzzle(shuffleMoves, this.maxMoves);
        
        if (DEBUG.ENABLED) {
            console.debug('Puzzle restarted with new configuration');
        }
    }

    // =============================================================================
    // SERIALIZATION
    // =============================================================================

    /**
     * Export puzzle state for saving
     * @returns {object} Serializable puzzle data
     */
    exportState() {
        return {
            size: this.size,
            currentState: this.currentState,
            initialState: this.initialState,
            moveHistory: this.moveHistory,
            moveCount: this.moveCount,
            maxMoves: this.maxMoves,
            startTime: this.startTime,
            endTime: this.endTime,
            isComplete: this.isComplete
        };
    }

    /**
     * Import puzzle state from saved data
     * @param {object} data - Saved puzzle data
     */
    importState(data) {
        this.size = data.size;
        this.currentState = data.currentState;
        this.initialState = data.initialState;
        this.moveHistory = data.moveHistory || [];
        this.moveCount = data.moveCount || 0;
        this.maxMoves = data.maxMoves || 100;
        this.startTime = data.startTime || null;
        this.endTime = data.endTime || null;
        this.isComplete = data.isComplete || false;
        
        // Regenerate solved state for current size
        this.solvedState = createSolvedPuzzle(this.size);
        
        this.emit(EVENTS.PUZZLE_STATE_IMPORTED, {
            importedState: clone2DArray(this.currentState)
        });
        
        if (DEBUG.ENABLED) {
            console.debug('Puzzle state imported');
        }
    }
}

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

/**
 * Create a new puzzle instance
 * @param {number} size - Board size (3, 4, or 5)
 * @returns {Puzzle} New puzzle instance
 */
export function createPuzzle(size = 4) {
    return new Puzzle(size);
}

/**
 * Create a puzzle from existing state
 * @param {Array<Array>} puzzleState - 2D array representing puzzle
 * @param {number} maxMoves - Maximum allowed moves
 * @returns {Puzzle} New puzzle instance with given state
 */
export function createPuzzleFromState(puzzleState, maxMoves = 100) {
    const size = puzzleState.length;
    const puzzle = new Puzzle(size);
    puzzle.setPuzzleState(puzzleState, maxMoves);
    return puzzle;
}

// =============================================================================
// EXPORTS
// =============================================================================

export default Puzzle;