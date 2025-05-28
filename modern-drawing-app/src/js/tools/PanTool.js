import { BaseTool } from './BaseTool.js';

export class PanTool extends BaseTool {
    constructor(state, renderer) {
        super(state, renderer);
        this.startPos = null;
        this.startPan = null;
    }

    onMouseDown(e) {
        this.startPos = { x: e.clientX, y: e.clientY };
        this.startPan = { x: this.state.panX, y: this.state.panY };
        this.isDrawing = true;
    }

    onMouseMove(e) {
        if (this.isDrawing) {
            const dx = (e.clientX - this.startPos.x) / this.state.zoom;
            const dy = (e.clientY - this.startPos.y) / this.state.zoom;
            
            this.state.panX = this.startPan.x + dx;
            this.state.panY = this.startPan.y + dy;
            this.state.emit('viewChanged');
        }
    }

    onMouseUp(e) {
        this.isDrawing = false;
        this.startPos = null;
        this.startPan = null;
    }
}