import { describe, expect, it, vi } from "vitest";

import {
  TranslationOutputError,
  TranslationQuotaError,
} from "./translation-adapter";
import { createWorkersAiAdapter } from "./workers-ai-adapter";

function adapterWith(response: Response) {
  const fetchImpl = vi.fn((..._args: Parameters<typeof fetch>) =>
    Promise.resolve(response),
  );
  const adapter = createWorkersAiAdapter({
    accountId: "acc",
    apiToken: "tok",
    fetchImpl,
  });
  return { adapter, fetchImpl };
}

function ok(content: string) {
  return Response.json({
    success: true,
    result: { choices: [{ message: { content } }] },
  });
}

interface IRequestBody {
  temperature: number;
  max_completion_tokens: number;
  messages: { role: string; content: string }[];
}

const input = {
  blocks: ["Hello"],
  from: "en" as const,
  to: "hr" as const,
  glossary: ["Studio Plava"],
};

describe("Workers AI adapter", () => {
  it("posts the documented request and returns the blocks", async () => {
    const { adapter, fetchImpl } = adapterWith(ok('{"blocks":["Bok"]}'));
    await expect(adapter.translate(input)).resolves.toEqual(["Bok"]);

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe(
      "https://api.cloudflare.com/client/v4/accounts/acc/ai/run/@cf/google/gemma-4-26b-a4b-it",
    );
    expect((init?.headers as Record<string, string>).Authorization).toBe(
      "Bearer tok",
    );
    const body = JSON.parse(init?.body as string) as IRequestBody;
    expect(body.temperature).toBeLessThanOrEqual(0.2);
    expect(body.max_completion_tokens).toBeGreaterThanOrEqual(2000);
    const user = JSON.parse(body.messages[1].content) as {
      do_not_translate: string[];
      blocks: string[];
    };
    expect(user.do_not_translate).toEqual(["Studio Plava"]);
    expect(user.blocks).toEqual(["Hello"]);
  });

  it("accepts JSON wrapped in a code fence", async () => {
    const { adapter } = adapterWith(ok('```json\n{"blocks":["Bok"]}\n```'));
    await expect(adapter.translate(input)).resolves.toEqual(["Bok"]);
  });

  it("raises an output error for text that is not the asked JSON", async () => {
    await expect(
      adapterWith(ok("Bok")).adapter.translate(input),
    ).rejects.toBeInstanceOf(TranslationOutputError);
    await expect(
      adapterWith(ok('{"text":"Bok"}')).adapter.translate(input),
    ).rejects.toBeInstanceOf(TranslationOutputError);
  });

  it("raises a quota error on the daily allocation response", async () => {
    const { adapter } = adapterWith(
      Response.json(
        { success: false, errors: [{ code: 3036, message: "limited" }] },
        { status: 429 },
      ),
    );
    await expect(adapter.translate(input)).rejects.toBeInstanceOf(
      TranslationQuotaError,
    );
  });

  it("raises a quota error on the 4006 code accounts get in practice", async () => {
    const { adapter } = adapterWith(
      Response.json(
        {
          success: false,
          errors: [
            {
              code: 4006,
              message:
                "AiError: you have used up your daily free allocation of 10,000 neurons, please upgrade to Cloudflare's Workers Paid plan if you would like to continue usage.",
            },
          ],
        },
        { status: 429 },
      ),
    );
    await expect(adapter.translate(input)).rejects.toBeInstanceOf(
      TranslationQuotaError,
    );
  });

  it("raises a quota error on the allocation message under an unknown code", async () => {
    const { adapter } = adapterWith(
      Response.json(
        {
          success: false,
          errors: [
            { code: 9999, message: "used up your daily free allocation" },
          ],
        },
        { status: 429 },
      ),
    );
    await expect(adapter.translate(input)).rejects.toBeInstanceOf(
      TranslationQuotaError,
    );
  });

  it("treats a capacity error as an ordinary failure to retry", async () => {
    const { adapter } = adapterWith(
      Response.json(
        { success: false, errors: [{ code: 3040 }] },
        { status: 429 },
      ),
    );
    const error: unknown = await adapter
      .translate(input)
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(TranslationQuotaError);
  });
});
