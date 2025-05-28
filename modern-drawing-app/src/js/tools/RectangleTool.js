import { BaseTool } from './BaseTool.js';
import { Rectangle } from '../shapes/Rectangle.js';

export class RectangleTool extends BaseTool {
    constructor(state, renderer) {
        super(state, renderer);
        this.startPos = null;
        this.currentShape = null;
    }

    onMouseDown(e) {
        this.startPos = this.getCanvasPosition(e);
        this.currentShape = new Rectangle(this.startPos.x, this.startPos.y, 0, 0);
        this.state.addShape(this.currentShape);
        this.isDrawing = true;
    }

    onMouseMove(e) {
        if (this.isDrawing && this.currentShape) {
            const pos = this.getCanvasPosition(e);
            const width = pos.x - this.startPos.x;
            const height = pos.y - this.startPos.y;
            
            this.currentShape.x = width < 0 ? pos.x : this.startPos.x;
            this.currentShape.y = height < 0 ? pos.y : this.startPos.y;
            this.currentShape.width = Math.abs(width);
            this.currentShape.height = Math.abs(height);
            
            this.currentShape.emit('changed', this.currentShape);
        }
    }

    onMouseUp(e) {
        if (this.currentShape && (this.currentShape.width < 5 || this.currentShape.height < 5)) {
            this.currentShape.width = Math.max(this.currentShape.width, 50);
            this.currentShape.height = Math.max(this.currentShape.height, 50);
            this.currentShape.emit('changed', this.currentShape);
        }
        this.isDrawing = false;
        this.currentShape = null;
        this.startPos = null;
    }
}