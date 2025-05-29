// src/js/core/ClipboardManager.js
export class ClipboardManager {
    constructor(state, commandManager) {
        this.state = state;
        this.commandManager = commandManager;
        this.clipboard = [];
    }

    copy() {
        if (this.state.selectedShapes.size === 0) return false;
        
        this.clipboard = Array.from(this.state.selectedShapes).map(shape => {
            return this.serializeShape(shape);
        });
        
        return true;
    }

    paste(offsetX = 20, offsetY = 20) {
        if (this.clipboard.length === 0) return false;
        
        // Clear current selection
        this.state.clearSelection();
        
        // Create new shapes from clipboard
        const newShapes = this.clipboard.map(data => {
            const shape = this.deserializeShape(data);
            shape.x += offsetX;
            shape.y += offsetY;
            return shape;
        });
        
        // Add shapes and select them
        newShapes.forEach(shape => {
            this.state.addShape(shape);
            this.state.selectShape(shape, true);
        });
        
        return true;
    }

    cut() {
        if (!this.copy()) return false;
        
        // Delete selected shapes
        const shapesToDelete = Array.from(this.state.selectedShapes);
        shapesToDelete.forEach(shape => {
            this.state.removeShape(shape.id);
        });
        
        return true;
    }

    duplicate() {
        if (!this.copy()) return false;
        return this.paste();
    }

    serializeShape(shape) {
        return {
            type: shape.type,
            x: shape.x,
            y: shape.y,
            fillColor: shape.fillColor,
            strokeColor: shape.strokeColor,
            strokeWidth: shape.strokeWidth,
            // Type-specific properties
            ...(shape.type === 'rectangle' && {
                width: shape.width,
                height: shape.height
            }),
            ...(shape.type === 'ellipse' && {
                radiusX: shape.radiusX,
                radiusY: shape.radiusY
            }),
            ...(shape.type === 'line' && {
                x2: shape.x2,
                y2: shape.y2
            }),
            ...(shape.type === 'text' && {
                text: shape.text,
                fontSize: shape.fontSize,
                fontFamily: shape.fontFamily,
                textAlign: shape.textAlign,
                textBaseline: shape.textBaseline
            })
        };
    }

    async deserializeShape(data) {
        const { Rectangle } = await import('../shapes/Rectangle.js');
        const { Ellipse } = await import('../shapes/Ellipse.js');
        const { Line } = await import('../shapes/Line.js');
        const { Text } = await import('../shapes/Text.js');
        
        let shape;
        
        switch (data.type) {
            case 'rectangle':
                shape = new Rectangle(data.x, data.y, data.width, data.height);
                break;
            case 'ellipse':
                shape = new Ellipse(data.x, data.y, data.radiusX, data.radiusY);
                break;
            case 'line':
                shape = new Line(data.x, data.y, data.x2, data.y2);
                break;
            case 'text':
                shape = new Text(data.x, data.y, data.text, data.fontSize);
                shape.fontFamily = data.fontFamily;
                shape.textAlign = data.textAlign;
                shape.textBaseline = data.textBaseline;
                break;
            default:
                return null;
        }
        
        // Apply common properties
        shape.fillColor = data.fillColor;
        shape.strokeColor = data.strokeColor;
        shape.strokeWidth = data.strokeWidth;
        
        return shape;
    }
}
