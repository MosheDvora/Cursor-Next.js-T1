"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  
  // Create supabase client only on client-side
  const supabase = useMemo(() => {
    if (typeof window === 'undefined') {
      return null;
    }
    try {
      return createClient();
    } catch {
      return null;
    }
  }, []);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast({
        title: "התחברות הצליחה",
        description: "ברוך הבא!",
      });

      router.push("/");
      router.refresh();
    } catch (error: any) {
      toast({
        title: "שגיאה בהתחברות",
        description: error.message || "אירעה שגיאה בעת ההתחברות",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!supabase) return;
    
    setIsGoogleLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;
      
      // Reset loading state before redirect
      // Note: The redirect will happen automatically, but we reset the state
      // in case the redirect is delayed or fails
      setIsGoogleLoading(false);
    } catch (error: any) {
      setIsGoogleLoading(false);
      toast({
        title: "שגיאה בהתחברות",
        description: error.message || "אירעה שגיאה בעת ההתחברות עם Google",
        variant: "destructive",
      });
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      toast({
        title: "הרשמה הצליחה",
        description: "נא לבדוק את האימייל לאימות החשבון",
      });
    } catch (error: any) {
      toast({
        title: "שגיאה בהרשמה",
        description: error.message || "אירעה שגיאה בעת ההרשמה",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 md:p-12" dir="rtl">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl md:text-5xl font-bold text-right">
            התחברות
          </h1>
          <p className="text-muted-foreground text-right">
            התחבר לחשבון שלך או צור חשבון חדש
          </p>
        </div>

        {/* Login Form */}
        <div className="space-y-6 p-6 border rounded-lg bg-card shadow-sm">
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-right block">
                אימייל
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="text-right"
                dir="ltr"
                data-testid="login-email-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-right block">
                סיסמה
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="text-right"
                dir="ltr"
                data-testid="login-password-input"
              />
            </div>

            <div className="flex flex-col gap-3">
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full gap-2"
                size="lg"
                data-testid="login-submit-button"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>מתחבר...</span>
                  </>
                ) : (
                  <span>התחבר</span>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleSignUp}
                disabled={isLoading}
                className="w-full"
                size="lg"
                data-testid="login-signup-button"
              >
                הרשמה
              </Button>
            </div>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                או
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleLogin}
            disabled={isGoogleLoading}
            className="w-full gap-2"
            size="lg"
            data-testid="login-google-button"
          >
            {isGoogleLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>מתחבר...</span>
              </>
            ) : (
              <>
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                <span>התחבר עם Google</span>
              </>
            )}
          </Button>
        </div>

        {/* Back to home */}
        <div className="text-center">
          <Link href="/" data-testid="login-back-home-link">
            <Button variant="ghost" className="gap-2">
              <ArrowRight className="h-4 w-4" />
              <span>חזרה לעמוד הבית</span>
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}

