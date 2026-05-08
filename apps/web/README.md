# Supremo Discord Bot - Web Dashboard

A modern, comprehensive Discord bot management dashboard built with Next.js 14, TypeScript, and Tailwind CSS.

## 🚀 Features

### 🎯 Core Functionality
- **Real-time Dashboard**: Live server statistics, member growth, and incident tracking
- **Guild Management**: Multi-guild support with context switching
- **User Management**: Discord member sync, role management, and user profiles
- **Incident Management**: Complete CRUD operations for moderation incidents
- **Automation System**: Create, manage, and execute custom workflows
- **Analytics**: Comprehensive analytics with charts and visualizations

### 🛡️ Security & Authentication
- **Discord OAuth2**: Secure authentication via Discord
- **Session Management**: HTTP-only cookies for enhanced security
- **Permission System**: Role-based access control (RBAC)
- **Guild Context**: Automatic guild selection and permission validation

### 🎨 User Experience
- **Modern UI**: Clean, responsive design with dark/light theme support
- **Loading States**: Skeleton loaders and smooth transitions
- **Error Handling**: Comprehensive error boundaries and user feedback
- **Real-time Updates**: Live data with React Query integration
- **Mobile Responsive**: Optimized for all device sizes

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - High-quality UI components
- **React Query** - Server state management
- **Axios** - HTTP client with interceptors
- **Sonner** - Toast notifications

### Backend Integration
- **NestJS API** - RESTful API integration
- **Session-based Auth** - Secure authentication
- **Real-time Data** - Live updates and synchronization

## 📁 Project Structure

```
apps/web/
├── app/                    # Next.js App Router
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Main dashboard pages
│   │   ├── analytics/     # Analytics and reporting
│   │   ├── automation/    # Workflow management
│   │   ├── incidents/     # Incident management
│   │   ├── users/         # User management
│   │   └── ...           # Other dashboard pages
│   └── layout.tsx        # Root layout
├── components/            # Reusable components
│   ├── ui/               # Base UI components
│   ├── dashboard/        # Dashboard-specific components
│   ├── auth/             # Authentication components
│   └── providers/        # Context providers
├── lib/                  # Utility libraries
│   ├── hooks/            # Custom React hooks
│   ├── api.ts           # API client configuration
│   └── utils.ts         # Utility functions
└── public/              # Static assets
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Running Supremo Discord Bot backend

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd supremo-discord-bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Environment Setup**
   ```bash
   cp apps/web/.env.example apps/web/.env.local
   ```

4. **Configure environment variables**
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:9691
   NEXT_PUBLIC_WS_URL=ws://localhost:9691
   NEXT_PUBLIC_APP_URL=http://localhost:7634
   ```

5. **Start development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

6. **Open in browser**
   Navigate to `http://localhost:7634`

## 🔧 Configuration

### API Integration
The dashboard integrates with the Supremo Discord Bot backend API. Configure the API URL in your environment variables:

```env
NEXT_PUBLIC_API_URL=http://your-backend-url:port
```

### Guild Setup
1. Ensure your Discord bot is added to your server
2. Log in with Discord OAuth2
3. Connect your guild through the setup flow
4. Configure permissions as needed

## 📊 Dashboard Features

### Main Dashboard
- **Server Overview**: Member count, online status, growth metrics
- **Recent Activity**: Latest incidents, automation runs, user actions
- **Quick Actions**: Common moderation tasks and shortcuts
- **System Status**: Bot status, API health, performance metrics

### Incident Management
- **Create Reports**: Detailed incident reporting with evidence
- **Status Tracking**: Open, in progress, resolved, closed states
- **Bulk Actions**: Approve, reject, or update multiple incidents
- **Filtering**: Search and filter by type, severity, status

### Automation System
- **Workflow Builder**: Create custom automation workflows
- **Trigger Management**: Configure event-based triggers
- **Action Library**: Pre-built actions for common tasks
- **Execution Monitoring**: Track automation runs and success rates

### User Management
- **Member Sync**: Sync Discord members with database
- **Role Management**: Assign and manage user roles
- **Trust System**: User trust scores and reputation
- **Activity Tracking**: Monitor user behavior and actions

### Analytics
- **Member Growth**: Track server growth over time
- **Activity Metrics**: Message counts, user engagement
- **Moderation Stats**: Incident trends, automation performance
- **Custom Reports**: Generate detailed analytics reports

## 🔐 Security Features

### Authentication
- **Discord OAuth2**: Secure login via Discord
- **Session Cookies**: HTTP-only cookies for session management
- **Auto Logout**: Automatic logout on token expiration

### Authorization
- **RBAC System**: Role-based access control
- **Guild Permissions**: Per-guild permission validation
- **API Security**: Automatic header injection for guild context

### Error Handling
- **Error Boundaries**: Graceful error recovery
- **API Error Handling**: Comprehensive error response handling
- **User Feedback**: Clear error messages and recovery options

## 🎨 Theming

The dashboard supports both light and dark themes with automatic system detection:

```tsx
// Theme switching is handled automatically
// Users can toggle via the theme switcher in the UI
```

## 🧪 Development

### Code Quality
- **TypeScript**: Full type safety
- **ESLint**: Code linting and formatting
- **Prettier**: Code formatting
- **Husky**: Git hooks for quality checks

### Testing
```bash
npm run test
# or
yarn test
```

### Building
```bash
npm run build
# or
yarn build
```

## 📱 Mobile Support

The dashboard is fully responsive and optimized for mobile devices:
- **Responsive Design**: Adapts to all screen sizes
- **Touch Friendly**: Optimized for touch interactions
- **Mobile Navigation**: Collapsible sidebar and mobile-first design

## 🔧 Customization

### Adding New Pages
1. Create page component in `app/dashboard/`
2. Add route to sidebar navigation
3. Implement API hooks if needed
4. Add to permission system

### Custom Components
1. Create component in `components/`
2. Follow existing patterns and conventions
3. Add TypeScript types
4. Include error handling

## 📈 Performance

### Optimization Features
- **Code Splitting**: Automatic route-based code splitting
- **Image Optimization**: Next.js image optimization
- **Caching**: React Query caching and invalidation
- **Lazy Loading**: Component and route lazy loading

### Monitoring
- **React Query Devtools**: Development debugging
- **Error Tracking**: Comprehensive error logging
- **Performance Metrics**: Built-in Next.js analytics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Check the documentation
- Open an issue on GitHub
- Join our Discord community

## 🙏 Acknowledgments

- **shadcn/ui** for the beautiful UI components
- **Vercel** for Next.js and hosting
- **Discord** for the API and OAuth2 system
- **Tailwind CSS** for the utility-first CSS framework