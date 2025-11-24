"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Settings, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function Header() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();
  
  // Create supabase client only on client-side
  const supabase = useMemo(() => {
    // Only create client if we're in the browser and env vars are available
    if (typeof window === 'undefined') {
      return null;
    }
    try {
      return createClient();
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    // Don't run if supabase client is not available
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setUser(user);

        // Fetch profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", user.id)
          .single();

        setProfile(profileData);
      }

      setIsLoading(false);
    };

    getUser();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        // Fetch profile when user changes
        supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", session.user.id)
          .single()
          .then(({ data }) => setProfile(data));
      } else {
        setUser(null);
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleLogout = async () => {
    if (!supabase) return;
    
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בעת ההתנתקות",
        variant: "destructive",
      });
    } else {
      toast({
        title: "התנתקות הצליחה",
        description: "התנתקת בהצלחה",
      });
      router.push("/");
      router.refresh();
    }
  };

  if (isLoading) {
    return null;
  }

  return (
    <header className="w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Link href="/">
            <h1 className="text-xl font-bold">לימוד קריאה</h1>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/settings">
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <Settings className="h-5 w-5" />
              <span className="sr-only">הגדרות</span>
            </Button>
          </Link>

          {user ? (
            <div className="flex items-center gap-2">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name || "User"}
                  className="h-8 w-8 rounded-full"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-4 w-4" />
                </div>
              )}
              {profile?.full_name && (
                <span className="text-sm font-medium hidden md:inline-block">
                  {profile.full_name}
                </span>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="h-10 w-10"
                title="התנתק"
              >
                <LogOut className="h-5 w-5" />
                <span className="sr-only">התנתק</span>
              </Button>
            </div>
          ) : (
            <Link href="/login">
              <Button variant="default" size="sm">
                התחבר
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

