import { BaseTool } from './BaseTool.js';

export class SelectTool extends BaseTool {
    constructor(state, renderer) {
        super(state, renderer);
        this.dragStartPos = null;
        this.dragOffset = null;
    }

    onMouseDown(e) {
        const pos = this.getCanvasPosition(e);
        const shape = this.state.getShapeAt(pos.x, pos.y);
        
        if (shape) {
            if (!e.shiftKey) {
                this.state.clearSelection();
            }
            this.state.selectShape(shape);
            this.dragStartPos = pos;
            this.dragOffset = {
                x: pos.x - shape.x,
                y: pos.y - shape.y
            };
            this.isDrawing = true;
        } else {
            this.state.clearSelection();
        }
    }

    onMouseMove(e) {
        if (this.isDrawing && this.state.selectedShapes.size > 0) {
            const pos = this.getCanvasPosition(e);
            this.state.selectedShapes.forEach(shape => {
                shape.setPosition(
                    pos.x - this.dragOffset.x,
                    pos.y - this.dragOffset.y
                );
            });
        }
    }

    onMouseUp(e) {
        this.isDrawing = false;
        this.dragStartPos = null;
        this.dragOffset = null;
    }
}