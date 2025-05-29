// src/js/core/FileManager.js
export class FileManager {
    constructor(state) {
        this.state = state;
    }

    saveToJSON() {
        const data = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            viewport: {
                zoom: this.state.zoom,
                panX: this.state.panX,
                panY: this.state.panY
            },
            shapes: Array.from(this.state.shapes.values()).map(shape => ({
                id: shape.id,
                type: shape.type,
                x: shape.x,
                y: shape.y,
                fillColor: shape.fillColor,
                strokeColor: shape.strokeColor,
                strokeWidth: shape.strokeWidth,
                zIndex: shape.zIndex,
                // Shape-specific properties
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
            }))
        };
        
        return JSON.stringify(data, null, 2);
    }

    async loadFromJSON(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            
            // Clear existing shapes
            this.state.shapes.clear();
            this.state.clearSelection();
            
            // Restore viewport
            if (data.viewport) {
                this.state.zoom = data.viewport.zoom || 1;
                this.state.panX = data.viewport.panX || 0;
                this.state.panY = data.viewport.panY || 0;
                this.state.emit('viewChanged');
            }
            
            // Recreate shapes
            for (const shapeData of data.shapes) {
                const shape = await this.createShapeFromData(shapeData);
                if (shape) {
                    this.state.shapes.set(shape.id, shape);
                    shape.on('changed', () => this.state.emit('shapesChanged'));
                }
            }
            
            this.state.emit('shapesChanged');
            return true;
        } catch (error) {
            console.error('Failed to load file:', error);
            return false;
        }
    }

    async createShapeFromData(data) {
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
        shape.id = data.id;
        shape.fillColor = data.fillColor;
        shape.strokeColor = data.strokeColor;
        shape.strokeWidth = data.strokeWidth;
        shape.zIndex = data.zIndex;
        
        return shape;
    }

    downloadFile(filename = 'drawing.json') {
        const content = this.saveToJSON();
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        
        URL.revokeObjectURL(url);
    }

    uploadFile() {
        return new Promise((resolve, reject) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) {
                    reject(new Error('No file selected'));
                    return;
                }
                
                try {
                    const text = await file.text();
                    const success = await this.loadFromJSON(text);
                    resolve(success);
                } catch (error) {
                    reject(error);
                }
            };
            
            input.click();
        });
    }

    exportToPNG(filename = 'drawing.png') {
        // Create a temporary canvas with the drawing
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Calculate bounds of all shapes
        const bounds = this.calculateBounds();
        const padding = 20;
        
        canvas.width = bounds.width + padding * 2;
        canvas.height = bounds.height + padding * 2;
        
        // Fill with white background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Render all shapes
        ctx.translate(-bounds.x + padding, -bounds.y + padding);
        
        const shapes = Array.from(this.state.shapes.values())
            .sort((a, b) => a.zIndex - b.zIndex);
        
        shapes.forEach(shape => this.renderShapeToCanvas(ctx, shape));
        
        // Download the image
        canvas.toBlob(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
        });
    }

    exportToSVG(filename = 'drawing.svg') {
        const bounds = this.calculateBounds();
        const padding = 20;
        
        let svg = `<svg width="${bounds.width + padding * 2}" height="${bounds.height + padding * 2}" xmlns="http://www.w3.org/2000/svg">`;
        svg += `<rect width="100%" height="100%" fill="white"/>`;
        svg += `<g transform="translate(${-bounds.x + padding}, ${-bounds.y + padding})">`;
        
        const shapes = Array.from(this.state.shapes.values())
            .sort((a, b) => a.zIndex - b.zIndex);
        
        shapes.forEach(shape => {
            svg += this.shapeToSVG(shape);
        });
        
        svg += '</g></svg>';
        
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    calculateBounds() {
        if (this.state.shapes.size === 0) {
            return { x: 0, y: 0, width: 800, height: 600 };
        }
        
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        this.state.shapes.forEach(shape => {
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

    renderShapeToCanvas(ctx, shape) {
        ctx.save();
        ctx.fillStyle = shape.fillColor;
        ctx.strokeStyle = shape.strokeColor;
        ctx.lineWidth = shape.strokeWidth;

        switch (shape.type) {
            case 'rectangle':
                ctx.fillRect(shape.x, shape.y, shape.width, shape.height);
                if (shape.strokeWidth > 0) {
                    ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
                }
                break;
            case 'ellipse':
                ctx.beginPath();
                ctx.ellipse(shape.x + shape.radiusX, shape.y + shape.radiusY,
                           shape.radiusX, shape.radiusY, 0, 0, 2 * Math.PI);
                ctx.fill();
                if (shape.strokeWidth > 0) ctx.stroke();
                break;
            case 'line':
                ctx.beginPath();
                ctx.moveTo(shape.x, shape.y);
                ctx.lineTo(shape.x2, shape.y2);
                ctx.stroke();
                break;
            case 'text':
                ctx.font = `${shape.fontSize}px ${shape.fontFamily}`;
                ctx.textAlign = shape.textAlign;
                ctx.textBaseline = shape.textBaseline;
                ctx.fillText(shape.text, shape.x, shape.y);
                break;
        }
        ctx.restore();
    }

    shapeToSVG(shape) {
        const fill = shape.fillColor;
        const stroke = shape.strokeWidth > 0 ? shape.strokeColor : 'none';
        const strokeWidth = shape.strokeWidth;

        switch (shape.type) {
            case 'rectangle':
                return `<rect x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
            case 'ellipse':
                return `<ellipse cx="${shape.x + shape.radiusX}" cy="${shape.y + shape.radiusY}" rx="${shape.radiusX}" ry="${shape.radiusY}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
            case 'line':
                return `<line x1="${shape.x}" y1="${shape.y}" x2="${shape.x2}" y2="${shape.y2}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
            case 'text':
                return `<text x="${shape.x}" y="${shape.y}" font-family="${shape.fontFamily}" font-size="${shape.fontSize}" fill="${fill}">${shape.text}</text>`;
            default:
                return '';
        }
    }
}