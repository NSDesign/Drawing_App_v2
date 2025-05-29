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

