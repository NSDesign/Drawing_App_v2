import { BaseTool } from './BaseTool.js';
import { MoveShapeCommand } from '../commands/MoveShapeCommand.js';

export class SelectTool extends BaseTool {
    constructor(state, renderer, commandManager) {
        super(state, renderer);
        this.commandManager = commandManager;
        this.dragStartPos = null;
        this.dragOffset = null;
        this.marqueeStart = null;
        this.marqueeEnd = null;
        this.isMarquee = false;
        this.originalPositions = [];
        this.isDragging = false;
    }

    onMouseDown(e) {
        const pos = this.getCanvasPosition(e);
        const shape = this.state.getShapeAt(pos.x, pos.y);
        
        if (shape) {
            // Handle shape selection and dragging
            if (!e.shiftKey && !this.state.selectedShapes.has(shape)) {
                this.state.clearSelection();
            }
            this.state.selectShape(shape, e.shiftKey);
            
            // Store original positions for undo - including line endpoints
            this.originalPositions = Array.from(this.state.selectedShapes).map(s => {
                const pos = { shape: s, x: s.x, y: s.y };
                // Store line endpoints separately
                if (s.type === 'line') {
                    pos.x2 = s.x2;
                    pos.y2 = s.y2;
                }
                return pos;
            });
            
            this.dragStartPos = pos;
            this.dragOffset = {
                x: pos.x - shape.x,
                y: pos.y - shape.y
            };
            this.isDragging = true;
            this.isDrawing = true;
        } else {
            // Start marquee selection
            if (!e.shiftKey) {
                this.state.clearSelection();
            }
            this.marqueeStart = pos;
            this.marqueeEnd = pos;
            this.isMarquee = true;
            this.isDrawing = true;
        }
    }

    onMouseMove(e) {
        const pos = this.getCanvasPosition(e);
        
        if (this.isMarquee) {
            // Update marquee rectangle
            this.marqueeEnd = pos;
            this.updateMarqueeSelection(e);
            this.renderer.render();
        } else if (this.isDragging && this.state.selectedShapes.size > 0) {
            // Drag selected shapes - handle lines specially
            const dx = pos.x - this.dragStartPos.x;
            const dy = pos.y - this.dragStartPos.y;
            
            this.originalPositions.forEach((posData, index) => {
                const shape = posData.shape;
                
                if (shape.type === 'line') {
                    // Move both endpoints of the line
                    shape.x = posData.x + dx;
                    shape.y = posData.y + dy;
                    shape.x2 = posData.x2 + dx;
                    shape.y2 = posData.y2 + dy;
                    shape.emit('changed', shape);
                } else {
                    // Standard position update for other shapes
                    const newX = posData.x + dx;
                    const newY = posData.y + dy;
                    shape.setPosition(newX, newY);
                }
            });
        }
    }

    onMouseUp(e) {
        if (this.isMarquee) {
            this.isMarquee = false;
            this.marqueeStart = null;
            this.marqueeEnd = null;
        } else if (this.isDragging && this.originalPositions.length > 0) {
            // Create move command for undo - handle lines properly
            const shapes = this.originalPositions.map(p => p.shape);
            const oldPositions = this.originalPositions.map(p => {
                const pos = { x: p.x, y: p.y };
                if (p.shape.type === 'line') {
                    pos.x2 = p.x2;
                    pos.y2 = p.y2;
                }
                return pos;
            });
            const newPositions = shapes.map(s => {
                const pos = { x: s.x, y: s.y };
                if (s.type === 'line') {
                    pos.x2 = s.x2;
                    pos.y2 = s.y2;
                }
                return pos;
            });
            
            // Only create command if shapes actually moved
            const moved = oldPositions.some((oldPos, i) => {
                const newPos = newPositions[i];
                if (oldPos.x !== newPos.x || oldPos.y !== newPos.y) return true;
                if (shapes[i].type === 'line' && (oldPos.x2 !== newPos.x2 || oldPos.y2 !== newPos.y2)) return true;
                return false;
            });
            
            if (moved) {
                const command = new MoveShapeCommand(shapes, oldPositions, newPositions);
                this.commandManager.execute(command);
            }
        }
        
        this.isDrawing = false;
        this.isDragging = false;
        this.dragStartPos = null;
        this.dragOffset = null;
        this.originalPositions = [];
        this.renderer.render();
    }

    updateMarqueeSelection(e) {
        if (!this.marqueeStart || !this.marqueeEnd) return;
        
        const minX = Math.min(this.marqueeStart.x, this.marqueeEnd.x);
        const minY = Math.min(this.marqueeStart.y, this.marqueeEnd.y);
        const maxX = Math.max(this.marqueeStart.x, this.marqueeEnd.x);
        const maxY = Math.max(this.marqueeStart.y, this.marqueeEnd.y);
        
        this.state.shapes.forEach(shape => {
            const bounds = shape.getBounds();
            const intersects = !(bounds.x + bounds.width < minX || 
                               bounds.x > maxX || 
                               bounds.y + bounds.height < minY || 
                               bounds.y > maxY);
            
            if (intersects) {
                this.state.selectShape(shape, true);
            } else if (!e?.shiftKey) {
                this.state.selectedShapes.delete(shape);
                shape.setSelected(false);
            }
        });
        
        this.state.emit('selectionChanged');
    }

    renderMarquee(ctx) {
        if (!this.isMarquee || !this.marqueeStart || !this.marqueeEnd) return;
        
        ctx.save();
        
        const x = Math.min(this.marqueeStart.x, this.marqueeEnd.x);
        const y = Math.min(this.marqueeStart.y, this.marqueeEnd.y);
        const width = Math.abs(this.marqueeEnd.x - this.marqueeStart.x);
        const height = Math.abs(this.marqueeEnd.y - this.marqueeStart.y);
        
        // Draw marquee rectangle
        ctx.strokeStyle = '#1976d2';
        ctx.lineWidth = 1 / this.state.zoom;
        ctx.setLineDash([5 / this.state.zoom, 5 / this.state.zoom]);
        ctx.strokeRect(x, y, width, height);
        
        // Fill with semi-transparent blue
        ctx.fillStyle = 'rgba(25, 118, 210, 0.1)';
        ctx.fillRect(x, y, width, height);
        
        ctx.setLineDash([]);
        ctx.restore();
    }
}