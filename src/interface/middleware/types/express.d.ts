import type { JwtPayload } from '@application/dto/request/compte.request.dto';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      cookies: {
        token_access?: string;
        token_refresh?: string;
      };
      files?: {
        [fieldname: string]: Array<{
          path: string;
          originalname: string;
          mimetype: string;
          size: number;
        }>;
      };
    }
  }
}

export {};
