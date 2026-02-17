# Correspondent Banking Flow Simulator

> **Select a corridor → watch money flow through the banking chain step by step**

An interactive browser-based simulator for visualizing cross-border payments through the correspondent banking system. See ISO 20022 messages, FX conversions, fee deductions, and nostro account movements at each hop — built for payment professionals, fintech builders, and anyone learning how international money transfers really work.

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript)](https://typescriptlang.org)
[![Mantine](https://img.shields.io/badge/Mantine-7.17-339AF0?logo=mantine)](https://mantine.dev)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite)](https://vitejs.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 🚀 [Launch Live Demo](https://siva-sub.github.io/correspondent-banking-simulator/)

---

## 💡 Why I Built This

Cross-border payments move **$150+ trillion annually** through correspondent banking — yet understanding *how* money actually flows remains opaque. Each transfer touches 3–5 institutions, incurs hidden fees, crosses time zones, and generates ISO 20022 messages that few people ever see.

> **"Where is my payment, and why did I lose 8%?"**

| Challenge | Traditional Understanding | This Simulator |
|-----------|-------------------------|----------------|
| Understanding the chain | Read whitepapers about "hops" | Watch money flow step-by-step through real banks |
| ISO 20022 messages | Abstract XML specifications | See actual pacs.008/pacs.002 snippets at each hop |
| Fee accumulation | Total cost shown after the fact | Fees deducted visibly at each intermediary |
| Nostro/vostro mechanics | Academic descriptions | Live debit/credit notifications (camt.054) shown |
| FX spreads | Hidden inside bank margins | Explicit rate + spread at conversion point |
| Corridor variation | "Costs vary" disclaimers | 5 corridors from 2.1% to 8.78% with real bank names |

This tool pairs with my [Correspondent Banking Carousel & PDF Cheat Sheet](https://www.linkedin.com/in/sivasub987/) on LinkedIn — learn the concepts visually, then simulate real flows here.

---

## ✨ Features

### 🔄 Interactive Flow Simulator
- **5 pre-configured corridors** — SGD→GBP, USD→NGN, INR→USD, AED→PHP, JPY→MXN with realistic bank chains
- **Bidirectional message flows** — Forward (pacs.008 credit transfers) and backward (pacs.002 status reports, camt.054 nostro notifications)
- **Step-by-step animation** — Play/Pause/Next/Reset with 2.5s auto-advance
- **Mobile-responsive SVG** — Auto-scrolls to active bank node on smaller screens
- **Configurable amount** — Change the transfer amount and see fee impact in real time

### 📨 ISO 20022 Message Display
- **Real XML snippets** per step — derived from the official pacs.008.001.13 and pacs.002.001.14 XSD schemas
- **UETR tracking** — Unique End-to-End Transaction Reference shown in every message
- **BIC codes** — Real SWIFT BICs for all banks (DBSSSGSG, HSBCSGSG, CHASUS33, etc.)
- **Charges information** — ChrgsInf elements showing fee deduction at each hop

### 📊 Live Data Panels
- **Fee deduction** — Amount deducted at each intermediary
- **FX conversion** — Rate and spread at conversion points
- **Nostro actions** — Debit/credit with account identifiers
- **Duration estimates** — Per-hop timing including time zone effects
- **Summary stats** — Total fees, FX spread, amount received, cost percentage

### 🎓 Learn Tab
- **How correspondent banking works** — Nostro/vostro mechanics explained
- **$794 billion trapped liquidity** — Pre-funded nostro capital globally (Industry estimate, BIS CPMI data, 2016)
- **ISO 20022 message reference** — pacs.008, pacs.009, pacs.002, camt.054, camt.056 with purposes
- **SWIFT gpi & UETR** — Real-time tracking explained
- **Time zone & settlement windows** — Why overnight gaps add 12+ hours
- **Cost drivers** — Chain length, FX spread, compliance costs, trapped liquidity

### 📋 Reference Tab
- **Settlement stack comparison** — Correspondent banking vs card networks vs IPS vs stablecoins vs tokenized deposits
- **Corridor cost comparison** — 7 corridors from USA→UK (1.5%) to USA→Nigeria (8.78%)
- **ISO 20022 message families** — pacs, camt, pain, acmt, reda with MT equivalents

---

## 🏗 Architecture

```
┌──────────────────────────────────────────────────────────┐
│                   Browser (Client-Side Only)              │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │  App.tsx     │  │ corridors.ts │  │  index.css     │  │
│  │  3-tab UI    │  │ 5 corridors  │  │  Brand tokens  │  │
│  │  SVG flow    │  │ + ISO 20022  │  │  Brut-card     │  │
│  │  + controls  │  │ XML snippets │  │  + animations  │  │
│  └──────┬──────┘  └──────┬───────┘  └───────┬────────┘  │
│         │                │                   │            │
│  ┌──────▼──────┐  ┌──────▼───────┐                       │
│  │  main.tsx   │  │  Mantine 7   │                       │
│  │  Entry      │  │  UI library  │                       │
│  └─────────────┘  └──────────────┘                       │
│                                                           │
│  No backend. No API calls. Everything runs in your browser│
└──────────────────────────────────────────────────────────┘
```

This is a **zero-backend, client-side application**. Your data never leaves the browser — there are no API calls, no server processing, and no data collection.

---

## 📂 Project Structure

```
correspondent-banking-simulator/
├── src/
│   ├── App.tsx            # Main component: 3 tabs, SVG flow, step controls, panels
│   ├── corridors.ts       # 5 corridors with banks, steps, ISO 20022 XML, FX data
│   ├── index.css          # Brand design tokens, brut-card system, flow styles
│   ├── main.tsx           # React entry point with Mantine provider
│   └── vite-env.d.ts      # Vite TypeScript declarations
├── index.html             # HTML entry with SEO meta tags
├── vite.config.ts         # Vite config with GitHub Pages base path
├── tsconfig.json          # TypeScript strict configuration
├── postcss.config.cjs     # PostCSS for Mantine
└── package.json           # Dependencies (React 19, Mantine 7, Vite 6)
```

---

## 🛠 Local Development

### Prerequisites
- Node.js 18+
- npm or yarn

### Quick Start
```bash
git clone https://github.com/siva-sub/correspondent-banking-simulator.git
cd correspondent-banking-simulator
npm install
npm run dev
```

Open `http://localhost:5173/correspondent-banking-simulator/` and select a corridor.

### Build for Production
```bash
npm run build
```

Output goes to `dist/` — deploy to any static host (GitHub Pages, Netlify, Vercel).

---

## 🌐 Corridor Data

| Corridor | Route | Banks | Cost | Time | Key Detail |
|----------|-------|-------|------|------|------------|
| 🇸🇬→🇬🇧 | SGD → GBP | DBS → HSBC SG → HSBC London → Barclays | 2.1% | 12-24 hrs | Direct bank bridge |
| 🇺🇸→🇳🇬 | USD → NGN | JPMorgan → Citi → StanChart → GTBank | 8.78% | 48-96 hrs | De-risking corridor |
| 🇮🇳→🇺🇸 | INR → USD | SBI → Deutsche → Wells Fargo | 5.12% | 12-24 hrs | RBI LRS compliance |
| 🇦🇪→🇵🇭 | AED → PHP | Emirates NBD → StanChart → BDO | 3.45% | 24-48 hrs | OFW remittance |
| 🇯🇵→🇲🇽 | JPY → MXN | MUFG → HSBC → Citi → BBVA | 4.2% | 36-72 hrs | Double FX conversion |

---

## 🔧 Technology Stack

| Component | Technology |
|-----------|-----------| 
| **Framework** | React 19, TypeScript 5.7 |
| **UI Library** | Mantine 7.17, Tabler Icons |
| **Build Tool** | Vite 6 |
| **Styling** | CSS design tokens, brut-card system |
| **Deployment** | GitHub Pages (static SPA) |
| **Design System** | "Learn with Siva" brand (DM Sans, Inter, JetBrains Mono) |

---

## 📖 References & Data Sources

| Data | Source |
|------|--------|
| ISO 20022 message structures | [ISO 20022](https://www.iso20022.org/) — pacs.008.001.13, pacs.002.001.14 XSD schemas |
| Trapped liquidity ($794B) | Industry estimate widely cited in BIS CPMI and FSB reports on correspondent banking (2016 baseline data) |
| Corridor cost data | [World Bank Remittance Prices Worldwide](https://remittanceprices.worldbank.org/) Q4 2024 |
| SWIFT gpi statistics | [SWIFT gpi](https://www.swift.com/our-solutions/swift-gpi) — 50% credited within 30 minutes |
| ISO 20022 migration | [SWIFT ISO 20022](https://www.swift.com/standards/iso-20022) — MT→MX migration complete Nov 2025 |
| BIC codes | [SWIFT BIC Directory](https://www.swift.com/standards/data-standards/bic-business-identifier-code) |
| Bank names & corridors | Derived from public correspondent banking relationships |
| Settlement stack comparison | BIS Innovation Hub, FSB Cross-Border Payments Roadmap |
| G20 remittance targets | [FSB G20 Roadmap](https://www.fsb.org/work-of-the-fsb/financial-innovation-and-structural-change/cross-border-payments/) |

---

## Disclaimer

This is a **portfolio project / educational tool**. It visualizes how correspondent banking works using realistic but simplified data. It does not connect to any payment network, process real transactions, or represent any financial institution's actual routing decisions.

---

## 👤 About the Author

**Sivasubramanian Ramanathan**
*Product Owner | Fintech, Payments & Digital Innovation*
*Ex-BIS Innovation Hub Singapore*

Building at the intersection of payments infrastructure and AI. Open for roles in Product Management, Fintech, Payments, and Digital Assets.

[![LinkedIn](https://img.shields.io/badge/LinkedIn-sivasub987-blue?logo=linkedin)](https://www.linkedin.com/in/sivasub987)
[![Website](https://img.shields.io/badge/Website-sivasub.com-green?logo=google-chrome)](https://www.sivasub.com)
[![GitHub](https://img.shields.io/badge/GitHub-siva--sub-black?logo=github)](https://github.com/siva-sub)

---

## 📄 License

MIT License © 2026 [Siva Subramanian](https://sivasub.com)

---

Built with ❤️ for the payments community.

[siva-sub.github.io/correspondent-banking-simulator/](https://siva-sub.github.io/correspondent-banking-simulator/)
