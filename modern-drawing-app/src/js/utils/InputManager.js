// src/js/utils/InputManager.js - Input Event Handling

/**
 * Manages mouse and keyboard input events for the drawing application
 */
export class InputManager {
    constructor({ canvasContainer, eventManager, stateManager }) {
        this.canvasContainer = canvasContainer;
        this.eventManager = eventManager;
        this.stateManager = stateManager;
        
        // Input state
        this.mousePosition = { x: 0, y: 0 };
        this.lastMousePosition = { x: 0, y: 0 };
        this.mouseButtons = new Set();
        this.pressedKeys = new Set();
        this.modifierKeys = {
            shift: false,
            ctrl: false,
            alt: false,
            meta: false
        };
        
        // Touch support
        this.touches = new Map();
        this.isTouchDevice = 'ontouchstart' in window;
        
        // Event tracking
        this.isMouseDown = false;
        this.isDragging = false;
        this.dragThreshold = 3; // pixels
        this.dragStartPosition = null;
        
        // Input prevention
        this.preventContextMenu = true;
        this.preventTextSelection = true;
        this.preventScrolling = true;
        
        // Performance optimization
        this.throttleMouseMove = true;
        this.mouseMoveThrottle = 16; // ~60fps
        this.lastMouseMoveTime = 0;
        
        // Bind methods
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        this.handleMouseWheel = this.handleMouseWheel.bind(this);
        this.handleMouseLeave = this.handleMouseLeave.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
        this.handleContextMenu = this.handleContextMenu.bind(this);
        this.handleSelectStart = this.handleSelectStart.bind(this);
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.handleTouchMove = this.handleTouchMove.bind(this);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);
    }

    /**
     * Initialize input manager
     */
    async initialize() {
        console.log('Initializing InputManager...');
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Configure input behavior
        this.configureInputBehavior();
        
        console.log('InputManager initialized');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        if (!this.canvasContainer) return;
        
        // Mouse events
        this.canvasContainer.addEventListener('mousedown', this.handleMouseDown, { passive: false });
        this.canvasContainer.addEventListener('mousemove', this.handleMouseMove, { passive: false });
        this.canvasContainer.addEventListener('mouseup', this.handleMouseUp, { passive: false });
        this.canvasContainer.addEventListener('wheel', this.handleMouseWheel, { passive: false });
        this.canvasContainer.addEventListener('mouseleave', this.handleMouseLeave, { passive: false });
        this.canvasContainer.addEventListener('contextmenu', this.handleContextMenu, { passive: false });
        this.canvasContainer.addEventListener('selectstart', this.handleSelectStart, { passive: false });
        
        // Keyboard events (global)
        document.addEventListener('keydown', this.handleKeyDown, { passive: false });
        document.addEventListener('keyup', this.handleKeyUp, { passive: false });
        
        // Touch events for mobile support
        if (this.isTouchDevice) {
            this.canvasContainer.addEventListener('touchstart', this.handleTouchStart, { passive: false });
            this.canvasContainer.addEventListener('touchmove', this.handleTouchMove, { passive: false });
            this.canvasContainer.addEventListener('touchend', this.handleTouchEnd, { passive: false });
            this.canvasContainer.addEventListener('touchcancel', this.handleTouchEnd, { passive: false });
        }
        
        // Window events
        window.addEventListener('blur', this.handleWindowBlur.bind(this));
        window.addEventListener('focus', this.handleWindowFocus.bind(this));
    }

    /**
     * Configure input behavior
     */
    configureInputBehavior() {
        if (!this.canvasContainer) return;
        
        // Prevent text selection
        if (this.preventTextSelection) {
            this.canvasContainer.style.userSelect = 'none';
            this.canvasContainer.style.webkitUserSelect = 'none';
        }
        
        // Make container focusable for keyboard events
        if (!this.canvasContainer.hasAttribute('tabindex')) {
            this.canvasContainer.setAttribute('tabindex', '0');
        }
        
        // Prevent scrolling on touch devices
        if (this.preventScrolling && this.isTouchDevice) {
            this.canvasContainer.style.touchAction = 'none';
        }
    }

    /**
     * Handle mouse down event
     */
    handleMouseDown(event) {
        if (this.shouldIgnoreEvent(event)) return;
        
        event.preventDefault();
        
        // Update mouse state
        this.isMouseDown = true;
        this.mouseButtons.add(event.button);
        this.updateMousePosition(event);
        this.dragStartPosition = { ...this.mousePosition };
        this.updateModifierKeys(event);
        
        // Focus container for keyboard events
        this.canvasContainer.focus();
        
        // Create mouse event data
        const mouseEventData = this.createMouseEventData(event, 'mousedown');
        
        // Emit global mouse event
        this.eventManager.emit('mouse:down', mouseEventData);
        
        // Forward to tool manager through event system
        this.eventManager.emit('input:mousedown', { 
            originalEvent: event, 
            mouseData: mouseEventData 
        });
    }

    /**
     * Handle mouse move event
     */
    handleMouseMove(event) {
        if (this.shouldIgnoreEvent(event)) return;
        
        // Throttle mouse move events for performance
        if (this.throttleMouseMove) {
            const now = performance.now();
            if (now - this.lastMouseMoveTime < this.mouseMoveThrottle) {
                return;
            }
            this.lastMouseMoveTime = now;
        }
        
        event.preventDefault();
        
        // Update mouse position
        this.lastMousePosition = { ...this.mousePosition };
        this.updateMousePosition(event);
        this.updateModifierKeys(event);
        
        // Check for drag start
        if (this.isMouseDown && !this.isDragging && this.dragStartPosition) {
            const deltaX = this.mousePosition.x - this.dragStartPosition.x;
            const deltaY = this.mousePosition.y - this.dragStartPosition.y;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            
            if (distance > this.dragThreshold) {
                this.isDragging = true;
                this.eventManager.emit('mouse:drag-start', this.createMouseEventData(event, 'dragstart'));
            }
        }
        
        // Create mouse event data
        const mouseEventData = this.createMouseEventData(event, this.isDragging ? 'mousedrag' : 'mousemove');
        
        // Emit global mouse event
        this.eventManager.emit('mouse:move', mouseEventData);
        
        // Forward to tool manager
        this.eventManager.emit('input:mousemove', { 
            originalEvent: event, 
            mouseData: mouseEventData 
        });
    }

    /**
     * Handle mouse up event
     */
    handleMouseUp(event) {
        if (this.shouldIgnoreEvent(event)) return;
        
        event.preventDefault();
        
        // Update mouse state
        this.mouseButtons.delete(event.button);
        this.updateMousePosition(event);
        this.updateModifierKeys(event);
        
        // Create mouse event data
        const mouseEventData = this.createMouseEventData(event, 'mouseup');
        
        // Emit drag end if dragging
        if (this.isDragging) {
            this.eventManager.emit('mouse:drag-end', mouseEventData);
        }
        
        // Reset drag state
        const wasDragging = this.isDragging;
        this.isMouseDown = false;
        this.isDragging = false;
        this.dragStartPosition = null;
        
        // Emit global mouse event
        this.eventManager.emit('mouse:up', mouseEventData);
        
        // Forward to tool manager
        this.eventManager.emit('input:mouseup', { 
            originalEvent: event, 
            mouseData: mouseEventData,
            wasDragging 
        });
    }

    /**
     * Handle mouse wheel event
     */
    handleMouseWheel(event) {
        if (this.shouldIgnoreEvent(event)) return;
        
        event.preventDefault();
        
        this.updateMousePosition(event);
        this.updateModifierKeys(event);
        
        // Create wheel event data
        const wheelEventData = {
            ...this.createMouseEventData(event, 'wheel'),
            deltaX: event.deltaX,
            deltaY: event.deltaY,
            deltaZ: event.deltaZ,
            deltaMode: event.deltaMode
        };
        
        // Emit events
        this.eventManager.emit('mouse:wheel', wheelEventData);
        this.eventManager.emit('input:wheel', { 
            originalEvent: event, 
            wheelData: wheelEventData 
        });
    }

    /**
     * Handle mouse leave event
     */
    handleMouseLeave(event) {
        // Reset mouse state when leaving canvas
        this.isMouseDown = false;
        this.isDragging = false;
        this.mouseButtons.clear();
        this.dragStartPosition = null;
        
        this.eventManager.emit('mouse:leave', this.createMouseEventData(event, 'mouseleave'));
    }

    /**
     * Handle key down event
     */
    handleKeyDown(event) {
        // Don't handle if typing in input field
        if (this.isTypingInInput(event.target)) return;
        
        const key = event.code;
        this.pressedKeys.add(key);
        this.updateModifierKeys(event);
        
        // Create keyboard event data
        const keyEventData = this.createKeyEventData(event, 'keydown');
        
        // Emit events
        this.eventManager.emit('key:down', keyEventData);
        this.eventManager.emit('input:keydown', { 
            originalEvent: event, 
            keyData: keyEventData 
        });
    }

    /**
     * Handle key up event
     */
    handleKeyUp(event) {
        // Don't handle if typing in input field
        if (this.isTypingInInput(event.target)) return;
        
        const key = event.code;
        this.pressedKeys.delete(key);
        this.updateModifierKeys(event);
        
        // Create keyboard event data
        const keyEventData = this.createKeyEventData(event, 'keyup');
        
        // Emit events
        this.eventManager.emit('key:up', keyEventData);
        this.eventManager.emit('input:keyup', { 
            originalEvent: event, 
            keyData: keyEventData 
        });
    }

    /**
     * Handle context menu event
     */
    handleContextMenu(event) {
        if (this.preventContextMenu) {
            event.preventDefault();
        }
        
        this.eventManager.emit('input:contextmenu', { originalEvent: event });
    }

    /**
     * Handle select start event
     */
    handleSelectStart(event) {
        if (this.preventTextSelection) {
            event.preventDefault();
        }
    }

    /**
     * Handle touch start event
     */
    handleTouchStart(event) {
        event.preventDefault();
        
        // Convert touches to mouse-like events
        Array.from(event.changedTouches).forEach(touch => {
            this.touches.set(touch.identifier, touch);
            
            // Convert to mouse event
            const mouseEvent = this.touchToMouseEvent(touch, 'mousedown');
            this.handleMouseDown(mouseEvent);
        });
    }

    /**
     * Handle touch move event
     */
    handleTouchMove(event) {
        event.preventDefault();
        
        Array.from(event.changedTouches).forEach(touch => {
            if (this.touches.has(touch.identifier)) {
                this.touches.set(touch.identifier, touch);
                
                // Convert to mouse event
                const mouseEvent = this.touchToMouseEvent(touch, 'mousemove');
                this.handleMouseMove(mouseEvent);
            }
        });
    }

    /**
     * Handle touch end event
     */
    handleTouchEnd(event) {
        event.preventDefault();
        
        Array.from(event.changedTouches).forEach(touch => {
            if (this.touches.has(touch.identifier)) {
                // Convert to mouse event
                const mouseEvent = this.touchToMouseEvent(touch, 'mouseup');
                this.handleMouseUp(mouseEvent);
                
                this.touches.delete(touch.identifier);
            }
        });
    }

    /**
     * Handle window blur (losing focus)
     */
    handleWindowBlur() {
        // Reset all input state when window loses focus
        this.isMouseDown = false;
        this.isDragging = false;
        this.mouseButtons.clear();
        this.pressedKeys.clear();
        this.touches.clear();
        this.dragStartPosition = null;
        
        // Reset modifier keys
        this.modifierKeys = {
            shift: false,
            ctrl: false,
            alt: false,
            meta: false
        };
        
        this.eventManager.emit('input:blur');
    }

    /**
     * Handle window focus
     */
    handleWindowFocus() {
        this.eventManager.emit('input:focus');
    }

    /**
     * Update mouse position from event
     */
    updateMousePosition(event) {
        const rect = this.canvasContainer.getBoundingClientRect();
        this.mousePosition = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
    }

    /**
     * Update modifier key states
     */
    updateModifierKeys(event) {
        this.modifierKeys.shift = event.shiftKey;
        this.modifierKeys.ctrl = event.ctrlKey;
        this.modifierKeys.alt = event.altKey;
        this.modifierKeys.meta = event.metaKey;
    }

    /**
     * Create mouse event data object
     */
    createMouseEventData(event, type) {
        return {
            type,
            position: { ...this.mousePosition },
            lastPosition: { ...this.lastMousePosition },
            clientX: event.clientX,
            clientY: event.clientY,
            pageX: event.pageX,
            pageY: event.pageY,
            button: event.button,
            buttons: event.buttons,
            modifiers: { ...this.modifierKeys },
            timestamp: performance.now(),
            isDragging: this.isDragging,
            dragStartPosition: this.dragStartPosition ? { ...this.dragStartPosition } : null
        };
    }

    /**
     * Create keyboard event data object
     */
    createKeyEventData(event, type) {
        return {
            type,
            code: event.code,
            key: event.key,
            keyCode: event.keyCode,
            modifiers: { ...this.modifierKeys },
            repeat: event.repeat,
            timestamp: performance.now()
        };
    }

    /**
     * Convert touch to mouse-like event
     */
    touchToMouseEvent(touch, type) {
        return {
            type,
            clientX: touch.clientX,
            clientY: touch.clientY,
            pageX: touch.pageX,
            pageY: touch.pageY,
            button: 0, // Left button
            buttons: 1,
            shiftKey: false,
            ctrlKey: false,
            altKey: false,
            metaKey: false,
            preventDefault: () => {},
            stopPropagation: () => {}
        };
    }

    /**
     * Check if event should be ignored
     */
    shouldIgnoreEvent(event) {
        // Ignore events from non-canvas elements
        return !this.canvasContainer.contains(event.target);
    }

    /**
     * Check if user is typing in an input field
     */
    isTypingInInput(element) {
        const inputTypes = ['input', 'textarea', 'select'];
        return inputTypes.includes(element.tagName.toLowerCase()) ||
               element.contentEditable === 'true' ||
               element.isContentEditable;
    }

    /**
     * Get current mouse position
     */
    getMousePosition() {
        return { ...this.mousePosition };
    }

    /**
     * Get pressed keys
     */
    getPressedKeys() {
        return new Set(this.pressedKeys);
    }

    /**
     * Check if key is pressed
     */
    isKeyPressed(key) {
        return this.pressedKeys.has(key);
    }

    /**
     * Check if mouse button is pressed
     */
    isMouseButtonPressed(button = 0) {
        return this.mouseButtons.has(button);
    }

    /**
     * Get modifier key states
     */
    getModifierKeys() {
        return { ...this.modifierKeys };
    }

    /**
     * Check if modifier key is pressed
     */
    isModifierPressed(modifier) {
        return this.modifierKeys[modifier] || false;
    }

    /**
     * Get input state summary
     */
    getInputState() {
        return {
            mouse: {
                position: { ...this.mousePosition },
                lastPosition: { ...this.lastMousePosition },
                isDown: this.isMouseDown,
                isDragging: this.isDragging,
                buttons: new Set(this.mouseButtons),
                dragStartPosition: this.dragStartPosition ? { ...this.dragStartPosition } : null
            },
            keyboard: {
                pressedKeys: new Set(this.pressedKeys),
                modifiers: { ...this.modifierKeys }
            },
            touch: {
                isTouch: this.isTouchDevice,
                activeTouches: this.touches.size
            }
        };
    }

    /**
     * Set input configuration
     */
    setConfiguration(config) {
        if (config.preventContextMenu !== undefined) {
            this.preventContextMenu = config.preventContextMenu;
        }
        if (config.preventTextSelection !== undefined) {
            this.preventTextSelection = config.preventTextSelection;
        }
        if (config.preventScrolling !== undefined) {
            this.preventScrolling = config.preventScrolling;
        }
        if (config.dragThreshold !== undefined) {
            this.dragThreshold = config.dragThreshold;
        }
        if (config.throttleMouseMove !== undefined) {
            this.throttleMouseMove = config.throttleMouseMove;
        }
        if (config.mouseMoveThrottle !== undefined) {
            this.mouseMoveThrottle = config.mouseMoveThrottle;
        }
        
        // Reconfigure behavior
        this.configureInputBehavior();
    }

    /**
     * Enable/disable input handling
     */
    setEnabled(enabled) {
        if (this.canvasContainer) {
            this.canvasContainer.style.pointerEvents = enabled ? 'auto' : 'none';
        }
        
        if (!enabled) {
            // Reset all input state
            this.handleWindowBlur();
        }
    }

    /**
     * Destroy input manager
     */
    destroy() {
        console.log('Destroying InputManager...');
        
        if (this.canvasContainer) {
            // Remove mouse event listeners
            this.canvasContainer.removeEventListener('mousedown', this.handleMouseDown);
            this.canvasContainer.removeEventListener('mousemove', this.handleMouseMove);
            this.canvasContainer.removeEventListener('mouseup', this.handleMouseUp);
            this.canvasContainer.removeEventListener('wheel', this.handleMouseWheel);
            this.canvasContainer.removeEventListener('mouseleave', this.handleMouseLeave);
            this.canvasContainer.removeEventListener('contextmenu', this.handleContextMenu);
            this.canvasContainer.removeEventListener('selectstart', this.handleSelectStart);
            
            // Remove touch event listeners
            if (this.isTouchDevice) {
                this.canvasContainer.removeEventListener('touchstart', this.handleTouchStart);
                this.canvasContainer.removeEventListener('touchmove', this.handleTouchMove);
                this.canvasContainer.removeEventListener('touchend', this.handleTouchEnd);
                this.canvasContainer.removeEventListener('touchcancel', this.handleTouchEnd);
            }
        }
        
        // Remove global event listeners
        document.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('keyup', this.handleKeyUp);
        window.removeEventListener('blur', this.handleWindowBlur);
        window.removeEventListener('focus', this.handleWindowFocus);
        
        // Clear state
        this.isMouseDown = false;
        this.isDragging = false;
        this.mouseButtons.clear();
        this.pressedKeys.clear();
        this.touches.clear();
        
        console.log('InputManager destroyed');
    }
}