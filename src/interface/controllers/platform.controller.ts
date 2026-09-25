import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  StreamableFile,
  Patch,
  Post,
  Req,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import {
  assertOperator,
  assertStaff,
  assertSuper,
  PlatformUseCase,
} from '@application/use-cases/platform/platform.use-case';
import { ExpressContractFilter } from '@interface/filters/express-contract.filter';
import { currentUserId } from '@interface/guards/express-auth.guard';
import {
  UsersAdminGuard,
  UsersAuthGuard,
} from '@interface/guards/users-auth.guard';

@ApiTags('platform')
@UseFilters(ExpressContractFilter)
@Controller()
export class PlatformController {
  constructor(private readonly platform: PlatformUseCase) {}

  @Get('services')
  services() {
    return this.platform.listDeliveryServices();
  }

  @UseGuards(UsersAuthGuard)
  @Get('services/mine')
  mine(@Req() request: Request) {
    return this.platform.listMyServices(currentUserId(request));
  }

  @UseGuards(UsersAuthGuard)
  @Post('services')
  createService(
    @Req() request: Request,
    @Body() body: { name?: string; description?: string; price?: number; zone?: string },
  ) {
    return this.platform.createService(currentUserId(request), request.user?.role, body);
  }

  @UseGuards(UsersAuthGuard)
  @Patch('services/:id')
  patchService(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string; price?: number; zone?: string; active?: boolean },
  ) {
    return this.platform.updateService(currentUserId(request), parseInt(id, 10), body);
  }

  @UseGuards(UsersAuthGuard)
  @Delete('services/:id')
  removeService(@Req() request: Request, @Param('id') id: string) {
    return this.platform.deleteService(currentUserId(request), parseInt(id, 10));
  }

  @Get('ads')
  ads() {
    return this.platform.listPublicAds();
  }

  @UseGuards(UsersAuthGuard)
  @Post('stories/:id/report')
  report(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    return this.platform.reportStory(currentUserId(request), parseInt(id, 10), body.reason ?? '');
  }

  @UseGuards(UsersAuthGuard)
  @Post('support/ask')
  ask(@Req() request: Request, @Body() body: { message?: string }) {
    return this.platform.askSupport(currentUserId(request), body.message ?? '');
  }

  @UseGuards(UsersAuthGuard)
  @Get('support/tickets')
  myTickets(@Req() request: Request) {
    return this.platform.listMyTickets(currentUserId(request));
  }

  @UseGuards(UsersAuthGuard)
  @Post('support/tickets')
  openTicket(
    @Req() request: Request,
    @Body() body: { subject?: string; body?: string },
  ) {
    return this.platform.createTicket(
      currentUserId(request),
      body.subject ?? '',
      body.body ?? '',
    );
  }

  @UseGuards(UsersAuthGuard)
  @Post('support/tickets/:id/messages')
  reply(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: { body?: string },
  ) {
    return this.platform.replyTicket(
      currentUserId(request),
      request.user?.role,
      parseInt(id, 10),
      body.body ?? '',
    );
  }

  @UseGuards(UsersAuthGuard)
  @Patch('support/tickets/:id')
  ticketStatus(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: { status?: string; satisfaction?: number },
  ) {
    return this.platform.setTicketStatus(
      request.user?.role,
      parseInt(id, 10),
      body.status ?? '',
      body.satisfaction,
    );
  }

  @UseGuards(UsersAuthGuard)
  @Post('auth/2fa/setup')
  setup(@Req() request: Request) {
    return this.platform.setupTwoFactor(currentUserId(request));
  }

  @UseGuards(UsersAuthGuard)
  @Post('auth/2fa/enable')
  enable(@Req() request: Request, @Body() body: { code?: string }) {
    return this.platform.enableTwoFactor(currentUserId(request), body.code ?? '');
  }

  @UseGuards(UsersAuthGuard)
  @Post('auth/2fa/disable')
  disable(@Req() request: Request, @Body() body: { code?: string }) {
    return this.platform.disableTwoFactor(currentUserId(request), body.code ?? '');
  }

  @Post('auth/2fa/verify')
  verify(@Body() body: { challenge?: string; code?: string }) {
    return this.platform.verifyTwoFactor(body.challenge ?? '', body.code ?? '');
  }

  @UseGuards(UsersAuthGuard, UsersAdminGuard)
  @Get('admin/reports')
  reports(@Req() request: Request) {
    assertStaff(request.user?.role);
    return this.platform.listReports();
  }

  @UseGuards(UsersAuthGuard, UsersAdminGuard)
  @Patch('admin/reports/:id')
  review(@Req() request: Request, @Param('id') id: string) {
    assertStaff(request.user?.role);
    return this.platform.reviewReport(parseInt(id, 10));
  }

  @UseGuards(UsersAuthGuard, UsersAdminGuard)
  @Post('admin/users/:id/warn')
  warn(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: { message?: string },
  ) {
    assertStaff(request.user?.role);
    return this.platform.warnUser(currentUserId(request), parseInt(id, 10), body.message ?? '');
  }

  @UseGuards(UsersAuthGuard, UsersAdminGuard)
  @Patch('admin/users/:id/suspension')
  suspend(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: { suspended?: boolean },
  ) {
    assertStaff(request.user?.role);
    return this.platform.setSuspended(parseInt(id, 10), Boolean(body.suspended));
  }

  @UseGuards(UsersAuthGuard, UsersAdminGuard)
  @Get('admin/ads')
  adminAds(@Req() request: Request) {
    assertOperator(request.user?.role);
    return this.platform.listAds();
  }

  @UseGuards(UsersAuthGuard, UsersAdminGuard)
  @Post('admin/ads')
  createAd(
    @Req() request: Request,
    @Body() body: { title?: string; imageUrl?: string; linkUrl?: string; endsAt?: string },
  ) {
    assertOperator(request.user?.role);
    return this.platform.createAd(currentUserId(request), body);
  }

  @UseGuards(UsersAuthGuard, UsersAdminGuard)
  @Patch('admin/ads/:id')
  updateAd(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: { title?: string; imageUrl?: string; linkUrl?: string | null; status?: string },
  ) {
    assertOperator(request.user?.role);
    return this.platform.updateAd(parseInt(id, 10), body);
  }

  @UseGuards(UsersAuthGuard, UsersAdminGuard)
  @Delete('admin/ads/:id')
  deleteAd(@Req() request: Request, @Param('id') id: string) {
    assertOperator(request.user?.role);
    return this.platform.deleteAd(parseInt(id, 10));
  }

  @UseGuards(UsersAuthGuard, UsersAdminGuard)
  @Get('admin/tickets')
  tickets(@Req() request: Request) {
    assertOperator(request.user?.role);
    return this.platform.listAllTickets();
  }

  @UseGuards(UsersAuthGuard, UsersAdminGuard)
  @Get('admin/finance')
  finance(@Req() request: Request) {
    assertSuper(request.user?.role);
    return this.platform.financeSummary();
  }

  @UseGuards(UsersAuthGuard, UsersAdminGuard)
  @Get('admin/finance/export.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="bibocom-badges.csv"')
  async financeCsv(@Req() request: Request) {
    assertSuper(request.user?.role);
    const csv = await this.platform.financeCsv();
    return new StreamableFile(Buffer.from(csv, 'utf8'));
  }
}
