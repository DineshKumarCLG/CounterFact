import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { CONFIG } from "../engine/config";

let client: BedrockRuntimeClient | null = null;

function getClient(): BedrockRuntimeClient {
  if (!client) {
    client = new BedrockRuntimeClient({
      region: CONFIG.bedrock.region,
    });
  }
  return client;
}

export interface InvokeOptions {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export interface LLMResponse {
  content: string;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Detect if the model uses the Anthropic API format
 */
function isAnthropicModel(): boolean {
  return CONFIG.bedrock.modelId.includes("anthropic");
}

/**
 * Build the request body based on the model provider
 */
function buildRequestBody(
  userMessage: string,
  options: { maxTokens: number; temperature: number; systemPrompt?: string }
): string {
  const { maxTokens, temperature, systemPrompt } = options;

  if (isAnthropicModel()) {
    // Anthropic Claude format
    const body: Record<string, unknown> = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: maxTokens,
      temperature,
      messages: [{ role: "user", content: userMessage }],
    };
    if (systemPrompt) {
      body.system = systemPrompt;
    }
    return JSON.stringify(body);
  }

  // OpenAI-compatible format (GLM, Mistral, Meta, etc.)
  const messages: { role: string; content: string }[] = [];
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: userMessage });

  return JSON.stringify({
    messages,
    max_tokens: maxTokens,
    temperature,
  });
}

/**
 * Parse the response body based on the model provider
 */
function parseResponse(responseBody: Record<string, any>): LLMResponse {
  if (isAnthropicModel()) {
    return {
      content: responseBody.content[0].text,
      inputTokens: responseBody.usage?.input_tokens ?? 0,
      outputTokens: responseBody.usage?.output_tokens ?? 0,
    };
  }

  // OpenAI-compatible format (GLM, Mistral, Meta, etc.)
  const choice = responseBody.choices?.[0];
  const text = choice?.message?.content ?? choice?.text ?? "";
  return {
    content: text,
    inputTokens: responseBody.usage?.prompt_tokens ?? 0,
    outputTokens: responseBody.usage?.completion_tokens ?? 0,
  };
}

/**
 * Invoke LLM via AWS Bedrock with retry logic
 * Supports both Anthropic (Claude) and OpenAI-compatible (GLM, Mistral, etc.) formats
 */
export async function invokeLLM(
  userMessage: string,
  options: InvokeOptions = {}
): Promise<LLMResponse> {
  const {
    maxTokens = CONFIG.bedrock.maxTokens,
    temperature = CONFIG.bedrock.temperature,
    systemPrompt,
  } = options;

  const bodyStr = buildRequestBody(userMessage, { maxTokens, temperature, systemPrompt });
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < CONFIG.bedrock.retryAttempts; attempt++) {
    try {
      const command = new InvokeModelCommand({
        modelId: CONFIG.bedrock.modelId,
        contentType: "application/json",
        accept: "application/json",
        body: bodyStr,
      });

      const response = await getClient().send(command);
      const responseBody = JSON.parse(
        new TextDecoder().decode(response.body)
      );

      return parseResponse(responseBody);
    } catch (error) {
      lastError = error as Error;
      const isRateLimit =
        (error as { name?: string }).name === "ThrottlingException" ||
        (error as { name?: string }).name ===
          "ServiceQuotaExceededException";

      if (isRateLimit && attempt < CONFIG.bedrock.retryAttempts - 1) {
        const delay =
          CONFIG.bedrock.retryBaseDelayMs * Math.pow(2, attempt);
        console.warn(
          `[Bedrock] Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${CONFIG.bedrock.retryAttempts})`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      throw error;
    }
  }

  throw lastError || new Error("All retry attempts exhausted");
}


/**
 * Extract JSON from an LLM response that may be wrapped in markdown code fences
 */
function extractJson(raw: string): string {
  // Strip markdown ```json ... ``` fences
  const fenceMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }
  // Try to find raw JSON object/array
  const jsonMatch = raw.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch) {
    return jsonMatch[1].trim();
  }
  return raw.trim();
}

/**
 * Invoke LLM and parse the response as JSON.
 * Strips markdown code fences before parsing.
 */
export async function invokeLLMJson<T = unknown>(
  userMessage: string,
  options: InvokeOptions = {}
): Promise<{ data: T; inputTokens: number; outputTokens: number }> {
  const response = await invokeLLM(userMessage, options);

  const cleaned = extractJson(response.content);

  let data: T;
  try {
    data = JSON.parse(cleaned) as T;
  } catch {
    throw new Error(
      `Failed to parse LLM response as JSON: ${response.content.slice(0, 200)}`
    );
  }

  return {
    data,
    inputTokens: response.inputTokens,
    outputTokens: response.outputTokens,
  };
}
