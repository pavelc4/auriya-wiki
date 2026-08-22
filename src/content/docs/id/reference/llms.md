---
title: "Konteks LLM & llms.txt"
description: "Format dokumentasi ramah mesin (machine-readable) untuk model AI, coding assistant, dan agent."
---

import { Card, CardGrid, Tabs, TabItem } from '@astrojs/starlight/components';

Auriya menyediakan dokumentasi ramah mesin yang mematuhi standar [llmstxt.org](https://llmstxt.org). Endpoint ini dirancang agar Large Language Models (LLM), AI coding assistant (seperti Cursor, Claude, Antigravity, GitHub Copilot, ChatGPT), dan agen otonom dapat membaca dan memahami dokumentasi teknis Auriya secara bersih tanpa gangguan markup HTML.

## Endpoint yang Tersedia

<CardGrid>
  <Card title="llms.txt (Indeks Utama)" icon="seti:info">
    Peta situs terstandarisasi yang merangkum ringkasan dan tautan dataset dokumentasi Auriya.
    
    [Buka /llms.txt](/llms.txt)
  </Card>
  <Card title="llms-small.txt (Konteks Ringkas)" icon="document">
    Kompilasi Markdown ringkas yang memuat panduan inti, skema API, dan arsitektur. Ideal untuk efisiensi batas token LLM.
    
    [Buka /llms-small.txt](/llms-small.txt)
  </Card>
  <Card title="llms-full.txt (Dokumentasi Lengkap)" icon="seti:markdown">
    Seluruh isi wiki Auriya dalam satu file teks Markdown terstruktur dengan referensi kode dan penjelasan internal lengkap.
    
    [Buka /llms-full.txt](/llms-full.txt)
  </Card>
</CardGrid>

---

## Cara Menggunakan pada AI & LLM

### 1. Pada AI IDE (Cursor, Windsurf, Copilot, Antigravity)

Tambahkan URL dokumentasi berikut sebagai sumber referensi eksternal (*custom docs*):

```text
https://auriya.pages.dev/llms.txt
```
Atau langsung gunakan file konteks lengkap:
```text
https://auriya.pages.dev/llms-full.txt
```

### 2. Pengambilan Data via cURL / Terminal

Anda dapat mengunduh atau menyalurkan (*pipe*) konteks langsung ke CLI LLM:

<Tabs>
  <TabItem label="Konteks Ringkas">
```bash
curl -sSL https://auriya.pages.dev/llms-small.txt | llm "Jelaskan cara kerja Penjadwal Profil Auriya"
```
  </TabItem>
  <TabItem label="Konteks Penuh">
```bash
curl -sSL https://auriya.pages.dev/llms-full.txt > auriya_context.md
```
  </TabItem>
</Tabs>

---

## Siklus Pembaruan Otomatis

File `llms.txt` dibuat secara otomatis pada setiap siklus build dokumentasi melalui pipeline Starlight (`starlight-llms-txt`). Setiap pembaruan panduan konfigurasi, protokol IPC, atau arsitektur akan langsung tersinkronisasi secara real-time pada endpoint ini.
