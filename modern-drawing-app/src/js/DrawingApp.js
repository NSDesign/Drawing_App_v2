import { CanvasState } from './core/CanvasState.js';
import { CanvasRenderer } from './renderers/CanvasRenderer.js';
import { GridRenderer } from './renderers/GridRenderer.js';
import { ToolManager } from './tools/ToolManager.js';
import { PropertiesPanel } from './ui/PropertiesPanel.js';
import { Rectangle } from './shapes/Rectangle.js';
import { Ellipse } from './shapes/Ellipse.js';
import { Line } from './shapes/Line.js';

class DrawingApp {
    constructor() {
        this.state = new CanvasState();
        this.initializeCanvases();
        this.initializeManagers();
        this.bindUIEvents();
        this.updateStatus();
        this.addSampleShapes();
    }

    initializeCanvases() {
        this.gridCanvas = document.getElementById('grid-canvas');
        this.mainCanvas = document.getElementById('main-canvas');
        this.overlayCanvas = document.getElementById('overlay-canvas');

        this.gridRenderer = new GridRenderer(this.gridCanvas, this.state);
        this.mainRenderer = new CanvasRenderer(this.mainCanvas, this.state);
    }

    initializeManagers() {
        this.toolManager = new ToolManager(this.state, this.mainRenderer);
        this.propertiesPanel = new PropertiesPanel(this.state);
        
        // Set initial tool
        this.state.setActiveTool('select');
    }

    bindUIEvents() {
        // Tool buttons
        document.querySelectorAll('.tool-button').forEach(button => {
            button.addEventListener('click', (e) => {
                document.querySelectorAll('.tool-button').forEach(b => b.classList.remove('active'));
                button.classList.add('active');
                this.state.setActiveTool(button.dataset.tool);
            });
        });

        // Zoom controls
        document.getElementById('zoom-in').addEventListener('click', () => {
            this.state.setZoom(this.state.zoom * 1.2);
            this.updateZoomDisplay();
        });

        document.getElementById('zoom-out').addEventListener('click', () => {
            this.state.setZoom(this.state.zoom / 1.2);
            this.updateZoomDisplay();
        });

        // Mouse position tracking
        this.mainCanvas.addEventListener('mousemove', (e) => {
            const pos = this.mainRenderer.screenToCanvas(e.clientX, e.clientY);
            document.getElementById('cursor-position').textContent = 
                `${Math.round(pos.x)}, ${Math.round(pos.y)}`;
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT') return;
            
            switch (e.key) {
                case 'v':
                case 'V':
                    this.setTool('select');
                    break;
                case 'r':
                case 'R':
                    this.setTool('rectangle');
                    break;
                case 'o':
                case 'O':
                    this.setTool('ellipse');
                    break;
                case 'l':
                case 'L':
                    this.setTool('line');
                    break;
                case 'h':
                case 'H':
                    this.setTool('pan');
                    break;
                case 'Delete':
                case 'Backspace':
                    this.deleteSelected();
                    break;
            }
        });
    }

    setTool(tool) {
        this.state.setActiveTool(tool);
        document.querySelectorAll('.tool-button').forEach(b => b.classList.remove('active'));
        document.querySelector(`[data-tool="${tool}"]`).classList.add('active');
    }

    deleteSelected() {
        this.state.selectedShapes.forEach(shape => {
            this.state.removeShape(shape.id);
        });
    }

    updateZoomDisplay() {
        document.getElementById('zoom-level').textContent = Math.round(this.state.zoom * 100) + '%';
    }

    updateStatus() {
        this.state.on('shapesChanged', () => {
            const count = this.state.shapes.size;
            document.getElementById('status-text').textContent = `${count} shapes`;
        });
    }

    addSampleShapes() {
        // Add sample shapes for demonstration
        const rect = new Rectangle(100, 100, 150, 100);
        rect.fillColor = '#e3f2fd';
        rect.strokeColor = '#1976d2';
        this.state.addShape(rect);

        const ellipse = new Ellipse(300, 150, 75, 50);
        ellipse.fillColor = '#f3e5f5';
        ellipse.strokeColor = '#7b1fa2';
        this.state.addShape(ellipse);

        const line = new Line(150, 300, 350, 350);
        line.strokeColor = '#d32f2f';
        line.strokeWidth = 3;
        this.state.addShape(line);
    }
}

// Initialize the application
const app = new DrawingApp();