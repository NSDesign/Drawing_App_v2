import { EventEmitter } from '../core/EventEmitter.js';
import { SelectTool } from './SelectTool.js';
import { RectangleTool } from './RectangleTool.js';
import { EllipseTool } from './EllipseTool.js';
import { LineTool } from './LineTool.js';
import { TextTool } from './TextVTool.js';
import { BezierTool } from './BezierTool.js';
import { PanTool } from './PanTool.js';

export class ToolManager extends EventEmitter {
    constructor(state, renderer, commandManager) {
        super();
        this.state = state;
        this.renderer = renderer;
        this.commandManager = commandManager;
        this.currentTool = null;
        this.tools = new Map();
        this.initializeTools();
        this.bindEvents();
    }

    initializeTools() {
        this.tools.set('select', new SelectTool(this.state, this.renderer, this.commandManager));
        this.tools.set('rectangle', new RectangleTool(this.state, this.renderer, this.commandManager));
        this.tools.set('ellipse', new EllipseTool(this.state, this.renderer, this.commandManager));
        this.tools.set('line', new LineTool(this.state, this.renderer, this.commandManager));
        this.tools.set('text', new TextTool(this.state, this.renderer, this.commandManager));
        this.tools.set('pan', new PanTool(this.state, this.renderer));
        this.tools.set('bezier', new BezierTool(this.state, this.renderer, this.commandManager));
    }

    bindEvents() {
        this.state.on('toolChanged', (tool) => this.setTool(tool));
    }

    setTool(toolName) {
        if (this.currentTool) {
            this.currentTool.deactivate();
        }
        this.currentTool = this.tools.get(toolName);
        if (this.currentTool) {
            this.currentTool.activate();
        }
    }

    getCurrentTool() {
        return this.currentTool;
    }
}