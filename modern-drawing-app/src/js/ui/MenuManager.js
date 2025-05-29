// src/js/ui/MenuManager.js - File Menu and Operations

/**
 * Manages file operations and main menu interactions
 */
export class MenuManager {
    constructor({ mainMenu, eventManager, stateManager, commandManager, canvasManager, shapeManager }) {
        this.mainMenu = mainMenu;
        this.eventManager = eventManager;
        this.stateManager = stateManager;
        this.commandManager = commandManager;
        this.canvasManager = canvasManager;
        this.shapeManager = shapeManager;
        
        // Menu state
        this.isMenuOpen = false;
        this.currentProject = null;
        this.hasUnsavedChanges = false;
        
        // DOM elements
        this.menuHeader = null;
        this.menuContent = null;
        
        // File operations
        this.fileInput = null;
        
        // Bind methods
        this.handleMenuClick = this.handleMenuClick.bind(this);
        this.handleDocumentClick = this.handleDocumentClick.bind(this);
        this.handleKeydown = this.handleKeydown.bind(this);
    }

    /**
     * Initialize menu manager
     */
    async initialize() {
        console.log('Initializing MenuManager...');
        
        // Setup DOM elements
        this.setupMenuElements();
        
        // Create hidden file input
        this.createFileInput();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Track changes for unsaved state
        this.setupChangeTracking();
        
        console.log('MenuManager initialized');
    }

    /**
     * Setup menu DOM elements
     */
    setupMenuElements() {
        if (!this.mainMenu) return;
        
        this.menuHeader = this.mainMenu.querySelector('.menu-header');
        this.menuContent = this.mainMenu.querySelector('#mainMenuContent');
        
        if (!this.menuHeader || !this.menuContent) {
            console.warn('Menu elements not found');
            return;
        }
        
        // Setup menu buttons
        this.setupMenuButtons();
    }

    /**
     * Setup menu buttons and their actions
     */
    setupMenuButtons() {
        const buttons = this.menuContent.querySelectorAll('.menu-item');
        
        buttons.forEach(button => {
            const action = button.getAttribute('data-action');
            if (action) {
                button.addEventListener('click', (event) => {
                    event.stopPropagation();
                    this.handleAction(action);
                    this.closeMenu();
                });
            }
        });
    }

    /**
     * Create hidden file input for file operations
     */
    createFileInput() {
        this.fileInput = document.createElement('input');
        this.fileInput.type = 'file';
        this.fileInput.accept = '.json,.draw';
        this.fileInput.style.display = 'none';
        document.body.appendChild(this.fileInput);
        
        this.fileInput.addEventListener('change', this.handleFileSelect.bind(this));
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Menu toggle
        if (this.menuHeader) {
            this.menuHeader.addEventListener('click', this.handleMenuClick);
        }
        
        // Close menu on outside click
        document.addEventListener('click', this.handleDocumentClick);
        
        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeydown);
        
        // Application events
        this.eventManager.on('project:loaded', this.handleProjectLoaded.bind(this));
        this.eventManager.on('project:saved', this.handleProjectSaved.bind(this));
        
        // Window events
        window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
    }

    /**
     * Setup change tracking for unsaved changes
     */
    setupChangeTracking() {
        // Track commands for unsaved changes
        this.commandManager.addListener((event) => {
            if (event.type === 'command:executed') {
                this.markAsChanged();
            }
        });
        
        // Track shape changes
        this.eventManager.on('shape:created', () => this.markAsChanged());
        this.eventManager.on('shape:removed', () => this.markAsChanged());
        this.eventManager.on('shape:modified', () => this.markAsChanged());
    }

    /**
     * Handle menu header click
     */
    handleMenuClick(event) {
        event.stopPropagation();
        this.toggleMenu();
    }

    /**
     * Handle document click (to close menu)
     */
    handleDocumentClick(event) {
        if (this.isMenuOpen && this.menuContent && !this.menuContent.contains(event.target)) {
            this.closeMenu();
        }
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeydown(event) {
        if (event.ctrlKey || event.metaKey) {
            switch (event.code) {
                case 'KeyN':
                    event.preventDefault();
                    this.handleAction('new');
                    break;
                case 'KeyO':
                    event.preventDefault();
                    this.handleAction('open');
                    break;
                case 'KeyS':
                    event.preventDefault();
                    if (event.shiftKey) {
                        this.handleAction('save-as');
                    } else {
                        this.handleAction('save');
                    }
                    break;
                case 'KeyE':
                    if (event.shiftKey) {
                        event.preventDefault();
                        this.handleAction('export');
                    }
                    break;
            }
        }
        
        // Close menu on Escape
        if (event.code === 'Escape' && this.isMenuOpen) {
            this.closeMenu();
        }
    }

    /**
     * Toggle menu visibility
     */
    toggleMenu() {
        if (this.isMenuOpen) {
            this.closeMenu();
        } else {
            this.openMenu();
        }
    }

    /**
     * Open menu
     */
    openMenu() {
        if (!this.menuContent) return;
        
        this.menuContent.classList.remove('hidden');
        this.isMenuOpen = true;
        
        // Update menu items based on current state
        this.updateMenuItems();
    }

    /**
     * Close menu
     */
    closeMenu() {
        if (!this.menuContent) return;
        
        this.menuContent.classList.add('hidden');
        this.isMenuOpen = false;
    }

    /**
     * Update menu items based on current state
     */
    updateMenuItems() {
        const saveButton = this.menuContent.querySelector('[data-action="save"]');
        const saveAsButton = this.menuContent.querySelector('[data-action="save-as"]');
        
        if (saveButton) {
            saveButton.disabled = !this.hasUnsavedChanges && !this.currentProject;
        }
        
        if (saveAsButton) {
            saveAsButton.disabled = false; // Always enabled
        }
    }

    /**
     * Handle menu actions
     */
    async handleAction(action) {
        try {
            switch (action) {
                case 'new':
                    await this.newProject();
                    break;
                case 'open':
                    await this.openProject();
                    break;
                case 'save':
                    await this.saveProject();
                    break;
                case 'save-as':
                    await this.saveProjectAs();
                    break;
                case 'export':
                    await this.exportProject();
                    break;
                default:
                    console.warn(`Unknown menu action: ${action}`);
            }
        } catch (error) {
            console.error(`Error handling menu action ${action}:`, error);
            this.showError(`Failed to ${action}: ${error.message}`);
        }
    }

    /**
     * Create new project
     */
    async newProject() {
        // Check for unsaved changes
        if (this.hasUnsavedChanges) {
            const shouldProceed = await this.confirmUnsavedChanges('create a new project');
            if (!shouldProceed) return;
        }
        
        // Clear current project
        this.shapeManager.clear();
        this.commandManager.clear();
        
        // Reset state
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
            }
        });
        
        // Reset project state
        this.currentProject = null;
        this.hasUnsavedChanges = false;
        
        // Update title
        this.updateDocumentTitle();
        
        // Emit event
        this.eventManager.emit('project:new');
        
        console.log('New project created');
    }

    /**
     * Open project from file
     */
    async openProject() {
        // Check for unsaved changes
        if (this.hasUnsavedChanges) {
            const shouldProceed = await this.confirmUnsavedChanges('open a project');
            if (!shouldProceed) return;
        }
        
        // Trigger file input
        this.fileInput.click();
    }

    /**
     * Handle file selection
     */
    async handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            const text = await this.readFile(file);
            const projectData = JSON.parse(text);
            
            await this.loadProjectData(projectData);
            
            this.currentProject = {
                name: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
                path: null // Browser doesn't provide file path
            };
            
            this.hasUnsavedChanges = false;
            this.updateDocumentTitle();
            
            console.log('Project loaded:', file.name);
            
        } catch (error) {
            console.error('Failed to load project:', error);
            this.showError('Failed to load project file');
        }
        
        // Clear file input
        event.target.value = '';
    }

    /**
     * Save current project
     */
    async saveProject() {
        if (this.currentProject) {
            // Save to existing file (browser limitation - will download)
            await this.saveProjectAs();
        } else {
            // No current project - save as new
            await this.saveProjectAs();
        }
    }

    /**
     * Save project as new file
     */
    async saveProjectAs() {
        try {
            const projectData = await this.generateProjectData();
            const filename = this.currentProject?.name || 'drawing';
            
            await this.downloadFile(projectData, `${filename}.json`, 'application/json');
            
            this.hasUnsavedChanges = false;
            this.updateDocumentTitle();
            
            this.eventManager.emit('project:saved', { projectData });
            
            console.log('Project saved');
            
        } catch (error) {
            console.error('Failed to save project:', error);
            this.showError('Failed to save project');
        }
    }

    /**
     * Export project (different formats)
     */
    async exportProject() {
        try {
            // Show export options
            const format = await this.showExportDialog();
            if (!format) return;
            
            switch (format) {
                case 'png':
                case 'jpg':
                    await this.exportAsImage(format);
                    break;
                case 'svg':
                    await this.exportAsSVG();
                    break;
                case 'json':
                    await this.saveProjectAs(); // Same as save as
                    break;
                default:
                    throw new Error(`Unsupported export format: ${format}`);
            }
            
        } catch (error) {
            console.error('Failed to export project:', error);
            this.showError('Failed to export project');
        }
    }

    /**
     * Export as image
     */
    async exportAsImage(format) {
        const dataUrl = await this.canvasManager.exportImage(format, 1);
        const filename = `${this.currentProject?.name || 'drawing'}.${format}`;
        
        // Create download link
        const link = document.createElement('a');
        link.download = filename;
        link.href = dataUrl;
        link.click();
        
        console.log(`Exported as ${format}:`, filename);
    }

    /**
     * Export as SVG
     */
    async exportAsSVG() {
        // Create SVG content from shapes
        const shapes = this.shapeManager.getAllShapes();
        const canvasState = this.stateManager.getState().canvas;
        
        let svgContent = `<svg width="${canvasState.width}" height="${canvasState.height}" xmlns="http://www.w3.org/2000/svg">`;
        
        shapes.forEach(shape => {
            svgContent += this.shapeToSVG(shape);
        });
        
        svgContent += '</svg>';
        
        const filename = `${this.currentProject?.name || 'drawing'}.svg`;
        await this.downloadFile(svgContent, filename, 'image/svg+xml');
        
        console.log('Exported as SVG:', filename);
    }

    /**
     * Convert shape to SVG element
     */
    shapeToSVG(shape) {
        const bounds = shape.getBounds();
        
        switch (shape.type) {
            case 'rectangle':
                return `<rect x="${bounds.x}" y="${bounds.y}" width="${bounds.width}" height="${bounds.height}" fill="${shape.fillColor}" stroke="${shape.strokeColor}" stroke-width="${shape.strokeWidth}" />`;
            
            case 'ellipse':
                const cx = bounds.x + bounds.width / 2;
                const cy = bounds.y + bounds.height / 2;
                const rx = bounds.width / 2;
                const ry = bounds.height / 2;
                return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${shape.fillColor}" stroke="${shape.strokeColor}" stroke-width="${shape.strokeWidth}" />`;
            
            case 'line':
                return `<line x1="${shape.startX}" y1="${shape.startY}" x2="${shape.endX}" y2="${shape.endY}" stroke="${shape.strokeColor}" stroke-width="${shape.strokeWidth}" />`;
            
            case 'text':
                return `<text x="${bounds.x}" y="${bounds.y}" fill="${shape.fillColor}" font-family="${shape.fontFamily}" font-size="${shape.fontSize}">${shape.text}</text>`;
            
            default:
                return '';
        }
    }

    /**
     * Generate project data for saving
     */
    async generateProjectData() {
        const shapes = this.shapeManager.getAllShapes();
        const canvasState = this.stateManager.getState().canvas;
        
        return {
            version: '2.0',
            timestamp: new Date().toISOString(),
            application: 'Modern Drawing App',
            canvas: canvasState,
            shapes: shapes.map(shape => shape.serialize()),
            metadata: {
                shapeCount: shapes.length,
                canvasSize: `${canvasState.width}x${canvasState.height}`
            }
        };
    }

    /**
     * Load project data
     */
    async loadProjectData(projectData) {
        // Validate project data
        if (!projectData || typeof projectData !== 'object') {
            throw new Error('Invalid project file format');
        }
        
        // Clear current project
        this.shapeManager.clear();
        this.commandManager.clear();
        
        // Load canvas settings
        if (projectData.canvas) {
            this.stateManager.setState({ canvas: projectData.canvas });
        }
        
        // Load shapes
        if (projectData.shapes && Array.isArray(projectData.shapes)) {
            projectData.shapes.forEach(shapeData => {
                try {
                    this.shapeManager.createFromData(shapeData);
                } catch (error) {
                    console.warn('Failed to load shape:', error, shapeData);
                }
            });
        }
        
        // Refresh display
        this.canvasManager.markAllDirty();
        
        // Emit event
        this.eventManager.emit('project:loaded', { projectData });
    }

    /**
     * Show export format dialog
     */
    async showExportDialog() {
        return new Promise((resolve) => {
            // Simple implementation - could be enhanced with a proper dialog
            const format = prompt('Export format (png, jpg, svg, json):', 'png');
            resolve(format && ['png', 'jpg', 'svg', 'json'].includes(format) ? format : null);
        });
    }

    /**
     * Confirm unsaved changes dialog
     */
    async confirmUnsavedChanges(action) {
        return new Promise((resolve) => {
            const message = `You have unsaved changes. Are you sure you want to ${action}?`;
            resolve(confirm(message));
        });
    }

    /**
     * Read file as text
     */
    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsText(file);
        });
    }

    /**
     * Download file
     */
    async downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.download = filename;
        link.href = url;
        link.click();
        
        // Clean up
        setTimeout(() => URL.revokeObjectURL(url), 100);
    }

    /**
     * Mark project as changed
     */
    markAsChanged() {
        if (!this.hasUnsavedChanges) {
            this.hasUnsavedChanges = true;
            this.updateDocumentTitle();
        }
    }

    /**
     * Update document title
     */
    updateDocumentTitle() {
        const baseTitle = 'Modern Drawing Application';
        let title = baseTitle;
        
        if (this.currentProject) {
            title = `${this.currentProject.name} - ${baseTitle}`;
        }
        
        if (this.hasUnsavedChanges) {
            title = `• ${title}`;
        }
        
        document.title = title;
    }

    /**
     * Show error message
     */
    showError(message) {
        // Create error notification
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #dc2626;
            color: white;
            padding: 12px 16px;
            border-radius: 4px;
            z-index: 10000;
            font-size: 14px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        `;
        
        document.body.appendChild(notification);
        
        // Remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }

    /**
     * Handle project loaded event
     */
    handleProjectLoaded(event) {
        this.hasUnsavedChanges = false;
        this.updateDocumentTitle();
    }

    /**
     * Handle project saved event
     */
    handleProjectSaved(event) {
        this.hasUnsavedChanges = false;
        this.updateDocumentTitle();
    }

    /**
     * Handle before unload (page refresh/close)
     */
    handleBeforeUnload(event) {
        if (this.hasUnsavedChanges) {
            event.preventDefault();
            event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        }
    }

    /**
     * Destroy menu manager
     */
    destroy() {
        console.log('Destroying MenuManager...');
        
        // Remove event listeners
        if (this.menuHeader) {
            this.menuHeader.removeEventListener('click', this.handleMenuClick);
        }
        
        document.removeEventListener('click', this.handleDocumentClick);
        document.removeEventListener('keydown', this.handleKeydown);
        window.removeEventListener('beforeunload', this.handleBeforeUnload);
        
        // Remove file input
        if (this.fileInput && this.fileInput.parentNode) {
            this.fileInput.parentNode.removeChild(this.fileInput);
        }
        
        // Reset state
        this.isMenuOpen = false;
        this.currentProject = null;
        this.hasUnsavedChanges = false;
        
        console.log('MenuManager destroyed');
    }
}