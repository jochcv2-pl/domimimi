// Domipack — Helper réponses API
// Format d'erreur cohérent sur toute l'API

import { NextResponse } from "next/server";
import { z } from "zod";

type ApiError = {
  error: string;
  code: string;
  details?: unknown;
};

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function apiError(error: string, code: string, status = 400, details?: unknown) {
  const body: ApiError = { error, code };
  if (details !== undefined) body.details = details;
  return NextResponse.json(body, { status });
}

export function apiZodError(error: z.ZodError) {
  return NextResponse.json(
    {
      error: "Données invalides",
      code: "VALIDATION_ERROR",
      details: error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    },
    { status: 422 }
  );
}
