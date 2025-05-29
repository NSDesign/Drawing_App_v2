// src/js/shapes/ShapeManager.js - Shape Management System

import { Rectangle } from './Rectangle.js';
import { Ellipse } from './Ellipse.js';
import { Line } from './Line.js';
import { Text } from './Text.js';

/**
 * Manages all shapes in the drawing application
 */
export class ShapeManager {
    constructor({ canvasManager, eventManager, stateManager, commandManager }) {
        this.canvasManager = canvasManager;
        this.eventManager = eventManager;
        this.stateManager = stateManager;
        this.commandManager = commandManager;
        
        // Shape storage
        this.shapes = new Map();
        this.shapeOrder = []; // Z-order for rendering
        this.nextId = 1;
        
        // Shape registry for different types
        this.shapeTypes = new Map();
        
        // Selection and interaction
        this.selectedShapes = new Set();
        this.hoveredShape = null;
        
        // Performance optimization
        this.renderCache = new Map();
        this.dirtyShapes = new Set();
        
        // Bind methods
        this.handleCanvasRender = this.handleCanvasRender.bind(this);
    }

    /**
     * Initialize shape manager
     */
    async initialize() {
        console.log('Initializing ShapeManager...');
        
        // Register built-in shape types
        this.registerBuiltInShapes();
        
        // Setup event listeners
        this.setupEventListeners();
        
        console.log('ShapeManager initialized');
    }

    /**
     * Register built-in shape types
     */
    registerBuiltInShapes() {
        this.registerShapeType('rectangle', Rectangle);
        this.registerShapeType('ellipse', Ellipse);
        this.registerShapeType('line', Line);
        this.registerShapeType('text', Text);
    }

    /**
     * Register a new shape type
     */
    registerShapeType(type, ShapeClass) {
        if (typeof ShapeClass !== 'function') {
            throw new Error('Shape class must be a constructor function');
        }
        
        this.shapeTypes.set(type, ShapeClass);
        this.eventManager.emit('shape-type:registered', { type, ShapeClass });
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Canvas rendering
        this.eventManager.on('canvas:render-draw', this.handleCanvasRender);
        
        // State changes that affect shapes
        this.stateManager.subscribe('canvas', this.handleCanvasStateChange.bind(this));
    }

    /**
     * Create a new shape
     */
    createShape(shapeData) {
        const { type, ...properties } = shapeData;
        
        // Get shape class
        const ShapeClass = this.shapeTypes.get(type);
        if (!ShapeClass) {
            throw new Error(`Unknown shape type: ${type}`);
        }
        
        // Generate unique ID
        const id = this.generateId();
        
        // Create shape instance
        const shape = new ShapeClass(id, {
            ...properties,
            shapeManager: this,
            eventManager: this.eventManager,
            stateManager: this.stateManager
        });
        
        // Add to collections
        this.shapes.set(id, shape);
        this.shapeOrder.push(id);
        
        // Initialize shape
        shape.initialize();
        
        // Mark as dirty for rendering
        this.markShapeDirty(shape);
        
        // Emit event
        this.eventManager.emit('shape:created', { shape, shapeData });
        
        return shape;
    }

    /**
     * Create shape from serialized data
     */
    createFromData(shapeData) {
        return this.createShape(shapeData);
    }

    /**
     * Add existing shape to manager
     */
    addShape(shape) {
        if (this.shapes.has(shape.id)) {
            console.warn(`Shape with ID ${shape.id} already exists`);
            return false;
        }
        
        this.shapes.set(shape.id, shape);
        this.shapeOrder.push(shape.id);
        
        // Update shape references
        shape.shapeManager = this;
        shape.eventManager = this.eventManager;
        shape.stateManager = this.stateManager;
        
        this.markShapeDirty(shape);
        this.eventManager.emit('shape:added', { shape });
        
        return true;
    }

    /**
     * Remove shape by ID
     */
    removeShape(id) {
        const shape = this.shapes.get(id);
        if (!shape) return false;
        
        // Remove from collections
        this.shapes.delete(id);
        const orderIndex = this.shapeOrder.indexOf(id);
        if (orderIndex > -1) {
            this.shapeOrder.splice(orderIndex, 1);
        }
        
        // Remove from selection
        this.selectedShapes.delete(shape);
        
        // Clear hover state
        if (this.hoveredShape === shape) {
            this.hoveredShape = null;
        }
        
        // Clean up shape
        shape.destroy();
        
        // Clean up caches
        this.renderCache.delete(id);
        this.dirtyShapes.delete(shape);
        
        // Request re-render
        this.canvasManager.markLayerDirty('draw');
        
        // Emit event
        this.eventManager.emit('shape:removed', { shape, id });
        
        return true;
    }

    /**
     * Get shape by ID
     */
    getShape(id) {
        return this.shapes.get(id);
    }

    /**
     * Get all shapes
     */
    getAllShapes() {
        // Return shapes in z-order
        return this.shapeOrder.map(id => this.shapes.get(id)).filter(Boolean);
    }

    /**
     * Get shapes by type
     */
    getShapesByType(type) {
        return Array.from(this.shapes.values()).filter(shape => shape.type === type);
    }

    /**
     * Check if shape exists
     */
    hasShape(id) {
        return this.shapes.has(id);
    }

    /**
     * Clear all shapes
     */
    clear() {
        // Clean up all shapes
        this.shapes.forEach(shape => shape.destroy());
        
        // Clear collections
        this.shapes.clear();
        this.shapeOrder = [];
        this.selectedShapes.clear();
        this.hoveredShape = null;
        this.renderCache.clear();
        this.dirtyShapes.clear();
        
        // Request re-render
        this.canvasManager.markLayerDirty('draw');
        
        // Emit event
        this.eventManager.emit('shapes:cleared');
    }

    /**
     * Move shape in z-order
     */
    moveShapeToFront(shape) {
        const id = shape.id;
        const currentIndex = this.shapeOrder.indexOf(id);
        
        if (currentIndex > -1 && currentIndex < this.shapeOrder.length - 1) {
            this.shapeOrder.splice(currentIndex, 1);
            this.shapeOrder.push(id);
            
            this.canvasManager.markLayerDirty('draw');
            this.eventManager.emit('shape:z-order-changed', { shape, action: 'to-front' });
        }
    }

    /**
     * Move shape to back in z-order
     */
    moveShapeToBack(shape) {
        const id = shape.id;
        const currentIndex = this.shapeOrder.indexOf(id);
        
        if (currentIndex > 0) {
            this.shapeOrder.splice(currentIndex, 1);
            this.shapeOrder.unshift(id);
            
            this.canvasManager.markLayerDirty('draw');
            this.eventManager.emit('shape:z-order-changed', { shape, action: 'to-back' });
        }
    }

    /**
     * Move shape forward one step in z-order
     */
    moveShapeForward(shape) {
        const id = shape.id;
        const currentIndex = this.shapeOrder.indexOf(id);
        
        if (currentIndex > -1 && currentIndex < this.shapeOrder.length - 1) {
            // Swap with next shape
            [this.shapeOrder[currentIndex], this.shapeOrder[currentIndex + 1]] = 
            [this.shapeOrder[currentIndex + 1], this.shapeOrder[currentIndex]];
            
            this.canvasManager.markLayerDirty('draw');
            this.eventManager.emit('shape:z-order-changed', { shape, action: 'forward' });
        }
    }

    /**
     * Move shape backward one step in z-order
     */
    moveShapeBackward(shape) {
        const id = shape.id;
        const currentIndex = this.shapeOrder.indexOf(id);
        
        if (currentIndex > 0) {
            // Swap with previous shape
            [this.shapeOrder[currentIndex], this.shapeOrder[currentIndex - 1]] = 
            [this.shapeOrder[currentIndex - 1], this.shapeOrder[currentIndex]];
            
            this.canvasManager.markLayerDirty('draw');
            this.eventManager.emit('shape:z-order-changed', { shape, action: 'backward' });
        }
    }

    /**
     * Find shapes at point (hit testing)
     */
    getShapesAtPoint(point, options = {}) {
        const {
            tolerance = 0,
            selectedOnly = false,
            visibleOnly = true
        } = options;
        
        const hitShapes = [];
        
        // Test shapes in reverse z-order (front to back)
        for (let i = this.shapeOrder.length - 1; i >= 0; i--) {
            const shape = this.shapes.get(this.shapeOrder[i]);
            if (!shape) continue;
            
            // Skip if filtering by selection
            if (selectedOnly && !this.selectedShapes.has(shape)) continue;
            
            // Skip if filtering by visibility
            if (visibleOnly && !shape.isVisible()) continue;
            
            // Perform hit test
            if (shape.hitTest(point, tolerance)) {
                hitShapes.push(shape);
            }
        }
        
        return hitShapes;
    }

    /**
     * Find shapes in rectangle
     */
    getShapesInRect(rect, options = {}) {
        const {
            fullyContained = false,
            visibleOnly = true
        } = options;
        
        const shapesInRect = [];
        
        this.shapes.forEach(shape => {
            if (visibleOnly && !shape.isVisible()) return;
            
            const bounds = shape.getBounds();
            const intersects = this.rectIntersects(bounds, rect);
            const contained = this.rectContains(rect, bounds);
            
            if ((fullyContained && contained) || (!fullyContained && intersects)) {
                shapesInRect.push(shape);
            }
        });
        
        return shapesInRect;
    }

    /**
     * Check if two rectangles intersect
     */
    rectIntersects(rect1, rect2) {
        return !(rect1.x + rect1.width < rect2.x ||
                rect2.x + rect2.width < rect1.x ||
                rect1.y + rect1.height < rect2.y ||
                rect2.y + rect2.height < rect1.y);
    }

    /**
     * Check if one rectangle contains another
     */
    rectContains(container, contained) {
        return container.x <= contained.x &&
               container.y <= contained.y &&
               container.x + container.width >= contained.x + contained.width &&
               container.y + container.height >= contained.y + contained.height;
    }

    /**
     * Mark shape as dirty for re-rendering
     */
    markShapeDirty(shape) {
        this.dirtyShapes.add(shape);
        this.renderCache.delete(shape.id);
        this.canvasManager.markLayerDirty('draw');
    }

    /**
     * Handle canvas rendering
     */
    handleCanvasRender(event) {
        const { context, transform } = event.data;
        
        // Render shapes in z-order
        this.shapeOrder.forEach(id => {
            const shape = this.shapes.get(id);
            if (shape && shape.isVisible()) {
                this.renderShape(shape, context, transform);
            }
        });
        
        // Clear dirty shapes
        this.dirtyShapes.clear();
    }

    /**
     * Render individual shape
     */
    renderShape(shape, context, transform) {
        try {
            context.save();
            
            // Apply shape-specific transforms
            const shapeTransform = shape.getTransform();
            if (shapeTransform) {
                context.translate(shapeTransform.x || 0, shapeTransform.y || 0);
                context.rotate(shapeTransform.rotation || 0);
                context.scale(shapeTransform.scaleX || 1, shapeTransform.scaleY || 1);
            }
            
            // Render the shape
            shape.render(context);
            
            // Render selection/hover indicators if needed
            if (this.selectedShapes.has(shape)) {
                this.renderSelectionIndicator(shape, context);
            }
            
            if (this.hoveredShape === shape && !this.selectedShapes.has(shape)) {
                this.renderHoverIndicator(shape, context);
            }
            
            context.restore();
            
        } catch (error) {
            console.error(`Error rendering shape ${shape.id}:`, error);
        }
    }

    /**
     * Render selection indicator
     */
    renderSelectionIndicator(shape, context) {
        const bounds = shape.getBounds();
        
        context.save();
        context.strokeStyle = '#007bff';
        context.lineWidth = 2;
        context.setLineDash([5, 5]);
        context.strokeRect(bounds.x - 2, bounds.y - 2, bounds.width + 4, bounds.height + 4);
        context.restore();
    }

    /**
     * Render hover indicator
     */
    renderHoverIndicator(shape, context) {
        const bounds = shape.getBounds();
        
        context.save();
        context.strokeStyle = '#28a745';
        context.lineWidth = 1;
        context.setLineDash([3, 3]);
        context.strokeRect(bounds.x - 1, bounds.y - 1, bounds.width + 2, bounds.height + 2);
        context.restore();
    }

    /**
     * Handle canvas state changes
     */
    handleCanvasStateChange(event) {
        // Re-render all shapes when canvas state changes
        this.shapes.forEach(shape => this.markShapeDirty(shape));
    }

    /**
     * Duplicate shape
     */
    duplicateShape(shape, offset = { x: 20, y: 20 }) {
        const shapeData = shape.serialize();
        
        // Apply offset
        shapeData.x += offset.x;
        shapeData.y += offset.y;
        
        // Remove ID to generate new one
        delete shapeData.id;
        
        return this.createShape(shapeData);
    }

    /**
     * Group shapes
     */
    groupShapes(shapes) {
        // TODO: Implement shape grouping
        console.log('Shape grouping not yet implemented');
    }

    /**
     * Ungroup shapes
     */
    ungroupShapes(group) {
        // TODO: Implement shape ungrouping
        console.log('Shape ungrouping not yet implemented');
    }

    /**
     * Get bounding box of multiple shapes
     */
    getBoundingBox(shapes) {
        if (shapes.length === 0) return null;
        
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        
        shapes.forEach(shape => {
            const bounds = shape.getBounds();
            minX = Math.min(minX, bounds.x);
            minY = Math.min(minY, bounds.y);
            maxX = Math.max(maxX, bounds.x + bounds.width);
            maxY = Math.max(maxY, bounds.y + bounds.height);
        });
        
        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }

    /**
     * Export shapes data
     */
    exportShapes(shapes = null) {
        const shapesToExport = shapes || this.getAllShapes();
        return shapesToExport.map(shape => shape.serialize());
    }

    /**
     * Import shapes data
     */
    importShapes(shapesData) {
        const importedShapes = [];
        
        shapesData.forEach(shapeData => {
            try {
                const shape = this.createFromData(shapeData);
                importedShapes.push(shape);
            } catch (error) {
                console.error('Failed to import shape:', error, shapeData);
            }
        });
        
        return importedShapes;
    }

    /**
     * Generate unique shape ID
     */
    generateId() {
        return `shape_${this.nextId++}`;
    }

    /**
     * Get statistics
     */
    getStats() {
        const stats = {
            totalShapes: this.shapes.size,
            selectedShapes: this.selectedShapes.size,
            hoveredShape: this.hoveredShape ? this.hoveredShape.id : null,
            dirtyShapes: this.dirtyShapes.size,
            shapeTypes: {}
        };
        
        // Count by type
        this.shapes.forEach(shape => {
            const type = shape.type;
            stats.shapeTypes[type] = (stats.shapeTypes[type] || 0) + 1;
        });
        
        return stats;
    }

    /**
     * Destroy shape manager
     */
    destroy() {
        console.log('Destroying ShapeManager...');
        
        // Clean up all shapes
        this.shapes.forEach(shape => shape.destroy());
        
        // Remove event listeners
        this.eventManager.off('canvas:render-draw', this.handleCanvasRender);
        
        // Clear all collections
        this.shapes.clear();
        this.shapeOrder = [];
        this.selectedShapes.clear();
        this.hoveredShape = null;
        this.renderCache.clear();
        this.dirtyShapes.clear();
        this.shapeTypes.clear();
        
        console.log('ShapeManager destroyed');
    }
}