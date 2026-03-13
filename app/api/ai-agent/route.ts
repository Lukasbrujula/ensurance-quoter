// Legacy route — deprecated in favor of /api/agents/*
// Returns 410 Gone to signal clients should stop calling this endpoint

export async function GET() {
  return Response.json(
    { error: "This endpoint has been deprecated. Use /api/agents instead." },
    { status: 410 },
  )
}

export async function POST() {
  return Response.json(
    { error: "This endpoint has been deprecated. Use /api/agents instead." },
    { status: 410 },
  )
}

export async function DELETE() {
  return Response.json(
    { error: "This endpoint has been deprecated. Use /api/agents instead." },
    { status: 410 },
  )
}
