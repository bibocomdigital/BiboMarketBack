jest.mock('@application/config/env', () => ({
  SMS_PROVIDER: 'console',
  SMS_SENDER_ID: 'Bibocomdigital',
}));

import type { SmsGatewayPort } from '@application/ports/output/sms-gateway.port';
import {
  SmsAdapter,
  createSmsGateway,
} from '@infrastructure/sms/sms.adapter';
import { ConsoleSmsGateway } from '@infrastructure/sms/console-sms.gateway';

describe('SmsAdapter', () => {
  const gateway = { send: jest.fn() } as unknown as SmsGatewayPort;
  const adapter = new SmsAdapter(gateway);

  afterEach(() => jest.clearAllMocks());

  it('envoie un SMS brut vers la passerelle', async () => {
    await adapter.sendRaw('+221771234567', 'Bonjour');

    expect(gateway.send).toHaveBeenCalledWith({
      telephone: '+221771234567',
      message: 'Bonjour',
      sender: 'Bibocomdigital',
    });
  });

  it('envoie un SMS de bienvenue après inscription', async () => {
    await adapter.sendCongratulation('+221771234567', 'Awa');

    expect(gateway.send).toHaveBeenCalledWith({
      telephone: '+221771234567',
      message: 'Félicitations Awa ! Votre compte a été créé avec succès.',
      sender: 'Bibocomdigital',
    });
  });

  it('utilise la passerelle console par défaut', () => {
    expect(createSmsGateway()).toBeInstanceOf(ConsoleSmsGateway);
  });
});