import { evaluateSafeExpression, conditionFromBuilderSubtype } from './safe-expression.evaluator';
import { WorkflowContext } from './interfaces/action.interface';

describe('SafeExpressionEvaluator', () => {
  const context: WorkflowContext = {
    user: {
      discordId: '1',
      trustScore: 75,
      roles: ['role-a', 'role-b'],
      joinDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
    message: {
      id: 'm1',
      content: 'Hello world',
      channelId: 'c1',
      authorId: '1',
    },
  };

  it('evaluates numeric comparisons', () => {
    expect(evaluateSafeExpression(context, 'trustScore >= 50')).toBe(true);
    expect(evaluateSafeExpression(context, 'trustScore < 10')).toBe(false);
  });

  it('evaluates structured role checks', () => {
    const rule = conditionFromBuilderSubtype('user_has_role', { role: 'role-a' });
    expect(evaluateSafeExpression(context, rule)).toBe(true);
  });

  it('evaluates message contains', () => {
    const rule = conditionFromBuilderSubtype('message_contains', { text: 'hello' });
    expect(evaluateSafeExpression(context, rule)).toBe(true);
  });
});
