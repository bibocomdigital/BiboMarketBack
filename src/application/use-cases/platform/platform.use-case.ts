import { Inject, Injectable } from '@nestjs/common';
import { ExpressContractException } from '@domain/exceptions/express-contract.exception';
import { generateTotpSecret, otpauthUrl, verifyTotp } from '@domain/security/totp';
import { isOperatorRole, isStaffRole, isSuperAdminRole, Role } from '@domain/types/role';
import {
  JWT_SERVICE_TOKEN,
  type JwtServicePort,
} from '@application/ports/output/jwt-service.port';
import {
  NOTIFICATION_SERVICE,
  type NotificationServicePort,
} from '@application/ports/output/notification.port';
import { PrismaService } from '@infrastructure/prisma/prisma.service';

const SOLD = ['CONFIRMED', 'SHIPPED', 'DELIVERED'] as const;

@Injectable()
export class PlatformUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(NOTIFICATION_SERVICE)
    private readonly notifications: NotificationServicePort,
    @Inject(JWT_SERVICE_TOKEN) private readonly jwt: JwtServicePort,
  ) {}

  listDeliveryServices() {
    return this.prisma.service.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
      include: {
        provider: {
          select: { id: true, firstName: true, lastName: true, phoneNumber: true, city: true },
        },
      },
    });
  }

  listMyServices(userId: number) {
    return this.prisma.service.findMany({
      where: { providerId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createService(
    userId: number,
    role: string | undefined,
    input: { name?: string; description?: string; price?: number; zone?: string },
  ) {
    if (role !== Role.SUPPLIER && role !== Role.SUPER_ADMIN) {
      throw ExpressContractException.raw(403, {
        message: 'Seuls les fournisseurs publient un service de livraison',
      });
    }
    const name = input.name?.trim() ?? '';
    const price = Number(input.price);
    if (name.length < 2 || !Number.isFinite(price) || price < 0) {
      throw ExpressContractException.raw(400, {
        message: 'Indiquez un nom et un prix en FCFA',
      });
    }
    return this.prisma.service.create({
      data: {
        name,
        description: input.description?.trim() || null,
        price,
        zone: input.zone?.trim() || null,
        providerId: userId,
        active: true,
      },
    });
  }

  async updateService(
    userId: number,
    id: number,
    input: { name?: string; description?: string; price?: number; zone?: string; active?: boolean },
  ) {
    const existing = await this.prisma.service.findUnique({ where: { id } });
    if (!existing || existing.providerId !== userId) {
      throw ExpressContractException.raw(404, { message: 'Service introuvable' });
    }
    return this.prisma.service.update({
      where: { id },
      data: {
        name: input.name?.trim() || undefined,
        description: input.description?.trim(),
        price: input.price !== undefined ? Number(input.price) : undefined,
        zone: input.zone?.trim(),
        active: input.active,
      },
    });
  }

  async deleteService(userId: number, id: number) {
    const existing = await this.prisma.service.findUnique({ where: { id } });
    if (!existing || existing.providerId !== userId) {
      throw ExpressContractException.raw(404, { message: 'Service introuvable' });
    }
    await this.prisma.service.delete({ where: { id } });
    return { message: 'Service retiré' };
  }

  async reportStory(userId: number, storyId: number, reason: string) {
    const clean = reason.trim();
    if (clean.length < 3) {
      throw ExpressContractException.raw(400, { message: 'Décrivez le motif du signalement' });
    }
    const story = await this.prisma.story.findUnique({ where: { id: storyId } });
    if (!story) throw ExpressContractException.raw(404, { message: 'Story introuvable' });
    return this.prisma.storyReport.create({
      data: { storyId, reporterId: userId, reason: clean },
    });
  }

  listReports() {
    return this.prisma.storyReport.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        story: { select: { id: true, status: true, mediaType: true, userId: true } },
        reporter: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  reviewReport(id: number) {
    return this.prisma.storyReport.update({
      where: { id },
      data: { status: 'REVIEWED' },
    });
  }

  async warnUser(authorId: number, userId: number, message: string) {
    const text = message.trim();
    if (text.length < 3) {
      throw ExpressContractException.raw(400, { message: 'Rédigez l’avertissement' });
    }
    const warning = await this.prisma.userWarning.create({
      data: { userId, authorId, message: text },
    });
    await this.notifications.create({
      userId,
      type: 'SYSTEM',
      message: `Avertissement : ${text}`,
      resourceType: 'WARNING',
      resourceId: warning.id,
    }).catch(() => undefined);
    return warning;
  }

  async setSuspended(userId: number, suspended: boolean) {
    const existing = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!existing) {
      throw ExpressContractException.raw(404, { message: 'Compte introuvable' });
    }
    if (existing.role === 'SUPER_ADMIN') {
      throw ExpressContractException.raw(403, {
        message: 'Le super administrateur ne peut pas être suspendu ici',
      });
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: { suspended },
      select: { id: true, suspended: true, role: true },
    });
  }

  listPublicAds() {
    const now = new Date();
    return this.prisma.advertisement.findMany({
      where: {
        status: 'PUBLISHED',
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      },
      orderBy: { createdAt: 'desc' },
      take: 6,
    });
  }

  listAds() {
    return this.prisma.advertisement.findMany({
      orderBy: { createdAt: 'desc' },
      take: 80,
    });
  }

  createAd(
    userId: number,
    input: { title?: string; imageUrl?: string; linkUrl?: string; endsAt?: string },
  ) {
    const title = input.title?.trim() ?? '';
    const imageUrl = input.imageUrl?.trim() ?? '';
    if (title.length < 2 || !imageUrl) {
      throw ExpressContractException.raw(400, { message: 'Titre et image sont requis' });
    }
    return this.prisma.advertisement.create({
      data: {
        title,
        imageUrl,
        linkUrl: input.linkUrl?.trim() || null,
        endsAt: input.endsAt ? new Date(input.endsAt) : null,
        createdById: userId,
        status: 'PENDING',
      },
    });
  }

  async updateAd(
    id: number,
    input: {
      title?: string;
      imageUrl?: string;
      linkUrl?: string | null;
      status?: string;
    },
  ) {
    const existing = await this.prisma.advertisement.findUnique({ where: { id } });
    if (!existing) {
      throw ExpressContractException.raw(404, { message: 'Publicité introuvable' });
    }
    const data: {
      title?: string;
      imageUrl?: string;
      linkUrl?: string | null;
      status?: 'PENDING' | 'PUBLISHED' | 'REJECTED';
    } = {};
    if (input.title !== undefined) {
      const title = input.title.trim();
      if (title.length < 2) {
        throw ExpressContractException.raw(400, { message: 'Le titre doit contenir au moins 2 caractères' });
      }
      data.title = title;
    }
    if (input.imageUrl !== undefined) {
      const imageUrl = input.imageUrl.trim();
      if (!imageUrl) {
        throw ExpressContractException.raw(400, { message: 'L’image est requise' });
      }
      data.imageUrl = imageUrl;
    }
    if (input.linkUrl !== undefined) {
      data.linkUrl = input.linkUrl?.trim() || null;
    }
    if (input.status !== undefined) {
      if (input.status !== 'PUBLISHED' && input.status !== 'REJECTED' && input.status !== 'PENDING') {
        throw ExpressContractException.raw(400, { message: 'Statut de publicité invalide' });
      }
      data.status = input.status;
    }
    if (Object.keys(data).length === 0) {
      throw ExpressContractException.raw(400, { message: 'Aucune modification à enregistrer' });
    }
    return this.prisma.advertisement.update({ where: { id }, data });
  }

  async deleteAd(id: number) {
    const existing = await this.prisma.advertisement.findUnique({ where: { id } });
    if (!existing) {
      throw ExpressContractException.raw(404, { message: 'Publicité introuvable' });
    }
    await this.prisma.advertisement.delete({ where: { id } });
    return { id, message: 'Publicité supprimée' };
  }

  async askSupport(userId: number, message: string) {
    const body = message.trim();
    if (body.length < 2) {
      throw ExpressContractException.raw(400, { message: 'Écrivez votre demande' });
    }
    const ticket = await this.prisma.supportTicket.create({
      data: {
        userId,
        subject: body.slice(0, 80),
        messages: { create: { authorId: userId, body } },
      },
    });
    return {
      ticketId: ticket.id,
      reply:
        'Votre demande est transmise à l’équipe Bibocom. Vous la retrouverez dans Support.',
    };
  }

  async createTicket(userId: number, subject: string, body: string) {
    const title = subject.trim();
    const text = body.trim();
    if (title.length < 2 || text.length < 2) {
      throw ExpressContractException.raw(400, { message: 'Sujet et message sont requis' });
    }
    return this.prisma.supportTicket.create({
      data: {
        userId,
        subject: title,
        messages: { create: { authorId: userId, body: text } },
      },
      include: { messages: true },
    });
  }

  listMyTickets(userId: number) {
    return this.prisma.supportTicket.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
  }

  listAllTickets() {
    return this.prisma.supportTicket.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 80,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, phoneNumber: true } },
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
  }

  async replyTicket(authorId: number, role: string | undefined, ticketId: number, body: string) {
    const text = body.trim();
    if (text.length < 1) {
      throw ExpressContractException.raw(400, { message: 'Message vide' });
    }
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw ExpressContractException.raw(404, { message: 'Ticket introuvable' });
    const staff = isStaffRole(role);
    if (!staff && ticket.userId !== authorId) {
      throw ExpressContractException.raw(403, { message: 'Ticket inaccessible' });
    }
    await this.prisma.ticketMessage.create({
      data: { ticketId, authorId, body: text },
    });
    return this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: staff && ticket.status === 'OPEN' ? 'IN_PROGRESS' : ticket.status },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
  }

  async setTicketStatus(
    role: string | undefined,
    ticketId: number,
    status: string,
    satisfaction?: number,
  ) {
    if (!['OPEN', 'IN_PROGRESS', 'ESCALATED', 'CLOSED'].includes(status)) {
      throw ExpressContractException.raw(400, { message: 'Statut de ticket invalide' });
    }
    if (status === 'ESCALATED' && !isOperatorRole(role)) {
      throw ExpressContractException.raw(403, {
        message: 'Seul un administrateur peut transférer au super administrateur',
      });
    }
    return this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: status as 'OPEN' | 'IN_PROGRESS' | 'ESCALATED' | 'CLOSED',
        satisfaction:
          status === 'CLOSED' && satisfaction !== undefined ? Number(satisfaction) : undefined,
      },
    });
  }

  async financeSummary() {
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    const [badges, monthOrders, yearOrders] = await Promise.all([
      this.prisma.badgeSubscription.findMany({
        where: { paidAt: { not: null } },
        orderBy: { paidAt: 'desc' },
        take: 200,
        include: {
          user: { select: { firstName: true, lastName: true, phoneNumber: true, email: true } },
        },
      }),
      this.prisma.order.aggregate({
        where: { status: { in: [...SOLD] }, createdAt: { gte: monthStart } },
        _sum: { totalAmount: true },
        _count: true,
      }),
      this.prisma.order.aggregate({
        where: { status: { in: [...SOLD] }, createdAt: { gte: yearStart } },
        _sum: { totalAmount: true },
        _count: true,
      }),
    ]);
    const badgeTotal = badges.reduce((sum, row) => sum + row.priceCfa, 0);
    return {
      badgeTotal,
      badgeCount: badges.length,
      monthRevenue: monthOrders._sum.totalAmount ?? 0,
      monthOrders: monthOrders._count,
      yearRevenue: yearOrders._sum.totalAmount ?? 0,
      yearOrders: yearOrders._count,
      badges,
    };
  }

  async financeCsv(): Promise<string> {
    const summary = await this.financeSummary();
    const lines = [
      'type,date,montant_fcfa,compte,telephone',
      ...summary.badges.map((row) =>
        [
          'badge',
          row.paidAt?.toISOString() ?? '',
          row.priceCfa,
          `${row.user.firstName ?? ''} ${row.user.lastName ?? ''}`.trim(),
          row.user.phoneNumber ?? '',
        ].join(','),
      ),
    ];
    return lines.join('\n');
  }

  async setupTwoFactor(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw ExpressContractException.raw(404, { message: 'Compte introuvable' });
    const secret = generateTotpSecret();
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret, twoFactorEnabled: false },
    });
    return {
      secret,
      otpauth: otpauthUrl(secret, user.phoneNumber || user.email || String(userId)),
    };
  }

  async enableTwoFactor(userId: number, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.twoFactorSecret || !verifyTotp(user.twoFactorSecret, code)) {
      throw ExpressContractException.raw(400, { message: 'Code invalide' });
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });
    return { enabled: true };
  }

  async disableTwoFactor(userId: number, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.twoFactorSecret || !verifyTotp(user.twoFactorSecret, code)) {
      throw ExpressContractException.raw(400, { message: 'Code invalide' });
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    });
    return { enabled: false };
  }

  async verifyTwoFactor(challenge: string, code: string) {
    const payload = await this.jwt.verifyToken(challenge);
    const raw = JSON.parse(
      Buffer.from(challenge.split('.')[1] ?? '', 'base64url').toString('utf8'),
    ) as { purpose?: string };
    if (raw.purpose !== '2fa') {
      throw ExpressContractException.raw(401, { message: 'Jeton de vérification invalide' });
    }
    const user = await this.prisma.user.findUnique({ where: { id: payload.id } });
    if (!user?.twoFactorSecret || !verifyTotp(user.twoFactorSecret, code)) {
      throw ExpressContractException.raw(401, { message: 'Code invalide' });
    }
    const tokens = await this.jwt.generateToken({
      id: user.id,
      userId: user.id,
      phoneNumber: user.phoneNumber,
      email: user.email,
      role: user.role as Role,
    });
    return {
      status: 'success',
      token: tokens.access,
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        photo: user.photo,
        role: user.role,
      },
    };
  }
}

export function assertStaff(role?: string) {
  if (!isStaffRole(role)) {
    throw ExpressContractException.raw(403, { message: 'Accès réservé à l’équipe Bibocom' });
  }
}

export function assertOperator(role?: string) {
  if (!isOperatorRole(role)) {
    throw ExpressContractException.raw(403, { message: 'Accès réservé aux administrateurs' });
  }
}

export function assertSuper(role?: string) {
  if (!isSuperAdminRole(role)) {
    throw ExpressContractException.raw(403, { message: 'Accès réservé au super administrateur' });
  }
}
