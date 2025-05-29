// src/js/core/CommandManager.js
import { EventEmitter } from './EventEmitter.js';

export class CommandManager extends EventEmitter {
    constructor() {
        super();
        this.history = [];
        this.currentIndex = -1;
        this.maxHistorySize = 50;
    }

    execute(command) {
        // Remove any commands after current index
        this.history = this.history.slice(0, this.currentIndex + 1);
        
        // Execute the command
        command.execute();
        
        // Add to history
        this.history.push(command);
        this.currentIndex++;
        
        // Limit history size
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
            this.currentIndex--;
        }
        
        this.emit('historyChanged');
    }

    undo() {
        if (this.canUndo()) {
            const command = this.history[this.currentIndex];
            command.undo();
            this.currentIndex--;
            this.emit('historyChanged');
            return true;
        }
        return false;
    }

    redo() {
        if (this.canRedo()) {
            this.currentIndex++;
            const command = this.history[this.currentIndex];
            command.execute();
            this.emit('historyChanged');
            return true;
        }
        return false;
    }

    canUndo() {
        return this.currentIndex >= 0;
    }

    canRedo() {
        return this.currentIndex < this.history.length - 1;
    }

    clear() {
        this.history = [];
        this.currentIndex = -1;
        this.emit('historyChanged');
    }
}

