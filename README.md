# Open App Builder
An open-source v0/Lovable alternative that uses client-side sandboxes instead of costly cloud sandboxes
[![Watch the demo](https://img.youtube.com/vi/kqGBE5FqSdA/maxresdefault.jpg)](https://youtu.be/kqGBE5FqSdA)

Open App Builder uses StackBlitz's Web Container API and Vercel Workflow to ensure durable synchronisation between coding agents in the backend and web container on the client side. App Builder was inspired by Workflow's [Human in the Loop](https://useworkflow.dev/docs/ai/human-in-the-loop) to ensure tool calls from coding agents are run before proceeding to the subsequent steps.

### Getting Started
Ensure that you have `bun` installed, otherwise run if on Mac:

```bash
curl -fsSL https://bun.sh/install | bash
```

Add in `.env.local`, get your Vercel AI Gateway API key

```bash
AI_GATEWAY_API_KEY=...
WEBCONTAINER_NEXT_BINARY_FILE=https://pub-f506e0b099eb43eea99fa713747836f5.r2.dev/webcontainer-next.bin
WEBCONTAINER_VITE_BINARY_FILE=https://pub-f506e0b099eb43eea99fa713747836f5.r2.dev/webcontainer-vite.bin
```

`WEBCONTAINER_NEXT_BINARY_FILE` and `WEBCONTAINER_VITE_BINARY_FILE` are binaries are mounted to Web Container as Vite/Next boilerplate. This expedites sandbox loading time.

### Run Locally
Once `.env.local` file is added, run the following:

```bash
bun i
bun dev
```

