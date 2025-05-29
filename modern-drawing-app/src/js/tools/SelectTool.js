// src/js/tools/SelectTool.js - Object Selection Tool

import { BaseTool } from './ToolManager.js';

/**
 * Selection tool for selecting and manipulating shapes
 */
export class SelectTool extends BaseTool {
    constructor(name, options = {}) {
        super(name, {
            cursor: 'default',
            description: 'Select and move objects',
            shortcut: 'Q',
            ...options
        });
        
        this.mode = options.mode || 'object'; // 'object' or 'element'
        this.selectedShapes = new Set();
        this.hoveredShape = null;
        this.isDraggingSelection = false;
        this.dragOffset = { x: 0, y: 0 };
        this.selectionBounds = null;
        this.resizeHandle = null;
        this.isResizing = false;
        
        // Selection rectangle for multi-select
        this.selectionRect = null;
        this.isDrawingSelection = false;
        
        // Configuration
        this.multiSelectKey = 'shiftKey';
        this.handleSize = 8;
        this.snapThreshold = 5;
    }

    /**
     * Activate the selection tool
     */
    onActivate() {
        // Subscribe to shape events
        this.eventManager.on('shape:created', this.handleShapeCreated.bind(this));
        this.eventManager.on('shape:deleted', this.handleShapeDeleted.bind(this));
        
        // Subscribe to canvas rendering
        this.eventManager.on('canvas:render-overlay', this.renderSelectionOverlay.bind(this));
        
        // Update cursor based on hover state
        this.eventManager.on('canvas:render-draw', () => {
            this.canvasManager.markLayerDirty('overlay');
        });
    }

    /**
     * Deactivate the selection tool
     */
    onDeactivate() {
        this.clearSelection();
        this.eventManager.off('shape:created', this.handleShapeCreated);
        this.eventManager.off('shape:deleted', this.handleShapeDeleted);
        this.eventManager.off('canvas:render-overlay', this.renderSelectionOverlay);
    }

    /**
     * Handle mouse down event
     */
    handleMouseDown(event, point) {
        const hitResult = this.performHitTest(point);
        
        if (hitResult) {
            this.handleShapeMouseDown(event, hitResult, point);
        } else {
            this.handleEmptyAreaMouseDown(event, point);
        }
        
        return true;
    }

    /**
     * Handle mouse down on a shape
     */
    handleShapeMouseDown(event, hitResult, point) {
        const { shape, handleType } = hitResult;
        
        if (handleType === 'resize') {
            // Start resizing
            this.startResize(shape, handleType, point);
        } else if (handleType === 'move' || !handleType) {
            // Start moving
            this.startMove(shape, point, event[this.multiSelectKey]);
        }
    }

    /**
     * Handle mouse down on empty area
     */
    handleEmptyAreaMouseDown(event, point) {
        if (!event[this.multiSelectKey]) {
            this.clearSelection();
        }
        
        // Start selection rectangle
        this.startSelectionRect(point);
    }

    /**
     * Handle mouse drag event
     */
    handleMouseDrag(event, point, startPoint) {
        if (this.isResizing) {
            this.updateResize(point);
        } else if (this.isDraggingSelection) {
            this.updateMove(point);
        } else if (this.isDrawingSelection) {
            this.updateSelectionRect(point);
        }
        
        // Request overlay re-render
        this.canvasManager.markLayerDirty('overlay');
        
        return true;
    }

    /**
     * Handle mouse move event (no drag)
     */
    handleMouseMove(event, point) {
        // Update hover state
        const hitResult = this.performHitTest(point);
        this.updateHoverState(hitResult);
        
        // Update cursor
        this.updateCursor(hitResult);
        
        return false;
    }

    /**
     * Handle mouse up event
     */
    handleMouseUp(event, point, startPoint) {
        if (this.isResizing) {
            this.finishResize();
        } else if (this.isDraggingSelection) {
            this.finishMove();
        } else if (this.isDrawingSelection) {
            this.finishSelectionRect();
        }
        
        // Clear overlay
        this.canvasManager.markLayerDirty('overlay');
        
        return true;
    }

    /**
     * Handle key down event
     */
    handleKeyDown(event) {
        switch (event.code) {
            case 'Delete':
            case 'Backspace':
                this.deleteSelected();
                return true;
            case 'KeyA':
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    this.selectAll();
                    return true;
                }
                break;
            case 'Escape':
                this.clearSelection();
                return true;
        }
        return false;
    }

    /**
     * Perform hit test to find shape under point
     */
    performHitTest(point) {
        // First check resize handles if we have selection
        if (this.selectedShapes.size > 0) {
            const handleResult = this.hitTestResizeHandles(point);
            if (handleResult) {
                return handleResult;
            }
        }
        
        // Then check shapes (in reverse order for proper z-index)
        const shapes = this.shapeManager.getAllShapes().reverse();
        
        for (const shape of shapes) {
            if (this.mode === 'object') {
                if (shape.hitTest(point)) {
                    return { shape, handleType: 'move' };
                }
            } else if (this.mode === 'element') {
                // Test individual elements (points, segments)
                const elementResult = shape.hitTestElements(point);
                if (elementResult) {
                    return { shape, ...elementResult };
                }
            }
        }
        
        return null;
    }

    /**
     * Hit test resize handles
     */
    hitTestResizeHandles(point) {
        if (!this.selectionBounds) return null;
        
        const handles = this.getResizeHandles();
        const threshold = this.handleSize / 2;
        
        for (const handle of handles) {
            const dx = point.x - handle.x;
            const dy = point.y - handle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= threshold) {
                return {
                    shape: Array.from(this.selectedShapes)[0], // For now, single selection
                    handleType: 'resize',
                    handle: handle.type
                };
            }
        }
        
        return null;
    }

    /**
     * Get resize handles for current selection
     */
    getResizeHandles() {
        if (!this.selectionBounds) return [];
        
        const { x, y, width, height } = this.selectionBounds;
        const handles = [
            { type: 'nw', x: x, y: y },
            { type: 'n', x: x + width / 2, y: y },
            { type: 'ne', x: x + width, y: y },
            { type: 'e', x: x + width, y: y + height / 2 },
            { type: 'se', x: x + width, y: y + height },
            { type: 's', x: x + width / 2, y: y + height },
            { type: 'sw', x: x, y: y + height },
            { type: 'w', x: x, y: y + height / 2 }
        ];
        
        return handles;
    }

    /**
     * Start moving selected shapes
     */
    startMove(shape, point, multiSelect) {
        // Handle selection
        if (!this.selectedShapes.has(shape)) {
            if (!multiSelect) {
                this.clearSelection();
            }
            this.addToSelection(shape);
        }
        
        // Calculate drag offset
        this.dragOffset = {
            x: point.x - shape.getBounds().x,
            y: point.y - shape.getBounds().y
        };
        
        this.isDraggingSelection = true;
        
        // Store original positions for undo
        this.originalPositions = new Map();
        this.selectedShapes.forEach(shape => {
            const bounds = shape.getBounds();
            this.originalPositions.set(shape, { x: bounds.x, y: bounds.y });
        });
    }

    /**
     * Update move operation
     */
    updateMove(point) {
        if (!this.isDraggingSelection) return;
        
        const deltaX = point.x - this.dragOffset.x - this.originalPositions.get(Array.from(this.selectedShapes)[0]).x;
        const deltaY = point.y - this.dragOffset.y - this.originalPositions.get(Array.from(this.selectedShapes)[0]).y;
        
        // Apply snap to grid if enabled
        const state = this.stateManager.getState();
        let snapDeltaX = deltaX;
        let snapDeltaY = deltaY;
        
        if (state.canvas?.snapToGrid) {
            const gridSize = state.canvas.gridSize || 20;
            snapDeltaX = Math.round(deltaX / gridSize) * gridSize;
            snapDeltaY = Math.round(deltaY / gridSize) * gridSize;
        }
        
        // Move all selected shapes
        this.selectedShapes.forEach(shape => {
            const original = this.originalPositions.get(shape);
            shape.setPosition(original.x + snapDeltaX, original.y + snapDeltaY);
        });
        
        // Update selection bounds
        this.updateSelectionBounds();
        
        // Mark canvas as dirty
        this.canvasManager.markLayerDirty('draw');
    }

    /**
     * Finish move operation
     */
    finishMove() {
        if (!this.isDraggingSelection) return;
        
        // Create move command for undo/redo
        if (this.originalPositions.size > 0) {
            const moveCommands = [];
            this.selectedShapes.forEach(shape => {
                const original = this.originalPositions.get(shape);
                const current = shape.getBounds();
                
                if (original.x !== current.x || original.y !== current.y) {
                    const MoveCommand = this.commandManager.constructor.MoveShapeCommand || 
                        class extends this.commandManager.constructor.Command {
                            constructor() { super('Move Shape'); }
                            execute() { shape.setPosition(current.x, current.y); }
                            undo() { shape.setPosition(original.x, original.y); }
                        };
                    
                    moveCommands.push(new MoveCommand());
                }
            });
            
            if (moveCommands.length > 0) {
                const CompositeCommand = this.commandManager.constructor.CompositeCommand;
                const compositeCommand = new CompositeCommand(moveCommands, 'Move Shapes');
                // Command already executed, just add to history
                this.commandManager.executeCommand(compositeCommand);
            }
        }
        
        this.isDraggingSelection = false;
        this.originalPositions.clear();
    }

    /**
     * Start resize operation
     */
    startResize(shape, handleType, point) {
        this.isResizing = true;
        this.resizeHandle = handleType;
        this.resizeStartPoint = point;
        this.resizeOriginalBounds = shape.getBounds();
    }

    /**
     * Update resize operation
     */
    updateResize(point) {
        if (!this.isResizing || this.selectedShapes.size !== 1) return;
        
        const shape = Array.from(this.selectedShapes)[0];
        const original = this.resizeOriginalBounds;
        const dx = point.x - this.resizeStartPoint.x;
        const dy = point.y - this.resizeStartPoint.y;
        
        let newBounds = { ...original };
        
        // Calculate new bounds based on handle type
        switch (this.resizeHandle) {
            case 'nw':
                newBounds.x = original.x + dx;
                newBounds.y = original.y + dy;
                newBounds.width = original.width - dx;
                newBounds.height = original.height - dy;
                break;
            case 'n':
                newBounds.y = original.y + dy;
                newBounds.height = original.height - dy;
                break;
            case 'ne':
                newBounds.y = original.y + dy;
                newBounds.width = original.width + dx;
                newBounds.height = original.height - dy;
                break;
            case 'e':
                newBounds.width = original.width + dx;
                break;
            case 'se':
                newBounds.width = original.width + dx;
                newBounds.height = original.height + dy;
                break;
            case 's':
                newBounds.height = original.height + dy;
                break;
            case 'sw':
                newBounds.x = original.x + dx;
                newBounds.width = original.width - dx;
                newBounds.height = original.height + dy;
                break;
            case 'w':
                newBounds.x = original.x + dx;
                newBounds.width = original.width - dx;
                break;
        }
        
        // Ensure minimum size
        const minSize = 10;
        if (newBounds.width < minSize) {
            newBounds.width = minSize;
            if (this.resizeHandle.includes('w')) {
                newBounds.x = original.x + original.width - minSize;
            }
        }
        if (newBounds.height < minSize) {
            newBounds.height = minSize;
            if (this.resizeHandle.includes('n')) {
                newBounds.y = original.y + original.height - minSize;
            }
        }
        
        // Apply new bounds to shape
        shape.setBounds(newBounds);
        
        // Update selection bounds
        this.updateSelectionBounds();
        
        // Mark canvas as dirty
        this.canvasManager.markLayerDirty('draw');
    }

    /**
     * Finish resize operation
     */
    finishResize() {
        this.isResizing = false;
        this.resizeHandle = null;
        this.resizeStartPoint = null;
        this.resizeOriginalBounds = null;
    }

    /**
     * Start selection rectangle
     */
    startSelectionRect(point) {
        this.selectionRect = {
            startX: point.x,
            startY: point.y,
            endX: point.x,
            endY: point.y
        };
        this.isDrawingSelection = true;
    }

    /**
     * Update selection rectangle
     */
    updateSelectionRect(point) {
        if (!this.selectionRect) return;
        
        this.selectionRect.endX = point.x;
        this.selectionRect.endY = point.y;
    }

    /**
     * Finish selection rectangle
     */
    finishSelectionRect() {
        if (!this.selectionRect) return;
        
        // Find shapes within selection rectangle
        const rect = this.normalizeRect(this.selectionRect);
        const shapesInRect = this.shapeManager.getAllShapes().filter(shape => {
            return this.isShapeInRect(shape, rect);
        });
        
        // Add to selection
        shapesInRect.forEach(shape => this.addToSelection(shape));
        
        this.selectionRect = null;
        this.isDrawingSelection = false;
    }

    /**
     * Add shape to selection
     */
    addToSelection(shape) {
        this.selectedShapes.add(shape);
        shape.setSelected(true);
        this.updateSelectionBounds();
        
        this.eventManager.emit('shape:selected', {
            shapes: Array.from(this.selectedShapes)
        });
    }

    /**
     * Remove shape from selection
     */
    removeFromSelection(shape) {
        this.selectedShapes.delete(shape);
        shape.setSelected(false);
        this.updateSelectionBounds();
        
        if (this.selectedShapes.size === 0) {
            this.eventManager.emit('shape:deselected');
        } else {
            this.eventManager.emit('shape:selected', {
                shapes: Array.from(this.selectedShapes)
            });
        }
    }

    /**
     * Clear all selection
     */
    clearSelection() {
        this.selectedShapes.forEach(shape => shape.setSelected(false));
        this.selectedShapes.clear();
        this.selectionBounds = null;
        
        this.eventManager.emit('shape:deselected');
        this.canvasManager.markLayerDirty('overlay');
    }

    /**
     * Select all shapes
     */
    selectAll() {
        this.clearSelection();
        const allShapes = this.shapeManager.getAllShapes();
        allShapes.forEach(shape => this.addToSelection(shape));
    }

    /**
     * Delete selected shapes
     */
    deleteSelected() {
        if (this.selectedShapes.size === 0) return;
        
        const shapesToDelete = Array.from(this.selectedShapes);
        this.clearSelection();
        
        // Create delete commands
        const deleteCommands = shapesToDelete.map(shape => {
            const DeleteCommand = class extends this.commandManager.constructor.Command {
                constructor() { super('Delete Shape'); }
                execute() { this.shapeManager.removeShape(shape.id); }
                undo() { this.shapeManager.addShape(shape); }
            };
            return new DeleteCommand();
        });
        
        const CompositeCommand = this.commandManager.constructor.CompositeCommand;
        const compositeCommand = new CompositeCommand(deleteCommands, 'Delete Shapes');
        this.commandManager.executeCommand(compositeCommand);
    }

    /**
     * Update selection bounds
     */
    updateSelectionBounds() {
        if (this.selectedShapes.size === 0) {
            this.selectionBounds = null;
            return;
        }
        
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        
        this.selectedShapes.forEach(shape => {
            const bounds = shape.getBounds();
            minX = Math.min(minX, bounds.x);
            minY = Math.min(minY, bounds.y);
            maxX = Math.max(maxX, bounds.x + bounds.width);
            maxY = Math.max(maxY, bounds.y + bounds.height);
        });
        
        this.selectionBounds = {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }

    /**
     * Update hover state
     */
    updateHoverState(hitResult) {
        const newHovered = hitResult?.shape || null;
        
        if (this.hoveredShape !== newHovered) {
            if (this.hoveredShape) {
                this.hoveredShape.setHovered(false);
            }
            
            this.hoveredShape = newHovered;
            
            if (this.hoveredShape) {
                this.hoveredShape.setHovered(true);
            }
            
            this.canvasManager.markLayerDirty('overlay');
        }
    }

    /**
     * Update cursor based on hit result
     */
    updateCursor(hitResult) {
        let cursor = 'default';
        
        if (hitResult) {
            if (hitResult.handleType === 'resize') {
                cursor = this.getResizeCursor(hitResult.handle);
            } else if (hitResult.handleType === 'move') {
                cursor = 'move';
            } else {
                cursor = 'pointer';
            }
        }
        
        const drawLayer = this.canvasManager.getLayer('draw');
        if (drawLayer) {
            drawLayer.canvas.style.cursor = cursor;
        }
    }

    /**
     * Get cursor for resize handle
     */
    getResizeCursor(handleType) {
        const cursors = {
            'nw': 'nw-resize',
            'n': 'n-resize',
            'ne': 'ne-resize',
            'e': 'e-resize',
            'se': 'se-resize',
            's': 's-resize',
            'sw': 'sw-resize',
            'w': 'w-resize'
        };
        return cursors[handleType] || 'default';
    }

    /**
     * Render selection overlay
     */
    renderSelectionOverlay(event) {
        const { context } = event.data;
        
        // Render selection bounds and handles
        if (this.selectionBounds) {
            this.renderSelectionBounds(context);
            this.renderResizeHandles(context);
        }
        
        // Render selection rectangle
        if (this.selectionRect && this.isDrawingSelection) {
            this.renderSelectionRect(context);
        }
    }

    /**
     * Render selection bounds
     */
    renderSelectionBounds(context) {
        const { x, y, width, height } = this.selectionBounds;
        
        context.save();
        context.strokeStyle = '#007bff';
        context.lineWidth = 1;
        context.setLineDash([5, 5]);
        context.strokeRect(x, y, width, height);
        context.restore();
    }

    /**
     * Render resize handles
     */
    renderResizeHandles(context) {
        const handles = this.getResizeHandles();
        const size = this.handleSize;
        
        context.save();
        context.fillStyle = '#007bff';
        context.strokeStyle = '#ffffff';
        context.lineWidth = 1;
        
        handles.forEach(handle => {
            context.fillRect(handle.x - size/2, handle.y - size/2, size, size);
            context.strokeRect(handle.x - size/2, handle.y - size/2, size, size);
        });
        
        context.restore();
    }

    /**
     * Render selection rectangle
     */
    renderSelectionRect(context) {
        const rect = this.normalizeRect(this.selectionRect);
        
        context.save();
        context.strokeStyle = '#007bff';
        context.fillStyle = 'rgba(0, 123, 255, 0.1)';
        context.lineWidth = 1;
        context.setLineDash([3, 3]);
        
        context.fillRect(rect.x, rect.y, rect.width, rect.height);
        context.strokeRect(rect.x, rect.y, rect.width, rect.height);
        
        context.restore();
    }

    /**
     * Normalize rectangle coordinates
     */
    normalizeRect(rect) {
        return {
            x: Math.min(rect.startX, rect.endX),
            y: Math.min(rect.startY, rect.endY),
            width: Math.abs(rect.endX - rect.startX),
            height: Math.abs(rect.endY - rect.startY)
        };
    }

    /**
     * Check if shape is within rectangle
     */
    isShapeInRect(shape, rect) {
        const bounds = shape.getBounds();
        return bounds.x >= rect.x && 
               bounds.y >= rect.y &&
               bounds.x + bounds.width <= rect.x + rect.width &&
               bounds.y + bounds.height <= rect.y + rect.height;
    }

    /**
     * Handle shape created event
     */
    handleShapeCreated(event) {
        // Auto-select newly created shapes
        const { shape } = event.data;
        this.clearSelection();
        this.addToSelection(shape);
    }

    /**
     * Handle shape deleted event
     */
    handleShapeDeleted(event) {
        const { shape } = event.data;
        this.removeFromSelection(shape);
    }

    /**
     * Get tool properties
     */
    getProperties() {
        return {
            mode: this.mode,
            multiSelectKey: this.multiSelectKey,
            snapThreshold: this.snapThreshold,
            selectedCount: this.selectedShapes.size
        };
    }

    /**
     * Set tool properties
     */
    setProperties(properties) {
        if (properties.mode !== undefined) {
            this.mode = properties.mode;
        }
        if (properties.multiSelectKey !== undefined) {
            this.multiSelectKey = properties.multiSelectKey;
        }
        if (properties.snapThreshold !== undefined) {
            this.snapThreshold = properties.snapThreshold;
        }
    }
}