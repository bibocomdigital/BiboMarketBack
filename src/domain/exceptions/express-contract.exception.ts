export class ExpressContractException extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code?: string,
    public readonly extra: Record<string, unknown> = {},
    public readonly body?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ExpressContractException';
  }

  static raw(
    statusCode: number,
    body: Record<string, unknown>,
  ): ExpressContractException {
    const message =
      typeof body.message === 'string' ? body.message : 'Error';
    return new ExpressContractException(
      statusCode,
      message,
      undefined,
      {},
      body,
    );
  }
}
