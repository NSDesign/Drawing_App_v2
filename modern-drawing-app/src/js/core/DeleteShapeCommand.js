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

