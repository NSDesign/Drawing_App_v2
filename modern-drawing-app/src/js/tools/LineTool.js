import { BaseTool } from './BaseTool.js';
import { Line } from '../shapes/Line.js';

export class LineTool extends BaseTool {
    constructor(state, renderer) {
        super(state, renderer);
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
        this.isDrawing = false;
        this.currentShape = null;
    }
}