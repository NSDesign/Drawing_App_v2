// src/js/tools/BezierTool.js
import { BaseTool } from './BaseTool.js';
import { BezierCurve } from '../shapes/BezierCurve.js';
import { AddShapeCommand } from '../commands/AddShapeCommand.js';

export class BezierTool extends BaseTool {
    constructor(state, renderer, commandManager) {
        super(state, renderer);
        this.commandManager = commandManager;
        this.currentCurve = null;
        this.mode = 'create'; // 'create' or 'edit'
        this.dragPoint = null;
        this.clickCount = 0;
    }

    activate() {
        super.activate();
        this.canvas.style.cursor = 'crosshair';
        this.mode = 'create';
    }

    deactivate() {
        super.deactivate();
        this.finishCurrentCurve();
        this.canvas.style.cursor = 'default';
    }

    onMouseDown(e) {
        const pos = this.getCanvasPosition(e);
        
        if (this.mode === 'create') {
            this.handleCreateMode(pos);
        } else if (this.mode === 'edit') {
            this.handleEditMode(pos, e);
        }
    }

    handleCreateMode(pos) {
        if (this.clickCount === 0) {
            // First click - start curve
            this.currentCurve = new BezierCurve(pos.x, pos.y, pos.x + 100, pos.y);
            this.currentCurve.showControlPoints = true;
            this.state.addShape(this.currentCurve);
            this.clickCount = 1;
            this.isDrawing = true;
        } else if (this.clickCount === 1) {
            // Second click - set end point and switch to edit mode
            this.currentCurve.endX = pos.x;
            this.currentCurve.endY = pos.y;
            // Auto-adjust control points for smooth curve
            this.autoAdjustControlPoints();
            this.mode = 'edit';
            this.clickCount = 0;
        }
    }

    handleEditMode(pos, e) {
        // Check if clicking on an existing curve
        const clickedShape = this.state.getShapeAt(pos.x, pos.y);
        
        if (clickedShape && clickedShape.type === 'bezier') {
            // Check if clicking on control point
            const controlPoint = clickedShape.hitTestControlPoint(pos.x, pos.y);
            if (controlPoint) {
                this.currentCurve = clickedShape;
                this.dragPoint = controlPoint;
                this.isDrawing = true;
                this.canvas.style.cursor = 'grab';
                return;
            }
            
            // Select different curve for editing
            this.currentCurve = clickedShape;
            this.currentCurve.showControlPoints = true;
            this.state.emit('shapesChanged');
        } else {
            // Click on empty space - start new curve
            this.finishCurrentCurve();
            this.mode = 'create';
            this.handleCreateMode(pos);
        }
    }

    onMouseMove(e) {
        const pos = this.getCanvasPosition(e);
        
        if (this.mode === 'create' && this.isDrawing && this.currentCurve) {
            if (this.clickCount === 1) {
                // Update end point while dragging
                this.currentCurve.endX = pos.x;
                this.currentCurve.endY = pos.y;
                this.autoAdjustControlPoints();
                this.currentCurve.emit('changed', this.currentCurve);
            }
        } else if (this.mode === 'edit' && this.isDrawing && this.dragPoint) {
            // Drag control point
            this.currentCurve.setControlPoint(this.dragPoint, pos.x, pos.y);
        }
        
        // Update cursor based on hover
        this.updateCursor(pos);
    }

    onMouseUp(e) {
        if (this.dragPoint) {
            this.dragPoint = null;
            this.canvas.style.cursor = 'crosshair';
        }
        
        if (this.mode === 'create' && this.clickCount === 1) {
            // Don't finish drawing yet, wait for second click
            this.isDrawing = false;
        } else {
            this.isDrawing = false;
        }
    }

    updateCursor(pos) {
        if (this.mode === 'edit' && this.currentCurve) {
            const controlPoint = this.currentCurve.hitTestControlPoint(pos.x, pos.y);
            this.canvas.style.cursor = controlPoint ? 'grab' : 'crosshair';
        }
    }

    autoAdjustControlPoints() {
        if (!this.currentCurve) return;
        
        const dx = this.currentCurve.endX - this.currentCurve.x;
        const dy = this.currentCurve.endY - this.currentCurve.y;
        
        // Set control points to create a smooth S-curve
        this.currentCurve.cp1X = this.currentCurve.x + dx * 0.33;
        this.currentCurve.cp1Y = this.currentCurve.y + dy * 0.1;
        this.currentCurve.cp2X = this.currentCurve.x + dx * 0.67;
        this.currentCurve.cp2Y = this.currentCurve.endY - dy * 0.1;
    }

    finishCurrentCurve() {
        if (this.currentCurve) {
            this.currentCurve.showControlPoints = false;
            
            // Remove from state and add via command for undo support
            this.state.removeShape(this.currentCurve.id);
            const command = new AddShapeCommand(this.state, this.currentCurve);
            this.commandManager.execute(command);
            
            this.currentCurve = null;
        }
        this.mode = 'create';
        this.clickCount = 0;
    }

    // Handle double-click to finish editing
    onDoubleClick(e) {
        if (this.mode === 'edit') {
            this.finishCurrentCurve();
        }
    }
}