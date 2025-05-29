// src/js/main.js - Modern Drawing Application Entry Point

import { DrawingApplication } from './core/Application.js';
import { EventManager } from './core/EventManager.js';
import { StateManager } from './core/StateManager.js';
import { CanvasManager } from './canvas/CanvasManager.js';
import { ToolManager } from './tools/ToolManager.js';
import { UIManager } from './ui/UIManager.js';
import { InputManager } from './utils/InputManager.js';

/**
 * Application initialization and setup
 */
class App {
    constructor() {
        this.app = null;
        this.initialized = false;
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                await new Promise(resolve => {
                    document.addEventListener('DOMContentLoaded', resolve);
                });
            }

            // Initialize core systems
            console.log('🎨 Initializing Modern Drawing Application...');
            
            this.app = new DrawingApplication({
                container: document.getElementById('canvasContainer'),
                toolbar: document.getElementById('toolbar'),
                propertiesPanel: document.getElementById('propertiesPanel'),
                statusBar: document.getElementById('statusBar'),
                mainMenu: document.getElementById('mainMenu')
            });

            await this.app.initialize();
            
            this.setupGlobalErrorHandling();
            this.setupKeyboardShortcuts();
            
            this.initialized = true;
            console.log('✅ Application initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize application:', error);
            this.showErrorMessage('Failed to initialize drawing application. Please refresh the page.');
        }
    }

    /**
     * Setup global error handling
     */
    setupGlobalErrorHandling() {
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            this.showErrorMessage('An unexpected error occurred.');
        });

        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this.showErrorMessage('An unexpected error occurred.');
        });
    }

    /**
     * Setup global keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            // Prevent default behavior for our shortcuts
            const shortcuts = {
                'KeyQ': 'select-object',
                'KeyW': 'select-element', 
                'KeyR': 'create-rectangle',
                'KeyE': 'create-ellipse',
                'KeyL': 'create-line',
                'KeyT': 'create-text',
                'KeyZ': 'zoom',
                'KeyP': 'pan'
            };

            if (shortcuts[event.code] && !event.ctrlKey && !event.metaKey) {
                event.preventDefault();
                this.app?.toolManager?.setActiveTool(shortcuts[event.code]);
            }

            // Handle Ctrl/Cmd shortcuts
            if (event.ctrlKey || event.metaKey) {
                switch (event.code) {
                    case 'KeyN':
                        event.preventDefault();
                        this.app?.menuManager?.handleAction('new');
                        break;
                    case 'KeyO':
                        event.preventDefault();
                        this.app?.menuManager?.handleAction('open');
                        break;
                    case 'KeyS':
                        event.preventDefault();
                        if (event.shiftKey) {
                            this.app?.menuManager?.handleAction('save-as');
                        } else {
                            this.app?.menuManager?.handleAction('save');
                        }
                        break;
                    case 'KeyZ':
                        event.preventDefault();
                        if (event.shiftKey) {
                            this.app?.commandManager?.redo();
                        } else {
                            this.app?.commandManager?.undo();
                        }
                        break;
                }
            }
        });
    }

    /**
     * Show error message to user
     */
    showErrorMessage(message) {
        // Create a simple error notification
        const notification = document.createElement('div');
        notification.className = 'error-notification';
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
     * Cleanup and destroy application
     */
    destroy() {
        if (this.app) {
            this.app.destroy();
            this.app = null;
        }
        this.initialized = false;
    }
}

// Create and initialize the application
const app = new App();
app.init();

// Make app available globally for debugging
window.drawingApp = app;

// Handle page unload
window.addEventListener('beforeunload', () => {
    app.destroy();
});

export default app;