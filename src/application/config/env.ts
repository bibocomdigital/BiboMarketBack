export const NODE_ENV = process.env.NODE_ENV;

export const JWT_SECRET = process.env.JWT_SECRET;

export const FRONTEND_URL = process.env.FRONTEND_URL;

export const FRONTEND_URL_ANDROID = process.env.FRONTEND_URL_ANDROID;

export const FRONTEND_URL_IOS = process.env.FRONTEND_URL_IOS;

export const PAYDUNYA_MASTER_KEY = process.env.PAYDUNYA_MASTER_KEY;

export const PAYDUNYA_PUBLIC_KEY = process.env.PAYDUNYA_PUBLIC_KEY;

export const PAYDUNYA_PRIVATE_KEY = process.env.PAYDUNYA_PRIVATE_KEY;

export const PAYDUNYA_TOKEN = process.env.PAYDUNYA_TOKEN;

export const PAYDUNYA_CALL_BACK = process.env.PAYDUNYA_CALL_BACK;

export const PAYDUNYA_RETURN_URL = process.env.PAYDUNYA_RETURN_URL;

export const PAYDUNYA_RETURN_URL_ANDROID = process.env.PAYDUNYA_RETURN_URL_ANDROID;

export const PAYDUNYA_RETURN_URL_IOS = process.env.PAYDUNYA_RETURN_URL_IOS;

export const PAYDUNYA_CANCEL_URL = process.env.PAYDUNYA_CANCEL_URL;

export const PAYDUNYA_CANCEL_URL_ANDROID = process.env.PAYDUNYA_CANCEL_URL_ANDROID;

export const PAYDUNYA_CANCEL_URL_IOS = process.env.PAYDUNYA_CANCEL_URL_IOS;

export const PAYDUNYA_SENBOX_URL = process.env.PAYDUNYA_SENBOX_URL;

export const LOGO_URL = process.env.LOGO_URL;

export const PAYDUNYA_MODE = process.env.PAYDUNYA_MODE;

export const DNS = process.env.DNS;

export const BUNNY_STREAM_SECRET = process.env.BUNNY_STREAM_SECRET;

export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

export const GOOGLE_CLIENT_ID_ANDROID = process.env.GOOGLE_CLIENT_ID_ANDROID;

export const GOOGLE_CLIENT_ID_IOS = process.env.GOOGLE_CLIENT_ID_IOS;

export const GOOGLE_CLIENT_ID_WEB = process.env.GOOGLE_CLIENT_ID_WEB;

export const GOOGLE_CLIENT_ID_FLUTTER = process.env.GOOGLE_CLIENT_ID_FLUTTER;

/** Liste dédupliquée de tous les client IDs Google autorisés (web + mobile). */
export function getGoogleClientIds(): string[] {
  const ids = [
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_ID_WEB,
    GOOGLE_CLIENT_ID_FLUTTER,
    GOOGLE_CLIENT_ID_ANDROID,
    GOOGLE_CLIENT_ID_IOS,
    ...(process.env.GOOGLE_CLIENT_IDS?.split(',') ?? []),
  ]
    .map((id) => id?.trim())
    .filter((id): id is string => Boolean(id));

  return [...new Set(ids)];
}

export const NAME = process.env.NAME;

export const TAGLINE = process.env.TAGLINE;

export const PHONE_NUMBER = process.env.PHONE_NUMBER;

export const POSTAL_ADDRESS = process.env.POSTAL_ADDRESS;

export const SMS_ENABLED = process.env.SMS_ENABLED === 'true';

export const SMS_PROVIDER = process.env.SMS_PROVIDER ?? 'console';

export const SMS_API_URL = process.env.SMS_API_URL;

export const SMS_API_KEY = process.env.SMS_API_KEY;

export const SMS_SENDER_ID = process.env.SMS_SENDER_ID ?? 'Bibocomdigital';

export const SMS_HTTP_METHOD = process.env.SMS_HTTP_METHOD;

export const SMS_CONTENT_TYPE = process.env.SMS_CONTENT_TYPE;

export const SMS_AUTH_HEADER = process.env.SMS_AUTH_HEADER;

export const SMS_AUTH_PREFIX = process.env.SMS_AUTH_PREFIX;

export const SMS_FIELD_TELEPHONE = process.env.SMS_FIELD_TELEPHONE;

export const SMS_FIELD_MESSAGE = process.env.SMS_FIELD_MESSAGE;

export const SMS_FIELD_SENDER = process.env.SMS_FIELD_SENDER;

export const SMS_BODY_TEMPLATE = process.env.SMS_BODY_TEMPLATE;

export const SMS_HEADERS_JSON = process.env.SMS_HEADERS_JSON;

export const ORANGE_CLIENT_ID = process.env.ORANGE_CLIENT_ID;

export const ORANGE_CLIENT_SECRET = process.env.ORANGE_CLIENT_SECRET;

export const ORANGE_AUTH_HEADER = process.env.ORANGE_AUTH_HEADER;

export const ORANGE_TOKEN_URL = process.env.ORANGE_TOKEN_URL;

export const ORANGE_SMS_BASE_URL = process.env.ORANGE_SMS_BASE_URL;

export const ORANGE_SENDER_NUMBER = process.env.ORANGE_SENDER_NUMBER;

export const ORANGE_SENDER_NAME = process.env.ORANGE_SENDER_NAME;

export const SENDTEXT_API_KEY = process.env.SENDTEXT_API_KEY;

export const SENDTEXT_API_SECRET = process.env.SENDTEXT_API_SECRET;

export const SENDTEXT_API_URL = process.env.SENDTEXT_API_URL;

export const SENDTEXT_SENDER_NAME = process.env.SENDTEXT_SENDER_NAME;

/** normal | flash — voir doc SendText */
export const SENDTEXT_SMS_TYPE = process.env.SENDTEXT_SMS_TYPE;

export const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;

export const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;

export const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

export const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;

export const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;

export const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

export const EMAIL_USER = process.env.EMAIL_USER;

export const EMAIL_PASS = process.env.EMAIL_PASS;

export const EMAIL_FROM = process.env.EMAIL_FROM;
