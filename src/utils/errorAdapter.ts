/**
 * Utility to safely extract error messages from unknown types.
 * Helps avoid unsafe 'as Error' casting.
 */

export interface AppError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

export function toAppError(error: unknown): AppError {
  // Handle Null/Undefined
  if (!error) {
    return { message: 'Ocorreu um erro desconhecido.' };
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    return { message: error.message };
  }

  if (typeof error === 'object' && error !== null) {
    const err = error as { message?: string, error_description?: string, error?: string, code?: string, status?: number | string, details?: string, hint?: string };
    return {
      message: err.message || err.error_description || err.error || 'Erro inesperado do sistema.',
      code: err.code || err.status?.toString(),
      details: err.details,
      hint: err.hint,
    };
  }

  // Handle strings
  if (typeof error === 'string') {
    return { message: error };
  }

  return { message: 'Falha na comunicação com o servidor.' };
}

export function getErrorMessage(error: unknown): string {
  return toAppError(error).message;
}
