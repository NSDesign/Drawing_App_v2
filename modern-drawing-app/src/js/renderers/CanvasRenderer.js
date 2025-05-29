export class CanvasRenderer {
    constructor(canvas, state) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.state = state;
        this.setupCanvas();
        this.bindEvents();
    }

    setupCanvas() {
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();
        this.canvas.width = rect.width * window.devicePixelRatio;
        this.canvas.height = rect.height * window.devicePixelRatio;
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        this.render();
    }

    bindEvents() {
        this.state.on('shapesChanged', () => this.render());
        this.state.on('selectionChanged', () => this.render());
        this.state.on('viewChanged', () => this.render());
    }

    render() {
        this.clear();
        this.applyTransform();
        this.renderShapes();
        this.renderSelection();
// Render marquee selection if active
if (this.state.currentTool === 'select') {
    const selectTool = this.toolManager?.tools?.get('select');
    if (selectTool && selectTool.isMarquee) {
        selectTool.renderMarquee(this.ctx);
    }
}

renderBezierControlPoints(shape) {
    this.ctx.save();
    
    // Control lines
    this.ctx.strokeStyle = 'rgba(25, 118, 210, 0.5)';
    this.ctx.lineWidth = 1 / this.state.zoom;
    this.ctx.setLineDash([5 / this.state.zoom, 5 / this.state.zoom]);
    
    // Line from start to cp1
    this.ctx.beginPath();
    this.ctx.moveTo(shape.x, shape.y);
    this.ctx.lineTo(shape.cp1X, shape.cp1Y);
    this.ctx.stroke();
    
    // Line from cp2 to end
    this.ctx.beginPath();
    this.ctx.moveTo(shape.cp2X, shape.cp2Y);
    this.ctx.lineTo(shape.endX, shape.endY);
    this.ctx.stroke();
    
    this.ctx.setLineDash([]);
    
    // Control points
    const pointSize = 6 / this.state.zoom;
    this.ctx.fillStyle = '#1976d2';
    this.ctx.strokeStyle = 'white';
    this.ctx.lineWidth = 2 / this.state.zoom;
    
    // Start point
    this.ctx.beginPath();
    this.ctx.arc(shape.x, shape.y, pointSize, 0, 2 * Math.PI);
    this.ctx.fill();
    this.ctx.stroke();
    
    // End point
    this.ctx.beginPath();
    this.ctx.arc(shape.endX, shape.endY, pointSize, 0, 2 * Math.PI);
    this.ctx.fill();
    this.ctx.stroke();
    
    // Control point 1
    this.ctx.fillStyle = '#ff9800';
    this.ctx.beginPath();
    this.ctx.arc(shape.cp1X, shape.cp1Y, pointSize, 0, 2 * Math.PI);
    this.ctx.fill();
    this.ctx.stroke();
    
    // Control point 2
    this.ctx.beginPath();
    this.ctx.arc(shape.cp2X, shape.cp2Y, pointSize, 0, 2 * Math.PI);
    this.ctx.fill();
    this.ctx.stroke();
    
    this.ctx.restore();
}
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    applyTransform() {
        this.ctx.save();
        this.ctx.scale(this.state.zoom, this.state.zoom);
        this.ctx.translate(this.state.panX, this.state.panY);
    }

    renderShapes() {
        const shapes = Array.from(this.state.shapes.values())
            .sort((a, b) => a.zIndex - b.zIndex);

        shapes.forEach(shape => this.renderShape(shape));
        this.ctx.restore();
    }

    renderShape(shape) {
        this.ctx.save();
        
        this.ctx.fillStyle = shape.fillColor;
        this.ctx.strokeStyle = shape.strokeColor;
        this.ctx.lineWidth = shape.strokeWidth;

        switch (shape.type) {
            case 'rectangle':
                this.ctx.fillRect(shape.x, shape.y, shape.width, shape.height);
                this.ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
                break;
            case 'ellipse':
                this.ctx.beginPath();
                this.ctx.ellipse(
                    shape.x + shape.radiusX, 
                    shape.y + shape.radiusY,
                    shape.radiusX, 
                    shape.radiusY, 
                    0, 0, 2 * Math.PI
                );
                this.ctx.fill();
                this.ctx.stroke();
                break;
            case 'line':
                this.ctx.beginPath();
                this.ctx.moveTo(shape.x, shape.y);
                this.ctx.lineTo(shape.x2, shape.y2);
                this.ctx.stroke();
                break;

case 'text':
    this.ctx.font = `${shape.fontSize}px ${shape.fontFamily}`;
    this.ctx.textAlign = shape.textAlign;
    this.ctx.textBaseline = shape.textBaseline;
    this.ctx.fillStyle = shape.fillColor;
    
    if (shape.editing) {
        // Draw selection background for editing text
        const bounds = shape.getBounds();
        this.ctx.fillStyle = 'rgba(25, 118, 210, 0.1)';
        this.ctx.fillRect(bounds.x - 2, bounds.y - 2, bounds.width + 4, bounds.height + 4);
        this.ctx.fillStyle = shape.fillColor;
    }
    
    this.ctx.fillText(shape.text, shape.x, shape.y);
    
    if (shape.strokeWidth > 0 && shape.strokeColor !== 'transparent') {
        this.ctx.strokeStyle = shape.strokeColor;
        this.ctx.lineWidth = shape.strokeWidth;
        this.ctx.strokeText(shape.text, shape.x, shape.y);
    }
    break;

case 'bezier':
    // Draw the curve
    this.ctx.beginPath();
    this.ctx.moveTo(shape.x, shape.y);
    this.ctx.bezierCurveTo(
        shape.cp1X, shape.cp1Y,
        shape.cp2X, shape.cp2Y,
        shape.endX, shape.endY
    );
    this.ctx.stroke();
    
    // Draw control points and lines if selected
    if (shape.showControlPoints || shape.selected) {
        this.renderBezierControlPoints(shape);
    }
    break;
        }

        this.ctx.restore();
    }

    renderSelection() {
        this.ctx.save();
        this.ctx.scale(this.state.zoom, this.state.zoom);
        this.ctx.translate(this.state.panX, this.state.panY);
        
        this.state.selectedShapes.forEach(shape => {
            const bounds = shape.getBounds();
            this.ctx.strokeStyle = '#1976d2';
            this.ctx.lineWidth = 2 / this.state.zoom;
            this.ctx.setLineDash([5 / this.state.zoom, 5 / this.state.zoom]);
            this.ctx.strokeRect(bounds.x - 5, bounds.y - 5, bounds.width + 10, bounds.height + 10);
            this.ctx.setLineDash([]);
        });
        
        this.ctx.restore();
    }

    screenToCanvas(screenX, screenY) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (screenX - rect.left) / this.state.zoom - this.state.panX;
        const y = (screenY - rect.top) / this.state.zoom - this.state.panY;
        return { x, y };
    }
}