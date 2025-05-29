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