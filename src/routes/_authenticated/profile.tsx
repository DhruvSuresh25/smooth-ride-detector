import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, LogOut, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { PasswordField, passwordScore } from "@/components/auth/PasswordField";
import { UserShell } from "@/components/layout/Shells";
import { useSignedUrl } from "@/components/StorageImage";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useProfile, useSignOut } from "@/hooks/useAuth";
import { formatDate, initialsOf } from "@/lib/constants";
import { useMyReports } from "@/lib/reports";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile & Settings — DriveSafe Vision" },
      { name: "description", content: "Manage your account details, password and preferences." },
      { property: "og:title", content: "Profile & Settings — DriveSafe Vision" },
      {
        property: "og:description",
        content: "Manage your account details, password and preferences.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: reports } = useMyReports();
  const queryClient = useQueryClient();
  const signOut = useSignOut();
  const avatarInput = useRef<HTMLInputElement>(null);
  const { data: avatarUrl } = useSignedUrl(profile?.avatar_url);

  const [fullName, setFullName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (profile) setFullName(profile.full_name);
  }, [profile]);

  async function saveProfile() {
    if (!fullName.trim()) {
      toast.error("Full name cannot be empty");
      return;
    }
    setSavingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim() })
      .eq("id", user!.id);
    setSavingProfile(false);
    if (error) {
      toast.error("Could not save profile", { description: error.message });
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["profile"] });
    toast.success("Profile updated");
  }

  async function uploadAvatar(file: File | null) {
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image too large", { description: "Maximum avatar size is 5 MB." });
      return;
    }
    setUploading(true);
    const path = `${user.id}/avatar-${Date.now()}.${file.name.split(".").pop() ?? "jpg"}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { contentType: file.type, upsert: true });
    if (uploadError) {
      setUploading(false);
      toast.error("Could not upload avatar", { description: uploadError.message });
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: `avatars/${path}` })
      .eq("id", user.id);
    setUploading(false);
    if (error) {
      toast.error("Could not save avatar", { description: error.message });
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["profile"] });
    toast.success("Avatar updated");
  }

  async function updatePassword() {
    const next: Record<string, string> = {};
    if (!currentPassword) next.current = "Enter your current password.";
    if (newPassword.length < 8) next.next = "Password must be at least 8 characters.";
    else if (passwordScore(newPassword) < 2) next.next = "Add numbers or symbols to strengthen it.";
    if (confirmPassword !== newPassword) next.confirm = "Passwords do not match.";
    setPasswordErrors(next);
    if (Object.keys(next).length) return;

    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
      // Required when changing the password for a signed-in session.
      ...({ current_password: currentPassword } as Record<string, string>),
    });
    setSavingPassword(false);

    if (error) {
      toast.error("Could not update password", { description: error.message });
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    toast.success("Password updated");
  }

  async function toggleSetting(
    key: "email_notifications" | "browser_notifications",
    value: boolean,
  ) {
    const { error } = await supabase
      .from("profiles")
      .update({ [key]: value })
      .eq("id", user!.id);
    if (error) {
      toast.error("Could not save preference", { description: error.message });
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["profile"] });
    toast.success("Preference saved");
  }

  return (
    <UserShell title="Profile & Settings" subtitle="Your account details and preferences">
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="surface-card p-5">
          <h2 className="font-bold">Profile</h2>
          <div className="mt-4 flex items-center gap-4">
            <Avatar className="size-16">
              {avatarUrl && <AvatarImage src={avatarUrl} alt="Your avatar" />}
              <AvatarFallback className="bg-primary-soft text-lg font-semibold text-primary">
                {initialsOf(profile?.full_name, profile?.email)}
              </AvatarFallback>
            </Avatar>
            <div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => avatarInput.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Upload className="size-4" aria-hidden="true" />
                )}
                Change avatar
              </Button>
              <p className="mt-1 text-xs text-muted-foreground">JPG or PNG, up to 5 MB.</p>
            </div>
            <input
              ref={avatarInput}
              type="file"
              accept="image/jpeg,image/png"
              className="sr-only"
              onChange={(e) => void uploadAvatar(e.target.files?.[0] ?? null)}
              aria-label="Upload profile avatar"
            />
          </div>

          <div className="mt-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full-name">Full name</Label>
              <Input
                id="full-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-email">Email address</Label>
              <Input id="profile-email" value={profile?.email ?? ""} readOnly />
            </div>
            <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted/50 p-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Account created</p>
                <p className="font-semibold">{formatDate(profile?.created_at)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Reports submitted</p>
                <p className="font-semibold">{reports?.length ?? 0}</p>
              </div>
            </div>
            <Button onClick={saveProfile} disabled={savingProfile}>
              {savingProfile && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              Save changes
            </Button>
          </div>
        </section>

        <div className="space-y-5">
          <section className="surface-card p-5">
            <h2 className="font-bold">Password</h2>
            <div className="mt-4 space-y-4">
              <PasswordField
                id="current-password"
                label="Current password"
                value={currentPassword}
                onChange={setCurrentPassword}
                error={passwordErrors.current}
              />
              <PasswordField
                id="new-password"
                label="New password"
                value={newPassword}
                onChange={setNewPassword}
                error={passwordErrors.next}
                showStrength
                autoComplete="new-password"
              />
              <PasswordField
                id="confirm-new-password"
                label="Confirm new password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                error={passwordErrors.confirm}
                autoComplete="new-password"
              />
              <Button onClick={updatePassword} disabled={savingPassword}>
                {savingPassword && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                Update password
              </Button>
            </div>
          </section>

          <section className="surface-card p-5">
            <h2 className="font-bold">Settings</h2>
            <div className="mt-4 space-y-4">
              <SettingRow
                id="email-notifications"
                label="Email notifications"
                description="Get an email when a report status changes."
                checked={profile?.email_notifications ?? true}
                onChange={(v) => void toggleSetting("email_notifications", v)}
              />
              <SettingRow
                id="browser-notifications"
                label="Browser notifications"
                description="Show in-browser alerts while you have the app open."
                checked={profile?.browser_notifications ?? false}
                onChange={(v) => void toggleSetting("browser_notifications", v)}
              />
            </div>
            <Button variant="outline" className="mt-5 gap-2" onClick={() => void signOut()}>
              <LogOut className="size-4" aria-hidden="true" /> Logout
            </Button>
          </section>
        </div>
      </div>
    </UserShell>
  );
}

function SettingRow({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <Label htmlFor={id}>{label}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
