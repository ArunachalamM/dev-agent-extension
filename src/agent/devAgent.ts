import * as vscode from 'vscode';
import { Planner } from './planner';
import { ToolExecutor } from './toolExecutor';
import { AgentContext, AgentStep, ChatMessage, ToolResult } from '../types';

export class DevAgent {
    private planner: Planner;
    private executor: ToolExecutor;
    private conversationHistory: ChatMessage[] = [];
    private cancellationTokenSource: vscode.CancellationTokenSource | null = null;
    
    // Event emitter for UI updates
    private readonly _onProgress = new vscode.EventEmitter<AgentStep>();
    public readonly onProgress = this._onProgress.event;
    
    private readonly _onMessage = new vscode.EventEmitter<ChatMessage>();
    public readonly onMessage = this._onMessage.event;
    
    constructor(private context: vscode.ExtensionContext) {
        this.planner = new Planner();
        this.executor = new ToolExecutor();
    }

    async run(prompt: string, cancellationToken?: vscode.CancellationToken): Promise<string> {
        // Create cancellation token if not provided
        if (!cancellationToken) {
            this.cancellationTokenSource = new vscode.CancellationTokenSource();
            cancellationToken = this.cancellationTokenSource.token;
        }

        // Add user message to history
        const userMessage: ChatMessage = {
            role: 'user',
            content: prompt,
            timestamp: new Date()
        };
        this.conversationHistory.push(userMessage);
        this._onMessage.fire(userMessage);

        try {
            // Build context
            const agentContext = await this.buildContext();

            // Get plan from LLM
            const plan = await this.planner.createPlan(prompt, agentContext, cancellationToken);
            
            if (cancellationToken.isCancellationRequested) {
                return 'Operation cancelled';
            }

            // If there's a direct response (conversational query), return it
            if (plan.directResponse && plan.steps.length === 0) {
                const response = plan.directResponse;
                
                const assistantMessage: ChatMessage = {
                    role: 'assistant',
                    content: response,
                    timestamp: new Date()
                };
                this.conversationHistory.push(assistantMessage);
                this._onMessage.fire(assistantMessage);

                return response;
            }

            // Execute each step
            const results: string[] = [];
            for (let i = 0; i < plan.steps.length; i++) {
                if (cancellationToken.isCancellationRequested) {
                    results.push('Operation cancelled');
                    break;
                }

                const step = plan.steps[i];
                const agentStep: AgentStep = {
                    tool: step.tool,
                    params: step.params,
                    status: 'running'
                };
                
                this._onProgress.fire(agentStep);

                try {
                    const result = await this.executor.execute(step, cancellationToken);
                    agentStep.status = result.success ? 'completed' : 'failed';
                    agentStep.result = result;
                    results.push(result.success 
                        ? `✓ ${step.tool}: ${result.output || 'Done'}` 
                        : `✗ ${step.tool}: ${result.error}`);
                } catch (error) {
                    agentStep.status = 'failed';
                    agentStep.result = { 
                        success: false, 
                        error: error instanceof Error ? error.message : String(error) 
                    };
                    results.push(`✗ ${step.tool}: ${agentStep.result.error}`);
                }

                this._onProgress.fire(agentStep);
            }

            // Build response
            const response = `## Execution Summary\n\n${plan.summary}\n\n### Steps Completed:\n${results.join('\n')}`;
            
            const assistantMessage: ChatMessage = {
                role: 'assistant',
                content: response,
                timestamp: new Date()
            };
            this.conversationHistory.push(assistantMessage);
            this._onMessage.fire(assistantMessage);

            return response;

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            const assistantMessage: ChatMessage = {
                role: 'assistant',
                content: `Error: ${errorMsg}`,
                timestamp: new Date()
            };
            this.conversationHistory.push(assistantMessage);
            this._onMessage.fire(assistantMessage);
            return `Error: ${errorMsg}`;
        }
    }

    cancel(): void {
        this.cancellationTokenSource?.cancel();
    }

    clearHistory(): void {
        this.conversationHistory = [];
    }

    getHistory(): ChatMessage[] {
        return [...this.conversationHistory];
    }

    private async buildContext(): Promise<AgentContext> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        const workspaceFolder = workspaceFolders?.[0]?.uri.fsPath || '';
        
        const activeEditor = vscode.window.activeTextEditor;
        const currentFile = activeEditor?.document.uri.fsPath;

        // Get diagnostics (errors/warnings)
        const diagnostics: string[] = [];
        if (currentFile) {
            const fileDiagnostics = vscode.languages.getDiagnostics(activeEditor.document.uri);
            for (const diag of fileDiagnostics.slice(0, 10)) { // Limit to first 10
                diagnostics.push(`${diag.severity === vscode.DiagnosticSeverity.Error ? 'Error' : 'Warning'}: ${diag.message} (line ${diag.range.start.line + 1})`);
            }
        }

        return {
            workspaceFolder,
            currentFile,
            diagnostics,
            conversationHistory: this.conversationHistory
        };
    }

    dispose(): void {
        this._onProgress.dispose();
        this._onMessage.dispose();
        this.cancellationTokenSource?.dispose();
    }
}
