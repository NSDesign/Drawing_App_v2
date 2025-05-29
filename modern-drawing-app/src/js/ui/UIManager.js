// src/js/ui/UIManager.js - User Interface Management

/**
 * Manages the user interface components and updates
 */
export class UIManager {
    constructor({ propertiesPanel, statusBar, eventManager, stateManager }) {
        this.propertiesPanel = propertiesPanel;
        this.statusBar = statusBar;
        this.eventManager = eventManager;
        this.stateManager = stateManager;
        
        // UI state
        this.currentTool = null;
        this.selectedShapes = [];
        this.mousePosition = { x: 0, y: 0 };
        
        // DOM elements
        this.propertiesContent = null;
        this.statusElements = {};
        
        // Property controls cache
        this.propertyControls = new Map();
        
        // Debounced update functions
        this.debouncedUpdateStatus = this.debounce(this.updateStatusBar.bind(this), 16);
    }

    /**
     * Initialize UI manager
     */
    async initialize() {
        console.log('Initializing UIManager...');
        
        // Get DOM elements
        this.propertiesContent = this.propertiesPanel?.querySelector('#propertiesContent');
        this.setupStatusBarElements();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Initial UI update
        this.updateAll();
        
        console.log('UIManager initialized');
    }

    /**
     * Setup status bar elements
     */
    setupStatusBarElements() {
        if (!this.statusBar) return;
        
        this.statusElements = {
            mousePosition: this.statusBar.querySelector('#mousePosition'),
            canvasSize: this.statusBar.querySelector('#canvasSize'),
            zoomLevel: this.statusBar.querySelector('#zoomLevel')
        };
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Tool changes
        this.eventManager.on('tool:changed', this.handleToolChanged.bind(this));
        
        // Shape selection
        this.eventManager.on('shape:selected', this.handleShapeSelected.bind(this));
        this.eventManager.on('shape:deselected', this.handleShapeDeselected.bind(this));
        
        // Mouse position updates
        this.eventManager.on('mouse:move', this.handleMouseMove.bind(this));
        
        // Canvas changes
        this.eventManager.on('canvas:resize', this.handleCanvasResize.bind(this));
        this.eventManager.on('canvas:transform', this.handleCanvasTransform.bind(this));
        
        // State changes
        this.stateManager.subscribe('canvas', this.debouncedUpdateStatus);
        this.stateManager.subscribe('tool', this.handleToolStateChange.bind(this));
    }

    /**
     * Update all UI components
     */
    updateAll() {
        this.updateToolProperties();
        this.updateStatusBar();
        this.updateSelectionProperties([]);
    }

    /**
     * Handle tool changed event
     */
    handleToolChanged(event) {
        const { tool, toolInstance } = event.data;
        this.currentTool = toolInstance;
        this.updateToolProperties(tool);
    }

    /**
     * Handle tool state changes
     */
    handleToolStateChange(event) {
        this.updateToolProperties();
    }

    /**
     * Update tool properties panel
     */
    updateToolProperties(toolName = null) {
        if (!this.propertiesContent) return;
        
        const tool = toolName || this.stateManager.getState().tool?.active;
        
        if (!tool || !this.currentTool) {
            this.showDefaultProperties();
            return;
        }
        
        // Get tool properties and controls
        const properties = this.currentTool.getProperties();
        const controls = this.currentTool.getUIControls ? this.currentTool.getUIControls() : [];
        
        // Clear existing content
        this.propertiesContent.innerHTML = '';
        
        // Create tool properties section
        this.createToolSection(tool, properties, controls);
    }

    /**
     * Create tool properties section
     */
    createToolSection(toolName, properties, controls) {
        const section = this.createElement('div', 'property-section');
        
        // Section header
        const header = this.createElement('h4', 'property-header');
        header.textContent = this.formatToolName(toolName);
        section.appendChild(header);
        
        // Create controls
        if (controls.length > 0) {
            controls.forEach(control => {
                const controlElement = this.createPropertyControl(control);
                if (controlElement) {
                    section.appendChild(controlElement);
                }
            });
        } else {
            // Fallback: create basic controls from properties
            this.createBasicControls(properties).forEach(control => {
                section.appendChild(control);
            });
        }
        
        this.propertiesContent.appendChild(section);
    }

    /**
     * Create a property control element
     */
    createPropertyControl(controlConfig) {
        const { type, property, label, value, ...options } = controlConfig;
        
        const group = this.createElement('div', 'property-group');
        
        // Create label
        const labelElement = this.createElement('label', 'property-label');
        labelElement.textContent = label;
        labelElement.setAttribute('for', property);
        group.appendChild(labelElement);
        
        // Create input based on type
        let input = null;
        
        switch (type) {
            case 'number':
                input = this.createNumberInput(property, value, options);
                break;
            case 'color':
                input = this.createColorInput(property, value, options);
                break;
            case 'checkbox':
                input = this.createCheckboxInput(property, value, options);
                break;
            case 'select':
                input = this.createSelectInput(property, value, options);
                break;
            case 'range':
                input = this.createRangeInput(property, value, options);
                break;
            case 'text':
            default:
                input = this.createTextInput(property, value, options);
                break;
        }
        
        if (input) {
            input.id = property;
            input.disabled = options.disabled || false;
            
            // Add change listener
            input.addEventListener('change', (event) => {
                this.handlePropertyChange(property, event.target.value, event.target.type);
            });
            
            group.appendChild(input);
            
            // Cache the control
            this.propertyControls.set(property, input);
        }
        
        return group;
    }

    /**
     * Create number input
     */
    createNumberInput(property, value, options) {
        const input = this.createElement('input', 'property-input');
        input.type = 'number';
        input.value = value;
        
        if (options.min !== undefined) input.min = options.min;
        if (options.max !== undefined) input.max = options.max;
        if (options.step !== undefined) input.step = options.step;
        
        return input;
    }

    /**
     * Create color input
     */
    createColorInput(property, value, options) {
        const container = this.createElement('div', 'color-input-container');
        
        const input = this.createElement('input', 'property-input color-input');
        input.type = 'color';
        
        // Convert rgba/hex to hex for color input
        const hexValue = this.rgbaToHex(value);
        input.value = hexValue;
        
        const textInput = this.createElement('input', 'property-input color-text');
        textInput.type = 'text';
        textInput.value = value;
        
        // Sync inputs
        input.addEventListener('change', () => {
            textInput.value = input.value;
            textInput.dispatchEvent(new Event('change'));
        });
        
        textInput.addEventListener('change', () => {
            const hexValue = this.rgbaToHex(textInput.value);
            if (hexValue) {
                input.value = hexValue;
            }
        });
        
        container.appendChild(input);
        container.appendChild(textInput);
        
        // Return text input as the main control
        return textInput;
    }

    /**
     * Create checkbox input
     */
    createCheckboxInput(property, value, options) {
        const container = this.createElement('div', 'property-checkbox');
        
        const input = this.createElement('input');
        input.type = 'checkbox';
        input.checked = Boolean(value);
        
        const label = this.createElement('span');
        label.textContent = options.checkboxLabel || '';
        
        container.appendChild(input);
        container.appendChild(label);
        
        return input;
    }

    /**
     * Create select input
     */
    createSelectInput(property, value, options) {
        const select = this.createElement('select', 'property-input');
        
        if (options.options) {
            options.options.forEach(option => {
                const optionElement = this.createElement('option');
                optionElement.value = option.value;
                optionElement.textContent = option.label;
                optionElement.selected = option.value === value;
                select.appendChild(optionElement);
            });
        }
        
        return select;
    }

    /**
     * Create range input
     */
    createRangeInput(property, value, options) {
        const container = this.createElement('div', 'range-input-container');
        
        const range = this.createElement('input', 'property-range');
        range.type = 'range';
        range.value = value;
        
        if (options.min !== undefined) range.min = options.min;
        if (options.max !== undefined) range.max = options.max;
        if (options.step !== undefined) range.step = options.step;
        
        const display = this.createElement('span', 'range-display');
        display.textContent = value;
        
        range.addEventListener('input', () => {
            display.textContent = range.value;
        });
        
        container.appendChild(range);
        container.appendChild(display);
        
        return range;
    }

    /**
     * Create text input
     */
    createTextInput(property, value, options) {
        const input = this.createElement('input', 'property-input');
        input.type = 'text';
        input.value = value;
        
        if (options.placeholder) input.placeholder = options.placeholder;
        
        return input;
    }

    /**
     * Create basic controls from properties
     */
    createBasicControls(properties) {
        const controls = [];
        const basicProps = ['fillColor', 'strokeColor', 'strokeWidth', 'opacity'];
        
        basicProps.forEach(prop => {
            if (properties[prop] !== undefined) {
                let type = 'text';
                if (prop.includes('Color')) type = 'color';
                if (prop === 'strokeWidth' || prop === 'opacity') type = 'number';
                
                const control = this.createPropertyControl({
                    type,
                    property: prop,
                    label: this.formatPropertyName(prop),
                    value: properties[prop],
                    min: prop === 'opacity' ? 0 : undefined,
                    max: prop === 'opacity' ? 1 : undefined,
                    step: prop === 'opacity' ? 0.1 : undefined
                });
                
                if (control) controls.push(control);
            }
        });
        
        return controls;
    }

    /**
     * Handle property changes
     */
    handlePropertyChange(property, value, inputType) {
        if (!this.currentTool) return;
        
        // Convert value based on input type
        let convertedValue = value;
        if (inputType === 'number' || inputType === 'range') {
            convertedValue = parseFloat(value);
        } else if (inputType === 'checkbox') {
            convertedValue = Boolean(value);
        }
        
        // Update tool properties
        const properties = { [property]: convertedValue };
        this.currentTool.setProperties(properties);
        
        // Emit event
        this.eventManager.emit('ui:property-changed', {
            property,
            value: convertedValue,
            tool: this.currentTool.name
        });
    }

    /**
     * Handle shape selection
     */
    handleShapeSelected(event) {
        const { shapes } = event.data;
        this.selectedShapes = shapes;
        this.updateSelectionProperties(shapes);
    }

    /**
     * Handle shape deselection
     */
    handleShapeDeselected() {
        this.selectedShapes = [];
        this.updateSelectionProperties([]);
    }

    /**
     * Update selection properties panel
     */
    updateSelectionProperties(shapes) {
        if (!this.propertiesContent) return;
        
        if (shapes.length === 0) {
            // No selection - show tool properties only
            this.updateToolProperties();
            return;
        }
        
        // Clear existing content
        this.propertiesContent.innerHTML = '';
        
        // Create selection info section
        this.createSelectionSection(shapes);
        
        // Create common properties section
        if (shapes.length === 1) {
            this.createShapePropertiesSection(shapes[0]);
        } else if (shapes.length > 1) {
            this.createMultiSelectionSection(shapes);
        }
    }

    /**
     * Create selection info section
     */
    createSelectionSection(shapes) {
        const section = this.createElement('div', 'property-section');
        
        const header = this.createElement('h4', 'property-header');
        header.textContent = shapes.length === 1 ? 
            `Selected: ${shapes[0].type}` : 
            `Selected: ${shapes.length} objects`;
        section.appendChild(header);
        
        // Selection actions
        const actionsContainer = this.createElement('div', 'selection-actions');
        
        const deleteButton = this.createElement('button', 'action-button delete');
        deleteButton.textContent = 'Delete';
        deleteButton.addEventListener('click', () => {
            this.eventManager.emit('ui:delete-selected');
        });
        
        actionsContainer.appendChild(deleteButton);
        
        if (shapes.length > 1) {
            const groupButton = this.createElement('button', 'action-button');
            groupButton.textContent = 'Group';
            groupButton.addEventListener('click', () => {
                this.eventManager.emit('ui:group-selected');
            });
            actionsContainer.appendChild(groupButton);
        }
        
        section.appendChild(actionsContainer);
        this.propertiesContent.appendChild(section);
    }

    /**
     * Create shape properties section
     */
    createShapePropertiesSection(shape) {
        const section = this.createElement('div', 'property-section');
        
        const header = this.createElement('h4', 'property-header');
        header.textContent = 'Properties';
        section.appendChild(header);
        
        const properties = shape.getProperties();
        
        // Common shape properties
        const commonControls = [
            { type: 'number', property: 'x', label: 'X', value: properties.x, step: 1 },
            { type: 'number', property: 'y', label: 'Y', value: properties.y, step: 1 },
            { type: 'number', property: 'width', label: 'Width', value: properties.width, min: 1, step: 1 },
            { type: 'number', property: 'height', label: 'Height', value: properties.height, min: 1, step: 1 },
            { type: 'number', property: 'rotation', label: 'Rotation', value: properties.rotation || 0, step: 1 },
            { type: 'color', property: 'fillColor', label: 'Fill', value: properties.fillColor },
            { type: 'color', property: 'strokeColor', label: 'Stroke', value: properties.strokeColor },
            { type: 'number', property: 'strokeWidth', label: 'Stroke Width', value: properties.strokeWidth, min: 0, step: 1 },
            { type: 'range', property: 'opacity', label: 'Opacity', value: properties.opacity || 1, min: 0, max: 1, step: 0.1 }
        ];
        
        commonControls.forEach(control => {
            if (properties[control.property] !== undefined) {
                const controlElement = this.createPropertyControl(control);
                if (controlElement) {
                    section.appendChild(controlElement);
                    
                    // Add change listener for shape properties
                    const input = controlElement.querySelector('input, select');
                    if (input) {
                        input.addEventListener('change', (event) => {
                            this.handleShapePropertyChange(shape, control.property, event.target.value, event.target.type);
                        });
                    }
                }
            }
        });
        
        this.propertiesContent.appendChild(section);
    }

    /**
     * Create multi-selection section
     */
    createMultiSelectionSection(shapes) {
        const section = this.createElement('div', 'property-section');
        
        const header = this.createElement('h4', 'property-header');
        header.textContent = 'Common Properties';
        section.appendChild(header);
        
        // Find common properties
        const commonProps = this.findCommonProperties(shapes);
        
        // Create controls for common properties
        Object.entries(commonProps).forEach(([prop, value]) => {
            let type = 'text';
            if (prop.includes('Color')) type = 'color';
            if (['strokeWidth', 'opacity', 'rotation'].includes(prop)) type = 'number';
            
            const control = this.createPropertyControl({
                type,
                property: prop,
                label: this.formatPropertyName(prop),
                value: value,
                min: prop === 'opacity' ? 0 : undefined,
                max: prop === 'opacity' ? 1 : undefined,
                step: prop === 'opacity' ? 0.1 : 1
            });
            
            if (control) {
                section.appendChild(control);
                
                // Add change listener for multi-selection
                const input = control.querySelector('input, select');
                if (input) {
                    input.addEventListener('change', (event) => {
                        this.handleMultiSelectionPropertyChange(shapes, prop, event.target.value, event.target.type);
                    });
                }
            }
        });
        
        this.propertiesContent.appendChild(section);
    }

    /**
     * Handle shape property changes
     */
    handleShapePropertyChange(shape, property, value, inputType) {
        // Convert value
        let convertedValue = value;
        if (inputType === 'number' || inputType === 'range') {
            convertedValue = parseFloat(value);
        } else if (inputType === 'checkbox') {
            convertedValue = Boolean(value);
        }
        
        // Update shape
        const properties = { [property]: convertedValue };
        shape.setProperties(properties);
        
        // Emit event
        this.eventManager.emit('ui:shape-property-changed', {
            shape,
            property,
            value: convertedValue
        });
    }

    /**
     * Handle multi-selection property changes
     */
    handleMultiSelectionPropertyChange(shapes, property, value, inputType) {
        // Convert value
        let convertedValue = value;
        if (inputType === 'number' || inputType === 'range') {
            convertedValue = parseFloat(value);
        } else if (inputType === 'checkbox') {
            convertedValue = Boolean(value);
        }
        
        // Update all selected shapes
        shapes.forEach(shape => {
            const properties = { [property]: convertedValue };
            shape.setProperties(properties);
        });
        
        // Emit event
        this.eventManager.emit('ui:multi-selection-property-changed', {
            shapes,
            property,
            value: convertedValue
        });
    }

    /**
     * Find common properties among shapes
     */
    findCommonProperties(shapes) {
        if (shapes.length === 0) return {};
        
        const commonProps = {};
        const firstShape = shapes[0];
        const firstProps = firstShape.getProperties();
        
        Object.entries(firstProps).forEach(([prop, value]) => {
            const allHaveSameValue = shapes.every(shape => {
                const shapeProps = shape.getProperties();
                return shapeProps[prop] === value;
            });
            
            if (allHaveSameValue) {
                commonProps[prop] = value;
            }
        });
        
        return commonProps;
    }

    /**
     * Handle mouse move for status updates
     */
    handleMouseMove(event) {
        this.mousePosition = event.data;
        this.debouncedUpdateStatus();
    }

    /**
     * Handle canvas resize
     */
    handleCanvasResize(event) {
        this.updateStatusBar();
    }

    /**
     * Handle canvas transform
     */
    handleCanvasTransform(event) {
        this.updateStatusBar();
    }

    /**
     * Update status bar
     */
    updateStatusBar() {
        if (!this.statusBar) return;
        
        const state = this.stateManager.getState();
        
        // Update mouse position
        if (this.statusElements.mousePosition) {
            this.statusElements.mousePosition.textContent = 
                `x: ${Math.round(this.mousePosition.x)}, y: ${Math.round(this.mousePosition.y)}`;
        }
        
        // Update canvas size
        if (this.statusElements.canvasSize) {
            const canvas = state.canvas || {};
            this.statusElements.canvasSize.textContent = 
                `Canvas: ${canvas.width || 0} × ${canvas.height || 0}`;
        }
        
        // Update zoom level
        if (this.statusElements.zoomLevel) {
            const zoom = (state.canvas?.scale || 1) * 100;
            this.statusElements.zoomLevel.textContent = `Zoom: ${Math.round(zoom)}%`;
        }
    }

    /**
     * Show default properties when no tool is selected
     */
    showDefaultProperties() {
        if (!this.propertiesContent) return;
        
        this.propertiesContent.innerHTML = `
            <div class="property-section">
                <h4 class="property-header">Drawing Application</h4>
                <p>Select a tool to see its properties, or select objects to edit them.</p>
            </div>
        `;
    }

    /**
     * Show error message
     */
    showError(message) {
        // Create error notification
        const notification = this.createElement('div', 'error-notification');
        notification.textContent = message;
        
        // Style the notification
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: '#dc2626',
            color: 'white',
            padding: '12px 16px',
            borderRadius: '4px',
            zIndex: '10000',
            fontSize: '14px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        });
        
        document.body.appendChild(notification);
        
        // Remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }

    /**
     * Update shape count in status (for statistics)
     */
    updateShapeCount() {
        // Could be implemented to show shape count in status bar
    }

    /**
     * Clear selection properties
     */
    clearSelectionProperties() {
        this.updateSelectionProperties([]);
    }

    /**
     * Helper: Create DOM element
     */
    createElement(tag, className = '') {
        const element = document.createElement(tag);
        if (className) element.className = className;
        return element;
    }

    /**
     * Helper: Format tool name for display
     */
    formatToolName(toolName) {
        return toolName
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    /**
     * Helper: Format property name for display
     */
    formatPropertyName(propName) {
        return propName
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase());
    }

    /**
     * Helper: Convert rgba/hex colors
     */
    rgbaToHex(color) {
        if (typeof color !== 'string') return '#000000';
        
        if (color.startsWith('#')) {
            return color.length === 7 ? color : '#000000';
        }
        
        if (color.startsWith('rgba') || color.startsWith('rgb')) {
            const match = color.match(/\d+/g);
            if (match && match.length >= 3) {
                const r = parseInt(match[0]);
                const g = parseInt(match[1]);
                const b = parseInt(match[2]);
                return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
            }
        }
        
        return '#000000';
    }

    /**
     * Helper: Debounce function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Destroy UI manager
     */
    destroy() {
        console.log('Destroying UIManager...');
        
        // Clear properties panel
        if (this.propertiesContent) {
            this.propertiesContent.innerHTML = '';
        }
        
        // Clear property controls cache
        this.propertyControls.clear();
        
        // Reset state
        this.currentTool = null;
        this.selectedShapes = [];
        this.statusElements = {};
        
        console.log('UIManager destroyed');
    }
}