// This runs on the server — replace with your preferred server setup
import { put } from "@vercel/blob";
import type { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
	const { path, filename, contentType } = await req.json();

	const { url } = await put(path, filename, {
		access: "public",
		contentType,
	});

	return new Response(JSON.stringify({ url }), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
}
