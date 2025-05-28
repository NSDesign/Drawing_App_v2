import { EventEmitter } from './EventEmitter.js';

export class Shape extends EventEmitter {
    constructor(type, x = 0, y = 0) {
        super();
        this.id = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.type = type;
        this.x = x;
        this.y = y;
        this.selected = false;
        this.active = false;
        this.fillColor = '#ffffff';
        this.strokeColor = '#000000';
        this.strokeWidth = 2;
        this.zIndex = 0;
    }

    setPosition(x, y) {
        this.x = x;
        this.y = y;
        this.emit('changed', this);
    }

    setSelected(selected) {
        this.selected = selected;
        this.emit('changed', this);
    }

    setActive(active) {
        this.active = active;
        this.emit('changed', this);
    }

    hitTest(x, y) {
        return false; // Override in subclasses
    }

    getBounds() {
        return { x: this.x, y: this.y, width: 0, height: 0 };
    }

    clone() {
        const cloned = new this.constructor();
        Object.assign(cloned, this);
        cloned.id = `${this.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        return cloned;
    }
}