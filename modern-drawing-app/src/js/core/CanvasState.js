import { EventEmitter } from './EventEmitter.js';

export class CanvasState extends EventEmitter {
    constructor() {
        super();
        this.shapes = new Map();
        this.selectedShapes = new Set();
        this.activeShape = null;
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.currentTool = 'select';
        this.gridVisible = true;
        this.gridSize = 20;
    }

    addShape(shape) {
        this.shapes.set(shape.id, shape);
        shape.zIndex = this.shapes.size;
        shape.on('changed', () => this.emit('shapesChanged'));
        this.emit('shapesChanged');
    }

    removeShape(shapeId) {
        const shape = this.shapes.get(shapeId);
        if (shape) {
            this.shapes.delete(shapeId);
            this.selectedShapes.delete(shape);
            if (this.activeShape === shape) {
                this.activeShape = null;
            }
            this.emit('shapesChanged');
        }
    }

    selectShape(shape, multi = false) {
        if (!multi) {
            this.clearSelection();
        }
        this.selectedShapes.add(shape);
        shape.setSelected(true);
        this.emit('selectionChanged');
    }

    clearSelection() {
        this.selectedShapes.forEach(shape => shape.setSelected(false));
        this.selectedShapes.clear();
        this.emit('selectionChanged');
    }

    setActiveTool(tool) {
        this.currentTool = tool;
        this.emit('toolChanged', tool);
    }

    setZoom(zoom) {
        this.zoom = Math.max(0.1, Math.min(5, zoom));
        this.emit('viewChanged');
    }

    getShapeAt(x, y) {
        const shapes = Array.from(this.shapes.values())
            .sort((a, b) => b.zIndex - a.zIndex);
        
        return shapes.find(shape => shape.hitTest(x, y));
    }
}