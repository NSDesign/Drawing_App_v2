import { Shape } from '../core/Shape.js';

export class Rectangle extends Shape {
    constructor(x = 0, y = 0, width = 100, height = 100) {
        super('rectangle', x, y);
        this.width = width;
        this.height = height;
    }

    hitTest(x, y) {
        return x >= this.x && x <= this.x + this.width &&
               y >= this.y && y <= this.y + this.height;
    }

    getBounds() {
        return { x: this.x, y: this.y, width: this.width, height: this.height };
    }
}