/**
 * ConfirmDialog.js - Confirmation Dialog Component
 * Provides reusable confirmation dialogs for user actions
 */

import { DEBUG } from '../utils/Constants.js';
import { EventEmitter } from '../utils/EventEmitter.js';

// =============================================================================
// CONFIRM DIALOG CLASS
// =============================================================================

export class ConfirmDialog extends EventEmitter {
    constructor() {
        super();
        
        this.isVisible = false;
        this.currentResolve = null;
        this.currentReject = null;
        this.overlay = null;
        this.modal = null;
        this.options = {};
        
        this._createDialog();
        this._setupEventListeners();
        
        if (DEBUG.ENABLED) {
            console.debug('ConfirmDialog initialized');
        }
    }

    // =============================================================================
    // DIALOG CREATION
    // =============================================================================

    /**
     * Create the dialog HTML structure
     * @private
     */
    _createDialog() {
        // Create overlay
        this.overlay = document.createElement('div');
        this.overlay.className = 'modal-overlay hidden clickable';
        this.overlay.id = 'confirm-dialog-overlay';
        
        // Create modal
        this.modal = document.createElement('div');
        this.modal.className = 'modal confirm-modal modal-sm';
        this.modal.setAttribute('role', 'dialog');
        this.modal.setAttribute('aria-modal', 'true');
        this.modal.setAttribute('tabindex', '-1');
        
        // Create modal structure
        this.modal.innerHTML = `
            <div class="modal-header">
                <h3 id="confirm-dialog-title">Confirm Action</h3>
                <button class="modal-close" aria-label="Close dialog">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
            <div class="modal-body">
                <div class="confirm-icon"></div>
                <p id="confirm-dialog-message">Are you sure you want to continue?</p>
            </div>
            <div class="modal-footer stack-mobile">
                <button id="confirm-dialog-cancel" class="btn btn-secondary">Cancel</button>
                <button id="confirm-dialog-confirm" class="btn btn-primary">Confirm</button>
            </div>
        `;
        
        this.overlay.appendChild(this.modal);
        document.body.appendChild(this.overlay);
        
        // Cache elements
        this.elements = {
            title: document.getElementById('confirm-dialog-title'),
            message: document.getElementById('confirm-dialog-message'),
            icon: this.modal.querySelector('.confirm-icon'),
            confirmBtn: document.getElementById('confirm-dialog-confirm'),
            cancelBtn: document.getElementById('confirm-dialog-cancel'),
            closeBtn: this.modal.querySelector('.modal-close')
        };
    }

    /**
     * Set up event listeners
     * @private
     */
    _setupEventListeners() {
        // Confirm button
        this.elements.confirmBtn.addEventListener('click', () => {
            this._handleConfirm();
        });
        
        // Cancel button
        this.elements.cancelBtn.addEventListener('click', () => {
            this._handleCancel();
        });
        
        // Close button
        this.elements.closeBtn.addEventListener('click', () => {
            this._handleCancel();
        });
        
        // Overlay click (click outside to close)
        this.overlay.addEventListener('click', (event) => {
            if (event.target === this.overlay) {
                this._handleCancel();
            }
        });
        
        // Keyboard events
        document.addEventListener('keydown', this._handleKeyDown.bind(this));
    }

    // =============================================================================
    // PUBLIC API
    // =============================================================================

    /**
     * Show confirmation dialog
     * @param {object} options - Dialog options
     * @returns {Promise<boolean>} Promise that resolves to true if confirmed, false if cancelled
     */
    show(options = {}) {
        return new Promise((resolve, reject) => {
            // Store promise resolvers
            this.currentResolve = resolve;
            this.currentReject = reject;
            
            // Configure dialog
            this.options = {
                title: 'Confirm Action',
                message: 'Are you sure you want to continue?',
                confirmText: 'Confirm',
                cancelText: 'Cancel',
                type: 'info', // info, warning, danger
                confirmButtonClass: 'btn-primary',
                cancelButtonClass: 'btn-secondary',
                showCloseButton: true,
                closeOnOverlayClick: true,
                closeOnEscape: true,
                focusConfirm: false,
                ...options
            };
            
            this._configureDialog();
            this._showDialog();
        });
    }

    /**
     * Hide the dialog
     */
    hide() {
        this._hideDialog();
        
        // Reject any pending promise
        if (this.currentReject) {
            this.currentReject(new Error('Dialog closed'));
            this.currentReject = null;
            this.currentResolve = null;
        }
    }

    /**
     * Check if dialog is currently visible
     * @returns {boolean} True if visible
     */
    get visible() {
        return this.isVisible;
    }

    // =============================================================================
    // CONVENIENCE METHODS
    // =============================================================================

    /**
     * Show a confirmation dialog for dangerous actions
     * @param {string} message - Confirmation message
     * @param {string} title - Dialog title
     * @returns {Promise<boolean>} Confirmation result
     */
    confirmDanger(message, title = 'Warning') {
        return this.show({
            title,
            message,
            type: 'danger',
            confirmText: 'Yes, Continue',
            confirmButtonClass: 'btn-danger',
            focusConfirm: false
        });
    }

    /**
     * Show a warning confirmation dialog
     * @param {string} message - Warning message
     * @param {string} title - Dialog title
     * @returns {Promise<boolean>} Confirmation result
     */
    confirmWarning(message, title = 'Are you sure?') {
        return this.show({
            title,
            message,
            type: 'warning',
            confirmText: 'Yes',
            focusConfirm: false
        });
    }

    /**
     * Show an info confirmation dialog
     * @param {string} message - Info message
     * @param {string} title - Dialog title
     * @returns {Promise<boolean>} Confirmation result
     */
    confirmInfo(message, title = 'Confirm') {
        return this.show({
            title,
            message,
            type: 'info',
            confirmText: 'OK'
        });
    }

    /**
     * Show a simple yes/no dialog
     * @param {string} message - Question message
     * @param {string} title - Dialog title
     * @returns {Promise<boolean>} Confirmation result
     */
    confirmYesNo(message, title = 'Question') {
        return this.show({
            title,
            message,
            confirmText: 'Yes',
            cancelText: 'No',
            type: 'info'
        });
    }

    // =============================================================================
    // GAME-SPECIFIC CONVENIENCE METHODS
    // =============================================================================

    /**
     * Confirm puzzle restart
     * @returns {Promise<boolean>} Confirmation result
     */
    confirmRestartPuzzle() {
        return this.confirmWarning(
            'Are you sure you want to restart this puzzle? All your progress will be lost.',
            'Restart Puzzle'
        );
    }

    /**
     * Confirm game quit
     * @returns {Promise<boolean>} Confirmation result
     */
    confirmQuitGame() {
        return this.confirmWarning(
            'Are you sure you want to quit? Your current progress will be saved.',
            'Quit Game'
        );
    }

    /**
     * Confirm progress reset
     * @returns {Promise<boolean>} Confirmation result
     */
    confirmResetProgress() {
        return this.confirmDanger(
            'This will permanently delete all your game progress, including completed levels, scores, and achievements. This action cannot be undone.',
            'Reset All Progress'
        );
    }

    /**
     * Confirm settings reset
     * @returns {Promise<boolean>} Confirmation result
     */
    confirmResetSettings() {
        return this.confirmWarning(
            'This will reset all settings to their default values.',
            'Reset Settings'
        );
    }

    /**
     * Confirm level skip (if implemented)
     * @returns {Promise<boolean>} Confirmation result
     */
    confirmSkipLevel() {
        return this.confirmWarning(
            'Are you sure you want to skip this level? You won\'t earn any points for incomplete puzzles.',
            'Skip Level'
        );
    }

    /**
     * Confirm hint usage
     * @param {number} hintsRemaining - Number of hints remaining
     * @returns {Promise<boolean>} Confirmation result
     */
    confirmUseHint(hintsRemaining) {
        const message = hintsRemaining > 1 
            ? `Use a hint? You have ${hintsRemaining} hints remaining.`
            : 'Use your last hint?';
            
        return this.confirmInfo(message, 'Use Hint');
    }

    // =============================================================================
    // DIALOG CONFIGURATION
    // =============================================================================

    /**
     * Configure dialog appearance and content
     * @private
     */
    _configureDialog() {
        // Set title and message
        this.elements.title.textContent = this.options.title;
        this.elements.message.textContent = this.options.message;
        
        // Set button text
        this.elements.confirmBtn.textContent = this.options.confirmText;
        this.elements.cancelBtn.textContent = this.options.cancelText;
        
        // Set button classes
        this.elements.confirmBtn.className = `btn ${this.options.confirmButtonClass}`;
        this.elements.cancelBtn.className = `btn ${this.options.cancelButtonClass}`;
        
        // Configure dialog type
        this.modal.className = `modal confirm-modal modal-sm ${this.options.type}`;
        
        // Configure close button visibility
        if (this.options.showCloseButton) {
            this.elements.closeBtn.style.display = 'flex';
        } else {
            this.elements.closeBtn.style.display = 'none';
        }
        
        // Configure overlay click behavior
        if (this.options.closeOnOverlayClick) {
            this.overlay.classList.add('clickable');
        } else {
            this.overlay.classList.remove('clickable');
        }
        
        // Set ARIA attributes
        this.modal.setAttribute('aria-labelledby', 'confirm-dialog-title');
        this.modal.setAttribute('aria-describedby', 'confirm-dialog-message');
        
        if (DEBUG.ENABLED) {
            console.debug('ConfirmDialog configured:', this.options);
        }
    }

    /**
     * Show the dialog with animation
     * @private
     */
    _showDialog() {
        this.isVisible = true;
        
        // Show overlay
        this.overlay.classList.remove('hidden');
        this.overlay.classList.add('animate-fade');
        
        // Show modal with animation
        this.modal.classList.add('animate-slide-up');
        
        // Focus management
        this._manageFocus();
        
        // Emit show event
        this.emit('show', this.options);
        
        if (DEBUG.ENABLED) {
            console.debug('ConfirmDialog shown');
        }
    }

    /**
     * Hide the dialog with animation
     * @private
     */
    _hideDialog() {
        if (!this.isVisible) return;
        
        this.isVisible = false;
        
        // Hide with animation
        this.overlay.classList.add('hidden');
        this.overlay.classList.remove('animate-fade');
        this.modal.classList.remove('animate-slide-up');
        
        // Restore focus
        this._restoreFocus();
        
        // Emit hide event
        this.emit('hide');
        
        if (DEBUG.ENABLED) {
            console.debug('ConfirmDialog hidden');
        }
    }

    // =============================================================================
    // EVENT HANDLERS
    // =============================================================================

    /**
     * Handle confirm button click
     * @private
     */
    _handleConfirm() {
        const result = true;
        
        this._hideDialog();
        
        if (this.currentResolve) {
            this.currentResolve(result);
            this.currentResolve = null;
            this.currentReject = null;
        }
        
        this.emit('confirm', result);
        
        if (DEBUG.ENABLED) {
            console.debug('ConfirmDialog confirmed');
        }
    }

    /**
     * Handle cancel button click
     * @private
     */
    _handleCancel() {
        const result = false;
        
        this._hideDialog();
        
        if (this.currentResolve) {
            this.currentResolve(result);
            this.currentResolve = null;
            this.currentReject = null;
        }
        
        this.emit('cancel', result);
        
        if (DEBUG.ENABLED) {
            console.debug('ConfirmDialog cancelled');
        }
    }

    /**
     * Handle keyboard events
     * @param {KeyboardEvent} event - Keyboard event
     * @private
     */
    _handleKeyDown(event) {
        if (!this.isVisible) return;
        
        switch (event.key) {
            case 'Escape':
                if (this.options.closeOnEscape) {
                    event.preventDefault();
                    this._handleCancel();
                }
                break;
            case 'Enter':
                // Only confirm on Enter if confirm button is focused or if focusConfirm is true
                if (document.activeElement === this.elements.confirmBtn || this.options.focusConfirm) {
                    event.preventDefault();
                    this._handleConfirm();
                }
                break;
            case 'Tab':
                // Trap focus within modal
                this._trapFocus(event);
                break;
        }
    }

    // =============================================================================
    // FOCUS MANAGEMENT
    // =============================================================================

    /**
     * Manage focus when dialog is shown
     * @private
     */
    _manageFocus() {
        // Store currently focused element
        this.previousFocus = document.activeElement;
        
        // Focus appropriate element
        if (this.options.focusConfirm) {
            this.elements.confirmBtn.focus();
        } else {
            this.elements.cancelBtn.focus();
        }
    }

    /**
     * Restore focus when dialog is hidden
     * @private
     */
    _restoreFocus() {
        if (this.previousFocus && typeof this.previousFocus.focus === 'function') {
            this.previousFocus.focus();
        }
        this.previousFocus = null;
    }

    /**
     * Trap focus within the modal
     * @param {KeyboardEvent} event - Tab event
     * @private
     */
    _trapFocus(event) {
        const focusableElements = this.modal.querySelectorAll(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
        );
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        if (event.shiftKey && document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
        }
    }

    // =============================================================================
    // CLEANUP
    // =============================================================================

    /**
     * Destroy the dialog and clean up resources
     */
    destroy() {
        // Hide dialog if visible
        if (this.isVisible) {
            this.hide();
        }
        
        // Remove from DOM
        if (this.overlay && this.overlay.parentNode) {
            this.overlay.parentNode.removeChild(this.overlay);
        }
        
        // Clear references
        this.overlay = null;
        this.modal = null;
        this.elements = {};
        this.currentResolve = null;
        this.currentReject = null;
        this.previousFocus = null;
        
        // Remove all event listeners
        this.removeAllListeners();
        
        if (DEBUG.ENABLED) {
            console.debug('ConfirmDialog destroyed');
        }
    }
}

// =============================================================================
// GLOBAL INSTANCE AND CONVENIENCE FUNCTIONS
// =============================================================================

// Create global instance
let globalConfirmDialog = null;

/**
 * Get or create the global confirm dialog instance
 * @returns {ConfirmDialog} Global confirm dialog instance
 */
function getGlobalConfirmDialog() {
    if (!globalConfirmDialog) {
        globalConfirmDialog = new ConfirmDialog();
    }
    return globalConfirmDialog;
}

/**
 * Show a confirmation dialog using the global instance
 * @param {object} options - Dialog options
 * @returns {Promise<boolean>} Confirmation result
 */
export function confirm(options) {
    return getGlobalConfirmDialog().show(options);
}

/**
 * Show a danger confirmation dialog
 * @param {string} message - Confirmation message
 * @param {string} title - Dialog title
 * @returns {Promise<boolean>} Confirmation result
 */
export function confirmDanger(message, title) {
    return getGlobalConfirmDialog().confirmDanger(message, title);
}

/**
 * Show a warning confirmation dialog
 * @param {string} message - Warning message
 * @param {string} title - Dialog title
 * @returns {Promise<boolean>} Confirmation result
 */
export function confirmWarning(message, title) {
    return getGlobalConfirmDialog().confirmWarning(message, title);
}

/**
 * Show an info confirmation dialog
 * @param {string} message - Info message
 * @param {string} title - Dialog title
 * @returns {Promise<boolean>} Confirmation result
 */
export function confirmInfo(message, title) {
    return getGlobalConfirmDialog().confirmInfo(message, title);
}

/**
 * Show a yes/no confirmation dialog
 * @param {string} message - Question message
 * @param {string} title - Dialog title
 * @returns {Promise<boolean>} Confirmation result
 */
export function confirmYesNo(message, title) {
    return getGlobalConfirmDialog().confirmYesNo(message, title);
}

// Game-specific convenience functions
export const GameConfirmations = {
    restartPuzzle: () => getGlobalConfirmDialog().confirmRestartPuzzle(),
    quitGame: () => getGlobalConfirmDialog().confirmQuitGame(),
    resetProgress: () => getGlobalConfirmDialog().confirmResetProgress(),
    resetSettings: () => getGlobalConfirmDialog().confirmResetSettings(),
    skipLevel: () => getGlobalConfirmDialog().confirmSkipLevel(),
    useHint: (hintsRemaining) => getGlobalConfirmDialog().confirmUseHint(hintsRemaining)
};

// =============================================================================
// EXPORTS
// =============================================================================

export default ConfirmDialog;