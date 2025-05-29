// src/js/canvas/CanvasManager.js - Canvas Layer Management and Rendering

/**
 * Manages multiple canvas layers and rendering pipeline
 */
export class CanvasManager {
    constructor({ container, eventManager, stateManager }) {
        this.container = container;
        this.eventManager = eventManager;
        this.stateManager = stateManager;
        
        // Canvas layers
        this.layers = new Map();
        this.layerOrder = ['grid', 'draw', 'overlay'];
        
        // Rendering state
        this.renderingPaused = false;
        this.renderRequestId = null;
        this.needsRender = false;
        this.lastRenderTime = 0;
        this.targetFPS = 60;
        this.frameInterval = 1000 / this.targetFPS;
        
        // Transform state
        this.transform = {
            x: 0,
            y: 0,
            scale: 1,
            rotation: 0
        };
        
        // Performance monitoring
        this.renderStats = {
            frameCount: 0,
            totalRenderTime: 0,
            avgFrameTime: 0,
            fps: 0,
            lastFPSUpdate: 0
        };
        
        this.debugMode = false;
        
        // Bind methods
        this.render = this.render.bind(this);
        this.handleResize = this.handleResize.bind(this);
    }

    /**
     * Initialize canvas manager and create layers
     */
    async initialize() {
        console.log('Initializing CanvasManager...');
        
        // Create canvas layers
        this.createLayers();
        
        // Setup initial size
        this.resize();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Start render loop
        this.startRenderLoop();
        
        console.log('CanvasManager initialized');
    }

    /**
     * Create canvas layers
     */
    createLayers() {
        this.layerOrder.forEach(layerName => {
            const canvas = document.getElementById(`${layerName}Canvas`);
            if (!canvas) {
                console.error(`Canvas element not found: ${layerName}Canvas`);
                return;
            }

            const context = canvas.getContext('2d');
            
            // Enable high DPI support
            this.setupHighDPI(canvas, context);
            
            this.layers.set(layerName, {
                canvas,
                context,
                visible: true,
                opacity: 1,
                dirty: true
            });
        });
    }

    /**
     * Setup high DPI support for crisp rendering
     */
    setupHighDPI(canvas, context) {
        const dpr = window.devicePixelRatio || 1;
        
        // Store original size
        const rect = canvas.getBoundingClientRect();
        const displayWidth = rect.width;
        const displayHeight = rect.height;
        
        // Set actual size in memory (scaled up)
        canvas.width = displayWidth * dpr;
        canvas.height = displayHeight * dpr;
        
        // Scale CSS size back down
        canvas.style.width = displayWidth + 'px';
        canvas.style.height = displayHeight + 'px';
        
        // Scale context to match device pixel ratio
        context.scale(dpr, dpr);
        
        // Enable image smoothing for better quality
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // State changes
        this.stateManager.subscribe('canvas', () => {
            this.requestRender();
        });
        
        // Window resize
        window.addEventListener('resize', this.handleResize);
    }

    /**
     * Handle container resize
     */
    handleResize() {
        this.resize();
    }

    /**
     * Resize all canvas layers
     */
    resize(width = null, height = null) {
        const rect = this.container.getBoundingClientRect();
        const newWidth = width || rect.width;
        const newHeight = height || rect.height;
        
        this.layers.forEach((layer, name) => {
            const { canvas, context } = layer;
            
            // Save current transform
            const currentTransform = context.getTransform();
            
            // Resize canvas
            this.setupHighDPI(canvas, context);
            
            // Update canvas display size
            canvas.style.width = newWidth + 'px';
            canvas.style.height = newHeight + 'px';
            
            // Set logical size
            const dpr = window.devicePixelRatio || 1;
            canvas.width = newWidth * dpr;
            canvas.height = newHeight * dpr;
            
            // Restore and scale context
            context.scale(dpr, dpr);
            
            // Mark layer as dirty
            layer.dirty = true;
        });
        
        // Update state
        this.stateManager.setState({
            canvas: {
                ...this.stateManager.getState().canvas,
                width: newWidth,
                height: newHeight
            }
        });
        
        // Emit resize event
        this.eventManager.emit('canvas:resize', { 
            width: newWidth, 
            height: newHeight 
        });
        
        this.requestRender();
    }

    /**
     * Get canvas layer
     */
    getLayer(name) {
        return this.layers.get(name);
    }

    /**
     * Get canvas context
     */
    getContext(layerName = 'draw') {
        const layer = this.layers.get(layerName);
        return layer ? layer.context : null;
    }

    /**
     * Set layer visibility
     */
    setLayerVisible(layerName, visible) {
        const layer = this.layers.get(layerName);
        if (layer) {
            layer.visible = visible;
            layer.canvas.style.display = visible ? 'block' : 'none';
            this.requestRender();
        }
    }

    /**
     * Set layer opacity
     */
    setLayerOpacity(layerName, opacity) {
        const layer = this.layers.get(layerName);
        if (layer) {
            layer.opacity = Math.max(0, Math.min(1, opacity));
            layer.canvas.style.opacity = layer.opacity;
            layer.dirty = true;
            this.requestRender();
        }
    }

    /**
     * Clear specific layer
     */
    clearLayer(layerName) {
        const layer = this.layers.get(layerName);
        if (layer) {
            const { canvas, context } = layer;
            context.clearRect(0, 0, canvas.width, canvas.height);
            layer.dirty = true;
        }
    }

    /**
     * Clear all layers
     */
    clearAll() {
        this.layers.forEach((layer, name) => {
            this.clearLayer(name);
        });
        this.requestRender();
    }

    /**
     * Apply transform to context
     */
    applyTransform(context, transform = this.transform) {
        context.save();
        context.translate(transform.x, transform.y);
        context.scale(transform.scale, transform.scale);
        context.rotate(transform.rotation);
        return () => context.restore();
    }

    /**
     * Set canvas transform
     */
    setTransform(transform) {
        this.transform = { ...this.transform, ...transform };
        this.requestRender();
        
        this.eventManager.emit('canvas:transform', { transform: this.transform });
    }

    /**
     * Convert screen coordinates to canvas coordinates
     */
    screenToCanvas(screenX, screenY) {
        const layer = this.layers.get('draw');
        if (!layer) return { x: screenX, y: screenY };
        
        const rect = layer.canvas.getBoundingClientRect();
        const scaleX = layer.canvas.width / rect.width;
        const scaleY = layer.canvas.height / rect.height;
        
        let x = (screenX - rect.left) * scaleX;
        let y = (screenY - rect.top) * scaleY;
        
        // Apply inverse transform
        x = (x - this.transform.x) / this.transform.scale;
        y = (y - this.transform.y) / this.transform.scale;
        
        return { x, y };
    }

    /**
     * Convert canvas coordinates to screen coordinates
     */
    canvasToScreen(canvasX, canvasY) {
        const layer = this.layers.get('draw');
        if (!layer) return { x: canvasX, y: canvasY };
        
        // Apply transform
        let x = canvasX * this.transform.scale + this.transform.x;
        let y = canvasY * this.transform.scale + this.transform.y;
        
        const rect = layer.canvas.getBoundingClientRect();
        const scaleX = rect.width / layer.canvas.width;
        const scaleY = rect.height / layer.canvas.height;
        
        x = x * scaleX + rect.left;
        y = y * scaleY + rect.top;
        
        return { x, y };
    }

    /**
     * Request a render on next frame
     */
    requestRender() {
        if (!this.renderingPaused && !this.renderRequestId) {
            this.needsRender = true;
            this.renderRequestId = requestAnimationFrame(this.render);
        }
    }

    /**
     * Start the render loop
     */
    startRenderLoop() {
        this.renderingPaused = false;
        this.requestRender();
    }

    /**
     * Pause rendering
     */
    pauseRendering() {
        this.renderingPaused = true;
        if (this.renderRequestId) {
            cancelAnimationFrame(this.renderRequestId);
            this.renderRequestId = null;
        }
    }

    /**
     * Resume rendering
     */
    resumeRendering() {
        if (this.renderingPaused) {
            this.renderingPaused = false;
            this.requestRender();
        }
    }

    /**
     * Main render method
     */
    render(timestamp) {
        this.renderRequestId = null;
        
        // Throttle rendering to target FPS
        if (timestamp - this.lastRenderTime < this.frameInterval) {
            this.requestRender();
            return;
        }
        
        const startTime = performance.now();
        
        try {
            // Emit pre-render event
            this.eventManager.emit('canvas:pre-render', { timestamp });
            
            // Render each layer
            this.layerOrder.forEach(layerName => {
                const layer = this.layers.get(layerName);
                if (layer && layer.visible && layer.dirty) {
                    this.renderLayer(layerName, layer);
                    layer.dirty = false;
                }
            });
            
            // Emit post-render event
            this.eventManager.emit('canvas:post-render', { timestamp });
            
        } catch (error) {
            console.error('Render error:', error);
            this.eventManager.emit('canvas:render-error', { error });
        }
        
        // Update performance stats
        this.updateRenderStats(timestamp, performance.now() - startTime);
        
        this.lastRenderTime = timestamp;
        this.needsRender = false;
        
        // Continue render loop if needed
        if (this.needsRender && !this.renderingPaused) {
            this.requestRender();
        }
    }

    /**
     * Render specific layer
     */
    renderLayer(layerName, layer) {
        const { context } = layer;
        
        // Clear layer
        this.clearLayer(layerName);
        
        // Apply global transform
        const restoreTransform = this.applyTransform(context);
        
        // Emit layer-specific render event
        this.eventManager.emit(`canvas:render-${layerName}`, { 
            context, 
            layerName,
            transform: this.transform 
        });
        
        // Restore transform
        restoreTransform();
    }

    /**
     * Update render performance statistics
     */
    updateRenderStats(timestamp, renderTime) {
        this.renderStats.frameCount++;
        this.renderStats.totalRenderTime += renderTime;
        this.renderStats.avgFrameTime = this.renderStats.totalRenderTime / this.renderStats.frameCount;
        
        // Update FPS every second
        if (timestamp - this.renderStats.lastFPSUpdate >= 1000) {
            this.renderStats.fps = Math.round(1000 / this.renderStats.avgFrameTime);
            this.renderStats.lastFPSUpdate = timestamp;
            
            if (this.debugMode) {
                console.log(`FPS: ${this.renderStats.fps}, Avg Frame Time: ${this.renderStats.avgFrameTime.toFixed(2)}ms`);
            }
        }
    }

    /**
     * Export canvas as image
     */
    async exportImage(format = 'png', quality = 1, layerNames = null) {
        const exportLayers = layerNames || ['grid', 'draw'];
        const drawLayer = this.layers.get('draw');
        if (!drawLayer) return null;
        
        // Create temporary canvas for compositing
        const tempCanvas = document.createElement('canvas');
        const tempContext = tempCanvas.getContext('2d');
        
        tempCanvas.width = drawLayer.canvas.width;
        tempCanvas.height = drawLayer.canvas.height;
        
        // Composite specified layers
        exportLayers.forEach(layerName => {
            const layer = this.layers.get(layerName);
            if (layer && layer.visible) {
                tempContext.globalAlpha = layer.opacity;
                tempContext.drawImage(layer.canvas, 0, 0);
                tempContext.globalAlpha = 1;
            }
        });
        
        // Export as data URL
        return tempCanvas.toDataURL(`image/${format}`, quality);
    }

    /**
     * Save canvas state
     */
    saveState() {
        const state = {};
        this.layers.forEach((layer, name) => {
            state[name] = {
                imageData: layer.context.getImageData(0, 0, layer.canvas.width, layer.canvas.height),
                visible: layer.visible,
                opacity: layer.opacity
            };
        });
        return state;
    }

    /**
     * Restore canvas state
     */
    restoreState(state) {
        Object.entries(state).forEach(([name, layerState]) => {
            const layer = this.layers.get(name);
            if (layer) {
                layer.context.putImageData(layerState.imageData, 0, 0);
                layer.visible = layerState.visible;
                layer.opacity = layerState.opacity;
                layer.dirty = true;
            }
        });
        this.requestRender();
    }

    /**
     * Get render statistics
     */
    getRenderStats() {
        return { ...this.renderStats };
    }

    /**
     * Set debug mode
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
    }

    /**
     * Get canvas bounds
     */
    getBounds() {
        const layer = this.layers.get('draw');
        if (!layer) return { x: 0, y: 0, width: 0, height: 0 };
        
        const rect = layer.canvas.getBoundingClientRect();
        return {
            x: rect.left,
            y: rect.top,
            width: rect.width,
            height: rect.height
        };
    }

    /**
     * Mark layer as dirty (needs re-render)
     */
    markLayerDirty(layerName) {
        const layer = this.layers.get(layerName);
        if (layer) {
            layer.dirty = true;
            this.requestRender();
        }
    }

    /**
     * Mark all layers as dirty
     */
    markAllDirty() {
        this.layers.forEach(layer => {
            layer.dirty = true;
        });
        this.requestRender();
    }

    /**
     * Destroy canvas manager
     */
    destroy() {
        console.log('Destroying CanvasManager...');
        
        // Stop rendering
        this.pauseRendering();
        
        // Remove event listeners
        window.removeEventListener('resize', this.handleResize);
        
        // Clear layers
        this.layers.forEach((layer, name) => {
            this.clearLayer(name);
        });
        
        this.layers.clear();
        
        console.log('CanvasManager destroyed');
    }
}