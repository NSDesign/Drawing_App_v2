// src/js/shapes/Rectangle.js - Rectangle shape implementation

/**
 * Rectangle shape class
 */
export class Rectangle extends BaseShape {
    constructor(id, properties = {}) {
        super(id, properties);
        this.type = 'rectangle';
        
        // Rectangle-specific properties
        this.cornerRadius = properties.cornerRadius || 0;
        this.roundedCorners = properties.roundedCorners || false;
    }

    /**
     * Draw the rectangle
     */
    draw(context) {
        if (this.roundedCorners && this.cornerRadius > 0) {
            this.drawRoundedRect(context);
        } else {
            this.drawRect(context);
        }
    }

    /**
     * Draw regular rectangle
     */
    drawRect(context) {
        // Fill
        if (this.fillColor && this.fillColor !== 'transparent') {
            context.fillRect(this.x, this.y, this.width, this.height);
        }
        
        // Stroke
        if (this.strokeColor && this.strokeWidth > 0) {
            context.strokeRect(this.x, this.y, this.width, this.height);
        }
    }

    /**
     * Draw rounded rectangle
     */
    drawRoundedRect(context) {
        const x = this.x;
        const y = this.y;
        const width = this.width;
        const height = this.height;
        const radius = Math.min(this.cornerRadius, width / 2, height / 2);
        
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
        
        // Fill
        if (this.fillColor && this.fillColor !== 'transparent') {
            context.fill();
        }
        
        // Stroke
        if (this.strokeColor && this.strokeWidth > 0) {
            context.stroke();
        }
    }

    /**
     * More precise hit testing for rectangles
     */
    hitTest(point, tolerance = 0) {
        const bounds = this.getBounds();
        
        if (this.rotation === 0) {
            // Simple axis-aligned rectangle test
            return point.x >= bounds.x - tolerance &&
                   point.x <= bounds.x + bounds.width + tolerance &&
                   point.y >= bounds.y - tolerance &&
                   point.y <= bounds.y + bounds.height + tolerance;
        } else {
            // Rotated rectangle test
            return this.hitTestRotated(point, tolerance);
        }
    }

    /**
     * Hit test for rotated rectangle
     */
    hitTestRotated(point, tolerance = 0) {
        // Transform point to rectangle's local coordinate system
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        
        const cos = Math.cos(-this.rotation);
        const sin = Math.sin(-this.rotation);
        
        const localX = cos * (point.x - centerX) - sin * (point.y - centerY) + centerX;
        const localY = sin * (point.x - centerX) + cos * (point.y - centerY) + centerY;
        
        // Test against axis-aligned rectangle
        return localX >= this.x - tolerance &&
               localX <= this.x + this.width + tolerance &&
               localY >= this.y - tolerance &&
               localY <= this.y + this.height + tolerance;
    }

    /**
     * Test rectangle elements (corners, edges)
     */
    hitTestElements(point, tolerance = 5) {
        const bounds = this.getBounds();
        
        // Test corners
        const corners = [
            { x: bounds.x, y: bounds.y, type: 'corner', id: 'nw' },
            { x: bounds.x + bounds.width, y: bounds.y, type: 'corner', id: 'ne' },
            { x: bounds.x + bounds.width, y: bounds.y + bounds.height, type: 'corner', id: 'se' },
            { x: bounds.x, y: bounds.y + bounds.height, type: 'corner', id: 'sw' }
        ];
        
        for (const corner of corners) {
            const distance = Math.sqrt(
                Math.pow(point.x - corner.x, 2) + Math.pow(point.y - corner.y, 2)
            );
            if (distance <= tolerance) {
                return { type: 'corner', id: corner.id, point: corner };
            }
        }
        
        // Test edges
        const edges = [
            { 
                start: { x: bounds.x, y: bounds.y }, 
                end: { x: bounds.x + bounds.width, y: bounds.y },
                type: 'edge', 
                id: 'top' 
            },
            { 
                start: { x: bounds.x + bounds.width, y: bounds.y }, 
                end: { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
                type: 'edge', 
                id: 'right' 
            },
            { 
                start: { x: bounds.x + bounds.width, y: bounds.y + bounds.height }, 
                end: { x: bounds.x, y: bounds.y + bounds.height },
                type: 'edge', 
                id: 'bottom' 
            },
            { 
                start: { x: bounds.x, y: bounds.y + bounds.height }, 
                end: { x: bounds.x, y: bounds.y },
                type: 'edge', 
                id: 'left' 
            }
        ];
        
        for (const edge of edges) {
            if (this.pointToLineDistance(point, edge.start, edge.end) <= tolerance) {
                return { type: 'edge', id: edge.id, edge };
            }
        }
        
        return null;
    }

    /**
     * Calculate distance from point to line segment
     */
    pointToLineDistance(point, lineStart, lineEnd) {
        const A = point.x - lineStart.x;
        const B = point.y - lineStart.y;
        const C = lineEnd.x - lineStart.x;
        const D = lineEnd.y - lineStart.y;
        
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        
        if (lenSq === 0) return Math.sqrt(A * A + B * B);
        
        let param = dot / lenSq;
        
        let xx, yy;
        
        if (param < 0) {
            xx = lineStart.x;
            yy = lineStart.y;
        } else if (param > 1) {
            xx = lineEnd.x;
            yy = lineEnd.y;
        } else {
            xx = lineStart.x + param * C;
            yy = lineStart.y + param * D;
        }
        
        const dx = point.x - xx;
        const dy = point.y - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Serialize rectangle with custom properties
     */
    serialize() {
        return {
            ...super.serialize(),
            cornerRadius: this.cornerRadius,
            roundedCorners: this.roundedCorners
        };
    }

    /**
     * Get rectangle-specific properties for UI
     */
    getProperties() {
        return {
            ...super.getStyle(),
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
            rotation: this.rotation,
            cornerRadius: this.cornerRadius,
            roundedCorners: this.roundedCorners
        };
    }

    /**
     * Set rectangle-specific properties
     */
    setProperties(properties) {
        super.setStyle(properties);
        
        if (properties.x !== undefined) this.x = properties.x;
        if (properties.y !== undefined) this.y = properties.y;
        if (properties.width !== undefined) this.width = properties.width;
        if (properties.height !== undefined) this.height = properties.height;
        if (properties.rotation !== undefined) this.rotation = properties.rotation;
        if (properties.cornerRadius !== undefined) this.cornerRadius = properties.cornerRadius;
        if (properties.roundedCorners !== undefined) this.roundedCorners = properties.roundedCorners;
        
        this.markDirty();
    }
}

// Export additional shape classes stubs
export class Ellipse extends BaseShape {
    constructor(id, properties = {}) {
        super(id, properties);
        this.type = 'ellipse';
        this.startAngle = properties.startAngle || 0;
        this.endAngle = properties.endAngle || Math.PI * 2;
    }
    
    draw(context) {
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        const radiusX = this.width / 2;
        const radiusY = this.height / 2;
        
        context.beginPath();
        context.ellipse(centerX, centerY, radiusX, radiusY, 0, this.startAngle, this.endAngle);
        
        if (this.fillColor && this.fillColor !== 'transparent') {
            context.fill();
        }
        if (this.strokeColor && this.strokeWidth > 0) {
            context.stroke();
        }
    }
}

export class Line extends BaseShape {
    constructor(id, properties = {}) {
        super(id, properties);
        this.type = 'line';
        this.startX = properties.startX || this.x;
        this.startY = properties.startY || this.y;
        this.endX = properties.endX || this.x + this.width;
        this.endY = properties.endY || this.y + this.height;
    }
    
    draw(context) {
        context.beginPath();
        context.moveTo(this.startX, this.startY);
        context.lineTo(this.endX, this.endY);
        
        if (this.strokeColor && this.strokeWidth > 0) {
            context.stroke();
        }
    }
}

export class Text extends BaseShape {
    constructor(id, properties = {}) {
        super(id, properties);
        this.type = 'text';
        this.text = properties.text || 'Text';
        this.fontSize = properties.fontSize || 16;
        this.fontFamily = properties.fontFamily || 'Arial';
        this.fontWeight = properties.fontWeight || 'normal';
        this.textAlign = properties.textAlign || 'left';
        this.textBaseline = properties.textBaseline || 'top';
    }
    
    draw(context) {
        context.font = `${this.fontWeight} ${this.fontSize}px ${this.fontFamily}`;
        context.textAlign = this.textAlign;
        context.textBaseline = this.textBaseline;
        
        if (this.fillColor && this.fillColor !== 'transparent') {
            context.fillText(this.text, this.x, this.y);
        }
        if (this.strokeColor && this.strokeWidth > 0) {
            context.strokeText(this.text, this.x, this.y);
        }
    }
}