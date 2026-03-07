import { AIProjectClient } from '@azure/ai-projects';
import { DefaultAzureCredential } from '@azure/identity';
import { AgentRole } from '../types';
import dotenv from 'dotenv';

dotenv.config();

export class AgentService {
  private client: AIProjectClient;
  private agentIds: Record<AgentRole, string>;

  constructor() {
    this.client = new AIProjectClient(
      process.env.AZURE_AI_PROJECT_CONNECTION_STRING!,
      new DefaultAzureCredential()
    );

    this.agentIds = {
      orchestrator: process.env.ORCHESTRATOR_AGENT_ID!,
      architect: process.env.ARCHITECT_AGENT_ID!,
      mentor: process.env.MENTOR_AGENT_ID!,
      challenger: process.env.CHALLENGER_AGENT_ID!,
      naive_student: process.env.NAIVE_STUDENT_AGENT_ID!,
      evaluator: process.env.EVALUATOR_AGENT_ID!,
      renderer: process.env.RENDERER_AGENT_ID!,
    };
  }

  async createThread(): Promise<string> {
    const thread = await this.client.agents.threads.create();
    return thread.id;
  }

  async sendMessage(
    threadId: string,
    agentRole: AgentRole,
    userMessage: string,
    systemContext: string
  ): Promise<string> {
    await this.client.agents.messages.create(threadId, 'user', userMessage);

    const agentId = this.agentIds[agentRole];

    // createAndPoll handles polling automatically
    const poller = this.client.agents.runs.createAndPoll(threadId, agentId, {
      additionalInstructions: systemContext,
    });
    const run = await poller;

    if (run.status !== 'completed') {
      throw new Error(`Agent run failed with status: ${run.status}`);
    }

    const messagesPage = this.client.agents.messages.list(threadId);
    for await (const msg of messagesPage) {
      if (msg.role === 'assistant' && msg.content && msg.content.length > 0) {
        const content = msg.content[0] as any;
        if (content.type === 'text') {
          return content.text.value as string;
        }
      }
    }

    throw new Error('No response from agent');
  }

  async sendMessageStreaming(
    threadId: string,
    agentRole: AgentRole,
    userMessage: string,
    systemContext: string,
    onToken: (token: string) => void
  ): Promise<string> {
    await this.client.agents.messages.create(threadId, 'user', userMessage);

    const agentId = this.agentIds[agentRole];

    const runResponse = this.client.agents.runs.create(threadId, agentId, {
      additionalInstructions: systemContext,
    });

    const eventStream = await runResponse.stream();

    let fullResponse = '';

    for await (const event of eventStream) {
      if (event.event === 'thread.message.delta') {
        const delta = event.data as any;
        if (delta?.delta?.content) {
          for (const part of delta.delta.content) {
            if (part.type === 'text' && part.text?.value) {
              const token = part.text.value;
              fullResponse += token;
              onToken(token);
            }
          }
        }
      }
    }

    return fullResponse;
  }
}
