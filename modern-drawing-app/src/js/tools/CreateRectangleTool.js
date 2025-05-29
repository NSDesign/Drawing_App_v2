// src/js/tools/CreateRectangleTool.js - Rectangle Creation Tool

import { BaseTool } from './ToolManager.js';

/**
 * Tool for creating rectangle shapes
 */
export class CreateRectangleTool extends BaseTool {
    constructor(name, options = {}) {
        super(name, {
            cursor: 'crosshair',
            description: 'Create rectangles',
            shortcut: 'R',
            ...options
        });
        
        // Shape creation state
        this.isCreating = false;
        this.previewShape = null;
        this.createdShape = null;
        
        // Tool properties
        this.properties = {
            fillColor: 'rgba(135, 206, 235, 0.5)', // Light blue
            strokeColor: '#000000',
            strokeWidth: 2,
            fromCenter: false,
            maintainAspectRatio: false,
            roundedCorners: false,
            cornerRadius: 0
        };
        
        // Minimum size for shape creation
        this.minSize = 5;
    }

    /**
     * Activate the rectangle creation tool
     */
    onActivate() {
        // Subscribe to canvas rendering for preview
        this.eventManager.on('canvas:render-overlay', this.renderPreview.bind(this));
        
        // Update cursor
        this.setCursor();
    }

    /**
     * Deactivate the rectangle creation tool
     */
    onDeactivate() {
        // Clean up any preview
        this.cancelCreation();
        
        // Unsubscribe from events
        this.eventManager.off('canvas:render-overlay', this.renderPreview);
    }

    /**
     * Handle mouse down - start creating rectangle
     */
    handleMouseDown(event, point) {
        // Start creating new rectangle
        this.startCreation(point, event);
        return true;
    }

    /**
     * Handle mouse drag - update rectangle size
     */
    handleMouseDrag(event, point, startPoint) {
        if (this.isCreating) {
            this.updateCreation(point, event);
            
            // Request overlay re-render for preview
            this.canvasManager.markLayerDirty('overlay');
        }
        return true;
    }

    /**
     * Handle mouse up - finish creating rectangle
     */
    handleMouseUp(event, point, startPoint) {
        if (this.isCreating) {
            this.finishCreation(point, event);
        }
        return true;
    }

    /**
     * Handle key down events
     */
    handleKeyDown(event) {
        if (this.isCreating) {
            switch (event.code) {
                case 'Escape':
                    this.cancelCreation();
                    return true;
                case 'ShiftKey':
                    // Enable aspect ratio constraint
                    this.properties.maintainAspectRatio = true;
                    this.updateCreation(this.currentPoint, event);
                    this.canvasManager.markLayerDirty('overlay');
                    return true;
            }
        }
        return false;
    }

    /**
     * Handle key up events
     */
    handleKeyUp(event) {
        if (this.isCreating) {
            switch (event.code) {
                case 'ShiftKey':
                    // Disable aspect ratio constraint
                    this.properties.maintainAspectRatio = false;
                    this.updateCreation(this.currentPoint, event);
                    this.canvasManager.markLayerDirty('overlay');
                    return true;
            }
        }
        return false;
    }

    /**
     * Start rectangle creation
     */
    startCreation(point, event) {
        this.isCreating = true;
        this.startPoint = point;
        this.currentPoint = point;
        
        // Apply snap to grid if enabled
        const snappedPoint = this.applySnapToGrid(point);
        this.startPoint = snappedPoint;
        this.currentPoint = snappedPoint;
        
        // Create preview shape data
        this.previewShape = this.createShapeData(this.startPoint, this.currentPoint);
        
        // Emit creation start event
        this.eventManager.emit('shape:creation-started', {
            tool: this.name,
            point: snappedPoint
        });
    }

    /**
     * Update rectangle creation
     */
    updateCreation(point, event) {
        if (!this.isCreating) return;
        
        this.currentPoint = point;
        
        // Apply snap to grid if enabled
        const snappedPoint = this.applySnapToGrid(point);
        this.currentPoint = snappedPoint;
        
        // Update preview shape
        this.previewShape = this.createShapeData(this.startPoint, this.currentPoint, event);
        
        // Emit creation update event
        this.eventManager.emit('shape:creation-updated', {
            tool: this.name,
            startPoint: this.startPoint,
            currentPoint: snappedPoint,
            previewData: this.previewShape
        });
    }

    /**
     * Finish rectangle creation
     */
    finishCreation(point, event) {
        if (!this.isCreating) return;
        
        const finalPoint = this.applySnapToGrid(point);
        const shapeData = this.createShapeData(this.startPoint, finalPoint, event);
        
        // Check if shape is large enough
        if (shapeData.width < this.minSize || shapeData.height < this.minSize) {
            // Create default size rectangle at click point
            shapeData.width = Math.max(shapeData.width, 50);
            shapeData.height = Math.max(shapeData.height, 50);
        }
        
        // Create the actual shape
        this.createdShape = this.shapeManager.createShape({
            type: 'rectangle',
            ...shapeData,
            ...this.properties
        });
        
        // Create command for undo/redo
        const CreateCommand = class extends this.commandManager.constructor.Command {
            constructor(shapeManager, shapeData, createdShape) {
                super('Create Rectangle');
                this.shapeManager = shapeManager;
                this.shapeData = shapeData;
                this.createdShape = createdShape;
            }
            
            execute() {
                if (!this.shapeManager.hasShape(this.createdShape.id)) {
                    this.shapeManager.addShape(this.createdShape);
                }
            }
            
            undo() {
                this.shapeManager.removeShape(this.createdShape.id);
            }
        };
        
        const command = new CreateCommand(this.shapeManager, shapeData, this.createdShape);
        this.commandManager.executeCommand(command);
        
        // Clean up creation state
        this.isCreating = false;
        this.previewShape = null;
        this.startPoint = null;
        this.currentPoint = null;
        
        // Emit creation finished event
        this.eventManager.emit('shape:created', {
            shape: this.createdShape,
            tool: this.name
        });
        
        // Clear overlay
        this.canvasManager.markLayerDirty('overlay');
        
        // Mark draw layer as dirty
        this.canvasManager.markLayerDirty('draw');
    }

    /**
     * Cancel rectangle creation
     */
    cancelCreation() {
        if (this.isCreating) {
            this.isCreating = false;
            this.previewShape = null;
            this.startPoint = null;
            this.currentPoint = null;
            
            // Clear overlay
            this.canvasManager.markLayerDirty('overlay');
            
            // Emit creation cancelled event
            this.eventManager.emit('shape:creation-cancelled', {
                tool: this.name
            });
        }
    }

    /**
     * Create shape data from start and current points
     */
    createShapeData(startPoint, currentPoint, event = null) {
        let { x: startX, y: startY } = startPoint;
        let { x: currentX, y: currentY } = currentPoint;
        
        // Calculate bounds
        let x = Math.min(startX, currentX);
        let y = Math.min(startY, currentY);
        let width = Math.abs(currentX - startX);
        let height = Math.abs(currentY - startY);
        
        // Handle "from center" mode
        if (this.properties.fromCenter) {
            const centerX = startX;
            const centerY = startY;
            const halfWidth = Math.abs(currentX - startX);
            const halfHeight = Math.abs(currentY - startY);
            
            x = centerX - halfWidth;
            y = centerY - halfHeight;
            width = halfWidth * 2;
            height = halfHeight * 2;
        }
        
        // Maintain aspect ratio if shift is held or property is set
        if (this.properties.maintainAspectRatio || (event && event.shiftKey)) {
            const size = Math.min(width, height);
            width = size;
            height = size;
            
            // Adjust position to maintain correct anchor point
            if (!this.properties.fromCenter) {
                if (currentX < startX) x = startX - width;
                if (currentY < startY) y = startY - height;
            }
        }
        
        return {
            x: Math.round(x),
            y: Math.round(y),
            width: Math.round(width),
            height: Math.round(height)
        };
    }

    /**
     * Apply snap to grid if enabled
     */
    applySnapToGrid(point) {
        const state = this.stateManager.getState();
        
        if (state.canvas?.snapToGrid) {
            const gridSize = state.canvas.gridSize || 20;
            return {
                x: Math.round(point.x / gridSize) * gridSize,
                y: Math.round(point.y / gridSize) * gridSize
            };
        }
        
        return point;
    }

    /**
     * Render preview rectangle
     */
    renderPreview(event) {
        if (!this.isCreating || !this.previewShape) return;
        
        const { context } = event.data;
        const { x, y, width, height } = this.previewShape;
        
        context.save();
        
        // Set preview styles
        context.fillStyle = this.properties.fillColor;
        context.strokeStyle = this.properties.strokeColor;
        context.lineWidth = this.properties.strokeWidth;
        context.setLineDash([5, 5]); // Dashed line for preview
        
        // Draw preview rectangle
        if (this.properties.roundedCorners && this.properties.cornerRadius > 0) {
            this.drawRoundedRect(context, x, y, width, height, this.properties.cornerRadius);
        } else {
            context.fillRect(x, y, width, height);
            context.strokeRect(x, y, width, height);
        }
        
        context.restore();
        
        // Draw creation info
        this.drawCreationInfo(context);
    }

    /**
     * Draw rounded rectangle
     */
    drawRoundedRect(context, x, y, width, height, radius) {
        context.beginPath();
        context.moveTo(x + radius, y);
        context.lineTo(x + width - radius, y);
        context.quadraticCurveTo(x + width, y, x + width, y + radius);
        context.lineTo(x + width, y + height - radius);
        context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        context.lineTo(x + radius, y + height);
        context.quadraticCurveTo(x, y + height, x, y + height - radius);
        context.lineTo(x, y + radius);
        context.quadraticCurveTo(x, y, x + radius, y);
        context.closePath();
        context.fill();
        context.stroke();
    }

    /**
     * Draw creation information
     */
    drawCreationInfo(context) {
        if (!this.previewShape) return;
        
        const { width, height } = this.previewShape;
        const text = `${Math.round(width)} × ${Math.round(height)}`;
        
        context.save();
        context.font = '12px system-ui, -apple-system, sans-serif';
        context.fillStyle = '#000000';
        context.strokeStyle = '#ffffff';
        context.lineWidth = 3;
        
        // Position text near current mouse position
        const textX = this.currentPoint.x + 10;
        const textY = this.currentPoint.y - 10;
        
        // Draw text with outline for better visibility
        context.strokeText(text, textX, textY);
        context.fillText(text, textX, textY);
        
        context.restore();
    }

    /**
     * Get tool properties for UI
     */
    getProperties() {
        return {
            ...this.properties,
            isCreating: this.isCreating,
            minSize: this.minSize
        };
    }

    /**
     * Set tool properties from UI
     */
    setProperties(properties) {
        // Update properties
        Object.assign(this.properties, properties);
        
        // If currently creating, update preview
        if (this.isCreating && this.currentPoint) {
            this.updateCreation(this.currentPoint);
            this.canvasManager.markLayerDirty('overlay');
        }
        
        // Emit properties changed event
        this.eventManager.emit('tool:properties-changed', {
            tool: this.name,
            properties: this.properties
        });
    }

    /**
     * Get tool-specific UI controls
     */
    getUIControls() {
        return [
            {
                type: 'color',
                property: 'fillColor',
                label: 'Fill Color',
                value: this.properties.fillColor
            },
            {
                type: 'color',
                property: 'strokeColor',
                label: 'Stroke Color',
                value: this.properties.strokeColor
            },
            {
                type: 'number',
                property: 'strokeWidth',
                label: 'Stroke Width',
                value: this.properties.strokeWidth,
                min: 0,
                max: 20,
                step: 1
            },
            {
                type: 'checkbox',
                property: 'fromCenter',
                label: 'From Center',
                value: this.properties.fromCenter
            },
            {
                type: 'checkbox',
                property: 'maintainAspectRatio',
                label: 'Square (1:1)',
                value: this.properties.maintainAspectRatio
            },
            {
                type: 'checkbox',
                property: 'roundedCorners',
                label: 'Rounded Corners',
                value: this.properties.roundedCorners
            },
            {
                type: 'number',
                property: 'cornerRadius',
                label: 'Corner Radius',
                value: this.properties.cornerRadius,
                min: 0,
                max: 50,
                step: 1,
                disabled: !this.properties.roundedCorners
            }
        ];
    }

    /**
     * Cleanup method
     */
    cleanup() {
        super.cleanup();
        this.cancelCreation();
    }
}

// Export additional create tools for other shapes
export class CreateEllipseTool extends BaseTool {
    constructor(name, options = {}) {
        super(name, {
            cursor: 'crosshair',
            description: 'Create ellipses and circles',
            shortcut: 'E',
            ...options
        });
        // Similar implementation to CreateRectangleTool but for ellipses
    }
}

export class CreateLineTool extends BaseTool {
    constructor(name, options = {}) {
        super(name, {
            cursor: 'crosshair',
            description: 'Create lines',
            shortcut: 'L',
            ...options
        });
        // Implementation for line creation
    }
}

export class CreateTextTool extends BaseTool {
    constructor(name, options = {}) {
        super(name, {
            cursor: 'text',
            description: 'Create text',
            shortcut: 'T',
            ...options
        });
        // Implementation for text creation
    }
}

export class ZoomTool extends BaseTool {
    constructor(name, options = {}) {
        super(name, {
            cursor: 'zoom-in',
            description: 'Zoom in/out',
            shortcut: 'Z',
            ...options
        });
        // Implementation for zoom functionality
    }
}

export class PanTool extends BaseTool {
    constructor(name, options = {}) {
        super(name, {
            cursor: 'move',
            description: 'Pan the canvas',
            shortcut: 'P',
            ...options
        });
        // Implementation for pan functionality
    }
}