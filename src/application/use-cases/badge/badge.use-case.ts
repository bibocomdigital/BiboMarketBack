import { Inject, Injectable } from '@nestjs/common';
import { ExpressContractException } from '@domain/exceptions/express-contract.exception';
import {
  BADGE_REPOSITORY,
  type BadgeRepository,
  type BadgeSettingsRecord,
  type BadgeSubscriptionRecord,
} from '@domain/repositories/badge.repository';
import {
  NOTIFICATION_SERVICE,
  type NotificationServicePort,
} from '@application/ports/output/notification.port';
import { Role } from '@domain/types/role';
import {
  confirmPaydunyaInvoice,
  createPaydunyaInvoice,
  paydunyaConfigured,
} from '@infrastructure/payment/paydunya-invoice';

const DAY_MS = 24 * 60 * 60 * 1000;
const SELLABLE = new Set<string>([Role.MERCHANT, Role.SUPPLIER]);

function addDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function badgePriceForRole(settings: BadgeSettingsRecord, role?: string | null): number {
  return role === Role.SUPPLIER ? settings.supplierPriceCfa : settings.priceCfa;
}

function readPrice(value: unknown, label: string): number {
  const price = Number(value);
  if (!Number.isInteger(price) || price < 0 || price > 1_000_000) {
    throw ExpressContractException.raw(400, {
      message: `${label} doit être un montant en FCFA entre 0 et 1 000 000`,
    });
  }
  return price;
}

@Injectable()
export class BadgeLifecycleUseCase {
  constructor(
    @Inject(BADGE_REPOSITORY) private readonly badges: BadgeRepository,
    @Inject(NOTIFICATION_SERVICE)
    private readonly notifications: NotificationServicePort,
  ) {}

  async refreshUser(userId: number): Promise<void> {
    const current = await this.badges.findActive(userId);
    if (current) await this.applyLifecycle(current);
  }

  async refreshAll(): Promise<void> {
    const rows = await this.badges.listActive();
    for (const row of rows) {
      await this.applyLifecycle(row);
    }
  }

  private async applyLifecycle(sub: BadgeSubscriptionRecord): Promise<void> {
    if (!sub.endsAt || !sub.graceEndsAt || sub.status !== 'ACTIVE') return;
    const now = Date.now();
    const ends = new Date(sub.endsAt).getTime();
    const grace = new Date(sub.graceEndsAt).getTime();

    if (now >= grace) {
      await this.badges.markExpired(sub.id);
      await this.badges.syncShopBadge(sub.userId, false);
      await this.notifyOnce(
        sub,
        'GRACE_ENDED',
        "Votre badge n'est plus actif. Les stories sont arrêtées jusqu'au renouvellement.",
      );
      return;
    }

    if (now >= grace - DAY_MS) {
      await this.notifyOnce(
        sub,
        'GRACE_LAST',
        'Dernier jour de grâce de votre badge. Les stories s’arrêteront à la fin de cette période.',
      );
    }
    if (now >= ends) {
      await this.notifyOnce(
        sub,
        'EXPIRED_DAY',
        'Votre badge est arrivé à échéance. Il reste actif pendant la période de grâce.',
      );
    } else if (now >= ends - DAY_MS) {
      await this.notifyOnce(sub, 'D1', 'Votre badge expire demain.');
    } else if (now >= ends - 7 * DAY_MS) {
      await this.notifyOnce(
        sub,
        'D7',
        'Votre badge expire dans 7 jours. Renouvelez-le pour garder vos stories.',
      );
    }
  }

  private async notifyOnce(
    sub: BadgeSubscriptionRecord,
    kind: string,
    message: string,
  ): Promise<void> {
    const claimed = await this.badges.claimReminder(sub.id, kind);
    if (!claimed) return;
    try {
      await this.notifications.create({
        userId: sub.userId,
        type: 'VERIFICATION',
        message,
        actionUrl: '/merchant-dashboard?view=badge',
        resourceId: sub.id,
        resourceType: 'BADGE',
      });
    } catch {
      // La notification ne doit pas bloquer le badge.
    }
  }
}

@Injectable()
export class GetBadgeSettingsUseCase {
  constructor(
    @Inject(BADGE_REPOSITORY) private readonly badges: BadgeRepository,
  ) {}

  execute() {
    return this.badges.getSettings();
  }
}

@Injectable()
export class UpdateBadgeSettingsUseCase {
  constructor(
    @Inject(BADGE_REPOSITORY) private readonly badges: BadgeRepository,
  ) {}

  async execute(input: Partial<BadgeSettingsRecord>) {
    const data: Partial<BadgeSettingsRecord> = {};
    if (input.priceCfa !== undefined) {
      data.priceCfa = readPrice(input.priceCfa, 'Le prix commerçant');
    }
    if (input.supplierPriceCfa !== undefined) {
      data.supplierPriceCfa = readPrice(input.supplierPriceCfa, 'Le prix livreur');
    }
    if (input.durationDays !== undefined) {
      const days = Number(input.durationDays);
      if (!Number.isInteger(days) || days < 1 || days > 3650) {
        throw ExpressContractException.raw(400, {
          message: 'La durée doit être comprise entre 1 et 3650 jours',
        });
      }
      data.durationDays = days;
    }
    if (input.graceDays !== undefined) {
      const days = Number(input.graceDays);
      if (!Number.isInteger(days) || days < 0 || days > 90) {
        throw ExpressContractException.raw(400, {
          message: 'La grâce doit être comprise entre 0 et 90 jours',
        });
      }
      data.graceDays = days;
    }
    if (input.saleOpen !== undefined) {
      data.saleOpen = Boolean(input.saleOpen);
    }
    if (Object.keys(data).length === 0) {
      throw ExpressContractException.raw(400, {
        message: 'Aucun réglage à mettre à jour',
      });
    }
    return this.badges.updateSettings(data);
  }
}

@Injectable()
export class GetMyBadgeUseCase {
  constructor(
    @Inject(BADGE_REPOSITORY) private readonly badges: BadgeRepository,
    private readonly lifecycle: BadgeLifecycleUseCase,
  ) {}

  async execute(userId: number) {
    await this.lifecycle.refreshUser(userId);
    const [settings, subscription, active] = await Promise.all([
      this.badges.getSettings(),
      this.badges.findLatest(userId),
      this.badges.hasActiveBadge(userId),
    ]);
    const user = await this.badges.findUser(userId);
    return {
      settings,
      quotedPriceCfa: badgePriceForRole(settings, user?.role),
      subscription,
      active,
    };
  }
}

@Injectable()
export class CheckoutBadgeUseCase {
  constructor(
    @Inject(BADGE_REPOSITORY) private readonly badges: BadgeRepository,
  ) {}

  async execute(userId: number) {
    if (!paydunyaConfigured()) {
      throw ExpressContractException.raw(503, {
        message:
          'PayDunya n’est pas configuré. Le paiement du badge sera disponible dès que les clés seront renseignées.',
      });
    }
    const user = await this.requireSeller(userId);
    const settings = await this.badges.getSettings();
    const priceCfa = badgePriceForRole(settings, user.role);
    if (!settings.saleOpen) {
      throw ExpressContractException.raw(403, {
        message: 'La vente du badge est fermée pour le moment.',
      });
    }
    const pending = await this.badges.createPending(userId, priceCfa);
    try {
      const invoice = await createPaydunyaInvoice({
        amount: priceCfa,
        description: `Badge Bibocom — ${settings.durationDays} jours`,
        subscriptionId: pending.id,
      });
      await this.badges.attachInvoice(pending.id, invoice.token);
      return {
        checkoutUrl: invoice.checkoutUrl,
        token: invoice.token,
        priceCfa,
        account: user.email,
      };
    } catch (error) {
      throw ExpressContractException.raw(502, {
        message: `PayDunya a refusé la facture : ${errorText(error)}`,
      });
    }
  }

  private async requireSeller(userId: number) {
    const user = await this.badges.findUser(userId);
    if (!user || !SELLABLE.has(user.role)) {
      throw ExpressContractException.raw(403, {
        message: 'Le badge concerne les comptes commerçant et fournisseur',
      });
    }
    return user;
  }
}

@Injectable()
export class ConfirmBadgePaymentUseCase {
  constructor(
    @Inject(BADGE_REPOSITORY) private readonly badges: BadgeRepository,
    @Inject(NOTIFICATION_SERVICE)
    private readonly notifications: NotificationServicePort,
    private readonly lifecycle: BadgeLifecycleUseCase,
  ) {}

  async execute(token: string) {
    const clean = token.trim();
    if (!clean) {
      throw ExpressContractException.raw(400, { message: 'Jeton PayDunya manquant' });
    }
    const subscription = await this.badges.findByToken(clean);
    if (!subscription) {
      throw ExpressContractException.raw(404, {
        message: 'Paiement de badge introuvable',
      });
    }
    if (subscription.status === 'ACTIVE') {
      return { paid: true, subscription };
    }
    if (!paydunyaConfigured()) {
      throw ExpressContractException.raw(503, {
        message: 'PayDunya n’est pas configuré.',
      });
    }
    const confirmation = await confirmPaydunyaInvoice(clean);
    if (!confirmation.paid) {
      return { paid: false, status: confirmation.status, subscription };
    }
    const activated = await this.activateTerm(subscription.id);
    return { paid: true, subscription: activated };
  }

  async grant(userId: number) {
    const user = await this.requireSeller(userId);
    const settings = await this.badges.getSettings();
    const pending = await this.badges.createPending(userId, badgePriceForRole(settings, user.role));
    const subscription = await this.activateTerm(pending.id);
    return { message: 'Badge attribué', subscription };
  }

  async revoke(userId: number) {
    await this.lifecycle.refreshUser(userId);
    const current = await this.badges.findActive(userId);
    if (!current) {
      await this.badges.syncShopBadge(userId, false);
      throw ExpressContractException.raw(404, {
        message: 'Aucun badge actif sur ce compte',
      });
    }
    await this.badges.markExpired(current.id);
    await this.badges.syncShopBadge(userId, false);
    return { message: 'Badge retiré', userId };
  }

  private async activateTerm(subscriptionId: number) {
    const subscription = await this.badges.findById(subscriptionId);
    if (!subscription) {
      throw ExpressContractException.raw(404, { message: 'Souscription introuvable' });
    }
    const settings = await this.badges.getSettings();
    const current = await this.badges.findActive(subscription.userId);
    const now = new Date();
    const carry =
      current &&
      current.id !== subscription.id &&
      current.endsAt &&
      new Date(current.endsAt) > now
        ? new Date(current.endsAt)
        : now;
    const endsAt = addDays(carry, settings.durationDays);
    const graceEndsAt = addDays(endsAt, settings.graceDays);
    const activated = await this.badges.activate(subscription.id, {
      startsAt: carry,
      endsAt,
      graceEndsAt,
      paidAt: now,
    });
    await this.badges.expireOthers(subscription.userId, activated.id);
    await this.badges.syncShopBadge(subscription.userId, true);
    try {
      await this.notifications.create({
        userId: subscription.userId,
        type: 'VERIFICATION',
        message: 'Votre badge est actif. Vous pouvez publier des stories.',
        actionUrl: '/merchant-dashboard?view=badge',
        resourceId: activated.id,
        resourceType: 'BADGE',
      });
    } catch {
      // La notification ne doit pas bloquer l'activation.
    }
    return activated;
  }

  private async requireSeller(userId: number) {
    const user = await this.badges.findUser(userId);
    if (!user || !SELLABLE.has(user.role)) {
      throw ExpressContractException.raw(400, {
        message: 'Le badge se pose sur un compte commerçant ou fournisseur',
      });
    }
    return user;
  }
}
