# Dev Agent Extension — Technical Deep Dive

A comprehensive guide for beginners to understand how this VS Code extension works internally.

---

## Table of Contents

1. [What is a VS Code Extension?](#1-what-is-a-vs-code-extension)
2. [Project Structure Explained](#2-project-structure-explained)
3. [How VS Code Loads Your Extension](#3-how-vs-code-loads-your-extension)
4. [The Extension Lifecycle](#4-the-extension-lifecycle)
5. [Understanding package.json](#5-understanding-packagejson)
6. [The Chat Panel (Webview)](#6-the-chat-panel-webview)
7. [The Agent Architecture](#7-the-agent-architecture)
8. [Copilot Language Model API](#8-copilot-language-model-api)
9. [Tool System Deep Dive](#9-tool-system-deep-dive)
10. [Data Flow: From User Input to Result](#10-data-flow-from-user-input-to-result)
11. [TypeScript & Compilation](#11-typescript--compilation)
12. [Debugging the Extension](#12-debugging-the-extension)
13. [Key VS Code APIs Used](#13-key-vs-code-apis-used)
14. [Common Patterns & Best Practices](#14-common-patterns--best-practices)

---

## 1. What is a VS Code Extension?

A VS Code extension is a **JavaScript/TypeScript program** that runs inside VS Code and extends its functionality.

```
┌─────────────────────────────────────────────────────────────┐
│                         VS Code                             │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Extension  │  │  Extension  │  │  Extension  │  ...    │
│  │  (Yours!)   │  │  (Copilot)  │  │  (ESLint)   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│         │                │                │                 │
│         └────────────────┼────────────────┘                 │
│                          │                                  │
│                    VS Code API                              │
│                    (vscode module)                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Key Concepts

| Concept | Description |
|---------|-------------|
| **Extension Host** | A separate Node.js process where extensions run |
| **VS Code API** | The `vscode` module — functions to interact with the editor |
| **Activation** | When VS Code loads and starts your extension |
| **Contribution Points** | Things your extension adds (commands, views, etc.) |

---

## 2. Project Structure Explained

```
dev-agent-extension/
│
├── 📁 .vscode/                  # VS Code workspace settings
│   ├── launch.json              # F5 debug configurations
│   └── tasks.json               # Build tasks (compile, watch)
│
├── 📁 out/                      # Compiled JavaScript (generated)
│   └── *.js                     # TypeScript → JavaScript output
│
├── 📁 resources/
│   └── icon.svg                 # Activity bar icon
│
├── 📁 src/                      # Source code (TypeScript)
│   │
│   ├── 📁 agent/                # Core agent logic
│   │   ├── devAgent.ts          # Main orchestrator
│   │   ├── planner.ts           # LLM integration
│   │   └── toolExecutor.ts      # Tool dispatcher
│   │
│   ├── 📁 tools/                # Individual tool implementations
│   │   ├── cloneRepo.ts
│   │   ├── npmInstall.ts
│   │   ├── buildProject.ts
│   │   ├── runTests.ts
│   │   ├── readFile.ts
│   │   ├── editFile.ts
│   │   ├── createFile.ts
│   │   ├── searchWorkspace.ts
│   │   └── runCommand.ts
│   │
│   ├── 📁 ui/                   # User interface
│   │   └── chatProvider.ts      # Webview panel
│   │
│   ├── extension.ts             # Entry point (activate/deactivate)
│   └── types.ts                 # TypeScript types & schemas
│
├── package.json                 # Extension manifest (IMPORTANT!)
├── tsconfig.json                # TypeScript configuration
├── README.md                    # Documentation
└── USER_GUIDE.md                # Usage guide
```

### What Each Folder Does

| Folder | Purpose |
|--------|---------|
| `src/` | Your TypeScript source code |
| `out/` | Compiled JavaScript (VS Code runs this) |
| `.vscode/` | Debug and build configurations |
| `resources/` | Static assets (icons, images) |

---

## 3. How VS Code Loads Your Extension

```
┌─────────────────────────────────────────────────────────────┐
│                    EXTENSION LOADING                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. VS Code starts                                          │
│         │                                                   │
│         ▼                                                   │
│  2. Reads package.json from each extension                  │
│         │                                                   │
│         ▼                                                   │
│  3. Checks "activationEvents" - when to load?               │
│     ┌──────────────────────────────────────────┐           │
│     │ "activationEvents": ["onView:devAgentChat"]│           │
│     └──────────────────────────────────────────┘           │
│         │                                                   │
│         ▼                                                   │
│  4. User clicks Dev Agent icon → triggers activation        │
│         │                                                   │
│         ▼                                                   │
│  5. VS Code loads "main" file: "./out/extension.js"         │
│         │                                                   │
│         ▼                                                   │
│  6. Calls your activate() function                          │
│         │                                                   │
│         ▼                                                   │
│  7. Extension is now running!                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. The Extension Lifecycle

### extension.ts — The Entry Point

```typescript
// src/extension.ts

import * as vscode from 'vscode';

// Called when extension is activated
export function activate(context: vscode.ExtensionContext) {
    console.log('Extension activated!');
    
    // Register your features here
    // context.subscriptions.push(...) ensures cleanup on deactivate
}

// Called when extension is deactivated
export function deactivate() {
    console.log('Extension deactivated!');
}
```

### What is `ExtensionContext`?

The `context` object gives you:

| Property | What It Does |
|----------|--------------|
| `subscriptions` | Array to register disposables (auto-cleanup) |
| `extensionUri` | Path to your extension folder |
| `globalState` | Persistent storage across sessions |
| `workspaceState` | Storage for current workspace |
| `secrets` | Secure storage for sensitive data |

### What is `subscriptions.push()`?

When VS Code deactivates your extension, it needs to clean up:
- Unregister commands
- Close webviews
- Stop event listeners

```typescript
// BAD: Memory leak - never cleaned up
vscode.commands.registerCommand('myCommand', () => {});

// GOOD: Automatically cleaned up on deactivate
context.subscriptions.push(
    vscode.commands.registerCommand('myCommand', () => {})
);
```

---

## 5. Understanding package.json

The `package.json` is the **manifest** — it tells VS Code everything about your extension.

```jsonc
{
  // Basic info
  "name": "dev-agent-extension",
  "displayName": "Dev Agent",
  "version": "0.0.1",
  
  // Which VS Code versions work
  "engines": {
    "vscode": "^1.90.0"  // Requires VS Code 1.90+
  },
  
  // When to load the extension
  "activationEvents": [
    "onView:devAgentChat"  // Activate when chat panel is opened
  ],
  
  // Entry point (compiled JavaScript)
  "main": "./out/extension.js",
  
  // What the extension adds to VS Code
  "contributes": {
    
    // Add icon to Activity Bar (left sidebar)
    "viewsContainers": {
      "activitybar": [{
        "id": "dev-agent",
        "title": "Dev Agent",
        "icon": "resources/icon.svg"
      }]
    },
    
    // Add a view (panel) under that icon
    "views": {
      "dev-agent": [{
        "type": "webview",        // Custom HTML content
        "id": "devAgentChat",     // Unique identifier
        "name": "Dev Agent Chat"  // Display name
      }]
    },
    
    // Add commands to Command Palette
    "commands": [{
      "command": "devAgent.runTask",
      "title": "Dev Agent: Run Task"
    }]
  }
}
```

### Contribution Points Explained

```
┌─────────────────────────────────────────────────────────────┐
│                    ACTIVITY BAR                             │
│  ┌────┐                                                     │
│  │ 📁 │  Explorer                                           │
│  │ 🔍 │  Search                                             │
│  │ 🔀 │  Source Control                                     │
│  │ ⏱️ │  Dev Agent  ◄── viewsContainers.activitybar         │
│  └────┘                                                     │
│     │                                                       │
│     └──► Opens ───►  ┌─────────────────────┐               │
│                      │  Dev Agent Chat     │◄── views       │
│                      │  (Webview Panel)    │                │
│                      │                     │                │
│                      │  Your custom HTML   │                │
│                      │  lives here!        │                │
│                      └─────────────────────┘               │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. The Chat Panel (Webview)

A **Webview** is a mini browser inside VS Code where you can render custom HTML/CSS/JavaScript.

### chatProvider.ts Structure

```typescript
// src/ui/chatProvider.ts

export class ChatProvider implements vscode.WebviewViewProvider {
    
    // VS Code calls this when the panel is opened
    resolveWebviewView(webviewView: vscode.WebviewView) {
        
        // 1. Enable JavaScript in the webview
        webviewView.webview.options = { enableScripts: true };
        
        // 2. Set the HTML content
        webviewView.webview.html = `
            <html>
            <body>
                <input id="prompt" />
                <button onclick="send()">Send</button>
                <script>
                    const vscode = acquireVsCodeApi();
                    function send() {
                        vscode.postMessage({ command: 'send', text: '...' });
                    }
                </script>
            </body>
            </html>
        `;
        
        // 3. Listen for messages FROM the webview
        webviewView.webview.onDidReceiveMessage(message => {
            if (message.command === 'send') {
                // Handle the user's input
            }
        });
    }
}
```

### Communication: Extension ↔ Webview

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   EXTENSION (Node.js)              WEBVIEW (Browser)        │
│   ┌─────────────────┐              ┌─────────────────┐     │
│   │                 │              │                 │     │
│   │  TypeScript     │   Message    │  HTML/CSS/JS    │     │
│   │  Code           │◄────────────►│  (Web Page)     │     │
│   │                 │              │                 │     │
│   └─────────────────┘              └─────────────────┘     │
│          │                                  │               │
│          │ webview.postMessage()            │               │
│          │ ─────────────────────►           │               │
│          │                                  │               │
│          │ onDidReceiveMessage()            │               │
│          │ ◄─────────────────────           │               │
│          │                   vscode.postMessage()           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### The Message Flow

```typescript
// IN WEBVIEW (JavaScript in HTML)
const vscode = acquireVsCodeApi();  // Get VS Code API

// Send message TO extension
vscode.postMessage({ command: 'send', text: 'hello' });

// Receive message FROM extension
window.addEventListener('message', event => {
    const message = event.data;
    // Handle: { command: 'response', content: '...' }
});
```

```typescript
// IN EXTENSION (TypeScript)

// Receive message FROM webview
webviewView.webview.onDidReceiveMessage(message => {
    if (message.command === 'send') {
        const userText = message.text;
    }
});

// Send message TO webview
webviewView.webview.postMessage({ command: 'response', content: '...' });
```

---

## 7. The Agent Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      AGENT ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│    User Input                                               │
│        │                                                    │
│        ▼                                                    │
│  ┌─────────────┐                                           │
│  │  DevAgent   │  ◄── Orchestrator (devAgent.ts)           │
│  │             │                                            │
│  │  • run()    │  Entry point for all requests              │
│  │  • cancel() │  Stop current operation                    │
│  └─────┬───────┘                                           │
│        │                                                    │
│        ▼                                                    │
│  ┌─────────────┐                                           │
│  │  Planner    │  ◄── LLM Integration (planner.ts)         │
│  │             │                                            │
│  │  Sends prompt to Copilot                                │
│  │  Receives JSON plan                                     │
│  └─────┬───────┘                                           │
│        │                                                    │
│        ▼                                                    │
│  ┌─────────────┐     ┌─────────────────────────────┐       │
│  │ToolExecutor │────►│  Tools                      │       │
│  │             │     │  • clone_repo               │       │
│  │  Routes to  │     │  • npm_install              │       │
│  │  correct    │     │  • build_project            │       │
│  │  tool       │     │  • run_tests                │       │
│  └─────────────┘     │  • read_file                │       │
│                      │  • edit_file                │       │
│                      │  • create_file              │       │
│                      │  • search_workspace         │       │
│                      │  • run_command              │       │
│                      └─────────────────────────────┘       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### DevAgent Class (devAgent.ts)

The main orchestrator that coordinates everything:

```typescript
export class DevAgent {
    private planner: Planner;      // Talks to LLM
    private executor: ToolExecutor; // Runs tools
    
    async run(prompt: string): Promise<string> {
        // 1. Build context (workspace, current file, errors)
        const context = await this.buildContext();
        
        // 2. Ask LLM to create a plan
        const plan = await this.planner.createPlan(prompt, context);
        
        // 3. If conversational, return direct response
        if (plan.directResponse) {
            return plan.directResponse;
        }
        
        // 4. Execute each step in the plan
        for (const step of plan.steps) {
            await this.executor.execute(step);
        }
        
        // 5. Return summary
        return "Done!";
    }
}
```

### Event Emitters for UI Updates

```typescript
// DevAgent uses EventEmitters to notify the UI
private readonly _onProgress = new vscode.EventEmitter<AgentStep>();
public readonly onProgress = this._onProgress.event;

// UI subscribes to updates
agent.onProgress(step => {
    updateUI(step.status);  // "running", "completed", "failed"
});

// Agent fires events during execution
this._onProgress.fire({ tool: 'npm_install', status: 'running' });
```

---

## 8. Copilot Language Model API

VS Code provides the `vscode.lm` API to access language models (like GPT-4 via Copilot).

### How It Works

```typescript
// src/agent/planner.ts

async createPlan(prompt: string): Promise<AgentPlan> {
    
    // 1. Get available language models
    const models = await vscode.lm.selectChatModels({
        vendor: 'copilot',
        family: 'gpt-4o'
    });
    
    const model = models[0];
    
    // 2. Create messages
    const messages = [
        vscode.LanguageModelChatMessage.User("You are an agent..."),
        vscode.LanguageModelChatMessage.User("User request: " + prompt)
    ];
    
    // 3. Send request & stream response
    const response = await model.sendRequest(messages, {}, token);
    
    let text = '';
    for await (const chunk of response.text) {
        text += chunk;  // Collect streamed response
    }
    
    // 4. Parse JSON response
    return JSON.parse(text);
}
```

### The LLM Request/Response

```
┌─────────────────────────────────────────────────────────────┐
│                    LLM INTERACTION                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Extension                         Copilot (GPT-4)         │
│       │                                  │                  │
│       │  System Prompt:                  │                  │
│       │  "You are a dev agent..."        │                  │
│       │  ─────────────────────────────►  │                  │
│       │                                  │                  │
│       │  User Message:                   │                  │
│       │  "install lodash"                │                  │
│       │  ─────────────────────────────►  │                  │
│       │                                  │                  │
│       │                                  │                  │
│       │  JSON Response (streamed):       │                  │
│       │  ◄─────────────────────────────  │                  │
│       │  {                               │                  │
│       │    "summary": "Installing...",   │                  │
│       │    "steps": [{                   │                  │
│       │      "tool": "npm_install",      │                  │
│       │      "params": {"packages":      │                  │
│       │        ["lodash"]}               │                  │
│       │    }]                            │                  │
│       │  }                               │                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### System Prompt Design

The system prompt tells the LLM:
1. What tools are available
2. How to format the response (JSON)
3. Rules for when to use tools vs. direct responses

```typescript
const systemPrompt = `
You are Dev Agent. You help users with coding tasks.

Available Tools:
- npm_install: Install npm packages
- build_project: Run npm build
...

Response Format:
{
  "summary": "What you're doing",
  "directResponse": "For questions (no tools needed)",
  "steps": [{ "tool": "...", "params": {...} }]
}

Rules:
- For questions, use directResponse
- For actions, use steps with tools
`;
```

---

## 9. Tool System Deep Dive

### Tool Definition (types.ts)

Each tool has a **schema** that defines its parameters:

```typescript
// Using Zod for validation
import { z } from 'zod';

export const NpmInstallParamsSchema = z.object({
    packages: z.array(z.string()).optional(),
    dev: z.boolean().optional()
});

export const TOOL_DEFINITIONS = [
    {
        name: 'npm_install',
        description: 'Install npm packages',
        schema: NpmInstallParamsSchema
    }
];
```

### Tool Implementation

Each tool is an async function:

```typescript
// src/tools/npmInstall.ts

export async function npmInstall(
    params: NpmInstallParams,
    cancellationToken: vscode.CancellationToken
): Promise<ToolResult> {
    
    // Build command
    const args = ['install'];
    if (params.packages) {
        args.push(...params.packages);
    }
    
    // Execute
    return new Promise((resolve) => {
        const proc = spawn('npm', args, { shell: true });
        
        proc.on('close', (code) => {
            if (code === 0) {
                resolve({ success: true, output: 'Done' });
            } else {
                resolve({ success: false, error: 'Failed' });
            }
        });
    });
}
```

### Tool Executor (Dispatcher)

Maps tool names to implementations:

```typescript
// src/agent/toolExecutor.ts

export class ToolExecutor {
    private tools = new Map([
        ['npm_install', npmInstall],
        ['build_project', buildProject],
        // ... more tools
    ]);
    
    async execute(step: ToolCall): Promise<ToolResult> {
        const toolFn = this.tools.get(step.tool);
        
        if (!toolFn) {
            return { success: false, error: 'Unknown tool' };
        }
        
        // Validate parameters with Zod
        const validation = schema.safeParse(step.params);
        if (!validation.success) {
            return { success: false, error: validation.error.message };
        }
        
        // Execute the tool
        return await toolFn(step.params, token);
    }
}
```

---

## 10. Data Flow: From User Input to Result

Complete journey of a user request:

```
┌─────────────────────────────────────────────────────────────┐
│                    COMPLETE DATA FLOW                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. USER TYPES: "install lodash"                            │
│         │                                                   │
│         ▼                                                   │
│  2. WEBVIEW                                                 │
│     └── vscode.postMessage({ command: 'send', text: '...'}) │
│         │                                                   │
│         ▼                                                   │
│  3. CHAT PROVIDER                                           │
│     └── onDidReceiveMessage(msg)                            │
│     └── calls: agent.run(msg.text)                          │
│         │                                                   │
│         ▼                                                   │
│  4. DEV AGENT                                               │
│     └── buildContext() - get workspace, file, errors        │
│     └── planner.createPlan(prompt, context)                 │
│         │                                                   │
│         ▼                                                   │
│  5. PLANNER                                                 │
│     └── vscode.lm.selectChatModels()                        │
│     └── model.sendRequest([messages])                       │
│         │                                                   │
│         ▼                                                   │
│  6. COPILOT LLM                                             │
│     └── Returns JSON: { steps: [{ tool: 'npm_install' }] }  │
│         │                                                   │
│         ▼                                                   │
│  7. TOOL EXECUTOR                                           │
│     └── validate params with Zod                            │
│     └── call npmInstall({ packages: ['lodash'] })           │
│         │                                                   │
│         ▼                                                   │
│  8. NPM INSTALL TOOL                                        │
│     └── spawn('npm', ['install', 'lodash'])                 │
│     └── wait for process to complete                        │
│     └── return { success: true, output: 'Installed' }       │
│         │                                                   │
│         ▼                                                   │
│  9. DEV AGENT                                               │
│     └── _onMessage.fire({ content: '✓ npm_install: Done' }) │
│         │                                                   │
│         ▼                                                   │
│  10. CHAT PROVIDER                                          │
│     └── webview.postMessage({ role: 'assistant', ... })     │
│         │                                                   │
│         ▼                                                   │
│  11. WEBVIEW                                                │
│     └── addMessage('assistant', '✓ npm_install: Done')      │
│     └── User sees result!                                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 11. TypeScript & Compilation

### Why TypeScript?

```typescript
// TypeScript catches errors at compile time
function greet(name: string): string {
    return `Hello, ${name}`;
}

greet(123);  // ❌ Error: Argument of type 'number' is not assignable
```

### tsconfig.json Explained

```jsonc
{
  "compilerOptions": {
    "module": "Node16",       // Output format for Node.js
    "target": "ES2022",       // JavaScript version to output
    "outDir": "out",          // Where to put compiled JS
    "rootDir": "src",         // Where TypeScript files are
    "sourceMap": true,        // Enable debugging
    "strict": true            // Catch more errors
  }
}
```

### Compilation Process

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   src/extension.ts          npm run compile          out/   │
│   src/agent/*.ts      ─────────────────────►    extension.js│
│   src/tools/*.ts             (tsc)              agent/*.js  │
│   src/ui/*.ts                                   tools/*.js  │
│                                                             │
│   TypeScript                                    JavaScript  │
│   (You write)                                  (VS Code runs)│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 12. Debugging the Extension

### Setting Breakpoints

1. Open any `.ts` file in `src/`
2. Click left of line number to add breakpoint (red dot)
3. Press F5
4. Breakpoints will pause execution

### Debug Console

In the debug toolbar, you can:
- Step Over (F10) — next line
- Step Into (F11) — go into function
- Step Out (Shift+F11) — exit function
- Continue (F5) — run until next breakpoint

### console.log() Debugging

```typescript
console.log('User prompt:', prompt);
console.log('Plan:', JSON.stringify(plan, null, 2));
```

View logs in:
- **Debug Console** (in your main VS Code window)
- **Developer Tools** (Help → Toggle Developer Tools in Extension Host)

### Webview Debugging

1. In Extension Host window: Help → Toggle Developer Tools
2. Or: Ctrl+Shift+I
3. Use browser-style debugging for your webview HTML/JS

---

## 13. Key VS Code APIs Used

### vscode.window

```typescript
// Show messages
vscode.window.showInformationMessage('Hello!');
vscode.window.showErrorMessage('Oops!');

// Get user input
const input = await vscode.window.showInputBox({
    prompt: 'Enter your name'
});

// Get active editor
const editor = vscode.window.activeTextEditor;
```

### vscode.workspace

```typescript
// Get workspace folder
const folder = vscode.workspace.workspaceFolders?.[0];

// Find files
const files = await vscode.workspace.findFiles('**/*.ts');

// Read/write files (via TextDocument)
const doc = await vscode.workspace.openTextDocument(uri);
```

### vscode.commands

```typescript
// Register a command
vscode.commands.registerCommand('myExt.doSomething', () => {
    // Command implementation
});

// Execute a command
await vscode.commands.executeCommand('workbench.action.files.save');
```

### vscode.lm (Language Model)

```typescript
// Get available models
const models = await vscode.lm.selectChatModels({ vendor: 'copilot' });

// Send a request
const response = await model.sendRequest(messages, {}, token);

// Stream the response
for await (const chunk of response.text) {
    console.log(chunk);
}
```

### vscode.CancellationToken

```typescript
// Check if user cancelled
if (token.isCancellationRequested) {
    return;
}

// Listen for cancellation
token.onCancellationRequested(() => {
    process.kill();
});
```

---

## 14. Common Patterns & Best Practices

### Pattern 1: Disposable Management

```typescript
// Always add disposables to subscriptions
export function activate(context: vscode.ExtensionContext) {
    const disposable1 = vscode.commands.registerCommand(...);
    const disposable2 = vscode.window.registerWebviewViewProvider(...);
    
    context.subscriptions.push(disposable1, disposable2);
}
```

### Pattern 2: Error Handling

```typescript
try {
    const result = await riskyOperation();
} catch (error) {
    // Type guard for Error
    const message = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Failed: ${message}`);
}
```

### Pattern 3: Async/Await

```typescript
// BAD: Callback hell
getUser(id, (user) => {
    getOrders(user, (orders) => {
        // ...
    });
});

// GOOD: Async/await
const user = await getUser(id);
const orders = await getOrders(user);
```

### Pattern 4: Event Emitters

```typescript
// Create emitter (private)
private readonly _onDidChange = new vscode.EventEmitter<string>();

// Expose as event (public, read-only)
public readonly onDidChange = this._onDidChange.event;

// Fire events
this._onDidChange.fire('something changed');

// Subscribe to events
myClass.onDidChange(value => console.log(value));
```

### Pattern 5: Configuration

```typescript
// Read settings from VS Code
const config = vscode.workspace.getConfiguration('devAgent');
const timeout = config.get<number>('timeout', 5000);
```

---

## Summary: Key Takeaways

| Concept | File | Purpose |
|---------|------|---------|
| Entry Point | `extension.ts` | `activate()` / `deactivate()` functions |
| Manifest | `package.json` | Declares commands, views, activation |
| Webview | `chatProvider.ts` | Custom HTML UI in sidebar |
| LLM | `planner.ts` | Talks to Copilot via `vscode.lm` |
| Tools | `tools/*.ts` | Individual actions (npm, git, etc.) |
| Types | `types.ts` | Zod schemas + TypeScript interfaces |

### Learning Path

1. **Start with `package.json`** — understand what the extension contributes
2. **Read `extension.ts`** — see how everything is wired together
3. **Explore `chatProvider.ts`** — understand webview communication
4. **Study `planner.ts`** — see how LLM integration works
5. **Look at a tool** (e.g., `npmInstall.ts`) — see how actions are executed

---

## Further Reading

- [VS Code Extension API](https://code.visualstudio.com/api)
- [Webview Guide](https://code.visualstudio.com/api/extension-guides/webview)
- [Language Model API](https://code.visualstudio.com/api/extension-guides/language-model)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/)
- [Zod Validation](https://zod.dev/)

Happy coding! 🚀
