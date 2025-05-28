import { EventEmitter } from '../core/EventEmitter.js';
import { SelectTool } from './SelectTool.js';
import { RectangleTool } from './RectangleTool.js';
import { EllipseTool } from './EllipseTool.js';
import { LineTool } from './LineTool.js';
import { PanTool } from './PanTool.js';

export class ToolManager extends EventEmitter {
    constructor(state, renderer) {
        super();
        this.state = state;
        this.renderer = renderer;
        this.currentTool = null;
        this.tools = new Map();
        this.initializeTools();
        this.bindEvents();
    }

    initializeTools() {
        this.tools.set('select', new SelectTool(this.state, this.renderer));
        this.tools.set('rectangle', new RectangleTool(this.state, this.renderer));
        this.tools.set('ellipse', new EllipseTool(this.state, this.renderer));
        this.tools.set('line', new LineTool(this.state, this.renderer));
        this.tools.set('pan', new PanTool(this.state, this.renderer));
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
}