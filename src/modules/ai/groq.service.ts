import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GroqCompletionOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

@Injectable()
export class GroqService {
  private readonly client: Groq;
  private readonly defaultModel: string;

  constructor(private readonly configService: ConfigService) {
    this.client = new Groq({
      apiKey: this.configService.get<string>('GROQ_API_KEY'),
    });
    this.defaultModel =
      this.configService.get<string>('GROQ_MODEL') ?? 'llama-3.3-70b-versatile';
  }

  async chat(
    messages: GroqMessage[],
    options: GroqCompletionOptions = {},
  ): Promise<string> {
    const completion = await this.client.chat.completions.create({
      model: options.model ?? this.defaultModel,
      messages,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 2048,
    });

    return completion.choices[0]?.message?.content ?? '';
  }

  async analyzeWithSystemPrompt(
    systemPrompt: string,
    userMessage: string,
    options: GroqCompletionOptions = {},
  ): Promise<string> {
    return this.chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      options,
    );
  }
}
