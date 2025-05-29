// src/js/core/StateManager.js - Application State Management

/**
 * Centralized state management with reactive updates and history
 */
export class StateManager {
    constructor() {
        this.state = {};
        this.listeners = new Map();
        this.history = [];
        this.historyIndex = -1;
        this.maxHistorySize = 50;
        this.debugMode = false;
    }

    /**
     * Set state with deep merge and change detection
     * @param {Object} newState - State to merge
     * @param {Object} options - Options { silent: boolean, saveHistory: boolean }
     */
    setState(newState, options = {}) {
        if (!newState || typeof newState !== 'object') {
            throw new Error('State must be an object');
        }

        const previousState = this.deepClone(this.state);
        const mergedState = this.deepMerge(this.state, newState);
        
        // Detect changes
        const changes = this.detectChanges(previousState, mergedState);
        
        if (changes.length === 0) {
            return; // No changes
        }

        // Save to history if requested
        if (options.saveHistory !== false) {
            this.saveToHistory(previousState);
        }

        // Update state
        this.state = mergedState;

        if (this.debugMode) {
            console.log('State updated:', {
                changes,
                previousState,
                newState: this.state
            });
        }

        // Notify listeners if not silent
        if (!options.silent) {
            this.notifyListeners(changes, previousState);
        }
    }

    /**
     * Get current state or specific path
     * @param {string} path - Dot notation path (e.g., 'canvas.width')
     */
    getState(path = null) {
        if (!path) {
            return this.deepClone(this.state);
        }

        return this.getNestedValue(this.state, path);
    }

    /**
     * Subscribe to state changes
     * @param {string|Function} pathOrCallback - Path to watch or callback for all changes
     * @param {Function} callback - Callback function (if path specified)
     * @returns {Function} Unsubscribe function
     */
    subscribe(pathOrCallback, callback = null) {
        let path = null;
        let handler = pathOrCallback;

        if (typeof pathOrCallback === 'string') {
            path = pathOrCallback;
            handler = callback;
        }

        if (typeof handler !== 'function') {
            throw new Error('Callback must be a function');
        }

        const listenerId = this.generateId();
        const listener = {
            id: listenerId,
            path,
            callback: handler
        };

        if (!this.listeners.has(path || '*')) {
            this.listeners.set(path || '*', []);
        }

        this.listeners.get(path || '*').push(listener);

        if (this.debugMode) {
            console.log(`State listener added for path: ${path || 'all'}`);
        }

        // Return unsubscribe function
        return () => this.unsubscribe(listenerId);
    }

    /**
     * Unsubscribe from state changes
     */
    unsubscribe(listenerId) {
        for (const [path, listeners] of this.listeners) {
            const index = listeners.findIndex(l => l.id === listenerId);
            if (index !== -1) {
                listeners.splice(index, 1);
                if (listeners.length === 0) {
                    this.listeners.delete(path);
                }
                if (this.debugMode) {
                    console.log(`State listener removed for path: ${path}`);
                }
                break;
            }
        }
    }

    /**
     * Notify listeners of state changes
     */
    notifyListeners(changes, previousState) {
        const notifiedPaths = new Set();

        // Notify specific path listeners
        changes.forEach(change => {
            const pathListeners = this.listeners.get(change.path);
            if (pathListeners && !notifiedPaths.has(change.path)) {
                pathListeners.forEach(listener => {
                    try {
                        listener.callback({
                            path: change.path,
                            value: change.newValue,
                            previousValue: change.oldValue,
                            state: this.state,
                            previousState
                        });
                    } catch (error) {
                        console.error(`Error in state listener for ${change.path}:`, error);
                    }
                });
                notifiedPaths.add(change.path);
            }

            // Also notify parent path listeners
            const pathParts = change.path.split('.');
            for (let i = 1; i < pathParts.length; i++) {
                const parentPath = pathParts.slice(0, i).join('.');
                const parentListeners = this.listeners.get(parentPath);
                if (parentListeners && !notifiedPaths.has(parentPath)) {
                    parentListeners.forEach(listener => {
                        try {
                            listener.callback({
                                path: change.path,
                                value: change.newValue,
                                previousValue: change.oldValue,
                                state: this.state,
                                previousState
                            });
                        } catch (error) {
                            console.error(`Error in state listener for ${parentPath}:`, error);
                        }
                    });
                    notifiedPaths.add(parentPath);
                }
            }
        });

        // Notify global listeners
        const globalListeners = this.listeners.get('*');
        if (globalListeners) {
            globalListeners.forEach(listener => {
                try {
                    listener.callback({
                        changes,
                        state: this.state,
                        previousState
                    });
                } catch (error) {
                    console.error('Error in global state listener:', error);
                }
            });
        }
    }

    /**
     * Detect changes between two state objects
     */
    detectChanges(oldState, newState, basePath = '') {
        const changes = [];
        
        const allKeys = new Set([
            ...Object.keys(oldState || {}),
            ...Object.keys(newState || {})
        ]);

        allKeys.forEach(key => {
            const path = basePath ? `${basePath}.${key}` : key;
            const oldValue = oldState?.[key];
            const newValue = newState?.[key];

            if (this.isObject(oldValue) && this.isObject(newValue)) {
                // Recursively check nested objects
                changes.push(...this.detectChanges(oldValue, newValue, path));
            } else if (!this.isEqual(oldValue, newValue)) {
                changes.push({
                    path,
                    oldValue,
                    newValue
                });
            }
        });

        return changes;
    }

    /**
     * Save current state to history
     */
    saveToHistory(state) {
        // Remove future history if we're not at the end
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }

        // Add new state to history
        this.history.push(this.deepClone(state));

        // Limit history size
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        } else {
            this.historyIndex++;
        }
    }

    /**
     * Undo last state change
     */
    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            const previousState = this.history[this.historyIndex];
            this.state = this.deepClone(previousState);
            this.notifyListeners(
                this.detectChanges(this.state, previousState),
                this.state
            );
            return true;
        }
        return false;
    }

    /**
     * Redo last undone change
     */
    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            const nextState = this.history[this.historyIndex];
            this.state = this.deepClone(nextState);
            this.notifyListeners(
                this.detectChanges(this.state, nextState),
                this.state
            );
            return true;
        }
        return false;
    }

    /**
     * Clear history
     */
    clearHistory() {
        this.history = [];
        this.historyIndex = -1;
    }

    /**
     * Reset state to initial values
     */
    reset(initialState = {}) {
        const previousState = this.deepClone(this.state);
        this.state = this.deepClone(initialState);
        this.clearHistory();
        
        const changes = this.detectChanges(previousState, this.state);
        this.notifyListeners(changes, previousState);
    }

    /**
     * Batch multiple state updates
     */
    batch(updates) {
        const previousState = this.deepClone(this.state);
        let hasChanges = false;

        updates.forEach(update => {
            const mergedState = this.deepMerge(this.state, update);
            const changes = this.detectChanges(this.state, mergedState);
            
            if (changes.length > 0) {
                this.state = mergedState;
                hasChanges = true;
            }
        });

        if (hasChanges) {
            this.saveToHistory(previousState);
            const changes = this.detectChanges(previousState, this.state);
            this.notifyListeners(changes, previousState);
        }
    }

    /**
     * Create a computed value that updates when dependencies change
     */
    computed(dependencies, computeFn) {
        let cachedValue = null;
        let isStale = true;

        const update = () => {
            if (isStale) {
                const depValues = dependencies.map(dep => this.getState(dep));
                cachedValue = computeFn(...depValues);
                isStale = false;
            }
            return cachedValue;
        };

        // Subscribe to dependency changes
        const unsubscribers = dependencies.map(dep => 
            this.subscribe(dep, () => { isStale = true; })
        );

        return {
            get value() { return update(); },
            destroy() { unsubscribers.forEach(fn => fn()); }
        };
    }

    /**
     * Get nested value using dot notation
     */
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : undefined;
        }, obj);
    }

    /**
     * Deep merge two objects
     */
    deepMerge(target, source) {
        const result = { ...target };

        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (this.isObject(source[key]) && this.isObject(result[key])) {
                    result[key] = this.deepMerge(result[key], source[key]);
                } else {
                    result[key] = source[key];
                }
            }
        }

        return result;
    }

    /**
     * Deep clone an object
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }

        if (obj instanceof Date) {
            return new Date(obj.getTime());
        }

        if (obj instanceof Array) {
            return obj.map(item => this.deepClone(item));
        }

        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = this.deepClone(obj[key]);
            }
        }

        return cloned;
    }

    /**
     * Check if two values are equal
     */
    isEqual(a, b) {
        if (a === b) return true;
        if (a == null || b == null) return a === b;
        if (typeof a !== typeof b) return false;

        if (typeof a === 'object') {
            const keysA = Object.keys(a);
            const keysB = Object.keys(b);
            
            if (keysA.length !== keysB.length) return false;
            
            return keysA.every(key => this.isEqual(a[key], b[key]));
        }

        return false;
    }

    /**
     * Check if value is an object
     */
    isObject(value) {
        return value !== null && 
               typeof value === 'object' && 
               !Array.isArray(value) && 
               !(value instanceof Date);
    }

    /**
     * Generate unique ID
     */
    generateId() {
        return `state_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Enable/disable debug mode
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
    }

    /**
     * Get state management statistics
     */
    getStats() {
        return {
            stateSize: JSON.stringify(this.state).length,
            listenerCount: Array.from(this.listeners.values())
                .reduce((sum, listeners) => sum + listeners.length, 0),
            historySize: this.history.length,
            historyIndex: this.historyIndex,
            watchedPaths: Array.from(this.listeners.keys())
        };
    }

    /**
     * Clear all state and listeners
     */
    clear() {
        this.state = {};
        this.listeners.clear();
        this.clearHistory();
        
        if (this.debugMode) {
            console.log('State manager cleared');
        }
    }
}