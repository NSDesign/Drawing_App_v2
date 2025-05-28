import { Shape } from '../core/Shape.js';

export class Ellipse extends Shape {
    constructor(x = 0, y = 0, radiusX = 50, radiusY = 50) {
        super('ellipse', x, y);
        this.radiusX = radiusX;
        this.radiusY = radiusY;
    }

    hitTest(x, y) {
        const centerX = this.x + this.radiusX;
        const centerY = this.y + this.radiusY;
        const dx = (x - centerX) / this.radiusX;
        const dy = (y - centerY) / this.radiusY;
        return (dx * dx + dy * dy) <= 1;
    }

    getBounds() {
        return { x: this.x, y: this.y, width: this.radiusX * 2, height: this.radiusY * 2 };
    }
}