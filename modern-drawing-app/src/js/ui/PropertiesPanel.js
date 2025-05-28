
export class PropertiesPanel {
    constructor(state) {
        this.state = state;
        this.panel = document.getElementById('properties-panel');
        this.fillColorInput = document.getElementById('fill-color');
        this.strokeColorInput = document.getElementById('stroke-color');
        this.strokeWidthInput = document.getElementById('stroke-width');
        this.posXInput = document.getElementById('pos-x');
        this.posYInput = document.getElementById('pos-y');
        this.sizeWidthInput = document.getElementById('size-width');
        this.sizeHeightInput = document.getElementById('size-height');
        
        this.bindEvents();
    }

    bindEvents() {
        this.state.on('selectionChanged', () => this.updatePanel());
        
        this.fillColorInput.addEventListener('change', (e) => this.updateSelectedShapes('fillColor', e.target.value));
        this.strokeColorInput.addEventListener('change', (e) => this.updateSelectedShapes('strokeColor', e.target.value));
        this.strokeWidthInput.addEventListener('input', (e) => this.updateSelectedShapes('strokeWidth', parseInt(e.target.value)));
        
        this.posXInput.addEventListener('change', (e) => this.updatePosition('x', parseFloat(e.target.value)));
        this.posYInput.addEventListener('change', (e) => this.updatePosition('y', parseFloat(e.target.value)));
        
        this.sizeWidthInput.addEventListener('change', (e) => this.updateSize('width', parseFloat(e.target.value)));
        this.sizeHeightInput.addEventListener('change', (e) => this.updateSize('height', parseFloat(e.target.value)));
    }

    updatePanel() {
        if (this.state.selectedShapes.size === 0) {
            this.panel.classList.remove('visible');
            return;
        }

        this.panel.classList.add('visible');
        
        if (this.state.selectedShapes.size === 1) {
            const shape = Array.from(this.state.selectedShapes)[0];
            this.fillColorInput.value = shape.fillColor;
            this.strokeColorInput.value = shape.strokeColor;
            this.strokeWidthInput.value = shape.strokeWidth;
            this.posXInput.value = Math.round(shape.x);
            this.posYInput.value = Math.round(shape.y);
            
            const bounds = shape.getBounds();
            this.sizeWidthInput.value = Math.round(bounds.width);
            this.sizeHeightInput.value = Math.round(bounds.height);
        }
    }

    updateSelectedShapes(property, value) {
        this.state.selectedShapes.forEach(shape => {
            shape[property] = value;
            shape.emit('changed', shape);
        });
    }

    updatePosition(axis, value) {
        this.state.selectedShapes.forEach(shape => {
            if (axis === 'x') {
                shape.setPosition(value, shape.y);
            } else {
                shape.setPosition(shape.x, value);
            }
        });
    }

    updateSize(dimension, value) {
        this.state.selectedShapes.forEach(shape => {
            if (shape.type === 'rectangle') {
                if (dimension === 'width') {
                    shape.width = value;
                } else {
                    shape.height = value;
                }
                shape.emit('changed', shape);
            } else if (shape.type === 'ellipse') {
                if (dimension === 'width') {
                    shape.radiusX = value / 2;
                } else {
                    shape.radiusY = value / 2;
                }
                shape.emit('changed', shape);
            }
        });
    }
}