import { BaseTool } from './BaseTool.js';
import { Rectangle } from '../shapes/Rectangle.js';
import { AddShapeCommand } from '../commands/AddShapeCommand.js';

export class RectangleTool extends BaseTool {
    constructor(state, renderer, commandManager) {
        super(state, renderer);
        this.commandManager = commandManager;
        this.startPos = null;
        this.currentShape = null;
    }

    onMouseDown(e) {
        this.startPos = this.getCanvasPosition(e);
        this.currentShape = new Rectangle(this.startPos.x, this.startPos.y, 0, 0);
        
        // Add to state immediately for preview
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
        if (this.currentShape) {
            // Ensure minimum size
            if (this.currentShape.width < 5 || this.currentShape.height < 5) {
                this.currentShape.width = Math.max(this.currentShape.width, 50);
                this.currentShape.height = Math.max(this.currentShape.height, 50);
            }
            
            // Remove from state and add via command for undo support
            this.state.removeShape(this.currentShape.id);
            const command = new AddShapeCommand(this.state, this.currentShape);
            this.commandManager.execute(command);
        }
        
        this.isDrawing = false;
        this.currentShape = null;
        this.startPos = null;
    }
}