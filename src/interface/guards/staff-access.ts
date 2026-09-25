import { ExpressContractException } from '@domain/exceptions/express-contract.exception';
import {
  isOperatorRole,
  isSuperAdminRole,
} from '@domain/types/role';

export function assertOperator(role?: string | null): void {
  if (!isOperatorRole(role)) {
    throw ExpressContractException.raw(403, {
      message: 'Accès réservé aux administrateurs',
    });
  }
}

export function assertSuperAdmin(role?: string | null): void {
  if (!isSuperAdminRole(role)) {
    throw ExpressContractException.raw(403, {
      message: 'Accès réservé au super administrateur',
    });
  }
}
