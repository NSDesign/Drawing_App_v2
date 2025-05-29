// src/js/tools/ToolManager.js - Drawing Tools Management

import { SelectTool } from './SelectTool.js';
import { CreateRectangleTool } from './CreateRectangleTool.js';
import { CreateEllipseTool } from './CreateEllipseTool.js';
import { CreateLineTool } from './CreateLineTool.js';
import { CreateTextTool } from './CreateTextTool.js';
import { ZoomTool } from './ZoomTool.js';
import { PanTool } from './PanTool.js';

/**
 * Base class for all drawing tools
 */
export class BaseTool {
    constructor(name, options = {}) {
        this.name = name;
        this.cursor = options.cursor || 'default';
        this.isActive = false;
        this.shortcut = options.shortcut || null;
        this.icon = options.icon || null;
        this.description = options.description || name;
        
        // Tool state
        this.isDragging = false;
        this.startPoint = null;
        this.currentPoint = null;
        this.lastPoint = null;
        
        // Dependencies will be injected
        this.eventManager = null;
        this.stateManager = null;
        this.canvasManager = null;
        this.shapeManager = null;
        this.commandManager = null;
        this.inputManager = null;
    }

    /**
     * Initialize tool with dependencies
     */
    initialize(dependencies) {
        this.eventManager = dependencies.eventManager;
        this.stateManager = dependencies.stateManager;
        this.canvasManager = dependencies.canvasManager;
        this.shapeManager = dependencies.shapeManager;
        this.commandManager = dependencies.commandManager;
        this.inputManager = dependencies.inputManager;
    }

    /**
     * Activate the tool
     */
    activate() {
        this.isActive = true;
        this.setCursor();
        this.onActivate();
    }

    /**
     * Deactivate the tool
     */
    deactivate() {
        this.isActive = false;
        this.cleanup();
        this.onDeactivate();
    }

    /**
     * Set cursor style
     */
    setCursor() {
        const drawLayer = this.canvasManager.getLayer('draw');
        if (drawLayer) {
            drawLayer.canvas.style.cursor = this.cursor;
        }
    }

    /**
     * Handle mouse down event
     */
    onMouseDown(event) {
        if (!this.isActive) return false;
        
        this.startPoint = this.getCanvasPoint(event);
        this.currentPoint = { ...this.startPoint };
        this.lastPoint = { ...this.startPoint };
        this.isDragging = true;
        
        return this.handleMouseDown(event, this.startPoint);
    }

    /**
     * Handle mouse move event
     */
    onMouseMove(event) {
        if (!this.isActive) return false;
        
        this.lastPoint = this.currentPoint ? { ...this.currentPoint } : null;
        this.currentPoint = this.getCanvasPoint(event);
        
        if (this.isDragging) {
            return this.handleMouseDrag(event, this.currentPoint, this.startPoint);
        } else {
            return this.handleMouseMove(event, this.currentPoint);
        }
    }

    /**
     * Handle mouse up event
     */
    onMouseUp(event) {
        if (!this.isActive) return false;
        
        const endPoint = this.getCanvasPoint(event);
        const result = this.handleMouseUp(event, endPoint, this.startPoint);
        
        this.isDragging = false;
        this.startPoint = null;
        this.currentPoint = null;
        this.lastPoint = null;
        
        return result;
    }

    /**
     * Handle key down event
     */
    onKeyDown(event) {
        if (!this.isActive) return false;
        return this.handleKeyDown(event);
    }

    /**
     * Handle key up event
     */
    onKeyUp(event) {
        if (!this.isActive) return false;
        return this.handleKeyUp(event);
    }

    /**
     * Get canvas coordinates from mouse event
     */
    getCanvasPoint(event) {
        return this.canvasManager.screenToCanvas(event.clientX, event.clientY);
    }

    /**
     * Get current tool properties
     */
    getProperties() {
        return {};
    }

    /**
     * Set tool properties
     */
    setProperties(properties) {
        // Override in subclasses
    }

    /**
     * Cleanup tool state
     */
    cleanup() {
        this.isDragging = false;
        this.startPoint = null;
        this.currentPoint = null;
        this.lastPoint = null;
    }

    // Override these methods in subclasses
    onActivate() {}
    onDeactivate() {}
    handleMouseDown(event, point) { return false; }
    handleMouseMove(event, point) { return false; }
    handleMouseDrag(event, point, startPoint) { return false; }
    handleMouseUp(event, point, startPoint) { return false; }
    handleKeyDown(event) { return false; }
    handleKeyUp(event) { return false; }
}

/**
 * Tool Manager for handling different drawing tools
 */
export class ToolManager {
    constructor({ toolbar, eventManager, stateManager, canvasManager, shapeManager, inputManager, commandManager }) {
        this.toolbar = toolbar;
        this.eventManager = eventManager;
        this.stateManager = stateManager;
        this.canvasManager = canvasManager;
        this.shapeManager = shapeManager;
        this.inputManager = inputManager;
        this.commandManager = commandManager;
        
        // Tools registry
        this.tools = new Map();
        this.activeTool = null;
        this.defaultTool = 'select-object';
        
        // Tool dependencies object
        this.dependencies = {
            eventManager: this.eventManager,
            stateManager: this.stateManager,
            canvasManager: this.canvasManager,
            shapeManager: this.shapeManager,
            inputManager: this.inputManager,
            commandManager: this.commandManager
        };
        
        // Bind methods
        this.handleToolButtonClick = this.handleToolButtonClick.bind(this);
    }

    /**
     * Initialize tool manager
     */
    async initialize() {
        console.log('Initializing ToolManager...');
        
        // Register built-in tools
        this.registerBuiltInTools();
        
        // Setup toolbar event listeners
        this.setupToolbarEvents();
        
        // Set default tool
        this.setActiveTool(this.defaultTool);
        
        console.log('ToolManager initialized');
    }

    /**
     * Register built-in tools
     */
    registerBuiltInTools() {
        const toolClasses = [
            { name: 'select-object', class: SelectTool, options: { cursor: 'default' } },
            { name: 'select-element', class: SelectTool, options: { cursor: 'pointer', mode: 'element' } },
            { name: 'create-rectangle', class: CreateRectangleTool, options: { cursor: 'crosshair' } },
            { name: 'create-ellipse', class: CreateEllipseTool, options: { cursor: 'crosshair' } },
            { name: 'create-line', class: CreateLineTool, options: { cursor: 'crosshair' } },
            { name: 'create-text', class: CreateTextTool, options: { cursor: 'text' } },
            { name: 'zoom', class: ZoomTool, options: { cursor: 'zoom-in' } },
            { name: 'pan', class: PanTool, options: { cursor: 'move' } }
        ];

        toolClasses.forEach(({ name, class: ToolClass, options }) => {
            try {
                const tool = new ToolClass(name, options);
                tool.initialize(this.dependencies);
                this.tools.set(name, tool);
            } catch (error) {
                console.warn(`Failed to register tool ${name}:`, error);
            }
        });
    }

    /**
     * Register a custom tool
     */
    registerTool(name, toolInstance) {
        if (!(toolInstance instanceof BaseTool)) {
            throw new Error('Tool must extend BaseTool class');
        }
        
        toolInstance.initialize(this.dependencies);
        this.tools.set(name, toolInstance);
        
        this.eventManager.emit('tool:registered', { name, tool: toolInstance });
    }

    /**
     * Unregister a tool
     */
    unregisterTool(name) {
        const tool = this.tools.get(name);
        if (tool) {
            if (this.activeTool === tool) {
                this.setActiveTool(this.defaultTool);
            }
            tool.deactivate();
            this.tools.delete(name);
            
            this.eventManager.emit('tool:unregistered', { name, tool });
        }
    }

    /**
     * Setup toolbar event listeners
     */
    setupToolbarEvents() {
        if (!this.toolbar) return;
        
        // Add click listeners to tool buttons
        this.toolbar.addEventListener('click', this.handleToolButtonClick);
        
        // Add hover effects
        this.toolbar.addEventListener('mouseover', (event) => {
            const button = event.target.closest('.tool-button');
            if (button && !button.classList.contains('active')) {
                button.style.transform = 'scale(1.05)';
            }
        });
        
        this.toolbar.addEventListener('mouseout', (event) => {
            const button = event.target.closest('.tool-button');
            if (button && !button.classList.contains('active')) {
                button.style.transform = '';
            }
        });
    }

    /**
     * Handle tool button clicks
     */
    handleToolButtonClick(event) {
        const button = event.target.closest('.tool-button');
        if (!button) return;
        
        const toolName = button.getAttribute('data-tool');
        if (toolName) {
            this.setActiveTool(toolName);
        }
    }

    /**
     * Set active tool
     */
    setActiveTool(toolName) {
        const newTool = this.tools.get(toolName);
        if (!newTool) {
            console.warn(`Tool not found: ${toolName}`);
            return false;
        }
        
        // Deactivate current tool
        if (this.activeTool) {
            this.activeTool.deactivate();
        }
        
        // Activate new tool
        this.activeTool = newTool;
        this.activeTool.activate();
        
        // Update UI
        this.updateToolbarUI(toolName);
        
        // Update state
        this.stateManager.setState({
            tool: {
                active: toolName,
                mode: this.getToolMode(toolName)
            }
        });
        
        // Emit event
        this.eventManager.emit('tool:changed', {
            tool: toolName,
            mode: this.getToolMode(toolName),
            toolInstance: this.activeTool
        });
        
        return true;
    }

    /**
     * Get tool mode based on tool name
     */
    getToolMode(toolName) {
        if (toolName.startsWith('select')) return 'select';
        if (toolName.startsWith('create')) return 'create';
        if (toolName === 'zoom' || toolName === 'pan') return 'manipulate';
        return 'unknown';
    }

    /**
     * Update toolbar UI to reflect active tool
     */
    updateToolbarUI(activeToolName) {
        if (!this.toolbar) return;
        
        // Remove active class from all buttons
        const buttons = this.toolbar.querySelectorAll('.tool-button');
        buttons.forEach(button => {
            button.classList.remove('active');
            button.style.transform = '';
        });
        
        // Add active class to current tool button
        const activeButton = this.toolbar.querySelector(`[data-tool="${activeToolName}"]`);
        if (activeButton) {
            activeButton.classList.add('active');
        }
    }

    /**
     * Get active tool
     */
    getActiveTool() {
        return this.activeTool;
    }

    /**
     * Get tool by name
     */
    getTool(name) {
        return this.tools.get(name);
    }

    /**
     * Get all registered tools
     */
    getAllTools() {
        return Array.from(this.tools.entries()).map(([name, tool]) => ({
            name,
            tool,
            description: tool.description,
            shortcut: tool.shortcut,
            cursor: tool.cursor
        }));
    }

    /**
     * Handle input events and forward to active tool
     */
    handleInputEvent(eventType, event) {
        if (!this.activeTool) return false;
        
        switch (eventType) {
            case 'mousedown':
                return this.activeTool.onMouseDown(event);
            case 'mousemove':
                return this.activeTool.onMouseMove(event);
            case 'mouseup':
                return this.activeTool.onMouseUp(event);
            case 'keydown':
                return this.activeTool.onKeyDown(event);
            case 'keyup':
                return this.activeTool.onKeyUp(event);
            default:
                return false;
        }
    }

    /**
     * Get properties of active tool
     */
    getActiveToolProperties() {
        return this.activeTool ? this.activeTool.getProperties() : {};
    }

    /**
     * Set properties of active tool
     */
    setActiveToolProperties(properties) {
        if (this.activeTool) {
            this.activeTool.setProperties(properties);
            this.eventManager.emit('tool:properties-changed', {
                tool: this.activeTool.name,
                properties
            });
        }
    }

    /**
     * Check if a tool exists
     */
    hasTool(name) {
        return this.tools.has(name);
    }

    /**
     * Get tool shortcuts for help/documentation
     */
    getToolShortcuts() {
        const shortcuts = {};
        this.tools.forEach((tool, name) => {
            if (tool.shortcut) {
                shortcuts[tool.shortcut] = name;
            }
        });
        return shortcuts;
    }

    /**
     * Enable/disable all tools
     */
    setEnabled(enabled) {
        if (this.toolbar) {
            this.toolbar.style.pointerEvents = enabled ? 'auto' : 'none';
            this.toolbar.style.opacity = enabled ? '1' : '0.5';
        }
        
        if (!enabled && this.activeTool) {
            this.activeTool.cleanup();
        }
    }

    /**
     * Reset all tools to default state
     */
    reset() {
        // Cleanup current tool
        if (this.activeTool) {
            this.activeTool.cleanup();
        }
        
        // Reset to default tool
        this.setActiveTool(this.defaultTool);
    }

    /**
     * Get tool statistics
     */
    getStats() {
        return {
            totalTools: this.tools.size,
            activeTool: this.activeTool?.name || 'none',
            registeredTools: Array.from(this.tools.keys())
        };
    }

    /**
     * Destroy tool manager
     */
    destroy() {
        console.log('Destroying ToolManager...');
        
        // Deactivate current tool
        if (this.activeTool) {
            this.activeTool.deactivate();
        }
        
        // Remove event listeners
        if (this.toolbar) {
            this.toolbar.removeEventListener('click', this.handleToolButtonClick);
        }
        
        // Clear tools
        this.tools.clear();
        this.activeTool = null;
        
        console.log('ToolManager destroyed');
    }
}