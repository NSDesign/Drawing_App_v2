// src/js/shapes/Text.js
import { Shape } from '../core/Shape.js';

export class Text extends Shape {
    constructor(x = 0, y = 0, text = 'Text', fontSize = 16) {
        super('text', x, y);
        this.text = text;
        this.fontSize = fontSize;
        this.fontFamily = 'Arial, sans-serif';
        this.textAlign = 'left';
        this.textBaseline = 'top';
        this.fillColor = '#000000';
        this.strokeColor = 'transparent';
        this.strokeWidth = 0;
        this.editing = false;
    }

    hitTest(x, y) {
        const bounds = this.getBounds();
        return x >= bounds.x && x <= bounds.x + bounds.width &&
               y >= bounds.y && y <= bounds.y + bounds.height;
    }

    getBounds() {
        // Create temporary canvas to measure text
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.font = `${this.fontSize}px ${this.fontFamily}`;
        const metrics = ctx.measureText(this.text);
        
        return {
            x: this.x,
            y: this.y,
            width: metrics.width,
            height: this.fontSize * 1.2 // Approximate line height
        };
    }

    startEditing() {
        this.editing = true;
        this.emit('editingStarted', this);
    }

    stopEditing() {
        this.editing = false;
        this.emit('editingStopped', this);
    }

    setText(text) {
        this.text = text;
        this.emit('changed', this);
    }
}

// CSS for text editor (add to components.css)
/*
.text-editor {
    position: absolute;
    border: 2px solid #1976d2;
    background: white;
    padding: 4px 8px;
    font-size: 16px;
    font-family: Arial, sans-serif;
    outline: none;
    z-index: 1000;
    border-radius: 4px;
}
*/