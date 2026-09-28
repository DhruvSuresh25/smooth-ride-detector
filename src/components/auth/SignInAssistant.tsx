import { useState } from "react";
import { Bot, Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { askSignInAssistant } from "@/lib/auth-assistant.functions";
import type { AuthIssue } from "@/lib/auth-errors";

export function SignInAssistant({ issue }: { issue: AuthIssue | null }) {
  const [description, setDescription] = useState("");
  const [guidance, setGuidance] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAsk() {
    const clean = description.trim();
    if (clean.length < 10) {
      setError("Describe what happened in at least a few words.");
      return;
    }

    setLoading(true);
    setError("");
    setGuidance("");
    try {
      const result = await askSignInAssistant({ data: { description: clean, issueKind: issue?.kind ?? null } });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setGuidance(result.guidance);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "AI guidance could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="w-full">
          <Sparkles aria-hidden="true" /> Trouble signing in? Ask AI
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="size-5 text-primary" aria-hidden="true" /> Sign-in assistant
          </DialogTitle>
          <DialogDescription>
            Describe what happened. Do not include your password, verification code, or other private details.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="sign-in-problem">What happened when you tried to sign in?</Label>
          <Textarea
            id="sign-in-problem"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="For example: I created my account today, but sign-in says my email is not confirmed."
            className="min-h-28 resize-none"
            maxLength={1200}
          />
          <p className="text-xs text-muted-foreground">{description.length}/1200 characters</p>
        </div>

        {guidance ? (
          <div className="rounded-md border border-primary/20 bg-primary/5 p-4" aria-live="polite">
            <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">{guidance}</p>
          </div>
        ) : null}
        {error ? <p className="text-sm font-medium text-destructive" role="alert">{error}</p> : null}

        <DialogFooter>
          <Button type="button" onClick={handleAsk} disabled={loading || description.trim().length < 10}>
            {loading ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Sparkles aria-hidden="true" />}
            {loading ? "Reviewing…" : "Recommend recovery steps"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}