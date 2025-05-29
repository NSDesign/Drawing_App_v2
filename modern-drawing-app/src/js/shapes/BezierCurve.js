// src/js/shapes/BezierCurve.js
import { Shape } from '../core/Shape.js';

export class BezierCurve extends Shape {
    constructor(startX = 0, startY = 0, endX = 100, endY = 100) {
        super('bezier', startX, startY);
        this.endX = endX;
        this.endY = endY;
        // Control points - initially set to create a smooth curve
        this.cp1X = startX + (endX - startX) * 0.33;
        this.cp1Y = startY;
        this.cp2X = startX + (endX - startX) * 0.66;
        this.cp2Y = endY;
        this.showControlPoints = false;
        this.selectedControlPoint = null;
    }

    hitTest(x, y) {
        // Check if point is near the curve
        const tolerance = this.strokeWidth + 4;
        
        // Sample points along the curve and check distance
        for (let t = 0; t <= 1; t += 0.01) {
            const point = this.getPointAtT(t);
            const distance = Math.sqrt((x - point.x) ** 2 + (y - point.y) ** 2);
            if (distance <= tolerance) return true;
        }
        
        return false;
    }

    hitTestControlPoint(x, y) {
        const tolerance = 8;
        
        // Check control point 1
        if (Math.sqrt((x - this.cp1X) ** 2 + (y - this.cp1Y) ** 2) <= tolerance) {
            return 'cp1';
        }
        
        // Check control point 2
        if (Math.sqrt((x - this.cp2X) ** 2 + (y - this.cp2Y) ** 2) <= tolerance) {
            return 'cp2';
        }
        
        // Check start point
        if (Math.sqrt((x - this.x) ** 2 + (y - this.y) ** 2) <= tolerance) {
            return 'start';
        }
        
        // Check end point
        if (Math.sqrt((x - this.endX) ** 2 + (y - this.endY) ** 2) <= tolerance) {
            return 'end';
        }
        
        return null;
    }

    getPointAtT(t) {
        // Cubic Bezier curve formula: B(t) = (1-t)³P₀ + 3(1-t)²tP₁ + 3(1-t)t²P₂ + t³P₃
        const t1 = 1 - t;
        const t1_2 = t1 * t1;
        const t1_3 = t1_2 * t1;
        const t_2 = t * t;
        const t_3 = t_2 * t;
        
        return {
            x: t1_3 * this.x + 3 * t1_2 * t * this.cp1X + 3 * t1 * t_2 * this.cp2X + t_3 * this.endX,
            y: t1_3 * this.y + 3 * t1_2 * t * this.cp1Y + 3 * t1 * t_2 * this.cp2Y + t_3 * this.endY
        };
    }

    getBounds() {
        // Calculate bounding box by sampling the curve
        let minX = Math.min(this.x, this.endX, this.cp1X, this.cp2X);
        let maxX = Math.max(this.x, this.endX, this.cp1X, this.cp2X);
        let minY = Math.min(this.y, this.endY, this.cp1Y, this.cp2Y);
        let maxY = Math.max(this.y, this.endY, this.cp1Y, this.cp2Y);
        
        // Sample more points for accurate bounds
        for (let t = 0; t <= 1; t += 0.1) {
            const point = this.getPointAtT(t);
            minX = Math.min(minX, point.x);
            maxX = Math.max(maxX, point.x);
            minY = Math.min(minY, point.y);
            maxY = Math.max(maxY, point.y);
        }
        
        return {
            x: minX - 5,
            y: minY - 5,
            width: maxX - minX + 10,
            height: maxY - minY + 10
        };
    }

    setControlPoint(pointType, x, y) {
        switch (pointType) {
            case 'start':
                this.x = x;
                this.y = y;
                break;
            case 'end':
                this.endX = x;
                this.endY = y;
                break;
            case 'cp1':
                this.cp1X = x;
                this.cp1Y = y;
                break;
            case 'cp2':
                this.cp2X = x;
                this.cp2Y = y;
                break;
        }
        this.emit('changed', this);
    }

    toggleControlPoints() {
        this.showControlPoints = !this.showControlPoints;
        this.emit('changed', this);
    }

    // Convert to path data for SVG export
    toPathData() {
        return `M ${this.x} ${this.y} C ${this.cp1X} ${this.cp1Y}, ${this.cp2X} ${this.cp2Y}, ${this.endX} ${this.endY}`;
    }
}