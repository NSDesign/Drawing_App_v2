// src/js/core/EventManager.js - Application Event System

/**
 * Centralized event management system for decoupled component communication
 */
export class EventManager {
    constructor() {
        this.listeners = new Map();
        this.wildcardListeners = new Set();
        this.debugMode = false;
    }

    /**
     * Add event listener
     * @param {string} event - Event name (supports wildcards with *)
     * @param {Function} callback - Event handler
     * @param {Object} options - Options { once: boolean, priority: number }
     * @returns {Function} Unsubscribe function
     */
    on(event, callback, options = {}) {
        if (typeof callback !== 'function') {
            throw new Error('Event callback must be a function');
        }

        const listenerData = {
            callback,
            once: options.once || false,
            priority: options.priority || 0,
            id: this.generateId()
        };

        // Handle wildcard events
        if (event.includes('*')) {
            this.wildcardListeners.add({
                pattern: this.createPatternMatcher(event),
                originalPattern: event,
                ...listenerData
            });
        } else {
            // Regular events
            if (!this.listeners.has(event)) {
                this.listeners.set(event, []);
            }
            
            const eventListeners = this.listeners.get(event);
            eventListeners.push(listenerData);
            
            // Sort by priority (higher first)
            eventListeners.sort((a, b) => b.priority - a.priority);
        }

        if (this.debugMode) {
            console.log(`Event listener added: ${event}`, listenerData);
        }

        // Return unsubscribe function
        return () => this.off(event, listenerData.id);
    }

    /**
     * Add one-time event listener
     */
    once(event, callback, options = {}) {
        return this.on(event, callback, { ...options, once: true });
    }

    /**
     * Remove event listener
     * @param {string} event - Event name
     * @param {string|Function} callbackOrId - Callback function or listener ID
     */
    off(event, callbackOrId) {
        if (event.includes('*')) {
            // Remove wildcard listener
            this.wildcardListeners.forEach(listener => {
                if (listener.originalPattern === event &&
                    (listener.id === callbackOrId || listener.callback === callbackOrId)) {
                    this.wildcardListeners.delete(listener);
                }
            });
        } else {
            // Remove regular listener
            const eventListeners = this.listeners.get(event);
            if (!eventListeners) return;

            const index = eventListeners.findIndex(listener => 
                listener.id === callbackOrId || listener.callback === callbackOrId
            );

            if (index !== -1) {
                eventListeners.splice(index, 1);
                
                // Clean up empty arrays
                if (eventListeners.length === 0) {
                    this.listeners.delete(event);
                }
            }
        }

        if (this.debugMode) {
            console.log(`Event listener removed: ${event}`);
        }
    }

    /**
     * Emit event to all listeners
     * @param {string} event - Event name
     * @param {*} data - Event data
     * @param {Object} options - Emit options { async: boolean }
     */
    emit(event, data = null, options = {}) {
        const eventData = {
            type: event,
            data,
            timestamp: Date.now(),
            preventDefault: false,
            stopPropagation: false
        };

        if (this.debugMode) {
            console.log(`Event emitted: ${event}`, eventData);
        }

        // Create event object with control methods
        const eventObject = {
            ...eventData,
            preventDefault() { this.preventDefault = true; },
            stopPropagation() { this.stopPropagation = true; }
        };

        const listeners = this.getListenersForEvent(event);
        
        if (options.async) {
            // Asynchronous execution
            this.executeListenersAsync(listeners, eventObject);
        } else {
            // Synchronous execution
            this.executeListeners(listeners, eventObject);
        }

        return !eventObject.preventDefault;
    }

    /**
     * Emit event asynchronously
     */
    emitAsync(event, data = null, options = {}) {
        return this.emit(event, data, { ...options, async: true });
    }

    /**
     * Get all listeners for a specific event
     */
    getListenersForEvent(event) {
        const listeners = [];

        // Regular listeners
        const eventListeners = this.listeners.get(event);
        if (eventListeners) {
            listeners.push(...eventListeners);
        }

        // Wildcard listeners
        this.wildcardListeners.forEach(listener => {
            if (listener.pattern.test(event)) {
                listeners.push(listener);
            }
        });

        // Sort by priority
        return listeners.sort((a, b) => b.priority - a.priority);
    }

    /**
     * Execute listeners synchronously
     */
    executeListeners(listeners, eventObject) {
        const toRemove = [];

        for (const listener of listeners) {
            try {
                listener.callback(eventObject);
                
                if (listener.once) {
                    toRemove.push(listener);
                }
                
                if (eventObject.stopPropagation) {
                    break;
                }
            } catch (error) {
                console.error(`Error in event listener for ${eventObject.type}:`, error);
                this.emit('error', { error, event: eventObject.type, listener });
            }
        }

        // Remove one-time listeners
        this.removeListeners(toRemove, eventObject.type);
    }

    /**
     * Execute listeners asynchronously
     */
    async executeListenersAsync(listeners, eventObject) {
        const toRemove = [];

        for (const listener of listeners) {
            try {
                await Promise.resolve(listener.callback(eventObject));
                
                if (listener.once) {
                    toRemove.push(listener);
                }
                
                if (eventObject.stopPropagation) {
                    break;
                }
            } catch (error) {
                console.error(`Error in async event listener for ${eventObject.type}:`, error);
                this.emit('error', { error, event: eventObject.type, listener });
            }
        }

        // Remove one-time listeners
        this.removeListeners(toRemove, eventObject.type);
    }

    /**
     * Remove listeners from collections
     */
    removeListeners(listeners, eventType) {
        listeners.forEach(listener => {
            if (listener.pattern) {
                // Wildcard listener
                this.wildcardListeners.delete(listener);
            } else {
                // Regular listener
                this.off(eventType, listener.id);
            }
        });
    }

    /**
     * Create pattern matcher for wildcard events
     */
    createPatternMatcher(pattern) {
        const escaped = pattern
            .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape regex chars
            .replace(/\*/g, '.*'); // Replace * with .*
        
        return new RegExp(`^${escaped}$`);
    }

    /**
     * Generate unique listener ID
     */
    generateId() {
        return `listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Enable/disable debug mode
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
    }

    /**
     * Get event statistics
     */
    getStats() {
        let totalListeners = 0;
        let eventCount = 0;

        this.listeners.forEach(listeners => {
            totalListeners += listeners.length;
            eventCount++;
        });

        return {
            eventTypes: eventCount,
            totalListeners: totalListeners + this.wildcardListeners.size,
            wildcardListeners: this.wildcardListeners.size,
            events: Array.from(this.listeners.keys())
        };
    }

    /**
     * Remove all listeners
     */
    removeAllListeners() {
        this.listeners.clear();
        this.wildcardListeners.clear();
        
        if (this.debugMode) {
            console.log('All event listeners removed');
        }
    }

    /**
     * Create a namespaced event emitter
     */
    namespace(prefix) {
        return {
            on: (event, callback, options) => 
                this.on(`${prefix}:${event}`, callback, options),
            once: (event, callback, options) => 
                this.once(`${prefix}:${event}`, callback, options),
            off: (event, callbackOrId) => 
                this.off(`${prefix}:${event}`, callbackOrId),
            emit: (event, data, options) => 
                this.emit(`${prefix}:${event}`, data, options),
            emitAsync: (event, data, options) => 
                this.emitAsync(`${prefix}:${event}`, data, options)
        };
    }

    /**
     * Wait for a specific event
     */
    waitFor(event, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.off(event, handler);
                reject(new Error(`Event ${event} timeout after ${timeout}ms`));
            }, timeout);

            const handler = (eventData) => {
                clearTimeout(timer);
                resolve(eventData);
            };

            this.once(event, handler);
        });
    }

    /**
     * Create event pipeline - chain multiple events
     */
    pipeline(events) {
        return new EventPipeline(this, events);
    }
}

/**
 * Event Pipeline for chaining events
 */
class EventPipeline {
    constructor(eventManager, events) {
        this.eventManager = eventManager;
        this.events = events;
        this.middlewares = [];
    }

    /**
     * Add middleware function
     */
    use(middleware) {
        this.middlewares.push(middleware);
        return this;
    }

    /**
     * Execute the pipeline
     */
    async execute(initialData) {
        let data = initialData;

        for (const event of this.events) {
            // Apply middlewares
            for (const middleware of this.middlewares) {
                data = await middleware(data, event);
            }

            // Emit event and wait for completion
            await this.eventManager.emitAsync(event, data);
        }

        return data;
    }
}