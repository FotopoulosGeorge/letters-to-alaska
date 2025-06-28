/**
     * Show story content modal
     * @param {object} storyData - Story content data
     * @private
     */
    _showStoryContent(storyData) {
        console.log('📖 Showing story content:', storyData.key);
        
        const modalOverlay = document.getElementById('modal-overlay');
        const storyModal = document.getElementById('story-modal');
        const storyTitle = document.getElementById('story-title');
        const storyContent = document.getElementById('story-content');
        
        if (modalOverlay && storyModal && storyTitle && storyContent) {
            // Set story content
            storyTitle.textContent = storyData.content.title;
            storyContent.innerHTML = `
                <div class="story-title">${storyData.content.title}</div>
                <p>${storyData.content.content}</p>
                ${storyData.content.image ? `<img src="./assets/images/story/${storyData.content.image}" alt="${storyData.content.title}" />` : ''}
            `;
            
            // Show modal
            modalOverlay.classList.remove('hidden');
            storyModal.classList.remove('hidden');
            
            // Set up continue handler
            const continueBtn = document.getElementById('story-continue-btn');
            if (continueBtn) {
                continueBtn.onclick = () => {
                    this._closeModal();
                };
            }
        }
    }

    /**
     * Show level completion modal
     * @param {object} completionData - Level completion data
     * @private
     */
    _showLevelCompletionModal(completionData) {
        console.log('🏆 Showing level completion modal');
        
        // For now, use a simple alert - could be expanded to a beautiful modal
        const message = `
            🎉 Level ${completionData.level} Complete! 🎉
            
            Achievements Unlocked: ${completionData.achievements.length}
            Total Score: ${completionData.progressData.totalScore}
            
            Ready for the next challenge?
        `;
        
        setTimeout(() => {
            alert(message);
            
            // Auto-advance to next level if available
            if (completionData.level < (this.levelManager?.gameConfig?.gameInfo?.maxLevels || 5)) {
                this._showLevelSelect();
            } else {
                // Game completed!
                alert('🎊 Congratulations! You have completed all levels! 🎊');
                this._showMainMenu();
            }
        }, 100);
    }    /**
     * Handle new game request from menu
     * @param {object} eventData - Event data
     * @private
     */
    _handleNewGameFromMenu(eventData) {
        console.log('🎮 New game requested from menu');
        this._startNewGame();
    }

    /**
     * Handle continue game request from menu
     * @private
     */
    _handleContinueGameFromMenu() {
        console.log('🔄 Continue game requested from menu');
        this._continueGame();
    }

    /**
     * Handle level selection from menu
     * @param {object} eventData - Event data with level info
     * @private
     */
    async _handleLevelSelected(eventData) {
        console.log('📋 Level selected:', eventData.level);
        
        if (this.levelManager && this.gameEngine) {
            try {
                // Start the selected level
                const levelData = await this.levelManager.startLevel(eventData.level);
                const puzzleData = await this.levelManager.getNextPuzzle();
                
                this.gameEngine.startNewGame({
                    level: eventData.level,
                    puzzle: 1,
                    puzzleData: puzzleData,
                    levelData: levelData
                });
                
                this._showGameScreen();
            } catch (error) {
                console.error('Failed to start selected level:', error);
                alert(`Unable to start Level ${eventData.level}. ${error.message}`);
            }
        }
    }

    /**
     * Handle level completion
     * @param {object} eventData - Level completion data
     * @private
     */
    _handleLevelCompleted(eventData) {
        console.log('🏆 Level completed:', eventData.level);
        
        // Show level completion message
        setTimeout(() => {
            this._showLevelCompletionModal(eventData);
        }, 1000);
    }

    /**
     * Handle puzzle completion
     * @param {object} eventData - Puzzle completion data
     * @private
     */
    _handlePuzzleCompleted(eventData) {
        console.log('✅ Puzzle completed:', eventData);
        
        // Update menu stats if visible
        if (this.menuSystem && this.gameState === GAME_STATES.MENU) {
            this.menuSystem._updateMainMenuStats();
        }
        
        // Check for story unlocks
        if (eventData.storyUnlocks && eventData.storyUnlocks.length > 0) {
            setTimeout(() => {
                this._showStoryContent(eventData.storyUnlocks[0]);
            }, 500);
        }
    }    /**
     * Connect all systems together
     * @private
     */
    _connectSystems() {
        // Connect level manager to game engine
        if (this.gameEngine && this.levelManager) {
            // The game engine will use the level manager for level data
            this.gameEngine.setLevelManager(this.levelManager);
        }
        
        // Update menu with current progress
        if (this.menuSystem) {
            this.menuSystem.setLevelManager(this.levelManager);
        }
        
        if (DEBUG.ENABLED) {
            console.debug('All systems connected successfully');
        }
    }/**
 * Main.js - Application Entry Point
 * Initializes the sliding puzzle game and wires up all components
 */

import { DEBUG, EVENTS, GAME_STATES } from './utils/Constants.js';
import { gameEventBus } from './utils/EventEmitter.js';
import { createPuzzle } from './core/PuzzleLogic.js';
import { validatePuzzleState } from './core/Validator.js';
import { createGameEngine } from './core/GameEngine.js';
import { createStateManager } from './core/StateManager.js';
import { createLevelManager } from './core/LevelManager.js';
import { createMenuSystem } from './ui/MenuSystem.js';
import { GameConfirmations, confirmWarning } from './ui/ConfirmDialog.js';

// =============================================================================
// GLOBAL GAME STATE
// =============================================================================

class GameApp {
    constructor() {
        this.gameEngine = null;
        this.stateManager = null;
        this.levelManager = null;
        this.menuSystem = null;
        this.gameState = GAME_STATES.MENU;
        this.isInitialized = false;
        this.loadingProgress = 0;
        this.settings = this._getDefaultSettings();
        
        // Initialize the application
        this._initialize();
    }

    // =============================================================================
    // INITIALIZATION
    // =============================================================================

    /**
     * Initialize the game application
     * @private
     */
    async _initialize() {
        try {
            console.log('🎮 Initializing Sliding Puzzle Game...');
            
            // Show loading screen
            this._showLoadingScreen();
            
            // Initialize core systems
            await this._initializeCoreSystems();
            
            // Set up event listeners
            this._setupEventListeners();
            
            // Load saved game state if exists
            await this._loadGameState();
            
            // Hide loading screen and show game
            this._hideLoadingScreen();
            
            // Show main menu
            this._showMainMenu();
            
            this.isInitialized = true;
            console.log('✅ Game initialized successfully!');
            
        } catch (error) {
            console.error('❌ Failed to initialize game:', error);
            this._handleInitializationError(error);
        }
    }

    /**
     * Initialize core game systems
     * @private
     */
    async _initializeCoreSystems() {
        this._updateLoadingProgress(20, 'Loading game configuration...');
        
        // Initialize state manager first
        this.stateManager = createStateManager();
        await this._delay(100);
        
        this._updateLoadingProgress(30, 'Setting up level system...');
        
        // Initialize level manager
        this.levelManager = createLevelManager(this.stateManager);
        await this._delay(200);
        
        this._updateLoadingProgress(50, 'Setting up game engine...');
        
        // Find game screen container
        const gameScreen = document.getElementById('game-screen');
        if (!gameScreen) {
            throw new Error('Game screen container not found');
        }
        
        // Create game engine instance
        this.gameEngine = createGameEngine(gameScreen);
        
        // Connect state manager to game engine
        this.stateManager.setGameEngine(this.gameEngine);
        
        this._updateLoadingProgress(70, 'Setting up menu system...');
        
        // Initialize menu system
        const menuContainer = document.body; // Uses global screen elements
        this.menuSystem = createMenuSystem(menuContainer, this.levelManager);
        
        this._updateLoadingProgress(80, 'Loading user settings...');
        
        // Load saved settings
        this.settings = this.stateManager.loadGameSettings();
        this._applySettings();
        
        await this._delay(200);
        
        this._updateLoadingProgress(90, 'Finalizing setup...');
        
        // Connect all systems together
        this._connectSystems();
        
        await this._delay(200);
        
        this._updateLoadingProgress(100, 'Ready to play!');
        await this._delay(300);
    }

    /**
     * Set up global event listeners
     * @private
     */
    _setupEventListeners() {
        // Game Engine events
        if (this.gameEngine) {
            // The GameEngine handles its own puzzle events internally
            // We just listen to high-level game events
            gameEventBus.on(EVENTS.PUZZLE_SOLVED, this._handlePuzzleSolved.bind(this));
            gameEventBus.on(EVENTS.GAME_OVER, this._handleGameOver.bind(this));
            gameEventBus.on(EVENTS.GAME_STATE_CHANGED, this._handleGameStateChanged.bind(this));
        }

        // Menu System events
        if (this.menuSystem) {
            this.menuSystem.on(EVENTS.NEW_GAME_REQUESTED, this._handleNewGameFromMenu.bind(this));
            this.menuSystem.on(EVENTS.CONTINUE_GAME_REQUESTED, this._handleContinueGameFromMenu.bind(this));
            this.menuSystem.on(EVENTS.LEVEL_SELECTED, this._handleLevelSelected.bind(this));
        }

        // Level Manager events
        if (this.levelManager) {
            this.levelManager.on(EVENTS.LEVEL_COMPLETE, this._handleLevelCompleted.bind(this));
            this.levelManager.on(EVENTS.PUZZLE_COMPLETED, this._handlePuzzleCompleted.bind(this));
        }

        // UI Event Listeners
        this._setupUIEventListeners();
        
        // Window events
        window.addEventListener('beforeunload', this._handleBeforeUnload.bind(this));
        window.addEventListener('resize', this._handleWindowResize.bind(this));
        
        // Keyboard events
        document.addEventListener('keydown', this._handleKeyPress.bind(this));
        
        if (DEBUG.ENABLED) {
            console.debug('Event listeners set up successfully');
        }
    }

    /**
     * Set up UI-specific event listeners
     * @private
     */
    _setupUIEventListeners() {
        // Menu buttons
        const newGameBtn = document.getElementById('new-game-btn');
        const continueGameBtn = document.getElementById('continue-game-btn');
        const levelSelectBtn = document.getElementById('level-select-btn');
        const howToPlayBtn = document.getElementById('how-to-play-btn');
        
        if (newGameBtn) {
            newGameBtn.addEventListener('click', this._startNewGame.bind(this));
        }
        
        if (continueGameBtn) {
            continueGameBtn.addEventListener('click', this._continueGame.bind(this));
            // Enable/disable continue button based on saved game
            this._updateContinueButton();
        }
        
        if (levelSelectBtn) {
            levelSelectBtn.addEventListener('click', this._showLevelSelect.bind(this));
        }
        
        if (howToPlayBtn) {
            howToPlayBtn.addEventListener('click', this._showHowToPlay.bind(this));
        }

        // Header buttons
        const settingsBtn = document.getElementById('settings-btn');
        const menuBtn = document.getElementById('menu-btn');
        
        if (settingsBtn) {
            settingsBtn.addEventListener('click', this._showSettings.bind(this));
        }
        
        if (menuBtn) {
            menuBtn.addEventListener('click', this._showMainMenu.bind(this));
        }

        // Game control buttons
        const hintBtn = document.getElementById('hint-btn');
        const undoBtn = document.getElementById('undo-btn');
        const restartBtn = document.getElementById('restart-btn');
        
        if (hintBtn) {
            hintBtn.addEventListener('click', this._showHint.bind(this));
        }
        
        if (undoBtn) {
            undoBtn.addEventListener('click', this._undoMove.bind(this));
        }
        
        if (restartBtn) {
            restartBtn.addEventListener('click', this._restartPuzzle.bind(this));
        }

        // Modal close buttons
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', this._closeModal.bind(this));
        });
        
        // Modal overlay click to close
        const modalOverlay = document.getElementById('modal-overlay');
        if (modalOverlay) {
            modalOverlay.addEventListener('click', (e) => {
                if (e.target === modalOverlay) {
                    this._closeModal();
                }
            });
        }
    }

    // =============================================================================
    // GAME STATE MANAGEMENT
    // =============================================================================

    /**
     * Change game state
     * @param {string} newState - New game state
     */
    _changeGameState(newState) {
        const previousState = this.gameState;
        this.gameState = newState;
        
        gameEventBus.emit(EVENTS.GAME_STATE_CHANGED, {
            previousState,
            currentState: newState
        });
        
        if (DEBUG.ENABLED) {
            console.debug(`Game state changed: ${previousState} → ${newState}`);
        }
    }

    /**
     * Show main menu
     */
    _showMainMenu() {
        this._changeGameState(GAME_STATES.MENU);
        if (this.menuSystem) {
            this.menuSystem.showMainMenu();
        } else {
            this._showScreen('menu-screen');
        }
        this._updateContinueButton();
        this._updateMenuStats();
    }

    /**
     * Show level select screen
     */
    _showLevelSelect() {
        this._changeGameState(GAME_STATES.LEVEL_SELECT);
        if (this.menuSystem) {
            this.menuSystem.showLevelSelection();
        } else {
            this._showScreen('level-select-screen');
            // TODO: Populate level grid in Phase 4 - now implemented!
        }
    }

    /**
     * Show game screen
     */
    _showGameScreen() {
        this._changeGameState(GAME_STATES.PLAYING);
        this._showScreen('game-screen');
        this._updateGameHUD();
        this._renderPuzzleBoard();
    }

    /**
     * Show specific screen and hide others
     * @param {string} screenId - ID of screen to show
     * @private
     */
    _showScreen(screenId) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        // Show target screen
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.add('active');
        }
    }

    // =============================================================================
    // GAME ACTIONS
    // =============================================================================

    /**
     * Start a new game
     */
    async _startNewGame() {
        console.log('🎮 Starting new game...');
        
        if (this.levelManager && this.gameEngine) {
            try {
                // Start from level 1, puzzle 1
                this.levelManager.setCurrentPosition(1, 1);
                const puzzleData = await this.levelManager.getNextPuzzle();
                
                // Start the game with level data
                this.gameEngine.startNewGame({
                    level: 1,
                    puzzle: 1,
                    puzzleData: puzzleData,
                    difficulty: 'easy'
                });
            } catch (error) {
                console.error('Failed to start new game:', error);
                // Fallback to basic game
                this.gameEngine.startNewGame();
            }
        }
        
        this._showGameScreen();
    }

    /**
     * Continue existing game
     */
    async _continueGame() {
        console.log('🔄 Continuing game...');
        
        if (!this.stateManager) {
            console.warn('State manager not available');
            this._startNewGame();
            return;
        }
        
        // Load saved game state
        const savedGameState = this.stateManager.loadCurrentGameState();
        
        if (savedGameState && this.gameEngine) {
            try {
                // Continue from saved state
                this.gameEngine.continueGame(savedGameState);
                this._showGameScreen();
                
                console.log('✅ Game continued from saved state');
            } catch (error) {
                console.error('Failed to continue game:', error);
                
                // Show confirmation to start new game instead
                const startNew = await confirmWarning(
                    'Unable to load your saved game. Would you like to start a new game instead?',
                    'Load Failed'
                );
                
                if (startNew) {
                    this._startNewGame();
                }
            }
        } else {
            // No saved game, start new
            console.log('No saved game found, starting new game');
            this._startNewGame();
        }
    }

    /**
     * Show hint for current puzzle
     */
    _showHint() {
        if (!this.gameEngine) return;
        
        console.log('💡 Showing hint...');
        // GameEngine handles hint requests through its HUD component
        const hudComponent = this.gameEngine.components.hud;
        if (hudComponent) {
            hudComponent.emit(EVENTS.HINT_REQUESTED);
        }
    }

    /**
     * Undo last move
     */
    _undoMove() {
        if (!this.gameEngine) return;
        
        // GameEngine handles undo through its HUD component
        const puzzleComponent = this.gameEngine.components.puzzle;
        if (puzzleComponent && puzzleComponent.canUndo()) {
            puzzleComponent.undoLastMove();
        }
    }

    /**
     * Restart current puzzle
     */
    async _restartPuzzle() {
        if (!this.gameEngine) return;
        
        const confirmed = await GameConfirmations.restartPuzzle();
        if (confirmed) {
            console.log('🔄 Restarting puzzle...');
            this.gameEngine.restartPuzzle();
        }
    }

    // =============================================================================
    // PUZZLE EVENT HANDLERS
    // =============================================================================

    /**
     * Handle puzzle solved event
     * @param {object} eventData - Puzzle solved event data
     */
    _handlePuzzleSolved(eventData) {
        console.log('🎉 Puzzle solved!', eventData.stats);
        
        // TODO: Show completion modal in Phase 5
        // TODO: Play victory sound in Phase 7
        // TODO: Save progress in Phase 3
        
        setTimeout(() => {
            alert(`Congratulations! Puzzle solved in ${eventData.stats.moveCount} moves!`);
        }, 500);
    }

    /**
     * Handle game over event
     * @param {object} eventData - Game over event data
     */
    _handleGameOver(eventData) {
        console.log('💀 Game over:', eventData.reason);
        
        // TODO: Show game over modal in Phase 5
        // TODO: Play game over sound in Phase 7
        
        setTimeout(() => {
            alert(`Game Over! ${eventData.reason}\nProgress: ${Math.round(eventData.stats.efficiency * 100)}%`);
        }, 500);
    }

    /**
     * Handle game state changes
     * @param {object} eventData - State change event data
     */
    _handleGameStateChanged(eventData) {
        this.gameState = eventData.currentState;
        
        if (DEBUG.ENABLED) {
            console.debug('App: Game state changed to', eventData.currentState);
        }
    }

    // =============================================================================
    // UI UPDATES AND STATE MANAGEMENT
    // =============================================================================

    /**
     * Update continue button state
     * @private
     */
    _updateContinueButton() {
        const continueBtn = document.getElementById('continue-game-btn');
        if (continueBtn && this.stateManager) {
            const hasSavedGame = this.stateManager.hasSavedGame();
            continueBtn.disabled = !hasSavedGame;
            
            if (DEBUG.ENABLED) {
                console.debug('Continue button updated:', hasSavedGame ? 'enabled' : 'disabled');
            }
        }
    }

    /**
     * Update menu statistics from saved progress
     * @private
     */
    _updateMenuStats() {
        if (!this.stateManager) return;
        
        const progress = this.stateManager.loadProgress();
        const analytics = this.stateManager.getAnalytics();
        
        const totalSolved = document.getElementById('total-puzzles-solved');
        const currentLevel = document.getElementById('current-level-display');
        const totalTime = document.getElementById('total-time-played');
        
        if (totalSolved) {
            totalSolved.textContent = (progress?.totalPuzzlesSolved || 0).toString();
        }
        
        if (currentLevel) {
            currentLevel.textContent = (progress?.currentLevel || 1).toString();
        }
        
        if (totalTime) {
            const totalMs = analytics?.totalTimePlayed || 0;
            const minutes = Math.floor(totalMs / 60000);
            const hours = Math.floor(minutes / 60);
            const displayMinutes = minutes % 60;
            
            if (hours > 0) {
                totalTime.textContent = `${hours}:${displayMinutes.toString().padStart(2, '0')}h`;
            } else {
                totalTime.textContent = `${displayMinutes}:${Math.floor((totalMs % 60000) / 1000).toString().padStart(2, '0')}`;
            }
        }
    }

    /**
     * Apply loaded settings to the game
     * @private
     */
    _applySettings() {
        if (!this.settings) return;
        
        // Apply settings to game engine if available
        if (this.gameEngine) {
            this.gameEngine.updateSettings(this.settings);
        }
        
        // Apply settings to UI elements
        this._applyUISettings();
        
        if (DEBUG.ENABLED) {
            console.debug('Settings applied:', this.settings);
        }
    }

    /**
     * Apply settings to UI elements
     * @private
     */
    _applyUISettings() {
        // Update checkbox states in settings modal
        const soundEnabled = document.getElementById('sound-enabled');
        const musicEnabled = document.getElementById('music-enabled');
        const animationsEnabled = document.getElementById('animations-enabled');
        const hintsEnabled = document.getElementById('hints-enabled');
        const autoSaveEnabled = document.getElementById('auto-save-enabled');
        const volumeSlider = document.getElementById('volume-slider');
        
        if (soundEnabled) soundEnabled.checked = this.settings.soundEnabled !== false;
        if (musicEnabled) musicEnabled.checked = this.settings.musicEnabled !== false;
        if (animationsEnabled) animationsEnabled.checked = this.settings.animationsEnabled !== false;
        if (hintsEnabled) hintsEnabled.checked = this.settings.showHints !== false;
        if (autoSaveEnabled) autoSaveEnabled.checked = this.settings.autoSave !== false;
        if (volumeSlider) volumeSlider.value = (this.settings.volume || 0.7) * 100;
    }

    // =============================================================================
    // MODAL MANAGEMENT
    // =============================================================================

    /**
     * Show settings modal
     */
    _showSettings() {
        console.log('⚙️ Opening settings...');
        
        // Show settings modal
        const modalOverlay = document.getElementById('modal-overlay');
        const settingsModal = document.getElementById('settings-modal');
        
        if (modalOverlay && settingsModal) {
            // Apply current settings to form
            this._applyUISettings();
            this._updateStorageInfo();
            
            // Show modal
            modalOverlay.classList.remove('hidden');
            settingsModal.classList.remove('hidden');
            
            // Set up save handler
            const saveBtn = document.getElementById('settings-save-btn');
            if (saveBtn) {
                saveBtn.onclick = () => this._saveSettings();
            }
            
            // Set up reset progress handler
            const resetBtn = document.getElementById('reset-progress-btn');
            if (resetBtn) {
                resetBtn.onclick = () => this._resetProgress();
            }
        } else {
            // Fallback for missing modal
            alert('Settings panel coming soon! Current settings are automatically saved.');
        }
    }

    /**
     * Update storage usage information
     * @private
     */
    _updateStorageInfo() {
        const storageUsage = document.getElementById('storage-usage');
        if (storageUsage && this.stateManager) {
            try {
                // This would require additional methods in StorageUtils
                storageUsage.textContent = 'Available';
            } catch (error) {
                storageUsage.textContent = 'Unknown';
            }
        }
    }

    /**
     * Reset all game progress
     * @private
     */
    async _resetProgress() {
        const confirmed = await GameConfirmations.resetProgress();
        if (confirmed && this.stateManager) {
            try {
                this.stateManager.resetProgress();
                this._updateMenuStats();
                this._updateContinueButton();
                this._closeModal();
                
                console.log('✅ Game progress reset');
                
                // Show success message
                setTimeout(() => {
                    alert('All game progress has been reset successfully.');
                }, 300);
            } catch (error) {
                console.error('Failed to reset progress:', error);
                alert('Failed to reset progress. Please try again.');
            }
        }
    }

    /**
     * Save settings from modal form
     * @private
     */
    _saveSettings() {
        const newSettings = {
            soundEnabled: document.getElementById('sound-enabled')?.checked ?? true,
            musicEnabled: document.getElementById('music-enabled')?.checked ?? true,
            animationsEnabled: document.getElementById('animations-enabled')?.checked ?? true,
            showHints: document.getElementById('hints-enabled')?.checked ?? true,
            autoSave: document.getElementById('auto-save-enabled')?.checked ?? true,
            volume: (document.getElementById('volume-slider')?.value ?? 70) / 100
        };
        
        // Update local settings
        this.settings = { ...this.settings, ...newSettings };
        
        // Save to persistent storage
        if (this.stateManager) {
            this.stateManager.saveGameSettings(this.settings);
        }
        
        // Apply settings
        this._applySettings();
        
        // Close modal
        this._closeModal();
        
        console.log('✅ Settings saved:', newSettings);
    }

    /**
     * Show how to play information
     */
    _showHowToPlay() {
        console.log('❓ Showing how to play...');
        // TODO: Implement help modal in Phase 6
        alert('How to Play:\n\n1. Click tiles adjacent to the empty space to move them\n2. Arrange numbers in order from 1 to 15\n3. Complete the puzzle before running out of moves!');
    }

    /**
     * Close any open modal
     */
    _closeModal() {
        const modalOverlay = document.getElementById('modal-overlay');
        if (modalOverlay) {
            modalOverlay.classList.add('hidden');
        }
        
        // Hide all modals
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.add('hidden');
        });
    }

    // =============================================================================
    // EVENT HANDLERS
    // =============================================================================

    /**
     * Handle before unload to save game state
     */
    _handleBeforeUnload() {
        if (this.stateManager) {
            console.log('💾 Auto-saving game state...');
            this.stateManager.manualSave();
        }
    }

    /**
     * Handle window resize for responsive design
     */
    _handleWindowResize() {
        // TODO: Implement responsive puzzle board sizing in Phase 6
        if (DEBUG.ENABLED) {
            console.debug('Window resized');
        }
    }

    /**
     * Handle keyboard input
     * @param {KeyboardEvent} event - Keyboard event
     */
    _handleKeyPress(event) {
        // TODO: Implement keyboard controls in Phase 6
        if (event.key === 'Escape') {
            this._closeModal();
        }
        
        // Arrow keys for tile movement (future implementation)
        if (this.gameState === GAME_STATES.PLAYING) {
            // TODO: Implement arrow key movement
        }
    }

    // =============================================================================
    // LOADING AND ERROR HANDLING
    // =============================================================================

    /**
     * Show loading screen
     * @private
     */
    _showLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        const gameContainer = document.getElementById('game-container');
        
        if (loadingScreen) loadingScreen.classList.remove('hidden');
        if (gameContainer) gameContainer.classList.add('hidden');
    }

    /**
     * Hide loading screen
     * @private
     */
    _hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        const gameContainer = document.getElementById('game-container');
        
        if (loadingScreen) {
            setTimeout(() => {
                loadingScreen.classList.add('hidden');
            }, 500);
        }
        
        if (gameContainer) {
            setTimeout(() => {
                gameContainer.classList.remove('hidden');
            }, 300);
        }
    }

    /**
     * Update loading progress
     * @param {number} progress - Progress percentage (0-100)
     * @param {string} text - Loading text
     * @private
     */
    _updateLoadingProgress(progress, text) {
        this.loadingProgress = progress;
        
        const progressFill = document.getElementById('loading-progress-fill');
        const loadingText = document.getElementById('loading-text');
        
        if (progressFill) {
            progressFill.style.width = `${progress}%`;
        }
        
        if (loadingText) {
            loadingText.textContent = text;
        }
        
        if (DEBUG.ENABLED) {
            console.debug(`Loading: ${progress}% - ${text}`);
        }
    }

    /**
     * Handle initialization error
     * @param {Error} error - Initialization error
     * @private
     */
    _handleInitializationError(error) {
        console.error('Initialization failed:', error);
        
        const loadingText = document.getElementById('loading-text');
        if (loadingText) {
            loadingText.textContent = 'Failed to load game. Please refresh the page.';
            loadingText.style.color = '#dc2626';
        }
    }

    // =============================================================================
    // UTILITY METHODS
    // =============================================================================

    /**
     * Get default settings
     * @private
     * @returns {object} Default settings
     */
    _getDefaultSettings() {
        return {
            soundEnabled: true,
            musicEnabled: true,
            volume: 0.7,
            animationsEnabled: true,
            showHints: true,
            autoSave: true
        };
    }

    /**
     * Load game state from storage
     * @private
     */
    async _loadGameState() {
        if (!this.stateManager) {
            console.log('No state manager available for loading game state');
            return;
        }
        
        try {
            // Load and apply settings (already done in _initializeCoreSystems)
            
            // Check for saved game to enable continue button
            this._updateContinueButton();
            
            console.log('✅ Game state loaded successfully');
        } catch (error) {
            console.error('Failed to load game state:', error);
        }
        
        await this._delay(100);
    }

    /**
     * Simple delay utility
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise} Promise that resolves after delay
     * @private
     */
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// =============================================================================
// APPLICATION BOOTSTRAP
// =============================================================================

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎮 DOM loaded, starting Sliding Puzzle Game...');
    
    // Create global game instance
    window.gameApp = new GameApp();
    
    // Expose for debugging in development
    if (DEBUG.ENABLED) {
        window.debugGame = {
            app: window.gameApp,
            engine: () => window.gameApp.gameEngine,
            stateManager: () => window.gameApp.stateManager,
            puzzle: () => window.gameApp.gameEngine?.components.puzzle,
            hud: () => window.gameApp.gameEngine?.components.hud,
            gameBoard: () => window.gameApp.gameEngine?.components.gameBoard,
            eventBus: gameEventBus,
            utils: { validatePuzzleState },
            // Convenience methods for testing
            clearProgress: () => window.gameApp.stateManager?.resetProgress(),
            exportData: () => window.gameApp.stateManager?.getAnalytics(),
            loadProgress: () => window.gameApp.stateManager?.loadProgress()
        };
        console.log('🔧 Debug utilities available as window.debugGame');
        console.log('📊 Try: debugGame.loadProgress(), debugGame.exportData()');
    }
});

// Handle any unhandled errors
window.addEventListener('error', (event) => {
    console.error('Unhandled error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});

console.log('📝 Main.js loaded successfully');