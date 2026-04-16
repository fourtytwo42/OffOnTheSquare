import { appendFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      name?: string;
      email?: string;
      subject?: string;
      message?: string;
    };
    if (!body?.name || !body?.email || !body?.message) {
      return Response.json({ error: "Missing fields" }, { status: 400 });
    }
    const dir = path.join(process.cwd(), "data");
    await mkdir(dir, { recursive: true });
    const file = path.join(dir, "contact-messages.jsonl");
    const line = JSON.stringify({
      at: new Date().toISOString(),
      ...body,
    });
    await appendFile(file, line + "\n", "utf8");
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
