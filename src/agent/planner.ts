import * as vscode from 'vscode';
import { AgentContext, AgentPlan, TOOL_DEFINITIONS, ToolCall } from '../types';

export class Planner {
    
    /**
     * Creates an execution plan using VS Code's Language Model API
     */
    async createPlan(
        userPrompt: string, 
        context: AgentContext,
        cancellationToken: vscode.CancellationToken
    ): Promise<AgentPlan> {
        
        // Try to get an available language model
        const models = await vscode.lm.selectChatModels({
            vendor: 'copilot',
            family: 'gpt-4o'
        });

        if (models.length === 0) {
            // Fallback: try any available model
            const anyModels = await vscode.lm.selectChatModels();
            if (anyModels.length === 0) {
                throw new Error('No language models available. Please ensure GitHub Copilot is installed and signed in.');
            }
            models.push(anyModels[0]);
        }

        const model = models[0];
        
        // Build the system prompt
        const systemPrompt = this.buildSystemPrompt();
        const userMessage = this.buildUserMessage(userPrompt, context);

        // Create messages for the LLM
        const messages = [
            vscode.LanguageModelChatMessage.User(systemPrompt),
            vscode.LanguageModelChatMessage.User(userMessage)
        ];

        // Send request to the model
        const response = await model.sendRequest(messages, {}, cancellationToken);
        
        // Collect the streamed response
        let responseText = '';
        for await (const chunk of response.text) {
            if (cancellationToken.isCancellationRequested) {
                throw new Error('Operation cancelled');
            }
            responseText += chunk;
        }

        // Parse the response into a plan
        return this.parseResponse(responseText);
    }

    private buildSystemPrompt(): string {
        const toolDescriptions = TOOL_DEFINITIONS.map(t => 
            `- ${t.name}: ${t.description}`
        ).join('\n');

        return `You are a developer automation agent named "Dev Agent". You help users with coding tasks by either:
1. Executing tools to perform actions (install packages, edit files, run commands, etc.)
2. Answering questions directly when no tools are needed

## Available Tools:
${toolDescriptions}

## Response Format:
You MUST respond with valid JSON in this exact format:
\`\`\`json
{
  "summary": "Brief description of what you're doing",
  "directResponse": "Your conversational response here (use this for questions, explanations, greetings, etc.)",
  "steps": [
    {
      "tool": "tool_name",
      "params": { "param1": "value1" },
      "reasoning": "Why this step is needed"
    }
  ]
}
\`\`\`

## Rules:
1. For conversational queries (greetings, questions about yourself, explanations, help requests), use "directResponse" and leave "steps" empty
2. For action requests (install, build, create, edit, search, run), use "steps" with appropriate tools
3. Only use tools from the available list
4. Provide all required parameters for each tool
5. Order steps logically (dependencies first)
6. Be helpful, friendly, and concise

## About You:
- You are Dev Agent, an AI-powered developer automation assistant
- You run inside VS Code and can execute various development tasks
- You use GitHub Copilot's language model for reasoning
- You can help with: installing packages, building projects, running tests, editing files, searching code, and running shell commands`;
    }

    private buildUserMessage(prompt: string, context: AgentContext): string {
        let message = `## User Request:\n${prompt}\n\n## Context:\n`;
        
        if (context.workspaceFolder) {
            message += `- Workspace: ${context.workspaceFolder}\n`;
        }
        
        if (context.currentFile) {
            message += `- Current file: ${context.currentFile}\n`;
        }
        
        if (context.diagnostics && context.diagnostics.length > 0) {
            message += `\n## Current Errors/Warnings:\n${context.diagnostics.join('\n')}\n`;
        }

        // Include recent conversation context
        if (context.conversationHistory.length > 0) {
            const recent = context.conversationHistory.slice(-4); // Last 4 messages
            message += `\n## Recent Conversation:\n`;
            for (const msg of recent) {
                message += `${msg.role}: ${msg.content.substring(0, 200)}...\n`;
            }
        }

        message += `\nProvide your plan as JSON:`;
        return message;
    }

    private parseResponse(responseText: string): AgentPlan {
        // Extract JSON from the response (handle markdown code blocks)
        let jsonStr = responseText;
        
        // Try to extract from code block
        const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
            jsonStr = jsonMatch[1].trim();
        }

        try {
            const parsed = JSON.parse(jsonStr);
            
            // Validate the structure
            const steps = parsed.steps || [];
            
            // Validate each step
            const validSteps: ToolCall[] = [];
            for (const step of steps) {
                if (step.tool && typeof step.tool === 'string') {
                    validSteps.push({
                        tool: step.tool,
                        params: step.params || {},
                        reasoning: step.reasoning
                    });
                }
            }

            return {
                summary: parsed.summary || 'Response',
                steps: validSteps,
                directResponse: parsed.directResponse
            };

        } catch (error) {
            // If parsing fails, try to extract intent and create a simple plan
            console.error('Failed to parse LLM response:', error);
            return {
                summary: 'Could not parse plan from response',
                steps: []
            };
        }
    }
}
