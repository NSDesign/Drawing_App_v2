export class GridRenderer {
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
        this.state.on('viewChanged', () => this.render());
    }

    render() {
        if (!this.state.gridVisible) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            return;
        }

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.save();
        
        this.ctx.strokeStyle = '#e1e5e9';
        this.ctx.lineWidth = 1;
        
        const rect = this.canvas.getBoundingClientRect();
        const gridSize = this.state.gridSize * this.state.zoom;
        const offsetX = (this.state.panX * this.state.zoom) % gridSize;
        const offsetY = (this.state.panY * this.state.zoom) % gridSize;
        
        // Vertical lines
        for (let x = offsetX; x < rect.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, rect.height);
            this.ctx.stroke();
        }
        
        // Horizontal lines
        for (let y = offsetY; y < rect.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(rect.width, y);
            this.ctx.stroke();
        }
        
        this.ctx.restore();
    }
}