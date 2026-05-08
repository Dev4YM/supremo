# 🤝 Contributing Guide

Welcome to the Supremo Discord Bot project! We're excited to have you contribute to making Discord communities safer and more manageable.

## 🌟 Ways to Contribute

### 🐛 Bug Reports
Found a bug? Help us fix it by providing detailed information about the issue.

### 💡 Feature Requests  
Have an idea for a new feature? We'd love to hear about it!

### 🔧 Code Contributions
Submit pull requests for bug fixes, new features, or improvements.

### 📝 Documentation
Help improve our documentation, guides, and examples.

### 🎨 Design & UX
Contribute to UI/UX improvements and design suggestions.

### 🌍 Translations
Help make Supremo accessible to more communities worldwide.

## 🚀 Getting Started

### 1. Fork & Clone

```bash
# Fork the repository on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/supremo-discord-bot.git
cd supremo-discord-bot

# Add the original repository as upstream
git remote add upstream https://github.com/original-owner/supremo-discord-bot.git
```

### 2. Development Setup

```bash
# Install dependencies
npm install

# Build shared packages
npm run build:packages

# Set up environment variables
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.local.example apps/web/.env.local

# Edit the .env files with your configuration
```

### 3. Database Setup

```bash
cd apps/server

# Generate Prisma client
npx prisma generate

# Set up database
npx prisma db push

# Seed with sample data (optional)
npm run prisma:seed
```

### 4. Start Development

```bash
# Start backend (Terminal 1)
cd apps/server
npm run start:dev

# Start frontend (Terminal 2)
cd apps/web  
npm run dev

# Or start both from root
npm run dev
```

## 📋 Development Guidelines

### Code Style

We use ESLint and Prettier for consistent code formatting:

```bash
# Check linting
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

**TypeScript Guidelines:**
- Use strict TypeScript configuration
- Prefer interfaces over types for object shapes
- Use meaningful variable and function names
- Add JSDoc comments for public APIs

**Example:**
```typescript
/**
 * Calculate user trust score based on various factors
 * @param factors - Object containing trust calculation factors
 * @returns Trust score between 0 and 1
 */
export function calculateTrustScore(factors: TrustFactors): number {
  // Implementation
}
```

### Git Workflow

**Branch Naming:**
- `feature/description` - New features
- `fix/description` - Bug fixes  
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring
- `test/description` - Test additions/updates

**Commit Messages:**
Follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Format: type(scope): description

feat(auth): add Discord OAuth integration
fix(moderation): resolve spam detection false positives  
docs(api): update endpoint documentation
test(utils): add string utility tests
refactor(database): optimize query performance
```

**Pull Request Process:**

1. **Create Feature Branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes:**
   - Write code following our guidelines
   - Add tests for new functionality
   - Update documentation as needed

3. **Test Your Changes:**
   ```bash
   npm run test
   npm run lint
   npm run build
   ```

4. **Commit Changes:**
   ```bash
   git add .
   git commit -m "feat(scope): your descriptive message"
   ```

5. **Push and Create PR:**
   ```bash
   git push origin feature/your-feature-name
   # Create pull request on GitHub
   ```

### Testing

**Running Tests:**
```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm run test -- --testNamePattern="UserService"
```

**Writing Tests:**

**Unit Tests:**
```typescript
// apps/server/src/modules/users/users.service.spec.ts
describe('UsersService', () => {
  let service: UsersService;
  
  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [UsersService],
    }).compile();
    
    service = module.get<UsersService>(UsersService);
  });

  it('should calculate trust score correctly', () => {
    const factors = {
      accountAge: 30,
      serverTenure: 15,
      messageCount: 100,
      violationCount: 0
    };
    
    const score = service.calculateTrustScore(factors);
    expect(score).toBeGreaterThan(0.5);
  });
});
```

**Integration Tests:**
```typescript
// apps/server/test/auth.e2e-spec.ts
describe('Authentication (e2e)', () => {
  let app: INestApplication;
  
  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/auth/login (POST)', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ code: 'discord_oauth_code' })
      .expect(201)
      .expect((res) => {
        expect(res.body.access_token).toBeDefined();
      });
  });
});
```

## 🏗️ Project Structure

Understanding the codebase structure:

```
supremo-discord-bot/
├── apps/
│   ├── server/           # NestJS Backend
│   │   ├── src/
│   │   │   ├── modules/  # Feature modules
│   │   │   ├── common/   # Shared code
│   │   │   └── config/   # Configuration
│   │   └── test/         # E2E tests
│   └── web/              # Next.js Frontend
│       ├── app/          # Next.js 13+ app directory
│       ├── components/   # React components
│       ├── hooks/        # Custom React hooks
│       └── lib/          # Utility libraries
├── packages/
│   ├── shared-types/     # TypeScript definitions
│   ├── rules-engine/     # Moderation rules
│   └── utils/            # Shared utilities
└── docs/                 # Documentation
```

### Adding New Features

**1. Backend Feature (NestJS Module):**

```bash
# Generate new module
cd apps/server
npx nest generate module features/my-feature
npx nest generate service features/my-feature
npx nest generate controller features/my-feature
```

**2. Frontend Feature (React Component):**

```bash
# Create component directory
mkdir apps/web/components/my-feature

# Create component files
touch apps/web/components/my-feature/MyFeature.tsx
touch apps/web/components/my-feature/index.ts
```

**3. Shared Types:**

```typescript
// packages/shared-types/src/my-feature.ts
export interface MyFeatureConfig {
  enabled: boolean;
  settings: Record<string, any>;
}

// Export in packages/shared-types/src/index.ts
export * from './my-feature';
```

## 🐛 Bug Reports

When reporting bugs, please include:

**Bug Report Template:**
```markdown
## Bug Description
A clear description of what the bug is.

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. See error

## Expected Behavior
What you expected to happen.

## Actual Behavior  
What actually happened.

## Environment
- OS: [e.g. Windows 10, macOS 12.0]
- Browser: [e.g. Chrome 95, Firefox 94]
- Node.js Version: [e.g. 18.12.0]
- Bot Version: [e.g. 1.2.3]

## Additional Context
Screenshots, logs, or other relevant information.
```

**Finding Bugs:**
- Check existing issues first
- Test in different environments
- Provide minimal reproduction case
- Include relevant logs/screenshots

## 💡 Feature Requests

**Feature Request Template:**
```markdown
## Feature Description
Clear description of the proposed feature.

## Problem Statement
What problem does this solve?

## Proposed Solution
How should this feature work?

## Alternatives Considered
Other approaches you've considered.

## Additional Context
Mockups, examples, or related features.
```

**Guidelines:**
- Check if feature already exists or is planned
- Consider impact on existing functionality
- Think about configuration and customization
- Consider different community sizes and needs

## 🔍 Code Review Process

### For Contributors

**Before Submitting:**
- [ ] Code follows style guidelines
- [ ] Tests pass locally
- [ ] Documentation updated
- [ ] No merge conflicts
- [ ] Descriptive PR title and description

**PR Description Template:**
```markdown
## Changes Made
- Brief description of changes
- List of modified files/features

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual testing completed

## Screenshots (if applicable)
Before/after screenshots for UI changes

## Breaking Changes
List any breaking changes

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests added/updated
```

### For Reviewers

**Review Checklist:**
- [ ] Code quality and readability
- [ ] Performance implications
- [ ] Security considerations
- [ ] Test coverage
- [ ] Documentation accuracy
- [ ] Breaking change impact

**Review Guidelines:**
- Be constructive and respectful
- Explain reasoning for requested changes
- Approve when ready, request changes when needed
- Test locally for complex changes

## 🚀 Release Process

### Versioning

We follow [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Workflow

1. **Prepare Release:**
   ```bash
   # Update version numbers
   npm version patch # or minor/major
   
   # Update CHANGELOG.md
   # Update documentation
   ```

2. **Create Release PR:**
   - Update version in all package.json files
   - Update CHANGELOG.md with new features/fixes
   - Tag release after merge

3. **Deploy:**
   - Automated deployment via GitHub Actions
   - Monitor for issues
   - Rollback if necessary

## 🏆 Recognition

### Contributors

We recognize contributors through:
- GitHub contributor graphs
- CONTRIBUTORS.md file
- Release notes mentions
- Discord community recognition

### Maintainer Guidelines

**For Project Maintainers:**

**Issue Triage:**
- Label issues appropriately
- Assign to appropriate team members
- Close duplicates and invalid issues
- Provide guidance to new contributors

**PR Management:**
- Review PRs promptly
- Provide constructive feedback
- Merge when ready
- Thank contributors

**Community Management:**
- Welcome new contributors
- Answer questions
- Maintain positive environment
- Organize community events

## 📞 Getting Help

### Communication Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and ideas
- **Discord Server**: Real-time chat and support
- **Email**: security@supremo-bot.com (security issues only)

### Development Support

**Common Questions:**
- Setup and configuration issues
- Architecture and design decisions
- Testing strategies
- Performance optimization

**Resources:**
- [Development Setup Guide](../README.md#development-setup)
- [API Documentation](./api-reference.md)
- [Architecture Overview](./architecture.md)
- [Deployment Guide](./deployment.md)

## 📜 Code of Conduct

### Our Pledge

We pledge to make participation in our project a harassment-free experience for everyone, regardless of:
- Age, body size, disability, ethnicity
- Gender identity and expression
- Level of experience, nationality
- Personal appearance, race, religion
- Sexual identity and orientation

### Expected Behavior

- Use welcoming and inclusive language
- Be respectful of differing viewpoints
- Accept constructive criticism gracefully
- Focus on what's best for the community
- Show empathy towards other members

### Unacceptable Behavior

- Harassment, trolling, or insulting comments
- Public or private harassment
- Publishing others' private information
- Other conduct inappropriate in a professional setting

### Enforcement

Project maintainers are responsible for clarifying standards and taking corrective action for unacceptable behavior.

**Reporting:**
- Email: conduct@supremo-bot.com
- All reports will be reviewed and investigated
- Confidentiality will be maintained

## 🎉 Thank You!

Thank you for contributing to Supremo Discord Bot! Your efforts help make Discord communities safer and more enjoyable for millions of users.

Every contribution, no matter how small, makes a difference:
- Bug reports help us improve quality
- Feature suggestions drive innovation  
- Code contributions build functionality
- Documentation helps others contribute
- Community support creates a welcoming environment

**Happy coding! 🚀**