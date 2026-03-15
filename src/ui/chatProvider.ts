import * as vscode from 'vscode';
import { DevAgent } from '../agent/devAgent';
import { AgentStep, ChatMessage } from '../types';

export class ChatProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;
    private _cancellationTokenSource?: vscode.CancellationTokenSource;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _agent: DevAgent
    ) {
        // Listen for agent events
        this._agent.onMessage((msg) => this.addMessage(msg));
        this._agent.onProgress((step) => this.updateProgress(step));
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        token: vscode.CancellationToken
    ): void {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtml(webviewView.webview);

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'send':
                    await this.handleUserMessage(message.text);
                    break;
                case 'cancel':
                    this._cancellationTokenSource?.cancel();
                    break;
                case 'clear':
                    this._agent.clearHistory();
                    this._view?.webview.postMessage({ command: 'clear' });
                    break;
            }
        });

        // Load existing history
        const history = this._agent.getHistory();
        for (const msg of history) {
            this._view?.webview.postMessage({
                command: 'message',
                role: msg.role,
                content: msg.content
            });
        }
    }

    private async handleUserMessage(text: string): Promise<void> {
        if (!text.trim()) return;

        this._cancellationTokenSource = new vscode.CancellationTokenSource();
        
        this._view?.webview.postMessage({ command: 'loading', value: true });

        try {
            await this._agent.run(text, this._cancellationTokenSource.token);
        } catch (error) {
            this._view?.webview.postMessage({
                command: 'message',
                role: 'assistant',
                content: `Error: ${error instanceof Error ? error.message : String(error)}`
            });
        } finally {
            this._view?.webview.postMessage({ command: 'loading', value: false });
            this._cancellationTokenSource.dispose();
        }
    }

    private addMessage(msg: ChatMessage): void {
        this._view?.webview.postMessage({
            command: 'message',
            role: msg.role,
            content: msg.content
        });
    }

    private updateProgress(step: AgentStep): void {
        const statusIcon = {
            pending: '○',
            running: '◐',
            completed: '✓',
            failed: '✗'
        }[step.status];

        this._view?.webview.postMessage({
            command: 'progress',
            tool: step.tool,
            status: step.status,
            icon: statusIcon,
            result: step.result
        });
    }

    private _getHtml(webview: vscode.Webview): string {
        const cssUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'resources', 'chat.css'));
        const jsUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'resources', 'chat.js'));
        const nonce = getNonce();

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
    <title>Dev Agent</title>
    <link rel="stylesheet" href="${cssUri}" nonce="${nonce}">
</head>
<body>
    <div id="toolbar">
        <button id="clearBtn" title="Clear chat history">Clear</button>
    </div>
    
    <div id="messages"></div>
    
    <div class="loading" id="loading">
        <div class="spinner"></div>
        <span>Thinking...</span>
    </div>
    
    <div id="inputArea">
        <input type="text" id="promptInput" placeholder="What should I do?" />
        <button id="sendBtn">Send</button>
        <button id="cancelBtn" disabled>Cancel</button>
    </div>

    <script nonce="${nonce}" src="${jsUri}"></script>
</body>
</html>`;
    }
}

function getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
