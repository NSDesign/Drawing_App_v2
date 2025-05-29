// src/js/core/Command.js
export class Command {
    execute() {
        throw new Error('Execute method must be implemented');
    }
    
    undo() {
        throw new Error('Undo method must be implemented');
    }
}

