'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { queryKeys } from '@/lib/hooks/use-api';
import { authAPI } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [processed, setProcessed] = useState(false);

  // Mutation to exchange token for session cookie
  const exchangeTokenMutation = useMutation({
    mutationFn: (token: string) => authAPI.exchangeToken(token),
    onSuccess: (response) => {
      const user = response.data.data.user;
      
      // Clear any old localStorage data
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Update React Query cache
      queryClient.setQueryData(queryKeys.auth.me, user);
      
      setStatus('success');
      toast.success('Successfully logged in!');
      
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    },
    onError: (error: any) => {
      console.error('Token exchange failed:', error);
      setStatus('error');
      setError(error.response?.data?.message || 'Failed to establish session');
      toast.error('Authentication failed');
    },
  });

  useEffect(() => {
    // Prevent multiple executions
    if (processed) return;

    const success = searchParams.get('success');
    const token = searchParams.get('token');
    const userParam = searchParams.get('user');
    const errorParam = searchParams.get('error');

    // Mark as processed to prevent re-execution
    setProcessed(true);

    if (errorParam) {
      setStatus('error');
      setError(decodeURIComponent(errorParam));
      toast.error('Discord authentication failed');
      return;
    }

    if (success && token) {
      // Exchange the token for a session cookie
      exchangeTokenMutation.mutate(token);
      return;
    }

    // If we get here, something went wrong
    setStatus('error');
    setError('Invalid authentication response');
  }, [searchParams, processed, exchangeTokenMutation]);

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <>
            <div className="flex items-center justify-center mb-4">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <CardTitle className="text-center mb-2">Authenticating...</CardTitle>
            <CardDescription className="text-center">
              Please wait while we verify your Discord account and set up your session.
            </CardDescription>
          </>
        );

      case 'success':
        return (
          <>
            <div className="flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <CardTitle className="text-center mb-2 text-green-700 dark:text-green-400">
              Login Successful!
            </CardTitle>
            <CardDescription className="text-center">
              Welcome to Supremo Bot! You'll be redirected to the dashboard in a moment.
            </CardDescription>
          </>
        );

      case 'error':
        return (
          <>
            <div className="flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle className="text-center mb-2 text-destructive">
              Authentication Failed
            </CardTitle>
            <CardDescription className="text-center mb-6">
              {error || 'An unexpected error occurred during authentication.'}
            </CardDescription>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild>
                <Link href="/">Try Again</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/support">Contact Support</Link>
              </Button>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-xl font-bold text-primary-foreground">S</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-xl font-bold text-primary-foreground">S</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center mb-4">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <CardTitle className="text-center mb-2">Loading...</CardTitle>
            <CardDescription className="text-center">
              Please wait while we load the authentication page.
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}