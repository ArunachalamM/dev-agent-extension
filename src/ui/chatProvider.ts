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
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dev Agent</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background: var(--vscode-sideBar-background);
            padding: 8px;
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        #messages {
            flex: 1;
            overflow-y: auto;
            padding-bottom: 8px;
        }
        .message {
            margin-bottom: 12px;
            padding: 8px;
            border-radius: 4px;
        }
        .message.user {
            background: var(--vscode-input-background);
            border-left: 3px solid var(--vscode-inputValidation-infoBorder);
        }
        .message.assistant {
            background: var(--vscode-editor-background);
            border-left: 3px solid var(--vscode-inputValidation-warningBorder);
        }
        .message-role {
            font-weight: bold;
            font-size: 0.85em;
            margin-bottom: 4px;
            opacity: 0.8;
        }
        .message-content {
            white-space: pre-wrap;
            word-break: break-word;
        }
        .progress-item {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 4px 0;
            font-size: 0.9em;
        }
        .progress-item.running {
            color: var(--vscode-charts-blue);
        }
        .progress-item.completed {
            color: var(--vscode-charts-green);
        }
        .progress-item.failed {
            color: var(--vscode-errorForeground);
        }
        #inputArea {
            display: flex;
            gap: 4px;
            padding-top: 8px;
            border-top: 1px solid var(--vscode-panel-border);
        }
        #promptInput {
            flex: 1;
            padding: 8px;
            border: 1px solid var(--vscode-input-border);
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border-radius: 4px;
            font-family: inherit;
            font-size: inherit;
        }
        #promptInput:focus {
            outline: 1px solid var(--vscode-focusBorder);
        }
        button {
            padding: 8px 12px;
            border: none;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border-radius: 4px;
            cursor: pointer;
        }
        button:hover {
            background: var(--vscode-button-hoverBackground);
        }
        button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        #cancelBtn {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        .loading {
            display: none;
            align-items: center;
            gap: 8px;
            color: var(--vscode-descriptionForeground);
            padding: 8px 0;
        }
        .loading.active {
            display: flex;
        }
        .spinner {
            width: 16px;
            height: 16px;
            border: 2px solid var(--vscode-progressBar-background);
            border-top-color: transparent;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        #toolbar {
            display: flex;
            justify-content: flex-end;
            padding-bottom: 8px;
        }
        #toolbar button {
            padding: 4px 8px;
            font-size: 0.85em;
        }
    </style>
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

    <script>
        const vscode = acquireVsCodeApi();
        const messagesEl = document.getElementById('messages');
        const inputEl = document.getElementById('promptInput');
        const sendBtn = document.getElementById('sendBtn');
        const cancelBtn = document.getElementById('cancelBtn');
        const clearBtn = document.getElementById('clearBtn');
        const loadingEl = document.getElementById('loading');

        function send() {
            const text = inputEl.value.trim();
            if (!text) return;
            
            vscode.postMessage({ command: 'send', text });
            inputEl.value = '';
        }

        function addMessage(role, content) {
            const div = document.createElement('div');
            div.className = 'message ' + role;
            div.innerHTML = \`
                <div class="message-role">\${role === 'user' ? '👤 You' : '🤖 Agent'}</div>
                <div class="message-content">\${escapeHtml(content)}</div>
            \`;
            messagesEl.appendChild(div);
            messagesEl.scrollTop = messagesEl.scrollHeight;
        }

        function addProgress(icon, tool, status) {
            let progressDiv = document.querySelector(\`.progress-item[data-tool="\${tool}"]\`);
            if (!progressDiv) {
                progressDiv = document.createElement('div');
                progressDiv.className = 'progress-item';
                progressDiv.dataset.tool = tool;
                messagesEl.appendChild(progressDiv);
            }
            progressDiv.className = 'progress-item ' + status;
            progressDiv.textContent = icon + ' ' + tool;
            messagesEl.scrollTop = messagesEl.scrollHeight;
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        sendBtn.addEventListener('click', send);
        inputEl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') send();
        });
        cancelBtn.addEventListener('click', () => {
            vscode.postMessage({ command: 'cancel' });
        });
        clearBtn.addEventListener('click', () => {
            vscode.postMessage({ command: 'clear' });
        });

        window.addEventListener('message', (event) => {
            const msg = event.data;
            switch (msg.command) {
                case 'message':
                    addMessage(msg.role, msg.content);
                    break;
                case 'progress':
                    addProgress(msg.icon, msg.tool, msg.status);
                    break;
                case 'loading':
                    loadingEl.classList.toggle('active', msg.value);
                    sendBtn.disabled = msg.value;
                    cancelBtn.disabled = !msg.value;
                    break;
                case 'clear':
                    messagesEl.innerHTML = '';
                    break;
            }
        });
    </script>
</body>
</html>`;
    }
}
