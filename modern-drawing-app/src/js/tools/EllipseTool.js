import { BaseTool } from './BaseTool.js';
import { Ellipse } from '../shapes/Ellipse.js';
import { AddShapeCommand } from '../commands/AddShapeCommand.js';

export class EllipseTool extends BaseTool {
    constructor(state, renderer, commandManager) {
        super(state, renderer);
        this.commandManager = commandManager;
        this.startPos = null;
        this.currentShape = null;
    }

    onMouseDown(e) {
        this.startPos = this.getCanvasPosition(e);
        this.currentShape = new Ellipse(this.startPos.x, this.startPos.y, 0, 0);
        this.state.addShape(this.currentShape);
        this.isDrawing = true;
    }

    onMouseMove(e) {
        if (this.isDrawing && this.currentShape) {
            const pos = this.getCanvasPosition(e);
            const radiusX = Math.abs(pos.x - this.startPos.x) / 2;
            const radiusY = Math.abs(pos.y - this.startPos.y) / 2;
            
            this.currentShape.x = Math.min(this.startPos.x, pos.x);
            this.currentShape.y = Math.min(this.startPos.y, pos.y);
            this.currentShape.radiusX = radiusX;
            this.currentShape.radiusY = radiusY;
            
            this.currentShape.emit('changed', this.currentShape);
        }
    }

    onMouseUp(e) {
        if (this.currentShape) {
            if (this.currentShape.radiusX < 5 || this.currentShape.radiusY < 5) {
                this.currentShape.radiusX = Math.max(this.currentShape.radiusX, 25);
                this.currentShape.radiusY = Math.max(this.currentShape.radiusY, 25);
            }
            
            this.state.removeShape(this.currentShape.id);
            const command = new AddShapeCommand(this.state, this.currentShape);
            this.commandManager.execute(command);
        }
        
        this.isDrawing = false;
        this.currentShape = null;
        this.startPos = null;
    }
}
