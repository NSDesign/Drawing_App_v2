import { Shape } from '../core/Shape.js';

export class Line extends Shape {
    constructor(x1 = 0, y1 = 0, x2 = 100, y2 = 100) {
        super('line', x1, y1);
        this.x2 = x2;
        this.y2 = y2;
    }

    hitTest(x, y) {
        const tolerance = this.strokeWidth + 2;
        const distance = this.distanceToLine(x, y, this.x, this.y, this.x2, this.y2);
        return distance <= tolerance;
    }

    distanceToLine(px, py, x1, y1, x2, y2) {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        
        if (lenSq === 0) return Math.sqrt(A * A + B * B);
        
        let param = dot / lenSq;
        param = Math.max(0, Math.min(1, param));
        
        const xx = x1 + param * C;
        const yy = y1 + param * D;
        const dx = px - xx;
        const dy = py - yy;
        
        return Math.sqrt(dx * dx + dy * dy);
    }

    getBounds() {
        return {
            x: Math.min(this.x, this.x2),
            y: Math.min(this.y, this.y2),
            width: Math.abs(this.x2 - this.x),
            height: Math.abs(this.y2 - this.y)
        };
    }
}