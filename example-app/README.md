## @capgo/capacitor-app-attest example

Run the example app with Bun:

```bash
bun install
bun run start
```

Then sync native projects when needed:

```bash
bunx cap sync ios
bunx cap sync android
```

### Android setup note

Play Integrity token calls need a Google Cloud project number. You can set it in `capacitor.config.json`:

```json
{
  "plugins": {
    "AppAttest": {
      "cloudProjectNumber": "123456789012"
    }
  }
}
```
