/**
 * MenuSystem.js - Level Selection and Menu Interface
 * Handles level selection screen, progress visualization, and menu navigation
 */

import { EVENTS, DEBUG } from '../utils/Constants.js';
import EventEmitter from '../utils/EventEmitter.js';

// =============================================================================
// MENU SYSTEM CLASS
// =============================================================================

export class MenuSystem extends EventEmitter {
    constructor(containerElement, levelManager = null) {
        super();
        
        this.container = containerElement;
        this.levelManager = levelManager;
        this.currentScreen = 'menu';
        this.levelCards = new Map();
        this.animationInProgress = false;
        
        this._initialize();
    }

    // =============================================================================
    // INITIALIZATION
    // =============================================================================

    /**
     * Initialize the menu system
     * @private
     */
    _initialize() {
        if (!this.container) {
            throw new Error('MenuSystem: Container element is required');
        }
        
        this._setupEventListeners();
        
        if (this.levelManager) {
            this.setLevelManager(this.levelManager);
        }
        
        if (DEBUG.ENABLED) {
            console.debug('MenuSystem initialized');
        }
    }

    /**
     * Set the level manager reference
     * @param {LevelManager} levelManager - Level manager instance
     */
    setLevelManager(levelManager) {
        this.levelManager = levelManager;
        
        if (levelManager) {
            // Listen to level manager events
            levelManager.on(EVENTS.LEVEL_UNLOCKED, this._handleLevelUnlocked.bind(this));
            levelManager.on(EVENTS.LEVEL_COMPLETE, this._handleLevelComplete.bind(this));
            levelManager.on(EVENTS.PROGRESS_RESET, this._handleProgressReset.bind(this));
        }
        
        // Update level selection if currently visible
        if (this.currentScreen === 'level-select') {
            this.renderLevelSelection();
        }
    }

    /**
     * Set up event listeners
     * @private
     */
    _setupEventListeners() {
        // Find and set up menu buttons that might not be in our container
        this._setupGlobalMenuListeners();
        
        // Set up level select specific listeners
        this._setupLevelSelectListeners();
    }

    /**
     * Set up global menu button listeners
     * @private
     */
    _setupGlobalMenuListeners() {
        // Main menu buttons
        const newGameBtn = document.getElementById('new-game-btn');
        const continueGameBtn = document.getElementById('continue-game-btn');
        const levelSelectBtn = document.getElementById('level-select-btn');
        const backToMenuBtn = document.getElementById('back-to-menu-btn');
        
        if (newGameBtn) {
            newGameBtn.addEventListener('click', this._handleNewGameClick.bind(this));
        }
        
        if (continueGameBtn) {
            continueGameBtn.addEventListener('click', this._handleContinueGameClick.bind(this));
        }
        
        if (levelSelectBtn) {
            levelSelectBtn.addEventListener('click', this._handleLevelSelectClick.bind(this));
        }
        
        if (backToMenuBtn) {
            backToMenuBtn.addEventListener('click', this._handleBackToMenuClick.bind(this));
        }
    }

    /**
     * Set up level selection specific listeners
     * @private
     */
    _setupLevelSelectListeners() {
        // Level grid container (dynamically created content)
        const levelGrid = document.getElementById('level-grid');
        if (levelGrid) {
            levelGrid.addEventListener('click', this._handleLevelCardClick.bind(this));
        }
    }

    // =============================================================================
    // SCREEN MANAGEMENT
    // =============================================================================

    /**
     * Show main menu screen
     */
    showMainMenu() {
        this._changeScreen('menu');
        this._showScreenElement('menu-screen');
        this._updateMainMenuStats();
    }

    /**
     * Show level selection screen
     */
    showLevelSelection() {
        this._changeScreen('level-select');
        this._showScreenElement('level-select-screen');
        this.renderLevelSelection();
    }

    /**
     * Change current screen
     * @param {string} screenName - Name of the screen
     * @private
     */
    _changeScreen(screenName) {
        const previousScreen = this.currentScreen;
        this.currentScreen = screenName;
        
        this.emit(EVENTS.SCREEN_CHANGED, {
            previous: previousScreen,
            current: screenName
        });
        
        if (DEBUG.ENABLED) {
            console.debug(`Screen changed: ${previousScreen} → ${screenName}`);
        }
    }

    /**
     * Show specific screen element
     * @param {string} screenId - Screen element ID
     * @private
     */
    _showScreenElement(screenId) {
        if (this.animationInProgress) return;
        
        this.animationInProgress = true;
        
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        // Show target screen with animation
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            requestAnimationFrame(() => {
                targetScreen.classList.add('active');
                
                setTimeout(() => {
                    this.animationInProgress = false;
                }, 250); // Match CSS transition duration
            });
        }
    }

    // =============================================================================
    // LEVEL SELECTION RENDERING
    // =============================================================================

    /**
     * Render the level selection grid
     */
    renderLevelSelection() {
        if (!this.levelManager) {
            console.warn('MenuSystem: No level manager available for rendering');
            this._renderFallbackLevelSelection();
            return;
        }
        
        const levelGrid = document.getElementById('level-grid');
        if (!levelGrid) {
            console.warn('MenuSystem: Level grid element not found');
            return;
        }
        
        // Clear existing content
        levelGrid.innerHTML = '';
        this.levelCards.clear();
        
        // Get all levels info
        const levelsInfo = this.levelManager.getAllLevelsInfo();
        
        // Create level cards
        levelsInfo.forEach(levelInfo => {
            const levelCard = this._createLevelCard(levelInfo);
            levelGrid.appendChild(levelCard);
            this.levelCards.set(levelInfo.levelNumber, levelCard);
        });
        
        // Add entrance animations
        this._animateLevelCardsEntrance();
        
        if (DEBUG.ENABLED) {
            console.debug('Level selection rendered with', levelsInfo.length, 'levels');
        }
    }

    /**
     * Create a level card element
     * @param {object} levelInfo - Level information
     * @returns {HTMLElement} Level card element
     * @private
     */
    _createLevelCard(levelInfo) {
        const card = document.createElement('div');
        card.className = `level-card ${levelInfo.isUnlocked ? 'unlocked' : 'locked'} ${levelInfo.isCompleted ? 'completed' : ''}`;
        card.dataset.level = levelInfo.levelNumber;
        
        // Calculate progress percentage
        const progressPercent = Math.round((levelInfo.completedPuzzles / levelInfo.totalPuzzles) * 100);
        
        card.innerHTML = `
            <div class="level-card-header">
                <div class="level-number">${levelInfo.levelNumber}</div>
                <div class="level-lock-icon ${levelInfo.isUnlocked ? 'hidden' : ''}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                </div>
                <div class="level-complete-icon ${levelInfo.isCompleted ? '' : 'hidden'}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20,6 9,17 4,12"></polyline>
                    </svg>
                </div>
            </div>
            
            <div class="level-card-content">
                <h3 class="level-name">${levelInfo.name}</h3>
                <p class="level-description">${levelInfo.description}</p>
                
                <div class="level-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progressPercent}%"></div>
                    </div>
                    <span class="progress-text">${levelInfo.completedPuzzles}/${levelInfo.totalPuzzles} puzzles</span>
                </div>
                
                <div class="level-meta">
                    <span class="level-theme theme-${levelInfo.theme}">
                        ${this._getThemeIcon(levelInfo.theme)}
                        ${this._formatThemeName(levelInfo.theme)}
                    </span>
                    <span class="level-difficulty difficulty-${levelInfo.difficulty}">
                        ${this._getDifficultyStars(levelInfo.difficulty)}
                    </span>
                </div>
            </div>
            
            <div class="level-card-footer">
                ${levelInfo.isUnlocked ? 
                    `<button class="btn btn-primary level-play-btn">
                        ${levelInfo.completedPuzzles > 0 ? 'Continue' : 'Start'}
                    </button>` :
                    `<span class="unlock-requirement">Complete previous level</span>`
                }
            </div>
        `;
        
        // Add theme-specific styling
        card.classList.add(`theme-${levelInfo.theme}`);
        
        return card;
    }

    /**
     * Get theme icon for display
     * @param {string} theme - Theme name
     * @returns {string} Icon HTML
     * @private
     */
    _getThemeIcon(theme) {
        const icons = {
            garden: '🌺',
            mountain: '⛰️',
            ocean: '🌊',
            desert: '🏜️',
            forest: '🌲',
            crystal: '💎',
            sky: '☁️',
            volcano: '🌋',
            ice: '❄️',
            cosmic: '🌌'
        };
        
        return icons[theme] || '🎯';
    }

    /**
     * Format theme name for display
     * @param {string} theme - Theme name
     * @returns {string} Formatted theme name
     * @private
     */
    _formatThemeName(theme) {
        return theme.charAt(0).toUpperCase() + theme.slice(1);
    }

    /**
     * Get difficulty stars display
     * @param {string} difficulty - Difficulty level
     * @returns {string} Stars HTML
     * @private
     */
    _getDifficultyStars(difficulty) {
        const starMap = {
            'easy': '★☆☆',
            'easy-medium': '★★☆',
            'medium': '★★☆',
            'medium-hard': '★★★',
            'hard': '★★★',
            'expert': '★★★',
            'challenging': '★★★'
        };
        
        return starMap[difficulty] || '★☆☆';
    }

    /**
     * Animate level cards entrance
     * @private
     */
    _animateLevelCardsEntrance() {
        const cards = this.container.querySelectorAll('.level-card');
        
        cards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                card.style.transition = 'all 0.3s ease-out';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 100);
        });
    }

    /**
     * Render fallback level selection when no level manager
     * @private
     */
    _renderFallbackLevelSelection() {
        const levelGrid = document.getElementById('level-grid');
        if (!levelGrid) return;
        
        levelGrid.innerHTML = `
            <div class="fallback-message">
                <h3>Level selection coming soon!</h3>
                <p>The level system is being prepared for your adventure.</p>
                <button class="btn btn-primary" onclick="history.back()">Back to Menu</button>
            </div>
        `;
    }

    // =============================================================================
    // EVENT HANDLERS
    // =============================================================================

    /**
     * Handle new game button click
     * @private
     */
    _handleNewGameClick() {
        this.emit(EVENTS.NEW_GAME_REQUESTED, {
            level: 1,
            puzzle: 1
        });
        
        if (DEBUG.ENABLED) {
            console.debug('New game requested');
        }
    }

    /**
     * Handle continue game button click
     * @private
     */
    _handleContinueGameClick() {
        this.emit(EVENTS.CONTINUE_GAME_REQUESTED);
        
        if (DEBUG.ENABLED) {
            console.debug('Continue game requested');
        }
    }

    /**
     * Handle level select button click
     * @private
     */
    _handleLevelSelectClick() {
        this.showLevelSelection();
    }

    /**
     * Handle back to menu button click
     * @private
     */
    _handleBackToMenuClick() {
        this.showMainMenu();
    }

    /**
     * Handle level card click
     * @param {MouseEvent} event - Click event
     * @private
     */
    _handleLevelCardClick(event) {
        const levelCard = event.target.closest('.level-card');
        if (!levelCard) return;
        
        const levelNumber = parseInt(levelCard.dataset.level);
        const isUnlocked = levelCard.classList.contains('unlocked');
        
        if (!isUnlocked) {
            this._showLockedLevelMessage(levelNumber);
            return;
        }
        
        // Check if clicked on play button or card itself
        const playButton = event.target.closest('.level-play-btn');
        if (playButton || event.target === levelCard) {
            this._selectLevel(levelNumber);
        }
    }

    /**
     * Select and start a level
     * @param {number} levelNumber - Level number to start
     * @private
     */
    _selectLevel(levelNumber) {
        this.emit(EVENTS.LEVEL_SELECTED, {
            level: levelNumber,
            levelInfo: this.levelManager ? this.levelManager.getLevelInfo(levelNumber) : null
        });
        
        if (DEBUG.ENABLED) {
            console.debug(`Level ${levelNumber} selected`);
        }
    }

    /**
     * Show locked level message
     * @param {number} levelNumber - Locked level number
     * @private
     */
    _showLockedLevelMessage(levelNumber) {
        // Create temporary tooltip or use a modal
        const tooltip = document.createElement('div');
        tooltip.className = 'level-locked-tooltip';
        tooltip.textContent = `Complete previous levels to unlock Level ${levelNumber}`;
        
        document.body.appendChild(tooltip);
        
        setTimeout(() => {
            tooltip.remove();
        }, 2000);
        
        if (DEBUG.ENABLED) {
            console.debug(`Attempted to access locked level ${levelNumber}`);
        }
    }

    /**
     * Handle level unlocked event
     * @param {object} eventData - Event data
     * @private
     */
    _handleLevelUnlocked(eventData) {
        const levelCard = this.levelCards.get(eventData.level);
        if (levelCard) {
            levelCard.classList.add('unlocked');
            levelCard.classList.remove('locked');
            
            // Update card content to show play button
            this._updateLevelCard(eventData.level);
            
            // Show unlock animation
            this._showLevelUnlockAnimation(levelCard);
        }
        
        if (DEBUG.ENABLED) {
            console.debug(`Level ${eventData.level} unlocked in UI`);
        }
    }

    /**
     * Handle level complete event
     * @param {object} eventData - Event data
     * @private
     */
    _handleLevelComplete(eventData) {
        const levelCard = this.levelCards.get(eventData.level);
        if (levelCard) {
            levelCard.classList.add('completed');
            
            // Update progress display
            this._updateLevelCard(eventData.level);
            
            // Show completion animation
            this._showLevelCompleteAnimation(levelCard);
        }
        
        if (DEBUG.ENABLED) {
            console.debug(`Level ${eventData.level} completed in UI`);
        }
    }

    /**
     * Handle progress reset event
     * @private
     */
    _handleProgressReset() {
        // Re-render entire level selection
        if (this.currentScreen === 'level-select') {
            this.renderLevelSelection();
        }
        
        // Update main menu stats
        this._updateMainMenuStats();
        
        if (DEBUG.ENABLED) {
            console.debug('Progress reset - UI updated');
        }
    }

    // =============================================================================
    // UI UPDATES
    // =============================================================================

    /**
     * Update a specific level card
     * @param {number} levelNumber - Level number to update
     * @private
     */
    _updateLevelCard(levelNumber) {
        if (!this.levelManager) return;
        
        const levelInfo = this.levelManager.getLevelInfo(levelNumber);
        const levelCard = this.levelCards.get(levelNumber);
        
        if (!levelCard) return;
        
        // Update progress
        const progressPercent = Math.round((levelInfo.completedPuzzles / levelInfo.totalPuzzles) * 100);
        const progressFill = levelCard.querySelector('.progress-fill');
        const progressText = levelCard.querySelector('.progress-text');
        
        if (progressFill) {
            progressFill.style.width = `${progressPercent}%`;
        }
        
        if (progressText) {
            progressText.textContent = `${levelInfo.completedPuzzles}/${levelInfo.totalPuzzles} puzzles`;
        }
        
        // Update button text
        const playBtn = levelCard.querySelector('.level-play-btn');
        if (playBtn) {
            playBtn.textContent = levelInfo.completedPuzzles > 0 ? 'Continue' : 'Start';
        }
    }

    /**
     * Update main menu statistics
     * @private
     */
    _updateMainMenuStats() {
        if (!this.levelManager) return;
        
        const progress = this.levelManager.getProgressSummary();
        
        // Update menu display elements
        const totalSolved = document.getElementById('total-puzzles-solved');
        const currentLevel = document.getElementById('current-level-display');
        const totalTime = document.getElementById('total-time-played');
        
        if (totalSolved) {
            totalSolved.textContent = progress.totalPuzzlesCompleted.toString();
        }
        
        if (currentLevel) {
            currentLevel.textContent = progress.currentLevel.toString();
        }
        
        if (totalTime) {
            // This would need to come from analytics data
            totalTime.textContent = '00:00'; // Placeholder
        }
    }

    // =============================================================================
    // ANIMATIONS
    // =============================================================================

    /**
     * Show level unlock animation
     * @param {HTMLElement} levelCard - Level card element
     * @private
     */
    _showLevelUnlockAnimation(levelCard) {
        levelCard.classList.add('unlock-animation');
        
        setTimeout(() => {
            levelCard.classList.remove('unlock-animation');
        }, 1000);
    }

    /**
     * Show level complete animation
     * @param {HTMLElement} levelCard - Level card element
     * @private
     */
    _showLevelCompleteAnimation(levelCard) {
        levelCard.classList.add('complete-animation');
        
        setTimeout(() => {
            levelCard.classList.remove('complete-animation');
        }, 1000);
    }

    // =============================================================================
    // CLEANUP
    // =============================================================================

    /**
     * Cleanup menu system resources
     */
    destroy() {
        // Remove level manager event listeners
        if (this.levelManager) {
            this.levelManager.off(EVENTS.LEVEL_UNLOCKED, this._handleLevelUnlocked);
            this.levelManager.off(EVENTS.LEVEL_COMPLETE, this._handleLevelComplete);
            this.levelManager.off(EVENTS.PROGRESS_RESET, this._handleProgressReset);
        }
        
        // Clear references
        this.levelCards.clear();
        this.levelManager = null;
        this.container = null;
        
        // Remove all event listeners
        this.removeAllListeners();
        
        if (DEBUG.ENABLED) {
            console.debug('MenuSystem destroyed');
        }
    }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create a new MenuSystem instance
 * @param {HTMLElement} container - Container element
 * @param {LevelManager} levelManager - Level manager instance (optional)
 * @returns {MenuSystem} New MenuSystem instance
 */
export function createMenuSystem(container, levelManager = null) {
    return new MenuSystem(container, levelManager);
}

// =============================================================================
// EXPORTS
// =============================================================================

export default MenuSystem;