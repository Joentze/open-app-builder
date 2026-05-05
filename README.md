# Open App Builder

Wah, this one is an open-source v0/Lovable alternative, but we use client-side sandboxes so you no need burn money on expensive cloud sandboxes.

[![Watch the demo](https://img.youtube.com/vi/kqGBE5FqSdA/maxresdefault.jpg)](https://youtu.be/kqGBE5FqSdA)

Open App Builder wires up StackBlitz WebContainer API with Vercel Workflow, so backend coding agents and your browser sandbox stay in sync, nice and steady. The flow is inspired by Workflow's [Human in the Loop](https://useworkflow.dev/docs/ai/human-in-the-loop), where each tool call from the coding agent executes first before moving to the next step. No blur, all clear.

## Getting Started

First thing first, make sure `bun` is installed. If you are on Mac and not installed yet, just run:

```bash
curl -fsSL https://bun.sh/install | bash
```

Then create `.env.local` and paste your Vercel AI Gateway key plus these configs:

```bash
AI_GATEWAY_API_KEY=...
WEBCONTAINER_NEXT_BINARY_FILE=https://pub-f506e0b099eb43eea99fa713747836f5.r2.dev/webcontainer-next.bin
WEBCONTAINER_VITE_BINARY_FILE=https://pub-f506e0b099eb43eea99fa713747836f5.r2.dev/webcontainer-vite.bin
```

`WEBCONTAINER_NEXT_BINARY_FILE` and `WEBCONTAINER_VITE_BINARY_FILE` are prebuilt binaries mounted into WebContainer as Next/Vite boilerplate. This one helps sandbox start faster, wait less, build more.

## Run Locally

After `.env.local` is ready, run these commands can already:

```bash
bun i
bun dev
```
