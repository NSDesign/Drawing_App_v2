// src/js/core/Application.js - Main Application Core

import { EventManager } from './EventManager.js';
import { StateManager } from './StateManager.js';
import { CommandManager } from './CommandManager.js';
import { CanvasManager } from '../canvas/CanvasManager.js';
import { ToolManager } from '../tools/ToolManager.js';
import { UIManager } from '../ui/UIManager.js';
import { MenuManager } from '../ui/MenuManager.js';
import { InputManager } from '../utils/InputManager.js';
import { ShapeManager } from '../shapes/ShapeManager.js';

/**
 * Main Drawing Application Class
 * Orchestrates all subsystems and manages application lifecycle
 */
export class DrawingApplication {
    constructor(elements) {
        this.elements = elements;
        this.initialized = false;
        
        // Core systems
        this.eventManager = new EventManager();
        this.stateManager = new StateManager();
        this.commandManager = new CommandManager();
        
        // Managers
        this.canvasManager = null;
        this.toolManager = null;
        this.uiManager = null;
        this.menuManager = null;
        this.inputManager = null;
        this.shapeManager = null;
        
        // Bind methods
        this.handleResize = this.handleResize.bind(this);
        this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    }

    /**
     * Initialize the application and all subsystems
     */
    async initialize() {
        console.log('Initializing Drawing Application...');
        
        try {
            // Initialize core systems first
            await this.initializeCore();
            
            // Initialize managers
            await this.initializeManagers();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Setup initial state
            this.setupInitialState();
            
            this.initialized = true;
            
            // Emit ready event
            this.eventManager.emit('app:ready', { app: this });
            
            console.log('Drawing Application initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize Drawing Application:', error);
            throw error;
        }
    }

    /**
     * Initialize core systems
     */
    async initializeCore() {
        // Initialize state with default values
        this.stateManager.setState({
            canvas: {
                width: 800,
                height: 600,
                zoom: 1,
                panX: 0,
                panY: 0,
                showGrid: true,
                gridSize: 20,
                snapToGrid: false
            },
            tool: {
                active: 'select-object',
                mode: 'select'
            },
            selection: {
                shapes: [],
                bounds: null
            },
            ui: {
                propertiesPanelVisible: true,
                statusBarVisible: true
            }
        });

        // Initialize command manager with undo/redo support
        this.commandManager.initialize({
            maxHistorySize: 50
        });
    }

    /**
     * Initialize all managers
     */
    async initializeManagers() {
        // Initialize canvas manager
        this.canvasManager = new CanvasManager({
            container: this.elements.container,
            eventManager: this.eventManager,
            stateManager: this.stateManager
        });
        await this.canvasManager.initialize();

        // Initialize shape manager
        this.shapeManager = new ShapeManager({
            canvasManager: this.canvasManager,
            eventManager: this.eventManager,
            stateManager: this.stateManager,
            commandManager: this.commandManager
        });

        // Initialize input manager
        this.inputManager = new InputManager({
            canvasContainer: this.elements.container,
            eventManager: this.eventManager,
            stateManager: this.stateManager
        });

        // Initialize tool manager
        this.toolManager = new ToolManager({
            toolbar: this.elements.toolbar,
            eventManager: this.eventManager,
            stateManager: this.stateManager,
            canvasManager: this.canvasManager,
            shapeManager: this.shapeManager,
            inputManager: this.inputManager,
            commandManager: this.commandManager
        });

        // Initialize UI manager
        this.uiManager = new UIManager({
            propertiesPanel: this.elements.propertiesPanel,
            statusBar: this.elements.statusBar,
            eventManager: this.eventManager,
            stateManager: this.stateManager
        });

        // Initialize menu manager
        this.menuManager = new MenuManager({
            mainMenu: this.elements.mainMenu,
            eventManager: this.eventManager,
            stateManager: this.stateManager,
            commandManager: this.commandManager,
            canvasManager: this.canvasManager,
            shapeManager: this.shapeManager
        });

        // Initialize all managers
        await Promise.all([
            this.shapeManager.initialize(),
            this.inputManager.initialize(),
            this.toolManager.initialize(),
            this.uiManager.initialize(),
            this.menuManager.initialize()
        ]);
    }

    /**
     * Setup global event listeners
     */
    setupEventListeners() {
        // Window events
        window.addEventListener('resize', this.handleResize);
        document.addEventListener('visibilitychange', this.handleVisibilityChange);

        // Application events
        this.eventManager.on('canvas:resize', this.handleCanvasResize.bind(this));
        this.eventManager.on('tool:changed', this.handleToolChanged.bind(this));
        this.eventManager.on('shape:created', this.handleShapeCreated.bind(this));
        this.eventManager.on('shape:selected', this.handleShapeSelected.bind(this));
        this.eventManager.on('shape:deselected', this.handleShapeDeselected.bind(this));
        this.eventManager.on('state:changed', this.handleStateChanged.bind(this));

        // Error handling
        this.eventManager.on('error', this.handleError.bind(this));
    }

    /**
     * Setup initial application state
     */
    setupInitialState() {
        // Set initial canvas size
        this.handleResize();
        
        // Set initial tool
        this.toolManager.setActiveTool('select-object');
        
        // Update UI
        this.uiManager.updateAll();
    }

    /**
     * Handle window resize
     */
    handleResize() {
        if (!this.canvasManager) return;
        
        const container = this.elements.container;
        const rect = container.getBoundingClientRect();
        
        this.canvasManager.resize(rect.width, rect.height);
        this.eventManager.emit('app:resize', { 
            width: rect.width, 
            height: rect.height 
        });
    }

    /**
     * Handle canvas resize
     */
    handleCanvasResize(event) {
        const { width, height } = event.data;
        this.stateManager.setState({
            canvas: {
                ...this.stateManager.getState().canvas,
                width,
                height
            }
        });
    }

    /**
     * Handle visibility change (tab switching, minimizing)
     */
    handleVisibilityChange() {
        if (document.hidden) {
            // Pause rendering when not visible
            this.canvasManager?.pauseRendering();
        } else {
            // Resume rendering when visible
            this.canvasManager?.resumeRendering();
        }
    }

    /**
     * Handle tool changes
     */
    handleToolChanged(event) {
        const { tool, mode } = event.data;
        this.stateManager.setState({
            tool: { active: tool, mode }
        });
        
        // Update UI to reflect tool change
        this.uiManager.updateToolProperties(tool);
    }

    /**
     * Handle shape creation
     */
    handleShapeCreated(event) {
        const { shape } = event.data;
        console.log('Shape created:', shape.id);
        
        // Update UI
        this.uiManager.updateShapeCount();
    }

    /**
     * Handle shape selection
     */
    handleShapeSelected(event) {
        const { shapes } = event.data;
        this.stateManager.setState({
            selection: {
                shapes: shapes.map(s => s.id),
                bounds: this.calculateSelectionBounds(shapes)
            }
        });
        
        // Update properties panel
        this.uiManager.updateSelectionProperties(shapes);
    }

    /**
     * Handle shape deselection
     */
    handleShapeDeselected() {
        this.stateManager.setState({
            selection: { shapes: [], bounds: null }
        });
        
        // Clear properties panel
        this.uiManager.clearSelectionProperties();
    }

    /**
     * Handle state changes
     */
    handleStateChanged(event) {
        const { path, value } = event.data;
        
        // Update status bar
        this.uiManager.updateStatusBar();
        
        // Re-render canvas if needed
        if (path.startsWith('canvas.') || path.startsWith('selection.')) {
            this.canvasManager.requestRender();
        }
    }

    /**
     * Handle application errors
     */
    handleError(event) {
        const { error, context } = event.data;
        console.error(`Application error in ${context}:`, error);
        
        // Show user-friendly error message
        this.uiManager.showError(`An error occurred: ${error.message}`);
    }

    /**
     * Calculate bounds for selected shapes
     */
    calculateSelectionBounds(shapes) {
        if (!shapes.length) return null;
        
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        
        shapes.forEach(shape => {
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

    /**
     * Get current application state
     */
    getState() {
        return this.stateManager.getState();
    }

    /**
     * Save current project
     */
    async saveProject(filename) {
        const state = this.getState();
        const shapes = this.shapeManager.getAllShapes();
        
        const projectData = {
            version: '2.0',
            timestamp: new Date().toISOString(),
            canvas: state.canvas,
            shapes: shapes.map(shape => shape.serialize())
        };
        
        return projectData;
    }

    /**
     * Load project from data
     */
    async loadProject(projectData) {
        try {
            // Clear current project
            this.shapeManager.clear();
            
            // Restore canvas settings
            if (projectData.canvas) {
                this.stateManager.setState({ canvas: projectData.canvas });
            }
            
            // Recreate shapes
            if (projectData.shapes) {
                for (const shapeData of projectData.shapes) {
                    this.shapeManager.createFromData(shapeData);
                }
            }
            
            // Refresh UI
            this.uiManager.updateAll();
            this.canvasManager.requestRender();
            
            this.eventManager.emit('project:loaded', { projectData });
            
        } catch (error) {
            console.error('Failed to load project:', error);
            throw new Error('Invalid project file');
        }
    }

    /**
     * Export canvas as image
     */
    async exportImage(format = 'png', quality = 1) {
        return this.canvasManager.exportImage(format, quality);
    }

    /**
     * Cleanup and destroy application
     */
    destroy() {
        if (!this.initialized) return;
        
        console.log('Destroying Drawing Application...');
        
        // Remove event listeners
        window.removeEventListener('resize', this.handleResize);
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
        
        // Destroy managers in reverse order
        this.menuManager?.destroy();
        this.uiManager?.destroy();
        this.toolManager?.destroy();
        this.inputManager?.destroy();
        this.shapeManager?.destroy();
        this.canvasManager?.destroy();
        
        // Clear core systems
        this.commandManager?.destroy();
        this.eventManager?.removeAllListeners();
        this.stateManager?.clear();
        
        this.initialized = false;
        
        console.log('Drawing Application destroyed');
    }
}