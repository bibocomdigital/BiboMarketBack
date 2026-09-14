import { ErrorCode } from '@domain/enums/error-code.enum';
import { HttpStatusCode } from '@domain/enums/http-status-code.enum';
import {
  apiError,
  mapHttpStatusToErrorCode,
  resolveErrorCode,
  type ApiErrorResponse,
} from '@application/dto/response/api.response';

type PrismaLikeError = Error & {
  code?: string;
  name: string;
  meta?: { modelName?: string; cause?: unknown };
};

export function buildApiErrorResponse(params: {
  statusCode: number;
  code?: unknown;
  message: string;
  details?: unknown;
  path?: string;
}): { statusCode: number; body: ApiErrorResponse } {
  const fallback = mapHttpStatusToErrorCode(params.statusCode);
  return {
    statusCode: params.statusCode,
    body: apiError({
      code: resolveErrorCode(params.code, fallback),
      message: params.message,
      statusCode: params.statusCode,
      details: params.details,
      path: params.path,
    }),
  };
}

export function mapPrismaError(
  exception: unknown,
  path?: string,
): { statusCode: number; body: ApiErrorResponse } | null {
  if (!(exception instanceof Error)) {
    return null;
  }

  const prismaError = exception as PrismaLikeError;

  if (prismaError.name === 'PrismaClientValidationError') {
    return buildApiErrorResponse({
      statusCode: HttpStatusCode.BAD_REQUEST,
      code: ErrorCode.VALIDATION_FAILED,
      message: 'Les données envoyées sont invalides',
      details: prismaError.message,
      path,
    });
  }

  if (!prismaError.code?.startsWith('P')) {
    return null;
  }

  const modelName = prismaError.meta?.modelName;
  const uniqueCode = uniqueConstraintCode(modelName);
  const notFoundCode = notFoundCodeForModel(modelName);

  switch (prismaError.code) {
    case 'P2002':
      return buildApiErrorResponse({
        statusCode: HttpStatusCode.CONFLICT,
        code: uniqueCode,
        message: 'Cette ressource existe déjà',
        details: prismaError.meta,
        path,
      });
    case 'P2025':
      return buildApiErrorResponse({
        statusCode: HttpStatusCode.NOT_FOUND,
        code: notFoundCode,
        message: 'Ressource introuvable',
        details: prismaError.meta,
        path,
      });
    case 'P2003':
      return buildApiErrorResponse({
        statusCode: HttpStatusCode.BAD_REQUEST,
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Référence invalide',
        details: prismaError.meta,
        path,
      });
    default:
      return buildApiErrorResponse({
        statusCode: HttpStatusCode.INTERNAL_SERVER_ERROR,
        code: ErrorCode.DATABASE_ERROR,
        message: 'Erreur de base de données',
        details: prismaError.message,
        path,
      });
  }
}

function uniqueConstraintCode(modelName?: string): ErrorCode {
  switch (modelName) {
    case 'CategorieShop':
      return ErrorCode.CATEGORIE_SHOP_ALREADY_EXISTS;
    case 'CategorieProd':
      return ErrorCode.CATEGORIE_PROD_ALREADY_EXISTS;
    case 'User':
      return ErrorCode.USER_ALREADY_EXISTS;
    default:
      return ErrorCode.CONFLICTING_OPERATION;
  }
}

function notFoundCodeForModel(modelName?: string): ErrorCode {
  switch (modelName) {
    case 'CategorieShop':
      return ErrorCode.CATEGORIE_SHOP_NOT_FOUND;
    case 'CategorieProd':
      return ErrorCode.CATEGORIE_PROD_NOT_FOUND;
    case 'User':
      return ErrorCode.USER_NOT_FOUND;
    default:
      return ErrorCode.RESOURCE_NOT_FOUND;
  }
}
