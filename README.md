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
- **Serial / Cover toggle** — Switch between settlement methods per corridor; serial (INDA) shows hop-by-hop pacs.008, cover (COVE) shows direct pacs.008 instruction + parallel pacs.009 COV settlement chain
- **Cover method visualization** — pacs.008 instruction arcs DIRECT from originator to beneficiary bank (dashed arc with "DIRECT" label), while pacs.009 COV settlement flows through the correspondent chain
- **Bidirectional message flows** — Forward (pacs.008 + pacs.009 COV) and backward (pacs.002 status reports)
- **Step-by-step animation** — Play/Pause/Next/Reset with 2.5s auto-advance
- **Mobile-responsive SVG** — Auto-scrolls to active bank node on smaller screens
- **Configurable amount** — Change the transfer amount and see fee impact in real time

### 📨 ISO 20022 Message Display
- **XSD-validated XML snippets** per step — validated against official pacs.008.001.13, pacs.009.001.13, pacs.002.001.15, and camt.054.001.13 XSD schemas using automated lxml validation
- **Mandatory elements enforced** — `Dbtr`/`Cdtr` party details with realistic entity names, `GrpHdr` where required, correct `xs:sequence` element ordering
- **Cover method messages** — `SttlmMtd=COVE` in pacs.008, `UndrlygCstmrCdtTrf` in pacs.009 COV, party role shifts between instruction and cover legs
- **UETR interlinking** — Same UUID links the direct pacs.008 instruction to the pacs.009 COV settlement chain
- **BIC codes** — Real SWIFT BICs for all banks (DBSSSGSG, HSBCSGSG, CHASUS33, etc.)
- **Charges information** — ChrgsInf elements showing fee deduction at each hop

### 📊 Live Data Panels
- **Fee deduction** — Amount deducted at each intermediary
- **FX conversion** — Rate and spread at conversion points
- **Nostro actions** — Debit/credit with account identifiers
- **Duration estimates** — Per-hop timing including time zone effects
- **Summary stats** — Total fees, FX spread, amount received, cost percentage

### 🎓 Learn Tab
- **How correspondent banking works** — Nostro/vostro mechanics and trapped liquidity ($794B, BIS CPMI 2016)
- **Serial method deep dive** — SttlmMtd=INDA, hop-by-hop pacs.008 flow, legacy MT 103 equivalent
- **Cover method deep dive** — SttlmMtd=COVE, parallel legs (instruction + settlement), party role shift table from [SWIFT PDF](https://www.swift.com/swift-resource/248681/download) p.34 (Debtor Agent → Debtor, Creditor Agent → Creditor)
- **When to choose Serial vs Cover** — 6-factor comparison table + side-by-side scenario cards
- **ISO 20022 message reference** — pacs.008, pacs.009, pacs.002, camt.054, camt.056 with "Used In" column (Serial+Cover / Cover COV / Both / Exception)
- **SWIFT gpi & UETR** — Real-time tracking, same UETR interlinks pacs.008 and pacs.009 COV
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
| 🇸🇬→🇬🇧 | SGD → GBP | DBS → HSBC SG → HSBC London → Barclays | 2.1% | 24-48 hrs | Cover method: direct pacs.008 + COV chain |
| 🇺🇸→🇳🇬 | USD → NGN | JPMorgan → Citi → StanChart → GTBank | 8.78% | 48-96 hrs | High-risk corridor, enhanced KYC |
| 🇮🇳→🇺🇸 | INR → USD | SBI → Deutsche Mumbai → Deutsche NY → Wells Fargo | 5.12% | 12-24 hrs | RBI LRS compliance, intra-group routing |
| 🇦🇪→🇵🇭 | AED → PHP | Emirates NBD → StanChart Dubai → StanChart Manila → BDO | 3.45% | 24-48 hrs | OFW remittance corridor |
| 🇯🇵→🇲🇽 | JPY → MXN | MUFG → HSBC Tokyo → HSBC NY → BBVA | 4.2% | 36-72 hrs | Double FX (JPY→USD→MXN) |

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
| ISO 20022 message structures | [ISO 20022](https://www.iso20022.org/) — pacs.008.001.13, pacs.009.001.13, pacs.002.001.15, camt.054.001.13 XSD schemas |
| Cover method specification | [SWIFT ISO 20022 Programme](https://www.swift.com/swift-resource/248681/download) — p.34-36 cover method deep dive |
| Trapped liquidity ($794B) | Industry estimate widely cited in BIS CPMI and FSB reports on correspondent banking (2016 baseline data) |
| Corridor cost data | [World Bank Remittance Prices Worldwide](https://remittanceprices.worldbank.org/) Q4 2024 |
| SWIFT gpi statistics | [SWIFT gpi](https://www.swift.com/products/swift-gpi) — 60% credited within 30 minutes |
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
