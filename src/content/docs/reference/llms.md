---
title: "LLM Context & llms.txt"
description: "Machine-readable documentation formats for AI models, agents, and IDE extensions."
---

import { Card, CardGrid, Tabs, TabItem } from '@astrojs/starlight/components';

Auriya provides standardized machine-readable documentation compliant with the [llmstxt.org](https://llmstxt.org) standard. These endpoints allow Large Language Models (LLMs), AI coding assistants (like Cursor, Claude, Antigravity, GitHub Copilot, ChatGPT), and autonomous agents to index and understand Auriya's technical documentation without HTML clutter.

## Available Endpoints

<CardGrid>
  <Card title="llms.txt (Root Index)" icon="seti:info">
    A standardized site map summarizing available documentation sets and references.
    
    [Open /llms.txt](/llms.txt)
  </Card>
  <Card title="llms-small.txt (Abridged Context)" icon="document">
    A curated, compact markdown distillation of key guides, API schemas, and architecture. Best for prompt context limits.
    
    [Open /llms-small.txt](/llms-small.txt)
  </Card>
  <Card title="llms-full.txt (Complete Documentation)" icon="seti:markdown">
    The entire Auriya wiki in a single consolidated Markdown file with full code references and internals.
    
    [Open /llms-full.txt](/llms-full.txt)
  </Card>
</CardGrid>

---

## How to Use with AI Agents

### 1. In AI IDEs (Cursor, Windsurf, Copilot, Antigravity)

Add the documentation URL as an external docs source in your IDE:

```text
https://auriya.pages.dev/llms.txt
```
Or directly feed the full context file:
```text
https://auriya.pages.dev/llms-full.txt
```

### 2. Prompt Ingestion via cURL / CLI

You can fetch the context directly in your scripts or feed it to local LLM runners:

<Tabs>
  <TabItem label="Compact Context">
```bash
curl -sSL https://auriya.pages.dev/llms-small.txt | llm "Explain Auriya's Profile Scheduler"
```
  </TabItem>
  <TabItem label="Full Context">
```bash
curl -sSL https://auriya.pages.dev/llms-full.txt > auriya_context.md
```
  </TabItem>
</Tabs>

---

## Structure & Update Cycle

The `llms.txt` files are automatically generated during each documentation build and deployment via the `@astrojs/starlight` build pipeline (`starlight-llms-txt`). Any updates to guides, IPC specs, and configuration references are synchronized instantly with these endpoints.
