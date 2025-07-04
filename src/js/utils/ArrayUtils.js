/**
 * Array Utilities for Sliding Puzzle Game
 * Contains essential array manipulation functions for puzzle logic
 */

import { MECHANICS } from '../utils/Constants.js';

// =============================================================================
// BASIC ARRAY OPERATIONS
// =============================================================================

/**
 * Create a 2D array filled with initial values
 * @param {number} rows - Number of rows
 * @param {number} cols - Number of columns
 * @param {*} fillValue - Value to fill array with (default: 0)
 * @returns {Array<Array>} 2D array
 */
export function create2DArray(rows, cols, fillValue = 0) {
    return Array(rows).fill(null).map(() => Array(cols).fill(fillValue));
}

/**
 * Deep clone a 2D array
 * @param {Array<Array>} array - 2D array to clone
 * @returns {Array<Array>} Deep cloned array
 */
export function clone2DArray(array) {
    return array.map(row => [...row]);
}

/**
 * Flatten a 2D array to 1D
 * @param {Array<Array>} array2D - 2D array to flatten
 * @returns {Array} Flattened 1D array
 */
export function flatten2DArray(array2D) {
    return array2D.flat();
}

/**
 * Convert 1D array to 2D array
 * @param {Array} array1D - 1D array to convert
 * @param {number} cols - Number of columns for 2D array
 * @returns {Array<Array>} 2D array
 */
export function arrayTo2D(array1D, cols) {
    const result = [];
    for (let i = 0; i < array1D.length; i += cols) {
        result.push(array1D.slice(i, i + cols));
    }
    return result;
}

// =============================================================================
// PUZZLE-SPECIFIC ARRAY OPERATIONS
// =============================================================================

/**
 * Create a solved puzzle state (1 to n-1, with 0 as empty)
 * @param {number} size - Board size (e.g., 4 for 4x4)
 * @returns {Array<Array>} Solved puzzle state
 */
export function createSolvedPuzzle(size) {
    const puzzle = create2DArray(size, size);
    let number = 1;
    
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            // Last tile is empty (0)
            if (row === size - 1 && col === size - 1) {
                puzzle[row][col] = MECHANICS.EMPTY_TILE;
            } else {
                puzzle[row][col] = number++;
            }
        }
    }
    
    return puzzle;
}

/**
 * Find position of a specific value in 2D array
 * @param {Array<Array>} puzzle - 2D puzzle array
 * @param {number} value - Value to find
 * @returns {object|null} Position {row, col} or null if not found
 */
export function findPosition(puzzle, value) {
    for (let row = 0; row < puzzle.length; row++) {
        for (let col = 0; col < puzzle[row].length; col++) {
            if (puzzle[row][col] === value) {
                return { row, col };
            }
        }
    }
    return null;
}

/**
 * Find position of empty tile (0)
 * @param {Array<Array>} puzzle - 2D puzzle array
 * @returns {object|null} Position {row, col} of empty tile
 */
export function findEmptyPosition(puzzle) {
    return findPosition(puzzle, MECHANICS.EMPTY_TILE);
}

/**
 * Get value at specific position
 * @param {Array<Array>} puzzle - 2D puzzle array
 * @param {number} row - Row index
 * @param {number} col - Column index
 * @returns {number|null} Value at position or null if out of bounds
 */
export function getValueAt(puzzle, row, col) {
    if (row >= 0 && row < puzzle.length && col >= 0 && col < puzzle[0].length) {
        return puzzle[row][col];
    }
    return null;
}

/**
 * Set value at specific position (returns new array, doesn't mutate original)
 * @param {Array<Array>} puzzle - 2D puzzle array
 * @param {number} row - Row index
 * @param {number} col - Column index
 * @param {number} value - Value to set
 * @returns {Array<Array>} New puzzle array with updated value
 */
export function setValueAt(puzzle, row, col, value) {
    const newPuzzle = clone2DArray(puzzle);
    if (row >= 0 && row < puzzle.length && col >= 0 && col < puzzle[0].length) {
        newPuzzle[row][col] = value;
    }
    return newPuzzle;
}

// =============================================================================
// MOVEMENT AND SWAPPING
// =============================================================================

/**
 * Swap two positions in puzzle (returns new array)
 * @param {Array<Array>} puzzle - 2D puzzle array
 * @param {object} pos1 - First position {row, col}
 * @param {object} pos2 - Second position {row, col}
 * @returns {Array<Array>} New puzzle array with swapped values
 */
export function swapPositions(puzzle, pos1, pos2) {
    const newPuzzle = clone2DArray(puzzle);
    const temp = newPuzzle[pos1.row][pos1.col];
    newPuzzle[pos1.row][pos1.col] = newPuzzle[pos2.row][pos2.col];
    newPuzzle[pos2.row][pos2.col] = temp;
    return newPuzzle;
}

/**
 * Get adjacent positions (up, down, left, right)
 * @param {number} row - Current row
 * @param {number} col - Current column
 * @param {number} size - Board size
 * @returns {Array} Array of valid adjacent positions {row, col}
 */
export function getAdjacentPositions(row, col, size) {
    const adjacent = [];
    
    // Check all four directions
    Object.values(MECHANICS.DIRECTIONS).forEach(direction => {
        const newRow = row + direction.y;
        const newCol = col + direction.x;
        
        // Check if position is within bounds
        if (newRow >= 0 && newRow < size && newCol >= 0 && newCol < size) {
            adjacent.push({ row: newRow, col: newCol });
        }
    });
    
    return adjacent;
}

/**
 * Check if two positions are adjacent
 * @param {object} pos1 - First position {row, col}
 * @param {object} pos2 - Second position {row, col}
 * @returns {boolean} True if positions are adjacent
 */
export function areAdjacent(pos1, pos2) {
    const rowDiff = Math.abs(pos1.row - pos2.row);
    const colDiff = Math.abs(pos1.col - pos2.col);
    
    // Adjacent means exactly one unit away in one direction
    return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
}

// =============================================================================
// PUZZLE VALIDATION AND CHECKING
// =============================================================================

/**
 * Check if puzzle is in solved state
 * @param {Array<Array>} puzzle - 2D puzzle array
 * @returns {boolean} True if puzzle is solved
 */
export function isPuzzleSolved(puzzle) {
    const size = puzzle.length;
    let expectedValue = 1;
    
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            // Last position should be empty (0)
            if (row === size - 1 && col === size - 1) {
                return puzzle[row][col] === MECHANICS.EMPTY_TILE;
            }
            // All other positions should be in order
            if (puzzle[row][col] !== expectedValue) {
                return false;
            }
            expectedValue++;
        }
    }
    
    return true;
}

/**
 * Check if a puzzle configuration is solvable
 * A sliding puzzle is solvable if the number of inversions is even (for odd-sized boards)
 * or follows specific rules for even-sized boards
 * @param {Array<Array>} puzzle - 2D puzzle array
 * @returns {boolean} True if puzzle is solvable
 */
export function isPuzzleSolvable(puzzle) {
    const size = puzzle.length;
    const flatPuzzle = flatten2DArray(puzzle);
    
    // Remove the empty tile for inversion counting
    const tilesOnly = flatPuzzle.filter(tile => tile !== MECHANICS.EMPTY_TILE);
    
    // Count inversions
    let inversions = 0;
    for (let i = 0; i < tilesOnly.length; i++) {
        for (let j = i + 1; j < tilesOnly.length; j++) {
            if (tilesOnly[i] > tilesOnly[j]) {
                inversions++;
            }
        }
    }
    
    if (size % 2 === 1) {
        // Odd-sized board: solvable if inversions are even
        return inversions % 2 === 0;
    } else {
        // Even-sized board: more complex rules
        const emptyPos = findEmptyPosition(puzzle);
        const emptyRowFromBottom = size - emptyPos.row;
        
        if (emptyRowFromBottom % 2 === 1) {
            // Empty on odd row from bottom: solvable if inversions are even
            return inversions % 2 === 0;
        } else {
            // Empty on even row from bottom: solvable if inversions are odd
            return inversions % 2 === 1;
        }
    }
}

// =============================================================================
// SHUFFLING AND GENERATION
// =============================================================================

/**
 * Fisher-Yates shuffle algorithm for arrays
 * @param {Array} array - Array to shuffle
 * @returns {Array} New shuffled array
 */
export function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * Generate a solvable puzzle by making valid moves from solved state
 * This ensures the puzzle is always solvable
 * @param {number} size - Board size
 * @param {number} shuffleMoves - Number of random moves to make
 * @returns {Array<Array>} Shuffled but solvable puzzle
 */
export function generateSolvablePuzzle(size, shuffleMoves) {
    let puzzle = createSolvedPuzzle(size);
    let emptyPos = findEmptyPosition(puzzle);
    let lastMove = null;
    
    for (let i = 0; i < shuffleMoves; i++) {
        const adjacent = getAdjacentPositions(emptyPos.row, emptyPos.col, size);
        
        // Filter out the last move to avoid immediate reversal
        const validMoves = adjacent.filter(pos => {
            if (!lastMove) return true;
            return !(pos.row === lastMove.row && pos.col === lastMove.col);
        });
        
        // Pick random valid move
        const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
        
        // Store current empty position as last move
        lastMove = { ...emptyPos };
        
        // Swap empty tile with random adjacent tile
        puzzle = swapPositions(puzzle, emptyPos, randomMove);
        emptyPos = randomMove;
    }
    
    return puzzle;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Compare two 2D arrays for equality
 * @param {Array<Array>} arr1 - First array
 * @param {Array<Array>} arr2 - Second array
 * @returns {boolean} True if arrays are equal
 */
export function arrays2DEqual(arr1, arr2) {
    if (arr1.length !== arr2.length) return false;
    
    for (let i = 0; i < arr1.length; i++) {
        if (arr1[i].length !== arr2[i].length) return false;
        for (let j = 0; j < arr1[i].length; j++) {
            if (arr1[i][j] !== arr2[i][j]) return false;
        }
    }
    
    return true;
}

/**
 * Convert puzzle to string representation (for debugging)
 * @param {Array<Array>} puzzle - 2D puzzle array
 * @returns {string} String representation of puzzle
 */
export function puzzleToString(puzzle) {
    return puzzle.map(row => 
        row.map(cell => cell === 0 ? '  ' : cell.toString().padStart(2, ' ')).join(' ')
    ).join('\n');
}

/**
 * Get Manhattan distance between current and target positions
 * Useful for AI solvers and hints
 * @param {Array<Array>} puzzle - Current puzzle state
 * @param {number} size - Board size
 * @returns {number} Total Manhattan distance
 */
export function getManhattanDistance(puzzle, size) {
    let distance = 0;
    
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const value = puzzle[row][col];
            if (value !== MECHANICS.EMPTY_TILE) {
                // Calculate target position for this value
                const targetRow = Math.floor((value - 1) / size);
                const targetCol = (value - 1) % size;
                
                // Add Manhattan distance to total
                distance += Math.abs(row - targetRow) + Math.abs(col - targetCol);
            }
        }
    }
    
    return distance;
}