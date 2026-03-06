import { AgentService } from '../../services/agent.service';

// Mock Azure AI SDK
const mockAgents = {
  threads: {
    create: jest.fn().mockResolvedValue({ id: 'thread-123' }),
  },
  messages: {
    create: jest.fn().mockResolvedValue({}),
    list: jest.fn().mockReturnValue({
      [Symbol.asyncIterator]: async function* () {
        yield {
          role: 'assistant',
          content: [{ type: 'text', text: { value: 'Hello learner!' } }],
        };
      },
    }),
  },
  runs: {
    createAndPoll: jest.fn().mockResolvedValue({ status: 'completed' }),
    create: jest.fn(),
  },
};

jest.mock('@azure/ai-projects', () => ({
  AIProjectClient: jest.fn().mockImplementation(() => ({
    agents: mockAgents,
  })),
}));

jest.mock('@azure/identity', () => ({
  DefaultAzureCredential: jest.fn(),
}));

describe('AgentService', () => {
  let service: AgentService;

  beforeEach(() => {
    process.env.AZURE_AI_PROJECT_CONNECTION_STRING = 'test-connection';
    process.env.ORCHESTRATOR_AGENT_ID = 'orch-id';
    process.env.ARCHITECT_AGENT_ID = 'arch-id';
    process.env.MENTOR_AGENT_ID = 'ment-id';
    process.env.CHALLENGER_AGENT_ID = 'chal-id';
    process.env.NAIVE_STUDENT_AGENT_ID = 'naive-id';
    process.env.EVALUATOR_AGENT_ID = 'eval-id';
    service = new AgentService();
  });

  it('should create a new thread', async () => {
    const threadId = await service.createThread();
    expect(threadId).toBe('thread-123');
  });

  it('should send a message and get a response', async () => {
    const response = await service.sendMessage('thread-123', 'architect', 'Hello', 'System prompt');
    expect(response).toBe('Hello learner!');
  });
});
