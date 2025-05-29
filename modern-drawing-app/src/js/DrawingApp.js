// Enhanced DrawingApp.js with all new features integrated
import { CanvasState } from './core/CanvasState.js';
import { CanvasRenderer } from './renderers/CanvasRenderer.js';
import { GridRenderer } from './renderers/GridRenderer.js';
import { ToolManager } from './tools/ToolManager.js';
import { PropertiesPanel } from './ui/PropertiesPanel.js';
import { CommandManager } from './core/CommandManager.js';
import { FileManager } from './core/FileManager.js';
import { ClipboardManager } from './core/ClipboardManager.js';
import { Rectangle } from './shapes/Rectangle.js';
import { Ellipse } from './shapes/Ellipse.js';
import { Line } from './shapes/Line.js';

class EnhancedDrawingApp {
    constructor() {
        this.state = new CanvasState();
        this.commandManager = new CommandManager();
        this.fileManager = new FileManager(this.state);
        this.clipboardManager = new ClipboardManager(this.state, this.commandManager);
        
        this.initializeCanvases();
        this.initializeManagers();
        this.bindUIEvents();
        this.setupMenuBar();
        this.updateStatus();
        this.addSampleShapes();
    }

    initializeCanvases() {
        this.gridCanvas = document.getElementById('grid-canvas');
        this.mainCanvas = document.getElementById('main-canvas');
        this.overlayCanvas = document.getElementById('overlay-canvas');

        this.gridRenderer = new GridRenderer(this.gridCanvas, this.state);
        this.mainRenderer = new CanvasRenderer(this.mainCanvas, this.state);
        
        // Enhanced renderer with marquee support
        const originalRender = this.mainRenderer.render.bind(this.mainRenderer);
        this.mainRenderer.render = () => {
            originalRender();
            this.renderMarquee();
        };
    }

    initializeManagers() {
        this.toolManager = new ToolManager(this.state, this.mainRenderer, this.commandManager);
        this.propertiesPanel = new PropertiesPanel(this.state);
        
        // Set initial tool
        this.state.setActiveTool('select');
        
        // Bind command manager events
        this.commandManager.on('historyChanged', () => {
            this.updateUndoRedoButtons();
        });
    }

    setupMenuBar() {
        // Add menu bar to HTML
        const menuBar = document.createElement('div');
        menuBar.className = 'menu-bar';
        menuBar.innerHTML = `
            <div class="menu-group">
                <button id="new-btn" class="menu-button">New</button>
                <button id="open-btn" class="menu-button">Open</button>
                <button id="save-btn" class="menu-button">Save</button>
            </div>
            <div class="menu-group">
                <button id="undo-btn" class="menu-button" disabled>Undo</button>
                <button id="redo-btn" class="menu-button" disabled>Redo</button>
            </div>
            <div class="menu-group">
                <button id="copy-btn" class="menu-button">Copy</button>
                <button id="paste-btn" class="menu-button">Paste</button>
                <button id="duplicate-btn" class="menu-button">Duplicate</button>
            </div>
            <div class="menu-group">
                <button id="export-png-btn" class="menu-button">Export PNG</button>
                <button id="export-svg-btn" class="menu-button">Export SVG</button>
            </div>
            <div class="menu-group">
                <label>
                    <input type="checkbox" id="snap-grid" checked> Snap to Grid
                </label>
            </div>
        `;
        
        // Insert before top-bar
        const topBar = document.querySelector('.top-bar');
        topBar.parentNode.insertBefore(menuBar, topBar);
        
        // Bind menu events
        this.bindMenuEvents();
    }

    bindMenuEvents() {
        // File operations
        document.getElementById('new-btn').addEventListener('click', () => this.newDrawing());
        document.getElementById('open-btn').addEventListener('click', () => this.openFile());
        document.getElementById('save-btn').addEventListener('click', () => this.saveFile());
        
        // Edit operations
        document.getElementById('undo-btn').addEventListener('click', () => this.commandManager.undo());
        document.getElementById('redo-btn').addEventListener('click', () => this.commandManager.redo());
        document.getElementById('copy-btn').addEventListener('click', () => this.copy());
        document.getElementById('paste-btn').addEventListener('click', () => this.paste());
        document.getElementById('duplicate-btn').addEventListener('click', () => this.duplicate());
        
        // Export operations
        document.getElementById('export-png-btn').addEventListener('click', () => this.exportPNG());
        document.getElementById('export-svg-btn').addEventListener('click', () => this.exportSVG());
        
        // Settings
        document.getElementById('snap-grid').addEventListener('change', (e) => {
            this.state.snapToGrid = e.target.checked;
        });
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
            
            // Snap to grid if enabled
            if (this.state.snapToGrid) {
                pos.x = Math.round(pos.x / this.state.gridSize) * this.state.gridSize;
                pos.y = Math.round(pos.y / this.state.gridSize) * this.state.gridSize;
            }
            
            document.getElementById('cursor-position').textContent = 
                `${Math.round(pos.x)}, ${Math.round(pos.y)}`;
        });

        // Enhanced keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT') return;
            
            switch (e.key.toLowerCase()) {
                // Tool shortcuts
                case 'v': this.setTool('select'); break;
                case 'r': this.setTool('rectangle'); break;
                case 'o': this.setTool('ellipse'); break;
                case 'l': this.setTool('line'); break;
                case 't': this.setTool('text'); break;
                case 'h': this.setTool('pan'); break;
                
                // Edit shortcuts
                case 'delete':
                case 'backspace':
                    this.deleteSelected();
                    break;
                    
                case 'c':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.copy();
                    }
                    break;
                    
                case 'v':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.paste();
                    }
                    break;
                    
                case 'x':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.cut();
                    }
                    break;
                    
                case 'd':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.duplicate();
                    }
                    break;
                    
                case 'z':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        if (e.shiftKey) {
                            this.commandManager.redo();
                        } else {
                            this.commandManager.undo();
                        }
                    }
                    break;
                    
                case 's':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.saveFile();
                    }
                    break;
                    
                case 'o':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.openFile();
                    }
                    break;
                    
                case 'n':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.newDrawing();
                    }
                    break;
            }
        });
    }

    renderMarquee() {
        const selectTool = this.toolManager.tools.get('select');
        if (selectTool && selectTool.isMarquee) {
            selectTool.renderMarquee(this.mainRenderer.ctx);
        }
    }

    // File operations
    newDrawing() {
        if (confirm('Create new drawing? This will clear the current drawing.')) {
            this.state.shapes.clear();
            this.state.clearSelection();
            this.commandManager.clear();
            this.updateStatusText('New drawing created');
        }
    }

    async openFile() {
        try {
            await this.fileManager.uploadFile();
            this.updateStatusText('File loaded successfully');
        } catch (error) {
            this.updateStatusText('Failed to load file');
        }
    }

    saveFile() {
        this.fileManager.downloadFile(`drawing-${Date.now()}.json`);
        this.updateStatusText('File saved');
    }

    exportPNG() {
        this.fileManager.exportToPNG(`drawing-${Date.now()}.png`);
        this.updateStatusText('Exported as PNG');
    }

    exportSVG() {
        this.fileManager.exportToSVG(`drawing-${Date.now()}.svg`);
        this.updateStatusText('Exported as SVG');
    }

    // Edit operations
    copy() {
        if (this.clipboardManager.copy()) {
            this.updateStatusText('Copied to clipboard');
        }
    }

    paste() {
        if (this.clipboardManager.paste()) {
            this.updateStatusText('Pasted from clipboard');
        }
    }

    cut() {
        if (this.clipboardManager.cut()) {
            this.updateStatusText('Cut to clipboard');
        }
    }

    duplicate() {
        if (this.clipboardManager.duplicate()) {
            this.updateStatusText('Duplicated selection');
        }
    }

    deleteSelected() {
        if (this.state.selectedShapes.size > 0) {
            const shapes = Array.from(this.state.selectedShapes);
            shapes.forEach(shape => this.state.removeShape(shape.id));
            this.updateStatusText(`Deleted ${shapes.length} shape(s)`);
        }
    }

    // UI updates
    setTool(tool) {
        this.state.setActiveTool(tool);
        document.querySelectorAll('.tool-button').forEach(b => b.classList.remove('active'));
        const button = document.querySelector(`[data-tool="${tool}"]`);
        if (button) button.classList.add('active');
    }

    updateUndoRedoButtons() {
        document.getElementById('undo-btn').disabled = !this.commandManager.canUndo();
        document.getElementById('redo-btn').disabled = !this.commandManager.canRedo();
    }

    updateZoomDisplay() {
        document.getElementById('zoom-level').textContent = Math.round(this.state.zoom * 100) + '%';
    }

    updateStatusText(text) {
        document.getElementById('status-text').textContent = text;
        setTimeout(() => {
            document.getElementById('status-text').textContent = 
                `${this.state.shapes.size} shapes`;
        }, 2000);
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

// Enhanced CanvasState with snap-to-grid
// Add this property to CanvasState constructor:
/*
this.snapToGrid = true;
*/

// Enhanced CSS for menu bar (add to components.css)
/*
.menu-bar {
    height: 40px;
    background: #f5f5f5;
    border-bottom: 1px solid #e1e5e9;
    display: flex;
    align-items: center;
    padding: 0 16px;
    gap: 24px;
}

.menu-group {
    display: flex;
    align-items: center;
    gap: 8px;
}

.menu-button {
    padding: 6px 12px;
    border: 1px solid #dadce0;
    border-radius: 4px;
    background: white;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s;
}

.menu-button:hover:not(:disabled) {
    background: #f1f3f4;
}

.menu-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.menu-group label {
    font-size: 12px;
    display: flex;
    align-items: center;
    gap: 4px;
}
*/

// Initialize the enhanced application
const app = new EnhancedDrawingApp();