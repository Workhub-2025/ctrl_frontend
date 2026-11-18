import { readDemoFile } from "../../demo-fixtures";

const CONTENT_TYPES: Record<string, string> = {
  json: "application/json",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string }> },
) {
  const { file } = await params;
  const body = await readDemoFile(file);
  if (!body) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": CONTENT_TYPES[file.split(".").pop() ?? ""] ?? "application/octet-stream",
      "Cache-Control": "no-store",
    },
  });
}
