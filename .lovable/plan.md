# Fix authentication and add AI sign-in help

## What will change
- Correct the citizen sign-up and sign-in flow so successful sessions consistently reach the dashboard without redirect races.
- Translate authentication failures into clear, actionable in-page guidance for incorrect credentials, unconfirmed email, suspended accounts, rate limits, connectivity problems, and unexpected failures.
- Add a compact “Trouble signing in?” assistant on the citizen sign-in page where a person can describe what happened and receive likely causes plus safe recovery steps.
- Keep password reset and account creation links directly available from error guidance.

## AI safety and privacy
- Send only the citizen’s typed problem description and a small, non-sensitive error category to Lovable AI; never send passwords, session tokens, or account records.
- Treat AI output as troubleshooting guidance, not confirmation of whether an account exists.
- Use the server-held AI Gateway key with the required `openai/gpt-6-astra` Responses API configuration and display the gateway’s safe error message if guidance is unavailable.

## Validation
- Test sign-up, valid sign-in, incorrect-password handling, and protected-page navigation in the live preview.
- Test the AI troubleshooting request end to end and inspect the gateway response.
- Confirm the final build has no errors.
