'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLogout } from '@/lib/hooks/use-api';
import { clearAuthState } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function LogoutPage() {
  const router = useRouter();
  const logoutMutation = useLogout();

  useEffect(() => {
    // Clear local auth state immediately
    clearAuthState();

    // Attempt server logout (optional, for session cleanup)
    logoutMutation.mutate(undefined, {
      onSettled: () => {
        // Redirect to home page regardless of server response
        setTimeout(() => {
          router.push('/');
        }, 1500);
      },
    });
  }, [logoutMutation, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
              <span className="text-xl font-bold text-muted-foreground">S</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center mb-4">
            <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
          </div>
          <CardTitle className="text-center mb-2">Logging Out...</CardTitle>
          <CardDescription className="text-center">
            Please wait while we securely log you out of your account.
          </CardDescription>
        </CardContent>
      </Card>
    </div>
  );
}