// src/js/tools/TextTool.js
import { BaseTool } from './BaseTool.js';
import { Text } from '../shapes/Text.js';
import { AddShapeCommand } from '../commands/AddShapeCommand.js';

export class TextTool extends BaseTool {
    constructor(state, renderer, commandManager) {
        super(state, renderer);
        this.commandManager = commandManager;
        this.currentText = null;
        this.textInput = null;
        this.setupTextInput();
    }

    setupTextInput() {
        this.textInput = document.createElement('input');
        this.textInput.type = 'text';
        this.textInput.className = 'text-editor';
        this.textInput.style.cssText = `
            position: absolute;
            border: 2px solid #1976d2;
            background: white;
            padding: 4px 8px;
            font-size: 16px;
            font-family: Arial, sans-serif;
            outline: none;
            z-index: 1000;
            display: none;
        `;
        document.body.appendChild(this.textInput);

        this.textInput.addEventListener('blur', () => this.finishEditing());
        this.textInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.finishEditing();
            } else if (e.key === 'Escape') {
                this.cancelEditing();
            }
        });
    }

    activate() {
        super.activate();
        this.canvas.style.cursor = 'text';
    }

    deactivate() {
        super.deactivate();
        this.canvas.style.cursor = 'default';
        if (this.currentText && this.currentText.editing) {
            this.finishEditing();
        }
    }

    onMouseDown(e) {
        const pos = this.getCanvasPosition(e);
        const existingText = this.state.getShapeAt(pos.x, pos.y);
        
        if (existingText && existingText.type === 'text') {
            this.editExistingText(existingText, e);
        } else {
            this.createNewText(pos, e);
        }
    }

    createNewText(pos, e) {
        const text = new Text(pos.x, pos.y, 'Text');
        
        // Add to state immediately for visual feedback
        const command = new AddShapeCommand(this.state, text);
        this.commandManager.execute(command);
        
        this.currentText = text;
        this.showTextEditor(text, e);
        text.startEditing();
    }

    editExistingText(text, e) {
        this.currentText = text;
        this.showTextEditor(text, e);
        text.startEditing();
    }

    showTextEditor(text, e) {
        const canvasRect = this.canvas.getBoundingClientRect();
        
        this.textInput.value = text.text;
        this.textInput.style.display = 'block';
        this.textInput.style.left = (canvasRect.left + text.x * this.state.zoom + this.state.panX * this.state.zoom) + 'px';
        this.textInput.style.top = (canvasRect.top + text.y * this.state.zoom + this.state.panY * this.state.zoom) + 'px';
        this.textInput.style.fontSize = (text.fontSize * this.state.zoom) + 'px';
        this.textInput.style.color = text.fillColor;
        
        // Focus and select all text
        this.textInput.focus();
        this.textInput.select();
    }

    finishEditing() {
        if (!this.currentText) return;

        const newText = this.textInput.value.trim();
        
        if (newText === '') {
            // Remove empty text
            this.state.removeShape(this.currentText.id);
        } else {
            this.currentText.setText(newText);
        }

        this.hideTextEditor();
        this.currentText.stopEditing();
        this.currentText = null;
    }

    cancelEditing() {
        if (!this.currentText) return;

        // If it's a new text that was just created, remove it
        if (this.currentText.text === 'Text') {
            this.state.removeShape(this.currentText.id);
        }

        this.hideTextEditor();
        this.currentText.stopEditing();
        this.currentText = null;
    }

    hideTextEditor() {
        this.textInput.style.display = 'none';
        this.textInput.value = '';
    }

    onMouseMove(e) {}
    onMouseUp(e) {}
}

// Update to CanvasRenderer.js - Add text rendering in renderShape method
/*
Add this case to the switch statement in renderShape():

case 'text':
    this.ctx.font = `${shape.fontSize}px ${shape.fontFamily}`;
    this.ctx.textAlign = shape.textAlign;
    this.ctx.textBaseline = shape.textBaseline;
    this.ctx.fillStyle = shape.fillColor;
    
    if (shape.editing) {
        // Draw selection background for editing text
        const bounds = shape.getBounds();
        this.ctx.fillStyle = 'rgba(25, 118, 210, 0.1)';
        this.ctx.fillRect(bounds.x - 2, bounds.y - 2, bounds.width + 4, bounds.height + 4);
        this.ctx.fillStyle = shape.fillColor;
    }
    
    this.ctx.fillText(shape.text, shape.x, shape.y);
    
    if (shape.strokeWidth > 0 && shape.strokeColor !== 'transparent') {
        this.ctx.strokeStyle = shape.strokeColor;
        this.ctx.lineWidth = shape.strokeWidth;
        this.ctx.strokeText(shape.text, shape.x, shape.y);
    }
    break;
*/

