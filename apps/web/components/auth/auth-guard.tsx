'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/use-api';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const router = useRouter();
  const { data: user, isLoading, error } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isLoading && error && error.response?.status === 401) {
      // Redirect to login on 401 error (unauthorized)
      router.push('/');
    }
  }, [mounted, isLoading, error, router]);

  // Show loading state during SSR and initial load
  if (!mounted || isLoading) {
    return fallback || <AuthLoadingSkeleton />;
  }

  // Show error state for non-401 errors
  if (error && error.response?.status !== 401) {
    return fallback || <AuthErrorState />;
  }

  // Show content if authenticated
  if (user) {
    return <>{children}</>;
  }

  // If no user and no error, still loading or redirecting
  return fallback || <AuthLoadingSkeleton />;
}

function AuthLoadingSkeleton() {
  return (
    <div className="flex h-screen">
      <div className="w-64 border-r bg-sidebar">
        <div className="p-4">
          <Skeleton className="h-8 w-32 mb-4" />
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </div>
      </div>
      <div className="flex-1">
        <div className="border-b p-4">
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    </div>
  );
}

function AuthErrorState() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">Authentication Error</h3>
            <p className="text-muted-foreground mb-4">
              There was an error verifying your authentication. Please try logging in again.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}