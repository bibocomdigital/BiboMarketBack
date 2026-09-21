import {
  SMS_API_KEY,
  SMS_API_URL,
  SMS_AUTH_HEADER,
  SMS_AUTH_PREFIX,
  SMS_BODY_TEMPLATE,
  SMS_CONTENT_TYPE,
  SMS_FIELD_MESSAGE,
  SMS_FIELD_SENDER,
  SMS_FIELD_TELEPHONE,
  SMS_HEADERS_JSON,
  SMS_HTTP_METHOD,
  SMS_SENDER_ID,
} from '@application/config/env';
import {
  SmsGatewayPort,
  SmsMessage,
} from '@application/ports/output/sms-gateway.port';
import { ErrorCode } from '@domain/enums/error-code.enum';
import { AppException } from '@domain/exceptions/app.exception';

type TemplateVariables = Record<string, string>;

export class HttpSmsGateway implements SmsGatewayPort {
  async send(payload: SmsMessage): Promise<void> {
    if (!SMS_API_URL) {
      throw AppException.create(
        ErrorCode.CONFIGURATION_ERROR,
        'SMS_API_URL est requis pour envoyer des SMS via HTTP',
      );
    }

    const variables = this.buildVariables(payload);
    const headers = this.buildHeaders(variables);
    const body = this.buildBody(variables);

    const response = await fetch(SMS_API_URL, {
      method: SMS_HTTP_METHOD ?? 'POST',
      headers,
      body,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('SMS HTTP gateway error:', errorBody);
      throw AppException.create(
        ErrorCode.EXTERNAL_SERVICE_ERROR,
        "Échec de l'envoi du SMS",
      );
    }
  }

  private buildVariables(payload: SmsMessage): TemplateVariables {
    return {
      telephone: payload.telephone,
      message: payload.message,
      sender: payload.sender ?? SMS_SENDER_ID ?? '',
      apiKey: SMS_API_KEY ?? '',
    };
  }

  private buildHeaders(
    variables: TemplateVariables,
  ): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': SMS_CONTENT_TYPE ?? 'application/json',
    };

    if (SMS_HEADERS_JSON) {
      Object.assign(headers, this.parseTemplateJson(SMS_HEADERS_JSON, variables));
    }

    if (SMS_API_KEY) {
      const headerName = SMS_AUTH_HEADER ?? 'Authorization';
      const prefix = SMS_AUTH_PREFIX ?? 'Bearer';
      headers[headerName] = prefix.includes('{{apiKey}}')
        ? this.applyTemplate(prefix, variables)
        : `${prefix} ${SMS_API_KEY}`.trim();
    }

    return headers;
  }

  private buildBody(variables: TemplateVariables): string | undefined {
    if (SMS_BODY_TEMPLATE) {
      return this.applyTemplate(SMS_BODY_TEMPLATE, variables);
    }

    const body: Record<string, string> = {
      [SMS_FIELD_TELEPHONE ?? 'to']: variables.telephone,
      [SMS_FIELD_MESSAGE ?? 'message']: variables.message,
    };

    if (variables.sender) {
      body[SMS_FIELD_SENDER ?? 'sender'] = variables.sender;
    }

    if ((SMS_CONTENT_TYPE ?? 'application/json').includes('json')) {
      return JSON.stringify(body);
    }

    return new URLSearchParams(body).toString();
  }

  private parseTemplateJson(
    template: string,
    variables: TemplateVariables,
  ): Record<string, string> {
    const resolved = this.applyTemplate(template, variables);
    return JSON.parse(resolved) as Record<string, string>;
  }

  private applyTemplate(
    template: string,
    variables: TemplateVariables,
  ): string {
    return Object.entries(variables).reduce(
      (result, [key, value]) => result.replaceAll(`{{${key}}}`, value),
      template,
    );
  }
}
