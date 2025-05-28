import { EventEmitter } from '../core/EventEmitter.js';

export class BaseTool extends EventEmitter {
    constructor(state, renderer) {
        super();
        this.state = state;
        this.renderer = renderer;
        this.isActive = false;
        this.isDrawing = false;
    }

    activate() {
        this.isActive = true;
        this.bindEvents();
    }

    deactivate() {
        this.isActive = false;
        this.unbindEvents();
        this.isDrawing = false;
    }

    bindEvents() {
        this.canvas = this.renderer.canvas;
        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
        
        this.canvas.addEventListener('mousedown', this.onMouseDown);
        this.canvas.addEventListener('mousemove', this.onMouseMove);
        this.canvas.addEventListener('mouseup', this.onMouseUp);
    }

    unbindEvents() {
        if (this.canvas) {
            this.canvas.removeEventListener('mousedown', this.onMouseDown);
            this.canvas.removeEventListener('mousemove', this.onMouseMove);
            this.canvas.removeEventListener('mouseup', this.onMouseUp);
        }
    }

    getCanvasPosition(e) {
        return this.renderer.screenToCanvas(e.clientX, e.clientY);
    }

    onMouseDown(e) {}
    onMouseMove(e) {}
    onMouseUp(e) {}
}