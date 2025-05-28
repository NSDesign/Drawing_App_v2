import { BaseTool } from './BaseTool.js';
import { Ellipse } from '../shapes/Ellipse.js';

export class EllipseTool extends BaseTool {
    constructor(state, renderer) {
        super(state, renderer);
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
        if (this.currentShape && (this.currentShape.radiusX < 5 || this.currentShape.radiusY < 5)) {
            this.currentShape.radiusX = Math.max(this.currentShape.radiusX, 25);
            this.currentShape.radiusY = Math.max(this.currentShape.radiusY, 25);
            this.currentShape.emit('changed', this.currentShape);
        }
        this.isDrawing = false;
        this.currentShape = null;
        this.startPos = null;
    }
}