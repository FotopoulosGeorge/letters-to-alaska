/**
 * EventEmitter - Custom Event System for Sliding Puzzle Game
 * Enables clean communication between game components
 */

import { DEBUG } from '../utils/Constants.js';

// =============================================================================
// EVENT EMITTER CLASS
// =============================================================================

export class EventEmitter {
    constructor() {
        this.events = {};
        this.maxListeners = 50; // Prevent memory leaks
        this.debugMode = DEBUG.ENABLED;
    }

    /**
     * Add an event listener
     * @param {string} eventName - Name of the event
     * @param {Function} listener - Function to call when event is fired
     * @param {object} options - Options for the listener
     * @param {boolean} options.once - Remove listener after first call
     * @param {object} options.context - Context to bind the listener to
     * @returns {EventEmitter} Returns this for chaining
     */
    on(eventName, listener, options = {}) {
        if (typeof eventName !== 'string') {
            throw new Error('Event name must be a string');
        }
        
        if (typeof listener !== 'function') {
            throw new Error('Listener must be a function');
        }

        // Initialize event array if it doesn't exist
        if (!this.events[eventName]) {
            this.events[eventName] = [];
        }

        // Check for too many listeners (potential memory leak)
        if (this.events[eventName].length >= this.maxListeners) {
            console.warn(`EventEmitter: Too many listeners for event "${eventName}". Possible memory leak?`);
        }

        // Create listener object
        const listenerObj = {
            fn: listener,
            once: options.once || false,
            context: options.context || null,
            id: this._generateListenerId()
        };

        this.events[eventName].push(listenerObj);

        if (this.debugMode) {
            console.debug(`EventEmitter: Added listener for "${eventName}"`);
        }

        return this;
    }

    /**
     * Add a one-time event listener (automatically removed after first call)
     * @param {string} eventName - Name of the event
     * @param {Function} listener - Function to call when event is fired
     * @param {object} context - Context to bind the listener to
     * @returns {EventEmitter} Returns this for chaining
     */
    once(eventName, listener, context = null) {
        return this.on(eventName, listener, { once: true, context });
    }

    /**
     * Remove an event listener
     * @param {string} eventName - Name of the event
     * @param {Function} listener - Function to remove
     * @returns {EventEmitter} Returns this for chaining
     */
    off(eventName, listener) {
        if (!this.events[eventName]) {
            return this;
        }

        if (!listener) {
            // Remove all listeners for this event
            delete this.events[eventName];
            if (this.debugMode) {
                console.debug(`EventEmitter: Removed all listeners for "${eventName}"`);
            }
            return this;
        }

        // Find and remove specific listener
        this.events[eventName] = this.events[eventName].filter(listenerObj => {
            return listenerObj.fn !== listener;
        });

        // Clean up empty event arrays
        if (this.events[eventName].length === 0) {
            delete this.events[eventName];
        }

        if (this.debugMode) {
            console.debug(`EventEmitter: Removed listener for "${eventName}"`);
        }

        return this;
    }

    /**
     * Emit an event to all listeners
     * @param {string} eventName - Name of the event to emit
     * @param {...*} args - Arguments to pass to listeners
     * @returns {boolean} Returns true if event had listeners
     */
    emit(eventName, ...args) {
        if (!this.events[eventName] || this.events[eventName].length === 0) {
            if (this.debugMode) {
                console.debug(`EventEmitter: No listeners for event "${eventName}"`);
            }
            return false;
        }

        // Clone the listeners array to avoid issues if listeners are modified during emission
        const listeners = [...this.events[eventName]];
        
        if (this.debugMode) {
            console.debug(`EventEmitter: Emitting "${eventName}" to ${listeners.length} listeners`);
        }

        // Call each listener
        for (const listenerObj of listeners) {
            try {
                // Call listener with proper context
                if (listenerObj.context) {
                    listenerObj.fn.call(listenerObj.context, ...args);
                } else {
                    listenerObj.fn(...args);
                }

                // Remove one-time listeners
                if (listenerObj.once) {
                    this.off(eventName, listenerObj.fn);
                }
            } catch (error) {
                console.error(`EventEmitter: Error in listener for "${eventName}":`, error);
                // Continue with other listeners even if one fails
            }
        }

        return true;
    }

    /**
     * Get the number of listeners for an event
     * @param {string} eventName - Name of the event
     * @returns {number} Number of listeners
     */
    listenerCount(eventName) {
        return this.events[eventName] ? this.events[eventName].length : 0;
    }

    /**
     * Get all event names that have listeners
     * @returns {Array<string>} Array of event names
     */
    eventNames() {
        return Object.keys(this.events);
    }

    /**
     * Remove all listeners for all events
     * @returns {EventEmitter} Returns this for chaining
     */
    removeAllListeners() {
        this.events = {};
        if (this.debugMode) {
            console.debug('EventEmitter: Removed all listeners for all events');
        }
        return this;
    }

    /**
     * Set maximum number of listeners per event (helps detect memory leaks)
     * @param {number} max - Maximum number of listeners
     * @returns {EventEmitter} Returns this for chaining
     */
    setMaxListeners(max) {
        if (typeof max !== 'number' || max < 0) {
            throw new Error('Max listeners must be a non-negative number');
        }
        this.maxListeners = max;
        return this;
    }

    /**
     * Generate a unique ID for listeners (for debugging)
     * @private
     * @returns {string} Unique listener ID
     */
    _generateListenerId() {
        return `listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get debug information about the event emitter
     * @returns {object} Debug information
     */
    getDebugInfo() {
        const info = {
            totalEvents: Object.keys(this.events).length,
            totalListeners: 0,
            events: {}
        };

        for (const [eventName, listeners] of Object.entries(this.events)) {
            info.totalListeners += listeners.length;
            info.events[eventName] = {
                listenerCount: listeners.length,
                listeners: listeners.map(l => ({
                    id: l.id,
                    once: l.once,
                    hasContext: !!l.context
                }))
            };
        }

        return info;
    }
}

// =============================================================================
// GLOBAL EVENT BUS
// =============================================================================

/**
 * Global event bus instance for game-wide communication
 * Use this for events that need to cross multiple components
 */
export const gameEventBus = new EventEmitter();

// =============================================================================
// EVENT HELPER FUNCTIONS
// =============================================================================

/**
 * Create a promise that resolves when a specific event is emitted
 * @param {EventEmitter} emitter - Event emitter to listen to
 * @param {string} eventName - Name of the event to wait for
 * @param {number} timeout - Optional timeout in milliseconds
 * @returns {Promise} Promise that resolves with event data
 */
export function waitForEvent(emitter, eventName, timeout = null) {
    return new Promise((resolve, reject) => {
        let timeoutId = null;

        // Set up timeout if specified
        if (timeout) {
            timeoutId = setTimeout(() => {
                emitter.off(eventName, listener);
                reject(new Error(`Event "${eventName}" timed out after ${timeout}ms`));
            }, timeout);
        }

        // Set up event listener
        const listener = (...args) => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            resolve(args.length === 1 ? args[0] : args);
        };

        emitter.once(eventName, listener);
    });
}

/**
 * Create an event listener that calls a function with debouncing
 * @param {Function} fn - Function to call
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export function debounceEvent(fn, delay) {
    let timeoutId = null;
    
    return function(...args) {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        
        timeoutId = setTimeout(() => {
            fn.apply(this, args);
        }, delay);
    };
}

/**
 * Create an event listener that calls a function with throttling
 * @param {Function} fn - Function to call
 * @param {number} delay - Minimum delay between calls in milliseconds
 * @returns {Function} Throttled function
 */
export function throttleEvent(fn, delay) {
    let lastCall = 0;
    
    return function(...args) {
        const now = Date.now();
        
        if (now - lastCall >= delay) {
            lastCall = now;
            fn.apply(this, args);
        }
    };
}

/**
 * Create a conditional event listener that only fires when condition is met
 * @param {Function} condition - Function that returns boolean
 * @param {Function} listener - Function to call if condition is true
 * @returns {Function} Conditional listener function
 */
export function conditionalEvent(condition, listener) {
    return function(...args) {
        if (condition(...args)) {
            listener.apply(this, args);
        }
    };
}

/**
 * Chain multiple event emitters so events from source are re-emitted on target
 * @param {EventEmitter} source - Source event emitter
 * @param {EventEmitter} target - Target event emitter
 * @param {Array<string>|string} events - Event names to chain (or 'all' for all events)
 * @returns {Function} Cleanup function to stop chaining
 */
export function chainEvents(source, target, events) {
    const listeners = [];

    if (events === 'all') {
        // Chain all events (including future ones)
        const originalEmit = source.emit;
        source.emit = function(eventName, ...args) {
            const result = originalEmit.call(this, eventName, ...args);
            target.emit(eventName, ...args);
            return result;
        };

        // Return cleanup function
        return () => {
            source.emit = originalEmit;
        };
    } else {
        // Chain specific events
        const eventArray = Array.isArray(events) ? events : [events];
        
        eventArray.forEach(eventName => {
            const listener = (...args) => {
                target.emit(eventName, ...args);
            };
            
            source.on(eventName, listener);
            listeners.push({ eventName, listener });
        });

        // Return cleanup function
        return () => {
            listeners.forEach(({ eventName, listener }) => {
                source.off(eventName, listener);
            });
        };
    }
}

// =============================================================================
// EXPORT DEFAULT SINGLETON
// =============================================================================

// Export a default instance for convenience
export default new EventEmitter();