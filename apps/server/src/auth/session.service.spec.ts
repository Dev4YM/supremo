import { SessionService } from './session.service';

describe('SessionService OAuth exchange codes', () => {
  const prisma = {} as any;
  let service: SessionService;

  beforeEach(() => {
    service = new SessionService(prisma);
  });

  it('issues a code that can be consumed once for the same session token', () => {
    const token = 'test-session-token';
    const code = service.issueOAuthExchangeCode(token);
    expect(code).toBeTruthy();
    expect(service.consumeOAuthExchangeCode(code)).toBe(token);
    expect(service.consumeOAuthExchangeCode(code)).toBeNull();
  });

  it('returns null for unknown or empty codes', () => {
    expect(service.consumeOAuthExchangeCode('')).toBeNull();
    expect(service.consumeOAuthExchangeCode('deadbeef')).toBeNull();
  });
});
