import { StringDecoder } from "node:string_decoder";
import type { Readable } from "node:stream";

import { SaxesParser } from "saxes";
import yauzl from "yauzl";

export interface IGmlNode {
  name: string;
  attrs: Record<string, string>;
  children: IGmlNode[];
  text: string;
}

export function findAll(node: IGmlNode, name: string): IGmlNode[] {
  return node.children.flatMap((child) => [
    ...(child.name === name ? [child] : []),
    ...findAll(child, name),
  ]);
}

export function findFirst(node: IGmlNode, name: string): IGmlNode | undefined {
  return findAll(node, name)[0];
}

export function openEntry(
  zipPath: string,
  entryName: string,
): Promise<Readable> {
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (error, zip) => {
      if (error) return reject(error);
      zip.on("error", reject);
      zip.on("end", () => reject(new Error(`${entryName} not in ${zipPath}`)));
      zip.on("entry", (entry: yauzl.Entry) => {
        if (entry.fileName !== entryName) return zip.readEntry();
        zip.openReadStream(entry, (streamError, stream) =>
          streamError ? reject(streamError) : resolve(stream),
        );
      });
      zip.readEntry();
    });
  });
}

// Yields each element named `memberTag` as a small tree, so the 2.6 GB file never sits in memory.
export async function* gmlMembers(
  chunks: AsyncIterable<Buffer | string> | Iterable<Buffer | string>,
  memberTag = "wfs:member",
): AsyncGenerator<IGmlNode> {
  const parser = new SaxesParser();
  const decoder = new StringDecoder("utf8");
  const stack: IGmlNode[] = [];
  let ready: IGmlNode[] = [];
  let failure: Error | undefined;

  parser.on("error", (error) => (failure = error));
  parser.on("opentag", (tag) => {
    const node: IGmlNode = {
      name: tag.name,
      attrs: Object.fromEntries(Object.entries(tag.attributes)),
      children: [],
      text: "",
    };
    // Members are not linked to the collection root, or every one would stay in memory.
    if (tag.name !== memberTag) stack.at(-1)?.children.push(node);
    stack.push(node);
  });
  parser.on("text", (text) => {
    const top = stack.at(-1);
    if (top) top.text += text;
  });
  parser.on("closetag", (tag) => {
    const node = stack.pop();
    if (node && tag.name === memberTag) ready.push(node);
  });

  for await (const chunk of chunks) {
    parser.write(typeof chunk === "string" ? chunk : decoder.write(chunk));
    if (failure) throw failure;
    const batch = ready;
    ready = [];
    yield* batch;
  }
  parser.close();
}

export async function* zipEntryMembers(zipPath: string, entryName: string) {
  const stream = await openEntry(zipPath, entryName);
  yield* gmlMembers(stream);
}
