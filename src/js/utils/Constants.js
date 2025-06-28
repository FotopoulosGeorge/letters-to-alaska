/**
 * Game Constants - Single source of truth for all game configuration
 * Sliding Puzzle Game
 */

// =============================================================================
// GAME BOARD CONFIGURATION
// =============================================================================

export const BOARD = {
    // Standard puzzle sizes (3x3, 4x4, 5x5)
    MIN_SIZE: 3,
    MAX_SIZE: 5,
    DEFAULT_SIZE: 4,
    
    // Tile dimensions in pixels
    TILE_SIZE: 80,
    TILE_GAP: 2,
    
    // Board padding
    PADDING: 20
};

// =============================================================================
// GAME STATES
// =============================================================================

export const GAME_STATES = {
    MENU: 'menu',
    LEVEL_SELECT: 'level_select',
    PLAYING: 'playing',
    PAUSED: 'paused',
    STORY_REVEAL: 'story_reveal',
    GAME_OVER: 'game_over',
    PUZZLE_COMPLETE: 'puzzle_complete',
    SETTINGS: 'settings'
};

// =============================================================================
// DIFFICULTY LEVELS
// =============================================================================

export const DIFFICULTY = {
    EASY: {
        name: 'Easy',
        boardSize: 3,
        maxMoves: 50,
        shuffleMoves: 20
    },
    MEDIUM: {
        name: 'Medium', 
        boardSize: 4,
        maxMoves: 80,
        shuffleMoves: 35
    },
    HARD: {
        name: 'Hard',
        boardSize: 5,
        maxMoves: 120,
        shuffleMoves: 50
    }
};

// =============================================================================
// ANIMATION SETTINGS
// =============================================================================

export const ANIMATIONS = {
    // Tile movement duration in milliseconds
    TILE_MOVE_DURATION: 200,
    
    // UI transition durations
    MODAL_FADE_DURATION: 300,
    MENU_TRANSITION_DURATION: 250,
    
    // Animation easing functions
    EASING: {
        EASE_OUT: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        EASE_IN_OUT: 'cubic-bezier(0.42, 0, 0.58, 1)',
        BOUNCE: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
    }
};

// =============================================================================
// UI CONSTANTS
// =============================================================================

export const UI = {
    // Z-index layers
    Z_INDEX: {
        BACKGROUND: 1,
        GAME_BOARD: 10,
        HUD: 20,
        MODAL_BACKDROP: 90,
        MODAL: 100,
        TOOLTIP: 110
    },
    
    // Breakpoints for responsive design
    BREAKPOINTS: {
        MOBILE: 768,
        TABLET: 1024,
        DESKTOP: 1200
    },
    
    // Color scheme
    COLORS: {
        PRIMARY: '#2563eb',
        SECONDARY: '#64748b',
        SUCCESS: '#059669',
        WARNING: '#d97706',
        DANGER: '#dc2626',
        BACKGROUND: '#f8fafc',
        SURFACE: '#ffffff',
        TEXT_PRIMARY: '#1e293b',
        TEXT_SECONDARY: '#64748b'
    }
};

// =============================================================================
// EVENTS
// =============================================================================

export const EVENTS = {
    // Game events
    GAME_STATE_CHANGED: 'gameStateChanged',
    PUZZLE_SOLVED: 'puzzleSolved',
    GAME_OVER: 'gameOver',
    LEVEL_COMPLETE: 'levelComplete',
    
    // Tile events
    TILE_MOVED: 'tileMoved',
    INVALID_MOVE: 'invalidMove',
    
    // UI events
    MODAL_OPENED: 'modalOpened',
    MODAL_CLOSED: 'modalClosed',
    SETTINGS_CHANGED: 'settingsChanged',
    
    // Progress events
    PROGRESS_SAVED: 'progressSaved',
    PROGRESS_LOADED: 'progressLoaded'
};

// =============================================================================
// STORAGE KEYS
// =============================================================================

export const STORAGE_KEYS = {
    GAME_PROGRESS: 'slidingPuzzle_gameProgress',
    SETTINGS: 'slidingPuzzle_settings',
    HIGH_SCORES: 'slidingPuzzle_highScores',
    CURRENT_GAME: 'slidingPuzzle_currentGame',
    ANALYTICS: 'slidingPuzzle_analytics'
};

// =============================================================================
// FILE PATHS
// =============================================================================

export const PATHS = {
    LEVELS: './data/levels/',
    CONFIG: './data/config/',
    IMAGES: './assets/images/',
    AUDIO: './assets/audio/',
    FONTS: './assets/fonts/'
};

// =============================================================================
// GAME MECHANICS
// =============================================================================

export const MECHANICS = {
    // Directions for tile movement
    DIRECTIONS: {
        UP: { x: 0, y: -1, name: 'up' },
        DOWN: { x: 0, y: 1, name: 'down' },
        LEFT: { x: -1, y: 0, name: 'left' },
        RIGHT: { x: 1, y: 0, name: 'right' }
    },
    
    // Empty tile representation
    EMPTY_TILE: 0,
    
    // Minimum moves for puzzle generation
    MIN_SHUFFLE_MOVES: 10,
    
    // Score multipliers
    SCORE_MULTIPLIERS: {
        PERFECT: 2.0,      // No wrong moves
        EXCELLENT: 1.5,    // Under 75% of max moves
        GOOD: 1.2,         // Under 90% of max moves
        NORMAL: 1.0        // Default
    }
};

// =============================================================================
// AUDIO SETTINGS
// =============================================================================

export const AUDIO = {
    // Volume levels (0.0 to 1.0)
    DEFAULT_VOLUME: {
        MASTER: 0.7,
        SFX: 0.8,
        MUSIC: 0.5
    },
    
    // Audio file formats to try (in order of preference)
    FORMATS: ['mp3', 'ogg', 'wav'],
    
    // Sound effect names
    SFX: {
        TILE_MOVE: 'tile_move',
        PUZZLE_COMPLETE: 'puzzle_complete',
        INVALID_MOVE: 'invalid_move',
        BUTTON_CLICK: 'button_click',
        LEVEL_COMPLETE: 'level_complete',
        GAME_OVER: 'game_over'
    }
};

// =============================================================================
// DEVELOPMENT & DEBUG
// =============================================================================

export const DEBUG = {
    // Enable debug mode
    ENABLED: false,
    
    // Console logging levels
    LOG_LEVELS: {
        ERROR: 0,
        WARN: 1,
        INFO: 2,
        DEBUG: 3
    },
    
    // Current log level
    CURRENT_LOG_LEVEL: 2, // INFO level by default
    
    // Performance monitoring
    PERFORMANCE_MONITORING: false
};

// =============================================================================
// VALIDATION RULES
// =============================================================================

export const VALIDATION = {
    // Player name constraints
    PLAYER_NAME: {
        MIN_LENGTH: 1,
        MAX_LENGTH: 20,
        ALLOWED_CHARS: /^[a-zA-Z0-9\s-_]+$/
    },
    
    // Level constraints
    LEVEL: {
        MIN_LEVEL: 1,
        MAX_LEVEL: 50
    },
    
    // Puzzle constraints
    PUZZLE: {
        MIN_PUZZLES_PER_LEVEL: 1,
        MAX_PUZZLES_PER_LEVEL: 20
    }
};

// =============================================================================
// DEFAULT SETTINGS
// =============================================================================

export const DEFAULT_SETTINGS = {
    difficulty: DIFFICULTY.MEDIUM,
    soundEnabled: true,
    musicEnabled: true,
    volume: AUDIO.DEFAULT_VOLUME,
    animationsEnabled: true,
    showHints: true,
    autoSave: true,
    theme: 'default'
};

// =============================================================================
// UTILITY FUNCTIONS FOR CONSTANTS
// =============================================================================

/**
 * Get board dimensions based on size
 * @param {number} size - Board size (3, 4, or 5)
 * @returns {object} Width and height in pixels
 */
export function getBoardDimensions(size) {
    const totalTileSize = BOARD.TILE_SIZE * size;
    const totalGapSize = BOARD.TILE_GAP * (size - 1);
    const dimension = totalTileSize + totalGapSize + (BOARD.PADDING * 2);
    
    return {
        width: dimension,
        height: dimension
    };
}

/**
 * Get tile position in pixels
 * @param {number} row - Tile row (0-based)
 * @param {number} col - Tile column (0-based)
 * @returns {object} X and Y coordinates
 */
export function getTilePosition(row, col) {
    return {
        x: BOARD.PADDING + (col * (BOARD.TILE_SIZE + BOARD.TILE_GAP)),
        y: BOARD.PADDING + (row * (BOARD.TILE_SIZE + BOARD.TILE_GAP))
    };
}

/**
 * Check if coordinates are within board bounds
 * @param {number} row - Row to check
 * @param {number} col - Column to check  
 * @param {number} size - Board size
 * @returns {boolean} True if within bounds
 */
export function isValidPosition(row, col, size) {
    return row >= 0 && row < size && col >= 0 && col < size;
}