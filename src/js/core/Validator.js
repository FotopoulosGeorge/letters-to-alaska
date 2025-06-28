/**
 * Validator - Move Validation and Win Condition Checking
 * Provides independent validation functions for the sliding puzzle game
 */

import { MECHANICS, VALIDATION, DEBUG } from './Constants.js';
import {
    findEmptyPosition,
    findPosition,
    getValueAt,
    areAdjacent,
    isPuzzleSolved,
    isPuzzleSolvable,
    arrays2DEqual,
    createSolvedPuzzle,
    flatten2DArray
} from './ArrayUtils.js';

// =============================================================================
// MOVE VALIDATION
// =============================================================================

/**
 * Validate if a tile can be moved from its current position
 * @param {Array<Array>} puzzle - Current puzzle state
 * @param {number} row - Row of tile to validate
 * @param {number} col - Column of tile to validate
 * @returns {object} Validation result with success/failure and reason
 */
export function validateTileMove(puzzle, row, col) {
    const result = {
        valid: false,
        reason: '',
        details: {}
    };

    // Check if position is within board bounds
    if (!isValidBoardPosition(row, col, puzzle.length)) {
        result.reason = 'Position out of bounds';
        result.details = { row, col, boardSize: puzzle.length };
        return result;
    }

    // Check if trying to move the empty tile
    const tileValue = getValueAt(puzzle, row, col);
    if (tileValue === MECHANICS.EMPTY_TILE) {
        result.reason = 'Cannot move empty tile';
        result.details = { position: { row, col } };
        return result;
    }

    // Find empty tile position
    const emptyPos = findEmptyPosition(puzzle);
    if (!emptyPos) {
        result.reason = 'Empty tile not found';
        result.details = { puzzle };
        return result;
    }

    // Check if tile is adjacent to empty space
    const tilePos = { row, col };
    if (!areAdjacent(tilePos, emptyPos)) {
        result.reason = 'Tile not adjacent to empty space';
        result.details = {
            tilePosition: tilePos,
            emptyPosition: emptyPos,
            distance: Math.abs(row - emptyPos.row) + Math.abs(col - emptyPos.col)
        };
        return result;
    }

    // Move is valid
    result.valid = true;
    result.reason = 'Valid move';
    result.details = {
        tileValue: tileValue,
        tilePosition: tilePos,
        emptyPosition: emptyPos
    };

    return result;
}

/**
 * Validate if a move by tile value is possible
 * @param {Array<Array>} puzzle - Current puzzle state
 * @param {number} tileValue - Value of tile to move
 * @returns {object} Validation result
 */
export function validateTileMoveByValue(puzzle, tileValue) {
    const result = {
        valid: false,
        reason: '',
        details: {}
    };

    // Check if tile value is valid
    if (!isValidTileValue(tileValue, puzzle.length)) {
        result.reason = 'Invalid tile value';
        result.details = { tileValue, expectedRange: [1, puzzle.length * puzzle.length - 1] };
        return result;
    }

    // Find tile position
    const tilePos = findPosition(puzzle, tileValue);
    if (!tilePos) {
        result.reason = 'Tile not found in puzzle';
        result.details = { tileValue };
        return result;
    }

    // Use standard position validation
    return validateTileMove(puzzle, tilePos.row, tilePos.col);
}

/**
 * Get all valid moves for current puzzle state
 * @param {Array<Array>} puzzle - Current puzzle state
 * @returns {Array} Array of valid move objects {row, col, tileValue}
 */
export function getValidMoves(puzzle) {
    const emptyPos = findEmptyPosition(puzzle);
    if (!emptyPos) return [];

    const validMoves = [];
    const size = puzzle.length;

    // Check all four directions from empty space
    Object.values(MECHANICS.DIRECTIONS).forEach(direction => {
        const tileRow = emptyPos.row + direction.y;
        const tileCol = emptyPos.col + direction.x;

        if (isValidBoardPosition(tileRow, tileCol, size)) {
            const tileValue = getValueAt(puzzle, tileRow, tileCol);
            validMoves.push({
                row: tileRow,
                col: tileCol,
                tileValue: tileValue,
                direction: direction.name
            });
        }
    });

    return validMoves;
}

// =============================================================================
// WIN CONDITION VALIDATION
// =============================================================================

/**
 * Check if puzzle is in winning state with detailed analysis
 * @param {Array<Array>} puzzle - Puzzle state to check
 * @returns {object} Detailed win condition result
 */
export function validateWinCondition(puzzle) {
    const result = {
        solved: false,
        correctTiles: 0,
        totalTiles: 0,
        misplacedTiles: [],
        details: {}
    };

    const size = puzzle.length;
    const solvedState = createSolvedPuzzle(size);
    result.totalTiles = size * size;

    // Check each position
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const currentValue = puzzle[row][col];
            const expectedValue = solvedState[row][col];

            if (currentValue === expectedValue) {
                result.correctTiles++;
            } else {
                result.misplacedTiles.push({
                    position: { row, col },
                    currentValue: currentValue,
                    expectedValue: expectedValue
                });
            }
        }
    }

    result.solved = result.correctTiles === result.totalTiles;
    result.details = {
        completionPercentage: (result.correctTiles / result.totalTiles) * 100,
        remainingMoves: result.misplacedTiles.length,
        perfectSolution: result.solved
    };

    if (DEBUG.ENABLED && result.solved) {
        console.debug('Win condition validated: Puzzle solved!');
    }

    return result;
}

/**
 * Calculate how close the puzzle is to being solved
 * @param {Array<Array>} puzzle - Current puzzle state
 * @returns {object} Progress analysis
 */
export function analyzeSolutionProgress(puzzle) {
    const winCondition = validateWinCondition(puzzle);
    const size = puzzle.length;
    
    // Calculate different metrics
    const correctPositions = winCondition.correctTiles;
    const totalPositions = winCondition.totalTiles;
    const progressPercentage = (correctPositions / totalPositions) * 100;

    // Calculate Manhattan distance (total displacement)
    let totalManhattanDistance = 0;
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const value = puzzle[row][col];
            if (value !== MECHANICS.EMPTY_TILE) {
                // Calculate target position for this value
                const targetRow = Math.floor((value - 1) / size);
                const targetCol = (value - 1) % size;
                
                // Add Manhattan distance
                totalManhattanDistance += Math.abs(row - targetRow) + Math.abs(col - targetCol);
            }
        }
    }

    // Calculate linear conflicts (tiles in correct row/column but wrong order)
    const linearConflicts = calculateLinearConflicts(puzzle);

    return {
        progressPercentage: Math.round(progressPercentage * 100) / 100,
        correctTiles: correctPositions,
        totalTiles: totalPositions,
        manhattanDistance: totalManhattanDistance,
        linearConflicts: linearConflicts,
        estimatedMovesToSolution: totalManhattanDistance + (2 * linearConflicts),
        difficulty: classifyDifficulty(totalManhattanDistance, size),
        solved: winCondition.solved
    };
}

// =============================================================================
// PUZZLE STATE VALIDATION
// =============================================================================

/**
 * Comprehensive puzzle state validation
 * @param {Array<Array>} puzzle - Puzzle state to validate
 * @returns {object} Validation result with detailed information
 */
export function validatePuzzleState(puzzle) {
    const result = {
        valid: false,
        errors: [],
        warnings: [],
        details: {}
    };

    // Check if puzzle is a 2D array
    if (!Array.isArray(puzzle)) {
        result.errors.push('Puzzle must be an array');
        return result;
    }

    if (puzzle.length === 0) {
        result.errors.push('Puzzle cannot be empty');
        return result;
    }

    // Check if all rows have same length (square grid)
    const size = puzzle.length;
    for (let i = 0; i < size; i++) {
        if (!Array.isArray(puzzle[i]) || puzzle[i].length !== size) {
            result.errors.push(`Row ${i} has invalid length. Expected ${size}, got ${puzzle[i]?.length || 'not array'}`);
        }
    }

    if (result.errors.length > 0) {
        return result;
    }

    // Check board size constraints
    if (!isValidBoardSize(size)) {
        result.errors.push(`Invalid board size: ${size}. Must be between ${VALIDATION.BOARD.MIN_SIZE} and ${VALIDATION.BOARD.MAX_SIZE}`);
    }

    // Validate tile values
    const flatPuzzle = flatten2DArray(puzzle);
    const tileValidation = validateTileValues(flatPuzzle, size);
    
    if (!tileValidation.valid) {
        result.errors.push(...tileValidation.errors);
        result.warnings.push(...tileValidation.warnings);
    }

    // Check if puzzle is solvable
    if (result.errors.length === 0) {
        if (!isPuzzleSolvable(puzzle)) {
            result.errors.push('Puzzle configuration is not solvable');
        }
    }

    // Additional checks if puzzle is valid so far
    if (result.errors.length === 0) {
        result.details = {
            size: size,
            totalTiles: size * size,
            solvable: isPuzzleSolvable(puzzle),
            solved: isPuzzleSolved(puzzle),
            emptyPosition: findEmptyPosition(puzzle),
            validMoves: getValidMoves(puzzle).length
        };
    }

    result.valid = result.errors.length === 0;
    return result;
}

/**
 * Validate tile values in puzzle
 * @param {Array} flatPuzzle - Flattened puzzle array
 * @param {number} size - Board size
 * @returns {object} Validation result
 */
export function validateTileValues(flatPuzzle, size) {
    const result = {
        valid: true,
        errors: [],
        warnings: []
    };

    const expectedTotal = size * size;
    const expectedValues = new Set();
    
    // Create set of expected values (0 for empty, 1 to n-1 for tiles)
    for (let i = 0; i <= expectedTotal - 1; i++) {
        expectedValues.add(i);
    }

    // Check for correct count
    if (flatPuzzle.length !== expectedTotal) {
        result.errors.push(`Expected ${expectedTotal} tiles, got ${flatPuzzle.length}`);
        result.valid = false;
    }

    // Check for valid values and duplicates
    const foundValues = new Set();
    const duplicates = [];
    const invalidValues = [];

    flatPuzzle.forEach((value, index) => {
        // Check if value is a number
        if (typeof value !== 'number' || !Number.isInteger(value)) {
            invalidValues.push({ index, value, type: typeof value });
            return;
        }

        // Check if value is in expected range
        if (!expectedValues.has(value)) {
            invalidValues.push({ index, value, reason: 'out of range' });
            return;
        }

        // Check for duplicates
        if (foundValues.has(value)) {
            duplicates.push({ value, positions: [foundValues.get(value), index] });
        } else {
            foundValues.add(value);
        }
    });

    if (invalidValues.length > 0) {
        result.errors.push(`Invalid tile values found: ${invalidValues.map(iv => `${iv.value} at position ${iv.index}`).join(', ')}`);
        result.valid = false;
    }

    if (duplicates.length > 0) {
        result.errors.push(`Duplicate values found: ${duplicates.map(d => `${d.value}`).join(', ')}`);
        result.valid = false;
    }

    // Check for missing values
    const missingValues = [...expectedValues].filter(v => !foundValues.has(v));
    if (missingValues.length > 0) {
        result.errors.push(`Missing values: ${missingValues.join(', ')}`);
        result.valid = false;
    }

    return result;
}

// =============================================================================
// UTILITY VALIDATION FUNCTIONS
// =============================================================================

/**
 * Check if position is valid on board
 * @param {number} row - Row to check
 * @param {number} col - Column to check
 * @param {number} size - Board size
 * @returns {boolean} True if position is valid
 */
export function isValidBoardPosition(row, col, size) {
    return row >= 0 && row < size && col >= 0 && col < size;
}

/**
 * Check if board size is valid
 * @param {number} size - Board size to check
 * @returns {boolean} True if size is valid
 */
export function isValidBoardSize(size) {
    return Number.isInteger(size) && 
           size >= VALIDATION.LEVEL.MIN_LEVEL && 
           size <= VALIDATION.LEVEL.MAX_LEVEL;
}

/**
 * Check if tile value is valid for given board size
 * @param {number} value - Tile value to check
 * @param {number} size - Board size
 * @returns {boolean} True if tile value is valid
 */
export function isValidTileValue(value, size) {
    return Number.isInteger(value) && 
           value >= MECHANICS.EMPTY_TILE && 
           value < size * size;
}

/**
 * Calculate linear conflicts in puzzle
 * @param {Array<Array>} puzzle - Puzzle state
 * @returns {number} Number of linear conflicts
 */
function calculateLinearConflicts(puzzle) {
    const size = puzzle.length;
    let conflicts = 0;

    // Check row conflicts
    for (let row = 0; row < size; row++) {
        const tilesInCorrectRow = [];
        
        for (let col = 0; col < size; col++) {
            const value = puzzle[row][col];
            if (value !== MECHANICS.EMPTY_TILE) {
                const targetRow = Math.floor((value - 1) / size);
                if (targetRow === row) {
                    tilesInCorrectRow.push({ value, col });
                }
            }
        }
        
        // Count conflicts within this row
        for (let i = 0; i < tilesInCorrectRow.length; i++) {
            for (let j = i + 1; j < tilesInCorrectRow.length; j++) {
                const tile1 = tilesInCorrectRow[i];
                const tile2 = tilesInCorrectRow[j];
                
                const targetCol1 = (tile1.value - 1) % size;
                const targetCol2 = (tile2.value - 1) % size;
                
                // Conflict if tiles are in wrong order
                if ((tile1.col < tile2.col && targetCol1 > targetCol2) ||
                    (tile1.col > tile2.col && targetCol1 < targetCol2)) {
                    conflicts++;
                }
            }
        }
    }

    // Check column conflicts (similar logic)
    for (let col = 0; col < size; col++) {
        const tilesInCorrectCol = [];
        
        for (let row = 0; row < size; row++) {
            const value = puzzle[row][col];
            if (value !== MECHANICS.EMPTY_TILE) {
                const targetCol = (value - 1) % size;
                if (targetCol === col) {
                    tilesInCorrectCol.push({ value, row });
                }
            }
        }
        
        // Count conflicts within this column
        for (let i = 0; i < tilesInCorrectCol.length; i++) {
            for (let j = i + 1; j < tilesInCorrectCol.length; j++) {
                const tile1 = tilesInCorrectCol[i];
                const tile2 = tilesInCorrectCol[j];
                
                const targetRow1 = Math.floor((tile1.value - 1) / size);
                const targetRow2 = Math.floor((tile2.value - 1) / size);
                
                // Conflict if tiles are in wrong order
                if ((tile1.row < tile2.row && targetRow1 > targetRow2) ||
                    (tile1.row > tile2.row && targetRow1 < targetRow2)) {
                    conflicts++;
                }
            }
        }
    }

    return conflicts;
}

/**
 * Classify difficulty based on Manhattan distance
 * @param {number} manhattanDistance - Total Manhattan distance
 * @param {number} size - Board size
 * @returns {string} Difficulty classification
 */
function classifyDifficulty(manhattanDistance, size) {
    const maxDistance = size * size * 2; // Rough maximum
    const ratio = manhattanDistance / maxDistance;
    
    if (ratio < 0.3) return 'Easy';
    if (ratio < 0.6) return 'Medium';
    return 'Hard';
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
    validateTileMove,
    validateTileMoveByValue,
    getValidMoves,
    validateWinCondition,
    analyzeSolutionProgress,
    validatePuzzleState,
    validateTileValues,
    isValidBoardPosition,
    isValidBoardSize,
    isValidTileValue
};