import * as vscode from 'vscode';
import { ChatProvider } from './ui/chatProvider';
import { DevAgent } from './agent/devAgent';

let devAgent: DevAgent;

export function activate(context: vscode.ExtensionContext) {
    console.log('Dev Agent extension is now active');

    // Initialize the dev agent
    devAgent = new DevAgent(context);

    // Register the chat webview provider
    const chatProvider = new ChatProvider(context.extensionUri, devAgent);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('devAgentChat', chatProvider)
    );

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('devAgent.runTask', async () => {
            const prompt = await vscode.window.showInputBox({
                prompt: 'What would you like me to do?',
                placeHolder: 'e.g., setup angular project, fix build errors'
            });
            if (prompt) {
                await devAgent.run(prompt);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('devAgent.clearHistory', () => {
            devAgent.clearHistory();
            vscode.window.showInformationMessage('Chat history cleared');
        })
    );
}

export function deactivate() {
    if (devAgent) {
        devAgent.dispose();
    }
}
