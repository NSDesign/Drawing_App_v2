// Update to SelectTool.js - Enhanced with marquee selection
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
            
            // Store original positions for undo
            this.originalPositions = Array.from(this.state.selectedShapes).map(s => ({
                x: s.x, y: s.y
            }));
            
            this.dragStartPos = pos;
            this.dragOffset = {
                x: pos.x - shape.x,
                y: pos.y - shape.y
            };
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
            this.updateMarqueeSelection();
            this.renderer.render(); // Force re-render to show marquee
        } else if (this.isDrawing && this.state.selectedShapes.size > 0) {
            // Drag selected shapes
            const dx = pos.x - this.dragStartPos.x;
            const dy = pos.y - this.dragStartPos.y;
            
            this.state.selectedShapes.forEach(shape => {
                shape.setPosition(
                    this.originalPositions.find(p => p === shape)?.x + dx || shape.x,
                    this.originalPositions.find(p => p === shape)?.y + dy || shape.y
                );
            });
        }
    }

    onMouseUp(e) {
        if (this.isMarquee) {
            this.isMarquee = false;
            this.marqueeStart = null;
            this.marqueeEnd = null;
        } else if (this.isDrawing && this.originalPositions.length > 0) {
            // Create move command for undo
            const newPositions = Array.from(this.state.selectedShapes).map(s => ({
                x: s.x, y: s.y
            }));
            
            const command = new MoveShapeCommand(
                Array.from(this.state.selectedShapes),
                this.originalPositions,
                newPositions
            );
            this.commandManager.execute(command);
        }
        
        this.isDrawing = false;
        this.dragStartPos = null;
        this.dragOffset = null;
        this.originalPositions = [];
        this.renderer.render();
    }

    updateMarqueeSelection() {
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
    }

    renderMarquee(ctx) {
        if (!this.isMarquee || !this.marqueeStart || !this.marqueeEnd) return;
        
        ctx.save();
        ctx.scale(this.state.zoom, this.state.zoom);
        ctx.translate(this.state.panX, this.state.panY);
        
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










// Update to CanvasRenderer.js - Add marquee rendering in render method
/*
Add this line at the end of the render() method:

// Render marquee selection if active
if (this.state.currentTool === 'select') {
    const selectTool = this.toolManager?.tools?.get('select');
    if (selectTool && selectTool.isMarquee) {
        selectTool.renderMarquee(this.ctx);
    }
}
*/

// Keyboard shortcuts for copy/paste (add to DrawingApp.js bindUIEvents)
/*
case 'c':
    if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        this.clipboardManager.copy();
        this.updateStatusText('Copied to clipboard');
    }
    break;
case 'v':
    if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (this.clipboardManager.paste()) {
            this.updateStatusText('Pasted from clipboard');
        }
    }
    break;
case 'x':
    if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (this.clipboardManager.cut()) {
            this.updateStatusText('Cut to clipboard');
        }
    }
    break;
case 'd':
    if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (this.clipboardManager.duplicate()) {
            this.updateStatusText('Duplicated selection');
        }
    }
    break;
case 'z':
    if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (e.shiftKey) {
            this.commandManager.redo();
        } else {
            this.commandManager.undo();
        }
    }
    break;
*/