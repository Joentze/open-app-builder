# Open App Builder
Aiya, this one is an open-source v0/Lovable alternative that uses client-side sandboxes instead of expensive cloud sandboxes.
[![Watch the demo](https://img.youtube.com/vi/kqGBE5FqSdA/maxresdefault.jpg)](https://youtu.be/kqGBE5FqSdA)

Open App Builder uses StackBlitz's Web Container API and Vercel Workflow to keep backend coding agents and the client-side web container in sync, steady steady. App Builder is inspired by Workflow's [Human in the Loop](https://useworkflow.dev/docs/ai/human-in-the-loop), so tool calls from coding agents get run first before moving to the next step.

### Getting Started
First thing first, make sure you got `bun` installed. If not, and you are on Mac, run this:

```bash
curl -fsSL https://bun.sh/install | bash
```

Then add this into `.env.local`, with your Vercel AI Gateway API key:

```bash
AI_GATEWAY_API_KEY=...
WEBCONTAINER_NEXT_BINARY_FILE=https://pub-f506e0b099eb43eea99fa713747836f5.r2.dev/webcontainer-next.bin
WEBCONTAINER_VITE_BINARY_FILE=https://pub-f506e0b099eb43eea99fa713747836f5.r2.dev/webcontainer-vite.bin
```

`WEBCONTAINER_NEXT_BINARY_FILE` and `WEBCONTAINER_VITE_BINARY_FILE` are binaries mounted to Web Container as Vite/Next boilerplate. This helps speed up sandbox loading time, shiok.

### Run Locally
Once `.env.local` is set up, just run the following can already:

```bash
bun i
bun dev
```
