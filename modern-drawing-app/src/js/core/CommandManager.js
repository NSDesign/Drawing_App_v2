// src/js/core/CommandManager.js - Command Pattern for Undo/Redo

/**
 * Base Command class that all commands should extend
 */
export class Command {
    constructor(description = 'Unknown Command') {
        this.description = description;
        this.timestamp = Date.now();
        this.id = this.generateId();
    }

    /**
     * Execute the command
     * @returns {Promise|void}
     */
    execute() {
        throw new Error('Execute method must be implemented');
    }

    /**
     * Undo the command
     * @returns {Promise|void}
     */
    undo() {
        throw new Error('Undo method must be implemented');
    }

    /**
     * Check if this command can be merged with another
     * @param {Command} otherCommand
     * @returns {boolean}
     */
    canMergeWith(otherCommand) {
        return false;
    }

    /**
     * Merge this command with another
     * @param {Command} otherCommand
     * @returns {Command}
     */
    mergeWith(otherCommand) {
        throw new Error('MergeWith method must be implemented when canMergeWith returns true');
    }

    /**
     * Get command data for serialization
     */
    serialize() {
        return {
            type: this.constructor.name,
            description: this.description,
            timestamp: this.timestamp,
            id: this.id
        };
    }

    generateId() {
        return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

/**
 * Composite command for grouping multiple commands
 */
export class CompositeCommand extends Command {
    constructor(commands = [], description = 'Composite Command') {
        super(description);
        this.commands = commands;
    }

    async execute() {
        for (const command of this.commands) {
            await command.execute();
        }
    }

    async undo() {
        // Undo in reverse order
        for (let i = this.commands.length - 1; i >= 0; i--) {
            await this.commands[i].undo();
        }
    }

    addCommand(command) {
        this.commands.push(command);
    }

    serialize() {
        return {
            ...super.serialize(),
            commands: this.commands.map(cmd => cmd.serialize())
        };
    }
}

/**
 * Command manager for handling undo/redo operations
 */
export class CommandManager {
    constructor() {
        this.history = [];
        this.currentIndex = -1;
        this.maxHistorySize = 50;
        this.isExecuting = false;
        this.listeners = new Set();
        this.mergeTimeWindow = 1000; // 1 second
        this.debugMode = false;
    }

    /**
     * Initialize the command manager
     */
    initialize(options = {}) {
        this.maxHistorySize = options.maxHistorySize || 50;
        this.mergeTimeWindow = options.mergeTimeWindow || 1000;
        this.debugMode = options.debugMode || false;

        if (this.debugMode) {
            console.log('CommandManager initialized', options);
        }
    }

    /**
     * Execute a command and add it to history
     * @param {Command} command
     */
    async executeCommand(command) {
        if (!(command instanceof Command)) {
            throw new Error('Command must be an instance of Command class');
        }

        if (this.isExecuting) {
            throw new Error('Cannot execute command while another is executing');
        }

        this.isExecuting = true;

        try {
            // Execute the command
            await command.execute();

            // Try to merge with the last command if possible
            if (this.canMergeWithLast(command)) {
                const lastCommand = this.history[this.currentIndex];
                const mergedCommand = lastCommand.mergeWith(command);
                this.history[this.currentIndex] = mergedCommand;
                
                if (this.debugMode) {
                    console.log('Command merged:', mergedCommand.description);
                }
            } else {
                // Remove any commands after current index (if we're not at the end)
                if (this.currentIndex < this.history.length - 1) {
                    this.history = this.history.slice(0, this.currentIndex + 1);
                }

                // Add new command to history
                this.history.push(command);
                this.currentIndex++;

                // Limit history size
                if (this.history.length > this.maxHistorySize) {
                    this.history.shift();
                    this.currentIndex--;
                }

                if (this.debugMode) {
                    console.log('Command executed:', command.description);
                }
            }

            this.notifyListeners({
                type: 'command:executed',
                command,
                canUndo: this.canUndo(),
                canRedo: this.canRedo()
            });

        } catch (error) {
            console.error('Failed to execute command:', error);
            throw error;
        } finally {
            this.isExecuting = false;
        }
    }

    /**
     * Undo the last command
     */
    async undo() {
        if (!this.canUndo() || this.isExecuting) {
            return false;
        }

        this.isExecuting = true;

        try {
            const command = this.history[this.currentIndex];
            await command.undo();
            this.currentIndex--;

            if (this.debugMode) {
                console.log('Command undone:', command.description);
            }

            this.notifyListeners({
                type: 'command:undone',
                command,
                canUndo: this.canUndo(),
                canRedo: this.canRedo()
            });

            return true;
        } catch (error) {
            console.error('Failed to undo command:', error);
            return false;
        } finally {
            this.isExecuting = false;
        }
    }

    /**
     * Redo the next command
     */
    async redo() {
        if (!this.canRedo() || this.isExecuting) {
            return false;
        }

        this.isExecuting = true;

        try {
            this.currentIndex++;
            const command = this.history[this.currentIndex];
            await command.execute();

            if (this.debugMode) {
                console.log('Command redone:', command.description);
            }

            this.notifyListeners({
                type: 'command:redone',
                command,
                canUndo: this.canUndo(),
                canRedo: this.canRedo()
            });

            return true;
        } catch (error) {
            console.error('Failed to redo command:', error);
            this.currentIndex--; // Revert index on failure
            return false;
        } finally {
            this.isExecuting = false;
        }
    }

    /**
     * Check if undo is possible
     */
    canUndo() {
        return this.currentIndex >= 0;
    }

    /**
     * Check if redo is possible
     */
    canRedo() {
        return this.currentIndex < this.history.length - 1;
    }

    /**
     * Check if a command can be merged with the last one
     */
    canMergeWithLast(command) {
        if (this.currentIndex < 0) return false;
        
        const lastCommand = this.history[this.currentIndex];
        const timeDiff = command.timestamp - lastCommand.timestamp;
        
        return timeDiff <= this.mergeTimeWindow && lastCommand.canMergeWith(command);
    }

    /**
     * Begin a composite command (transaction)
     */
    beginTransaction(description = 'Transaction') {
        return new TransactionBuilder(this, description);
    }

    /**
     * Clear command history
     */
    clear() {
        this.history = [];
        this.currentIndex = -1;
        
        this.notifyListeners({
            type: 'history:cleared',
            canUndo: false,
            canRedo: false
        });

        if (this.debugMode) {
            console.log('Command history cleared');
        }
    }

    /**
     * Get command history
     */
    getHistory() {
        return {
            commands: this.history.map(cmd => cmd.serialize()),
            currentIndex: this.currentIndex,
            canUndo: this.canUndo(),
            canRedo: this.canRedo()
        };
    }

    /**
     * Get the current command description for UI
     */
    getUndoDescription() {
        if (!this.canUndo()) return null;
        return this.history[this.currentIndex].description;
    }

    /**
     * Get the next command description for UI
     */
    getRedoDescription() {
        if (!this.canRedo()) return null;
        return this.history[this.currentIndex + 1].description;
    }

    /**
     * Add event listener
     */
    addListener(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    /**
     * Notify all listeners
     */
    notifyListeners(event) {
        this.listeners.forEach(callback => {
            try {
                callback(event);
            } catch (error) {
                console.error('Error in command manager listener:', error);
            }
        });
    }

    /**
     * Set debug mode
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            historySize: this.history.length,
            currentIndex: this.currentIndex,
            maxHistorySize: this.maxHistorySize,
            canUndo: this.canUndo(),
            canRedo: this.canRedo(),
            isExecuting: this.isExecuting
        };
    }

    /**
     * Destroy the command manager
     */
    destroy() {
        this.clear();
        this.listeners.clear();
        
        if (this.debugMode) {
            console.log('CommandManager destroyed');
        }
    }
}

/**
 * Transaction builder for creating composite commands
 */
class TransactionBuilder {
    constructor(commandManager, description) {
        this.commandManager = commandManager;
        this.description = description;
        this.commands = [];
        this.isActive = true;
    }

    /**
     * Add a command to the transaction
     */
    addCommand(command) {
        if (!this.isActive) {
            throw new Error('Transaction is no longer active');
        }
        this.commands.push(command);
        return this;
    }

    /**
     * Execute all commands in the transaction
     */
    async execute() {
        if (!this.isActive) {
            throw new Error('Transaction is no longer active');
        }

        if (this.commands.length === 0) {
            throw new Error('Transaction has no commands');
        }

        const compositeCommand = new CompositeCommand(this.commands, this.description);
        await this.commandManager.executeCommand(compositeCommand);
        
        this.isActive = false;
        return compositeCommand;
    }

    /**
     * Cancel the transaction
     */
    cancel() {
        this.isActive = false;
        this.commands = [];
    }
}

// Predefined command types for common operations

/**
 * Create shape command
 */
export class CreateShapeCommand extends Command {
    constructor(shapeManager, shapeData) {
        super(`Create ${shapeData.type}`);
        this.shapeManager = shapeManager;
        this.shapeData = shapeData;
        this.createdShape = null;
    }

    async execute() {
        this.createdShape = this.shapeManager.createShape(this.shapeData);
        return this.createdShape;
    }

    async undo() {
        if (this.createdShape) {
            this.shapeManager.removeShape(this.createdShape.id);
        }
    }

    serialize() {
        return {
            ...super.serialize(),
            shapeData: this.shapeData,
            shapeId: this.createdShape?.id
        };
    }
}

/**
 * Delete shape command
 */
export class DeleteShapeCommand extends Command {
    constructor(shapeManager, shapeId) {
        super('Delete Shape');
        this.shapeManager = shapeManager;
        this.shapeId = shapeId;
        this.deletedShapeData = null;
    }

    async execute() {
        const shape = this.shapeManager.getShape(this.shapeId);
        if (shape) {
            this.deletedShapeData = shape.serialize();
            this.shapeManager.removeShape(this.shapeId);
        }
    }

    async undo() {
        if (this.deletedShapeData) {
            this.shapeManager.createShape(this.deletedShapeData);
        }
    }

    serialize() {
        return {
            ...super.serialize(),
            shapeId: this.shapeId,
            deletedShapeData: this.deletedShapeData
        };
    }
}

/**
 * Move shape command
 */
export class MoveShapeCommand extends Command {
    constructor(shapeManager, shapeId, oldPosition, newPosition) {
        super('Move Shape');
        this.shapeManager = shapeManager;
        this.shapeId = shapeId;
        this.oldPosition = oldPosition;
        this.newPosition = newPosition;
    }

    async execute() {
        const shape = this.shapeManager.getShape(this.shapeId);
        if (shape) {
            shape.setPosition(this.newPosition.x, this.newPosition.y);
        }
    }

    async undo() {
        const shape = this.shapeManager.getShape(this.shapeId);
        if (shape) {
            shape.setPosition(this.oldPosition.x, this.oldPosition.y);
        }
    }

    canMergeWith(otherCommand) {
        return otherCommand instanceof MoveShapeCommand &&
               otherCommand.shapeId === this.shapeId &&
               otherCommand.timestamp - this.timestamp <= 1000;
    }

    mergeWith(otherCommand) {
        return new MoveShapeCommand(
            this.shapeManager,
            this.shapeId,
            this.oldPosition,
            otherCommand.newPosition
        );
    }

    serialize() {
        return {
            ...super.serialize(),
            shapeId: this.shapeId,
            oldPosition: this.oldPosition,
            newPosition: this.newPosition
        };
    }
}