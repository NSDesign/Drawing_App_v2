// src/js/shapes/BaseShape.js - Base class for all shapes

/**
 * Base class for all drawable shapes
 */
export class BaseShape {
    constructor(id, properties = {}) {
        this.id = id;
        this.type = 'base';
        
        // Basic properties
        this.x = properties.x || 0;
        this.y = properties.y || 0;
        this.width = properties.width || 100;
        this.height = properties.height || 100;
        this.rotation = properties.rotation || 0;
        
        // Style properties
        this.fillColor = properties.fillColor || 'rgba(135, 206, 235, 0.5)';
        this.strokeColor = properties.strokeColor || '#000000';
        this.strokeWidth = properties.strokeWidth || 1;
        this.opacity = properties.opacity || 1;
        
        // State properties
        this.visible = properties.visible !== false;
        this.selected = false;
        this.hovered = false;
        this.locked = properties.locked || false;
        
        // Transform properties
        this.scaleX = properties.scaleX || 1;
        this.scaleY = properties.scaleY || 1;
        
        // References (will be set by ShapeManager)
        this.shapeManager = properties.shapeManager || null;
        this.eventManager = properties.eventManager || null;
        this.stateManager = properties.stateManager || null;
        
        // Custom properties for specific shape types
        this.customProperties = properties.customProperties || {};
        
        // Creation timestamp
        this.createdAt = Date.now();
        this.modifiedAt = this.createdAt;
    }

    /**
     * Initialize the shape (called after creation)
     */
    initialize() {
        // Override in subclasses if needed
    }

    /**
     * Render the shape to canvas context
     */
    render(context) {
        if (!this.visible) return;
        
        context.save();
        
        // Apply opacity
        context.globalAlpha = this.opacity;
        
        // Apply styles
        context.fillStyle = this.fillColor;
        context.strokeStyle = this.strokeColor;
        context.lineWidth = this.strokeWidth;
        
        // Draw the shape (override in subclasses)
        this.draw(context);
        
        context.restore();
        
        // Update modified timestamp
        this.modifiedAt = Date.now();
    }

    /**
     * Abstract method to draw the shape (must be implemented in subclasses)
     */
    draw(context) {
        throw new Error('draw() method must be implemented in subclass');
    }

    /**
     * Test if a point is inside the shape
     */
    hitTest(point, tolerance = 0) {
        const bounds = this.getBounds();
        return point.x >= bounds.x - tolerance &&
               point.x <= bounds.x + bounds.width + tolerance &&
               point.y >= bounds.y - tolerance &&
               point.y <= bounds.y + bounds.height + tolerance;
    }

    /**
     * Test individual shape elements (points, segments)
     */
    hitTestElements(point, tolerance = 5) {
        // Default implementation - override in subclasses for more specific element testing
        return null;
    }

    /**
     * Get shape bounding box
     */
    getBounds() {
        return {
            x: this.x,
            y: this.y,
            width: this.width * this.scaleX,
            height: this.height * this.scaleY
        };
    }

    /**
     * Set shape bounds
     */
    setBounds(bounds) {
        this.x = bounds.x;
        this.y = bounds.y;
        this.width = bounds.width / this.scaleX;
        this.height = bounds.height / this.scaleY;
        this.markDirty();
    }

    /**
     * Get shape position
     */
    getPosition() {
        return { x: this.x, y: this.y };
    }

    /**
     * Set shape position
     */
    setPosition(x, y) {
        this.x = x;
        this.y = y;
        this.markDirty();
    }

    /**
     * Get shape size
     */
    getSize() {
        return { 
            width: this.width * this.scaleX, 
            height: this.height * this.scaleY 
        };
    }

    /**
     * Set shape size
     */
    setSize(width, height) {
        this.width = width / this.scaleX;
        this.height = height / this.scaleY;
        this.markDirty();
    }

    /**
     * Get transform matrix
     */
    getTransform() {
        return {
            x: this.x,
            y: this.y,
            scaleX: this.scaleX,
            scaleY: this.scaleY,
            rotation: this.rotation
        };
    }

    /**
     * Set transform
     */
    setTransform(transform) {
        if (transform.x !== undefined) this.x = transform.x;
        if (transform.y !== undefined) this.y = transform.y;
        if (transform.scaleX !== undefined) this.scaleX = transform.scaleX;
        if (transform.scaleY !== undefined) this.scaleY = transform.scaleY;
        if (transform.rotation !== undefined) this.rotation = transform.rotation;
        this.markDirty();
    }

    /**
     * Move shape by delta
     */
    move(deltaX, deltaY) {
        this.x += deltaX;
        this.y += deltaY;
        this.markDirty();
    }

    /**
     * Scale shape
     */
    scale(scaleX, scaleY = scaleX) {
        this.scaleX *= scaleX;
        this.scaleY *= scaleY;
        this.markDirty();
    }

    /**
     * Rotate shape
     */
    rotate(angle) {
        this.rotation += angle;
        this.markDirty();
    }

    /**
     * Check if shape is visible
     */
    isVisible() {
        return this.visible && this.opacity > 0;
    }

    /**
     * Set visibility
     */
    setVisible(visible) {
        this.visible = visible;
        this.markDirty();
    }

    /**
     * Check if shape is selected
     */
    isSelected() {
        return this.selected;
    }

    /**
     * Set selection state
     */
    setSelected(selected) {
        this.selected = selected;
        this.markDirty();
    }

    /**
     * Check if shape is hovered
     */
    isHovered() {
        return this.hovered;
    }

    /**
     * Set hover state
     */
    setHovered(hovered) {
        this.hovered = hovered;
        this.markDirty();
    }

    /**
     * Check if shape is locked
     */
    isLocked() {
        return this.locked;
    }

    /**
     * Set lock state
     */
    setLocked(locked) {
        this.locked = locked;
        this.markDirty();
    }

    /**
     * Get style properties
     */
    getStyle() {
        return {
            fillColor: this.fillColor,
            strokeColor: this.strokeColor,
            strokeWidth: this.strokeWidth,
            opacity: this.opacity
        };
    }

    /**
     * Set style properties
     */
    setStyle(style) {
        if (style.fillColor !== undefined) this.fillColor = style.fillColor;
        if (style.strokeColor !== undefined) this.strokeColor = style.strokeColor;
        if (style.strokeWidth !== undefined) this.strokeWidth = style.strokeWidth;
        if (style.opacity !== undefined) this.opacity = style.opacity;
        this.markDirty();
    }

    /**
     * Clone the shape
     */
    clone() {
        const data = this.serialize();
        delete data.id; // Will get new ID
        const CloneClass = this.constructor;
        return new CloneClass(null, data);
    }

    /**
     * Serialize shape to JSON-compatible object
     */
    serialize() {
        return {
            id: this.id,
            type: this.type,
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
            rotation: this.rotation,
            scaleX: this.scaleX,
            scaleY: this.scaleY,
            fillColor: this.fillColor,
            strokeColor: this.strokeColor,
            strokeWidth: this.strokeWidth,
            opacity: this.opacity,
            visible: this.visible,
            locked: this.locked,
            customProperties: { ...this.customProperties },
            createdAt: this.createdAt,
            modifiedAt: this.modifiedAt
        };
    }

    /**
     * Mark shape as dirty for re-rendering
     */
    markDirty() {
        if (this.shapeManager) {
            this.shapeManager.markShapeDirty(this);
        }
        this.modifiedAt = Date.now();
    }

    /**
     * Destroy the shape
     */
    destroy() {
        // Clean up any resources
        this.shapeManager = null;
        this.eventManager = null;
        this.stateManager = null;
    }
}