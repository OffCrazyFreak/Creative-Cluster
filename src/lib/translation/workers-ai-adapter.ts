import { z } from "zod";

import { LOCALE_NAMES } from "@/constants/locales";

import {
  TranslationOutputError,
  TranslationQuotaError,
  type ITranslateInput,
  type ITranslationAdapter,
} from "./translation-adapter";

export const WORKERS_AI_MODEL = "@cf/google/gemma-4-26b-a4b-it";
const REQUEST_TIMEOUT_MS = 90_000;
// Error 3036: the 10,000 neurons per day free allocation is used up (resets 00:00 UTC).
const QUOTA_ERROR_CODE = 3036;

const SYSTEM_PROMPT = [
  "You are a professional translator for a directory of creative and cultural organisations.",
  "The user message is JSON with source_language, target_language, do_not_translate and blocks.",
  "Translate every string in blocks from source_language to target_language.",
  "Rules:",
  "- Return exactly one translated string per input string, in the same order.",
  "- Keep every term in do_not_translate exactly as written.",
  "- Keep numbered tags such as <1> and </1> exactly as they are, around the matching words.",
  "- Keep URLs, email addresses, numbers and line breaks unchanged.",
  "- Do not add, remove, merge or split strings. Do not explain anything.",
  '- Answer with JSON only: {"blocks": ["...", "..."]}',
].join("\n");

const RESPONSE_SCHEMA = {
  type: "object",
  properties: { blocks: { type: "array", items: { type: "string" } } },
  required: ["blocks"],
};

const envelopeSchema = z.object({
  success: z.boolean().optional(),
  errors: z.array(z.object({ code: z.number().optional() })).optional(),
  result: z
    .object({
      choices: z
        .array(
          z.object({ message: z.object({ content: z.string().nullish() }) }),
        )
        .optional(),
      response: z.string().nullish(),
    })
    .nullish(),
});

const outputSchema = z.object({ blocks: z.array(z.string()) });

export interface IWorkersAiOptions {
  accountId: string;
  apiToken: string;
  fetchImpl?: typeof fetch;
}

function extractJson(content: string): unknown {
  const body = content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  try {
    return JSON.parse(body);
  } catch {
    throw new TranslationOutputError("Model output is not JSON");
  }
}

export function createWorkersAiAdapter({
  accountId,
  apiToken,
  fetchImpl = fetch,
}: IWorkersAiOptions): ITranslationAdapter {
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${WORKERS_AI_MODEL}`;

  return {
    name: `workers-ai:${WORKERS_AI_MODEL}`,
    async translate({ blocks, from, to, glossary }: ITranslateInput) {
      const response = await fetchImpl(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        body: JSON.stringify({
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: JSON.stringify({
                source_language: LOCALE_NAMES[from],
                target_language: LOCALE_NAMES[to],
                do_not_translate: glossary,
                blocks,
              }),
            },
          ],
          temperature: 0.1,
          // Gemma 4 reasons first; a small cap would cut the answer off mid-JSON.
          max_completion_tokens: 4000,
          response_format: {
            type: "json_schema",
            json_schema: RESPONSE_SCHEMA,
          },
        }),
      });

      const envelope = envelopeSchema.safeParse(
        await response.json().catch(() => null),
      );
      const codes = envelope.data?.errors?.map((e) => e.code) ?? [];
      if (response.status === 429 && codes.includes(QUOTA_ERROR_CODE)) {
        throw new TranslationQuotaError("Workers AI daily allocation used up");
      }
      // Anything else (capacity 3040, 5xx, bad token) is retried by the job queue with backoff.
      if (
        !response.ok ||
        !envelope.success ||
        envelope.data?.success === false
      ) {
        throw new Error(`Workers AI request failed (${response.status})`);
      }

      const result = envelope.data?.result;
      const content =
        result?.choices?.[0]?.message.content ?? result?.response ?? "";
      const parsed = outputSchema.safeParse(extractJson(content));
      if (!parsed.success) {
        throw new TranslationOutputError("Model output has no blocks array");
      }
      return parsed.data.blocks;
    },
  };
}
