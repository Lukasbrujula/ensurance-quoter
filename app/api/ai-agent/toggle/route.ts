// Legacy route — deprecated in favor of /api/agents/*
// Returns 410 Gone to signal clients should stop calling this endpoint

export async function PUT() {
  return Response.json(
    { error: "This endpoint has been deprecated. Use /api/agents instead." },
    { status: 410 },
  )
}
