import { BaseTool } from './BaseTool.js';
import { Line } from '../shapes/Line.js';
import { AddShapeCommand } from '../commands/AddShapeCommand.js';

export class LineTool extends BaseTool {
    constructor(state, renderer, commandManager) {
        super(state, renderer);
        this.commandManager = commandManager;
        this.currentShape = null;
    }

    onMouseDown(e) {
        const pos = this.getCanvasPosition(e);
        this.currentShape = new Line(pos.x, pos.y, pos.x, pos.y);
        this.state.addShape(this.currentShape);
        this.isDrawing = true;
    }

    onMouseMove(e) {
        if (this.isDrawing && this.currentShape) {
            const pos = this.getCanvasPosition(e);
            this.currentShape.x2 = pos.x;
            this.currentShape.y2 = pos.y;
            this.currentShape.emit('changed', this.currentShape);
        }
    }

    onMouseUp(e) {
        if (this.currentShape) {
            this.state.removeShape(this.currentShape.id);
            const command = new AddShapeCommand(this.state, this.currentShape);
            this.commandManager.execute(command);
        }
        
        this.isDrawing = false;
        this.currentShape = null;
    }
}