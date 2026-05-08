# @supremo/rules-engine

A powerful and flexible rules engine for Discord bot moderation, designed to analyze messages, user behavior, and server events to detect potential violations and threats.

## Features

- **Intelligent Content Analysis**: Detect spam, toxicity, NSFW content, and scams
- **Behavioral Pattern Recognition**: Identify suspicious user activities and raid attempts
- **Configurable Rules**: Create custom detection rules for your community
- **Confidence Scoring**: AI-powered analysis with adjustable thresholds
- **Signal Processing**: Real-time event processing and pattern matching
- **Extensible Architecture**: Easy to add new rule types and detection methods

## Installation

```bash
npm install @supremo/rules-engine
```

## Usage

### Basic Rule Evaluation

```typescript
import { RulesEngine, SpamDetectionRule, ToxicityRule } from '@supremo/rules-engine';

const engine = new RulesEngine();

// Add built-in rules
engine.addRule(new SpamDetectionRule());
engine.addRule(new ToxicityRule());

// Evaluate a message
const result = await engine.evaluate({
  type: 'message',
  content: 'User message content',
  author: { id: 'user123', trustScore: 0.8 },
  channel: { id: 'channel456' },
  guild: { id: 'guild789' }
});

if (result.triggered) {
  console.log(`Rule violation detected: ${result.reason}`);
  console.log(`Confidence: ${result.confidence}`);
  console.log(`Suggested action: ${result.suggestedAction}`);
}
```

### Custom Rules

```typescript
import { ModerationRule, RuleResult } from '@supremo/rules-engine';

class CustomSpamRule implements ModerationRule {
  name = 'custom-spam-detection';
  description = 'Detects custom spam patterns';
  
  async evaluate(signal: Signal): Promise<RuleResult> {
    // Your custom detection logic
    const isSpam = this.detectCustomSpamPattern(signal);
    
    return {
      triggered: isSpam,
      confidence: isSpam ? 0.9 : 0.0,
      reason: 'Custom spam pattern detected',
      suggestedAction: 'delete_message',
      metadata: {
        pattern: 'custom_pattern_type'
      }
    };
  }
  
  private detectCustomSpamPattern(signal: Signal): boolean {
    // Implementation details
    return false;
  }
}

// Add to engine
engine.addRule(new CustomSpamRule());
```

### Signal Processing

```typescript
import { SignalProcessor } from '@supremo/rules-engine';

const processor = new SignalProcessor();

// Process different types of signals
processor.process({
  type: 'user_join',
  user: { id: 'user123', accountAge: 86400000 }, // 1 day old
  guild: { id: 'guild789' },
  timestamp: new Date()
});

processor.process({
  type: 'message_sent',
  message: { content: 'Hello world!', author: 'user123' },
  channel: { id: 'channel456' },
  timestamp: new Date()
});
```

## Built-in Rules

### Content Analysis Rules

- **SpamDetectionRule**: Detects repetitive content, excessive caps, and spam patterns
- **ToxicityRule**: Identifies toxic language and harassment
- **NSFWRule**: Detects NSFW content and inappropriate material
- **ScamDetectionRule**: Identifies phishing attempts and scam messages
- **InviteSpamRule**: Detects unauthorized Discord invite links

### Behavioral Rules

- **RaidDetectionRule**: Identifies coordinated raid attempts
- **SuspiciousActivityRule**: Detects unusual user behavior patterns
- **TrustScoreRule**: Evaluates user trustworthiness
- **RateLimitRule**: Prevents message/action flooding

### Server Security Rules

- **AntiRaidRule**: Protects against mass join attacks
- **PermissionEscalationRule**: Detects unauthorized permission changes
- **BotDetectionRule**: Identifies potential bot accounts

## Configuration

```typescript
const config = {
  rules: {
    spam: {
      enabled: true,
      sensitivity: 0.8,
      exemptRoles: ['moderator', 'trusted']
    },
    toxicity: {
      enabled: true,
      threshold: 0.7,
      autoDelete: false
    }
  },
  signals: {
    messageAnalysis: true,
    userBehavior: true,
    serverEvents: true
  }
};

const engine = new RulesEngine(config);
```

## API Reference

### RulesEngine

Main engine class for rule evaluation and management.

#### Methods

- `addRule(rule: ModerationRule)`: Add a rule to the engine
- `removeRule(name: string)`: Remove a rule by name
- `evaluate(signal: Signal)`: Evaluate a signal against all rules
- `getResults()`: Get evaluation results and statistics

### ModerationRule Interface

```typescript
interface ModerationRule {
  name: string;
  description: string;
  enabled: boolean;
  priority: number;
  evaluate(signal: Signal): Promise<RuleResult>;
}
```

### Signal Types

- `MessageSignal`: For message analysis
- `UserSignal`: For user behavior analysis
- `ServerSignal`: For server event analysis
- `CustomSignal`: For custom event types

## License

MIT License - see LICENSE file for details.