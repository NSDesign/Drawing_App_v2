// src/js/core/Command.js
export class Command {
    execute() {
        throw new Error('Execute method must be implemented');
    }
    
    undo() {
        throw new Error('Undo method must be implemented');
    }
}

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

// src/js/commands/AddShapeCommand.js
import { Command } from '../core/Command.js';

export class AddShapeCommand extends Command {
    constructor(state, shape) {
        super();
        this.state = state;
        this.shape = shape;
    }

    execute() {
        this.state.addShape(this.shape);
    }

    undo() {
        this.state.removeShape(this.shape.id);
    }
}

// src/js/commands/DeleteShapeCommand.js
import { Command } from '../core/Command.js';

export class DeleteShapeCommand extends Command {
    constructor(state, shapes) {
        super();
        this.state = state;
        this.shapes = Array.isArray(shapes) ? shapes : [shapes];
    }

    execute() {
        this.shapes.forEach(shape => {
            this.state.removeShape(shape.id);
        });
    }

    undo() {
        this.shapes.forEach(shape => {
            this.state.addShape(shape);
        });
    }
}

// src/js/commands/MoveShapeCommand.js
import { Command } from '../core/Command.js';

export class MoveShapeCommand extends Command {
    constructor(shapes, oldPositions, newPositions) {
        super();
        this.shapes = Array.isArray(shapes) ? shapes : [shapes];
        this.oldPositions = oldPositions;
        this.newPositions = newPositions;
    }

    execute() {
        this.shapes.forEach((shape, index) => {
            const pos = this.newPositions[index];
            shape.setPosition(pos.x, pos.y);
        });
    }

    undo() {
        this.shapes.forEach((shape, index) => {
            const pos = this.oldPositions[index];
            shape.setPosition(pos.x, pos.y);
        });
    }
}