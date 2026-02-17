// ─── Corridor Data: 5 Pre-configured Cross-Border Payment Corridors ──────
// Each corridor models a realistic correspondent banking chain with
// bidirectional ISO 20022 messages (forward + backward status reports)

export interface Bank {
    name: string;
    bic: string;
    country: string;
    countryCode: string;
    role: 'originator' | 'correspondent' | 'intermediary' | 'beneficiary';
}

export interface Step {
    id: number;
    from: number;       // bank index
    to: number;         // bank index
    direction: 'forward' | 'backward';
    messageType: string; // e.g., 'pacs.008', 'pacs.002', 'camt.054'
    messageName: string;
    description: string;
    duration: string;    // e.g., '~2 min', '4-8 hrs'
    fee?: number;        // fee deducted at this step (in source currency)
    fxRate?: number;     // FX conversion happens here
    fxFrom?: string;
    fxTo?: string;
    nostroAction?: string; // e.g., 'Debit SGD nostro', 'Credit GBP nostro'
    xmlSnippet: string;  // Realistic ISO 20022 XML snippet
    detail: string;      // What happens at this step
}

export interface Corridor {
    id: string;
    name: string;
    senderCountry: string;
    senderFlag: string;
    receiverCountry: string;
    receiverFlag: string;
    sourceCurrency: string;
    targetCurrency: string;
    defaultAmount: number;
    fxRate: number;
    fxSpread: string;
    totalCostPct: string;
    settlementTime: string;
    banks: Bank[];
    steps: Step[];
}

const UETR = 'e8b7a4c2-9d3f-4e1a-b5c6-8f2d7a3e9b1c';

export const CORRIDORS: Corridor[] = [
    // ─── SGD → GBP (Singapore → London) ────────────────────────
    {
        id: 'sgd-gbp',
        name: 'Singapore → London',
        senderCountry: 'Singapore',
        senderFlag: '🇸🇬',
        receiverCountry: 'United Kingdom',
        receiverFlag: '🇬🇧',
        sourceCurrency: 'SGD',
        targetCurrency: 'GBP',
        defaultAmount: 50000,
        fxRate: 0.5812,
        fxSpread: '0.35%',
        totalCostPct: '2.1%',
        settlementTime: '24-48 hrs',
        banks: [
            { name: 'DBS Bank', bic: 'DBSSSGSG', country: 'Singapore', countryCode: 'SG', role: 'originator' },
            { name: 'HSBC', bic: 'HSBCSGSG', country: 'Singapore', countryCode: 'SG', role: 'correspondent' },
            { name: 'HSBC London', bic: 'HSBCGB2L', country: 'United Kingdom', countryCode: 'GB', role: 'intermediary' },
            { name: 'Barclays', bic: 'BARCGB22', country: 'United Kingdom', countryCode: 'GB', role: 'beneficiary' },
        ],
        steps: [
            {
                id: 1, from: 0, to: 1, direction: 'forward',
                messageType: 'pacs.008.001.13', messageName: 'FI to FI Customer Credit Transfer',
                description: 'DBS initiates transfer to HSBC Singapore',
                duration: '~2 min', fee: 35,
                nostroAction: 'Debit: DBS debits customer SGD account',
                xmlSnippet: `<FIToFICstmrCdtTrf>
  <GrpHdr>
    <MsgId>DBS-2026021800001</MsgId>
    <CreDtTm>2026-02-18T09:15:00+08:00</CreDtTm>
    <NbOfTxs>1</NbOfTxs>
    <SttlmInf><SttlmMtd>INDA</SttlmMtd></SttlmInf>
    <InstgAgt><FinInstnId><BICFI>DBSSSGSG</BICFI></FinInstnId></InstgAgt>
    <InstdAgt><FinInstnId><BICFI>HSBCSGSG</BICFI></FinInstnId></InstdAgt>
  </GrpHdr>
  <CdtTrfTxInf>
    <PmtId>
      <InstrId>DBS-INS-0001</InstrId>
      <EndToEndId>E2E-SGD-GBP-001</EndToEndId>
      <UETR>${UETR}</UETR>
    </PmtId>
    <IntrBkSttlmAmt Ccy="SGD">50000.00</IntrBkSttlmAmt>
    <ChrgBr>SHAR</ChrgBr>
    <DbtrAgt><FinInstnId><BICFI>DBSSSGSG</BICFI></FinInstnId></DbtrAgt>
    <CdtrAgt><FinInstnId><BICFI>BARCGB22</BICFI></FinInstnId></CdtrAgt>
  </CdtTrfTxInf>
</FIToFICstmrCdtTrf>`,
                detail: 'DBS validates KYC/AML, debits sender account, generates UETR, sends pacs.008 to correspondent HSBC Singapore via SWIFT network.',
            },
            {
                id: 2, from: 1, to: 0, direction: 'backward',
                messageType: 'pacs.002.001.15', messageName: 'Payment Status Report',
                description: 'HSBC Singapore acknowledges receipt',
                duration: '~30 sec',
                xmlSnippet: `<FIToFIPmtStsRpt>
  <GrpHdr>
    <MsgId>HSBC-STS-0001</MsgId>
    <CreDtTm>2026-02-18T09:15:30+08:00</CreDtTm>
  </GrpHdr>
  <TxInfAndSts>
    <OrgnlEndToEndId>E2E-SGD-GBP-001</OrgnlEndToEndId>
    <OrgnlUETR>${UETR}</OrgnlUETR>
    <TxSts>ACSP</TxSts>
    <StsRsnInf><Rsn><Cd>G000</Cd></Rsn></StsRsnInf>
  </TxInfAndSts>
</FIToFIPmtStsRpt>`,
                detail: 'HSBC Singapore sends ACSP (Accepted Settlement in Process) status back to DBS. The UETR links this confirmation to the original payment.',
            },
            {
                id: 3, from: 1, to: 2, direction: 'forward',
                messageType: 'pacs.008.001.13', messageName: 'FI to FI Customer Credit Transfer',
                description: 'HSBC SG forwards to HSBC London',
                duration: '4-8 hrs', fee: 25,
                fxRate: 0.5812, fxFrom: 'SGD', fxTo: 'GBP',
                nostroAction: 'Debit: HSBC SG nostro (SGD) → Credit: HSBC London nostro (GBP)',
                xmlSnippet: `<CdtTrfTxInf>
  <PmtId>
    <InstrId>HSBC-FWD-0001</InstrId>
    <EndToEndId>E2E-SGD-GBP-001</EndToEndId>
    <UETR>${UETR}</UETR>
  </PmtId>
  <IntrBkSttlmAmt Ccy="GBP">28985.00</IntrBkSttlmAmt>
  <InstdAmt Ccy="SGD">49965.00</InstdAmt>
  <XchgRate>0.5812</XchgRate>
  <ChrgsInf>
    <Amt Ccy="SGD">25.00</Amt>
    <Agt><FinInstnId><BICFI>HSBCSGSG</BICFI></FinInstnId></Agt>
  </ChrgsInf>
  <InstgAgt><FinInstnId><BICFI>HSBCSGSG</BICFI></FinInstnId></InstgAgt>
  <InstdAgt><FinInstnId><BICFI>HSBCGB2L</BICFI></FinInstnId></InstdAgt>
</CdtTrfTxInf>`,
                detail: 'HSBC Singapore converts SGD→GBP at 0.5812 (mid-market: 0.5832, spread: 0.35%). Deducts £25 correspondent fee. Forwards via intra-group HSBC network to London.',
            },
            {
                id: 4, from: 2, to: 1, direction: 'backward',
                messageType: 'camt.054.001.13', messageName: 'Bank to Customer Debit/Credit Notification',
                description: 'HSBC London confirms nostro credit',
                duration: '~1 min',
                xmlSnippet: `<BkToCstmrDbtCdtNtfctn>
  <Ntfctn>
    <Id>HSBC-NTF-0001</Id>
    <Acct><Id><IBAN>GB29HSBC40120712345678</IBAN></Id></Acct>
    <Ntry>
      <Amt Ccy="GBP">28985.00</Amt>
      <CdtDbtInd>CRDT</CdtDbtInd>
      <Sts><Cd>BOOK</Cd></Sts>
      <NtryDtls><TxDtls><Refs>
        <EndToEndId>E2E-SGD-GBP-001</EndToEndId>
        <UETR>${UETR}</UETR>
      </Refs></TxDtls></NtryDtls>
    </Ntry>
  </Ntfctn>
</BkToCstmrDbtCdtNtfctn>`,
                detail: 'HSBC London sends camt.054 credit notification confirming GBP funds have been booked to the nostro account. This enables HSBC SG to reconcile.',
            },
            {
                id: 5, from: 2, to: 3, direction: 'forward',
                messageType: 'pacs.008.001.13', messageName: 'FI to FI Customer Credit Transfer',
                description: 'HSBC London forwards to Barclays',
                duration: '2-4 hrs', fee: 15,
                nostroAction: 'Debit: HSBC London nostro → Credit: Barclays settlement via CHAPS',
                xmlSnippet: `<CdtTrfTxInf>
  <PmtId>
    <InstrId>HSBC-LDN-0001</InstrId>
    <EndToEndId>E2E-SGD-GBP-001</EndToEndId>
    <UETR>${UETR}</UETR>
  </PmtId>
  <IntrBkSttlmAmt Ccy="GBP">28970.00</IntrBkSttlmAmt>
  <ChrgsInf>
    <Amt Ccy="GBP">15.00</Amt>
    <Agt><FinInstnId><BICFI>HSBCGB2L</BICFI></FinInstnId></Agt>
  </ChrgsInf>
  <InstgAgt><FinInstnId><BICFI>HSBCGB2L</BICFI></FinInstnId></InstgAgt>
  <InstdAgt><FinInstnId><BICFI>BARCGB22</BICFI></FinInstnId></InstdAgt>
  <RmtInf><Ustrd>Payment for services - INV-2026-0042</Ustrd></RmtInf>
</CdtTrfTxInf>`,
                detail: 'HSBC London deducts £15 intermediary fee, settles with Barclays via CHAPS (UK RTGS — immediate finality). Remittance info preserved end-to-end.',
            },
            {
                id: 6, from: 3, to: 2, direction: 'backward',
                messageType: 'pacs.002.001.15', messageName: 'Payment Status Report',
                description: 'Barclays confirms credit to beneficiary',
                duration: '~1 min',
                xmlSnippet: `<FIToFIPmtStsRpt>
  <TxInfAndSts>
    <OrgnlEndToEndId>E2E-SGD-GBP-001</OrgnlEndToEndId>
    <OrgnlUETR>${UETR}</OrgnlUETR>
    <TxSts>ACCC</TxSts>
    <AccptncDtTm>2026-02-18T17:42:00+00:00</AccptncDtTm>
  </TxInfAndSts>
</FIToFIPmtStsRpt>`,
                detail: 'Barclays sends ACCC (Accepted Credit Completed) — beneficiary account credited with £28,970. SWIFT gpi Tracker updated. Total fees: S$35 + S$25 + £15.',
            },
            {
                id: 7, from: 2, to: 0, direction: 'backward',
                messageType: 'pacs.002.001.15', messageName: 'Payment Status Report (End-to-End)',
                description: 'Final confirmation relayed to DBS',
                duration: '~2 min',
                xmlSnippet: `<FIToFIPmtStsRpt>
  <TxInfAndSts>
    <OrgnlEndToEndId>E2E-SGD-GBP-001</OrgnlEndToEndId>
    <OrgnlUETR>${UETR}</OrgnlUETR>
    <TxSts>ACCC</TxSts>
    <ChrgsInf>
      <TtlChrgsAndTaxAmt Ccy="SGD">75.00</TtlChrgsAndTaxAmt>
    </ChrgsInf>
  </TxInfAndSts>
</FIToFIPmtStsRpt>`,
                detail: 'DBS receives final ACCC confirmation via gpi Tracker. Customer notified. Total journey: ~24 hrs. Total fees: SGD 75 + spread. Amount received: £28,970.',
            },
        ],
    },

    // ─── USD → NGN (USA → Nigeria) ─────────────────────────────
    {
        id: 'usd-ngn',
        name: 'USA → Nigeria',
        senderCountry: 'United States',
        senderFlag: '🇺🇸',
        receiverCountry: 'Nigeria',
        receiverFlag: '🇳🇬',
        sourceCurrency: 'USD',
        targetCurrency: 'NGN',
        defaultAmount: 1000,
        fxRate: 1580.50,
        fxSpread: '4.2%',
        totalCostPct: '8.78%',
        settlementTime: '48-96 hrs',
        banks: [
            { name: 'JPMorgan Chase', bic: 'CHASUS33', country: 'United States', countryCode: 'US', role: 'originator' },
            { name: 'Citibank NY', bic: 'CITIUS33', country: 'United States', countryCode: 'US', role: 'correspondent' },
            { name: 'Standard Chartered', bic: 'SCBLGB2L', country: 'United Kingdom', countryCode: 'GB', role: 'intermediary' },
            { name: 'Guaranty Trust Bank', bic: 'GTBINGLA', country: 'Nigeria', countryCode: 'NG', role: 'beneficiary' },
        ],
        steps: [
            {
                id: 1, from: 0, to: 1, direction: 'forward',
                messageType: 'pacs.008.001.13', messageName: 'FI to FI Customer Credit Transfer',
                description: 'JPMorgan initiates USD transfer',
                duration: '~5 min', fee: 45,
                nostroAction: 'Debit: JPM debits sender USD account',
                xmlSnippet: `<CdtTrfTxInf>
  <PmtId><EndToEndId>E2E-USD-NGN-001</EndToEndId>
    <UETR>${UETR}</UETR></PmtId>
  <IntrBkSttlmAmt Ccy="USD">955.00</IntrBkSttlmAmt>
  <ChrgBr>SHAR</ChrgBr>
  <ChrgsInf><Amt Ccy="USD">45.00</Amt>
    <Agt><FinInstnId><BICFI>CHASUS33</BICFI></FinInstnId></Agt></ChrgsInf>
</CdtTrfTxInf>`,
                detail: 'JPMorgan validates enhanced KYC (Nigeria = high-risk corridor), debits $1,000, deducts $45 origination fee. Compliance screening takes ~3 min due to sanctions watchlist checks.',
            },
            {
                id: 2, from: 1, to: 0, direction: 'backward',
                messageType: 'pacs.002.001.15', messageName: 'Payment Status Report',
                description: 'Citi acknowledges receipt',
                duration: '~1 min',
                xmlSnippet: `<TxInfAndSts>
  <OrgnlUETR>${UETR}</OrgnlUETR>
  <TxSts>ACSP</TxSts>
</TxInfAndSts>`,
                detail: 'Citibank confirms ACSP status. Payment enters Citi\'s compliance queue for additional screening (Nigeria corridor requires enhanced due diligence).',
            },
            {
                id: 3, from: 1, to: 2, direction: 'forward',
                messageType: 'pacs.008.001.13', messageName: 'FI to FI Customer Credit Transfer',
                description: 'Citi routes via Standard Chartered (London)',
                duration: '8-24 hrs', fee: 35,
                nostroAction: 'Debit: Citi USD nostro → Credit: StanChart USD nostro',
                xmlSnippet: `<CdtTrfTxInf>
  <PmtId><EndToEndId>E2E-USD-NGN-001</EndToEndId>
    <UETR>${UETR}</UETR></PmtId>
  <IntrBkSttlmAmt Ccy="USD">920.00</IntrBkSttlmAmt>
  <ChrgsInf><Amt Ccy="USD">35.00</Amt>
    <Agt><FinInstnId><BICFI>CITIUS33</BICFI></FinInstnId></Agt></ChrgsInf>
  <InstgAgt><FinInstnId><BICFI>CITIUS33</BICFI></FinInstnId></InstgAgt>
  <InstdAgt><FinInstnId><BICFI>SCBLGB2L</BICFI></FinInstnId></InstdAgt>
</CdtTrfTxInf>`,
                detail: 'Citi deducts $35 correspondent fee. Routes via London (StanChart) because no direct Citi→GTBank relationship exists. Settlement via Fedwire for USD leg. Time zone delay: NY→London.',
            },
            {
                id: 4, from: 2, to: 3, direction: 'forward',
                messageType: 'pacs.008.001.13', messageName: 'FI to FI Customer Credit Transfer',
                description: 'StanChart converts USD→NGN, forwards to GTBank',
                duration: '12-48 hrs', fee: 25,
                fxRate: 1580.50, fxFrom: 'USD', fxTo: 'NGN',
                nostroAction: 'Debit: StanChart USD → Credit: GTBank NGN nostro',
                xmlSnippet: `<CdtTrfTxInf>
  <PmtId><EndToEndId>E2E-USD-NGN-001</EndToEndId>
    <UETR>${UETR}</UETR></PmtId>
  <IntrBkSttlmAmt Ccy="NGN">1414047.50</IntrBkSttlmAmt>
  <InstdAmt Ccy="USD">895.00</InstdAmt>
  <XchgRate>1580.50</XchgRate>
  <ChrgsInf><Amt Ccy="USD">25.00</Amt>
    <Agt><FinInstnId><BICFI>SCBLGB2L</BICFI></FinInstnId></Agt></ChrgsInf>
</CdtTrfTxInf>`,
                detail: 'StanChart converts at 1,580.50 (mid-market: 1,649.20 — spread 4.2%). $25 fee deducted. NGN settlement depends on CBN clearing hours (Lagos business day). Longest delay in chain.',
            },
            {
                id: 5, from: 3, to: 2, direction: 'backward',
                messageType: 'pacs.002.001.15', messageName: 'Payment Status Report',
                description: 'GTBank confirms beneficiary credit',
                duration: '~5 min',
                xmlSnippet: `<TxInfAndSts>
  <OrgnlUETR>${UETR}</OrgnlUETR>
  <TxSts>ACCC</TxSts>
  <AccptncDtTm>2026-02-20T14:30:00+01:00</AccptncDtTm>
</TxInfAndSts>`,
                detail: 'GTBank credits beneficiary with ₦1,414,047.50. Total journey: 48-96 hrs. Original $1,000 → ₦1,414,047 received. Effective cost: 8.78% ($45+$35+$25 fees + 4.2% FX spread).',
            },
            {
                id: 6, from: 2, to: 0, direction: 'backward',
                messageType: 'pacs.002.001.15', messageName: 'Payment Status Report (End-to-End)',
                description: 'Final ACCC relayed to JPMorgan',
                duration: '~2 min',
                xmlSnippet: `<TxInfAndSts>
  <OrgnlUETR>${UETR}</OrgnlUETR>
  <TxSts>ACCC</TxSts>
  <ChrgsInf><TtlChrgsAndTaxAmt Ccy="USD">105.00</TtlChrgsAndTaxAmt></ChrgsInf>
</TxInfAndSts>`,
                detail: 'JPMorgan receives final confirmation. gpi Tracker shows end-to-end completion. Customer notified: "Your $1,000 transfer to Nigeria is complete."',
            },
        ],
    },

    // ─── INR → USD (India → USA) ───────────────────────────────
    {
        id: 'inr-usd',
        name: 'India → USA',
        senderCountry: 'India',
        senderFlag: '🇮🇳',
        receiverCountry: 'United States',
        receiverFlag: '🇺🇸',
        sourceCurrency: 'INR',
        targetCurrency: 'USD',
        defaultAmount: 500000,
        fxRate: 0.01195,
        fxSpread: '1.8%',
        totalCostPct: '5.12%',
        settlementTime: '12-24 hrs',
        banks: [
            { name: 'State Bank of India', bic: 'SBININBB', country: 'India', countryCode: 'IN', role: 'originator' },
            { name: 'Deutsche Bank Mumbai', bic: 'DEUTINBB', country: 'India', countryCode: 'IN', role: 'correspondent' },
            { name: 'Deutsche Bank NY', bic: 'DEUTUS33', country: 'United States', countryCode: 'US', role: 'intermediary' },
            { name: 'Wells Fargo', bic: 'WFBIUS6S', country: 'United States', countryCode: 'US', role: 'beneficiary' },
        ],
        steps: [
            {
                id: 1, from: 0, to: 1, direction: 'forward',
                messageType: 'pacs.008.001.13', messageName: 'FI to FI Customer Credit Transfer',
                description: 'SBI initiates INR transfer with RBI reporting',
                duration: '~10 min', fee: 2500,
                nostroAction: 'Debit: SBI debits sender INR account',
                xmlSnippet: `<CdtTrfTxInf>
  <PmtId><EndToEndId>E2E-INR-USD-001</EndToEndId>
    <UETR>${UETR}</UETR></PmtId>
  <IntrBkSttlmAmt Ccy="INR">497500.00</IntrBkSttlmAmt>
  <ChrgBr>SHAR</ChrgBr>
  <RgltryRptg><DbtCdtRptgInd>DEBT</DbtCdtRptgInd>
    <Authrty><Nm>Reserve Bank of India</Nm></Authrty></RgltryRptg>
</CdtTrfTxInf>`,
                detail: 'SBI validates LRS (Liberalized Remittance Scheme — $250K/year limit), files Form A2 with RBI, debits ₹5,00,000 and deducts ₹2,500 fee. RBI regulatory reporting attached to pacs.008.',
            },
            {
                id: 2, from: 1, to: 0, direction: 'backward',
                messageType: 'pacs.002.001.15', messageName: 'Payment Status Report',
                description: 'Deutsche Bank Mumbai acknowledges',
                duration: '~1 min',
                xmlSnippet: `<TxInfAndSts><OrgnlUETR>${UETR}</OrgnlUETR><TxSts>ACSP</TxSts></TxInfAndSts>`,
                detail: 'Deutsche Bank Mumbai confirms receipt. Queues for FX conversion at next available fixing window.',
            },
            {
                id: 3, from: 1, to: 2, direction: 'forward',
                messageType: 'pacs.008.001.13', messageName: 'FI to FI Customer Credit Transfer',
                description: 'Deutsche Mumbai converts INR→USD, routes to NY',
                duration: '4-8 hrs', fee: 1500,
                fxRate: 0.01195, fxFrom: 'INR', fxTo: 'USD',
                nostroAction: 'Debit: DB Mumbai INR → Credit: DB NY USD nostro',
                xmlSnippet: `<CdtTrfTxInf>
  <PmtId><EndToEndId>E2E-INR-USD-001</EndToEndId><UETR>${UETR}</UETR></PmtId>
  <IntrBkSttlmAmt Ccy="USD">5927.13</IntrBkSttlmAmt>
  <InstdAmt Ccy="INR">496000.00</InstdAmt>
  <XchgRate>0.01195</XchgRate>
</CdtTrfTxInf>`,
                detail: 'DB Mumbai converts at 0.01195 INR/USD (mid-market: 0.01217, spread: 1.8%). Intra-group transfer to DB New York. Settles through RTGS (India) for INR leg.',
            },
            {
                id: 4, from: 2, to: 3, direction: 'forward',
                messageType: 'pacs.008.001.13', messageName: 'FI to FI Customer Credit Transfer',
                description: 'Deutsche NY forwards to Wells Fargo via Fedwire',
                duration: '2-4 hrs', fee: 12,
                nostroAction: 'Debit: DB NY USD → Credit: Wells Fargo via Fedwire',
                xmlSnippet: `<CdtTrfTxInf>
  <PmtId><EndToEndId>E2E-INR-USD-001</EndToEndId><UETR>${UETR}</UETR></PmtId>
  <IntrBkSttlmAmt Ccy="USD">5915.13</IntrBkSttlmAmt>
  <ChrgsInf><Amt Ccy="USD">12.00</Amt>
    <Agt><FinInstnId><BICFI>DEUTUS33</BICFI></FinInstnId></Agt></ChrgsInf>
</CdtTrfTxInf>`,
                detail: 'DB New York settles with Wells Fargo via Fedwire ($2T/day RTGS — immediate finality). $12 wire fee. Domestic USD settlement is fast.',
            },
            {
                id: 5, from: 3, to: 0, direction: 'backward',
                messageType: 'pacs.002.001.15', messageName: 'Payment Status Report',
                description: 'Wells Fargo confirms credit, relayed to SBI',
                duration: '~3 min',
                xmlSnippet: `<TxInfAndSts><OrgnlUETR>${UETR}</OrgnlUETR><TxSts>ACCC</TxSts>
  <AccptncDtTm>2026-02-18T18:15:00-05:00</AccptncDtTm></TxInfAndSts>`,
                detail: 'Wells Fargo credits beneficiary with $5,915.13. Confirmation relayed end-to-end. Total: ₹5,00,000 sent → $5,915.13 received (5.12% cost including FX spread + fees).',
            },
        ],
    },

    // ─── AED → PHP (UAE → Philippines) ─────────────────────────
    {
        id: 'aed-php',
        name: 'UAE → Philippines',
        senderCountry: 'UAE',
        senderFlag: '🇦🇪',
        receiverCountry: 'Philippines',
        receiverFlag: '🇵🇭',
        sourceCurrency: 'AED',
        targetCurrency: 'PHP',
        defaultAmount: 5000,
        fxRate: 15.24,
        fxSpread: '2.1%',
        totalCostPct: '3.45%',
        settlementTime: '24-48 hrs',
        banks: [
            { name: 'Emirates NBD', bic: 'ABORAEADXXX', country: 'UAE', countryCode: 'AE', role: 'originator' },
            { name: 'Standard Chartered Dubai', bic: 'SCBLAEAD', country: 'UAE', countryCode: 'AE', role: 'correspondent' },
            { name: 'Standard Chartered Manila', bic: 'SCBLPHMM', country: 'Philippines', countryCode: 'PH', role: 'intermediary' },
            { name: 'BDO Unibank', bic: 'ABORPHMM', country: 'Philippines', countryCode: 'PH', role: 'beneficiary' },
        ],
        steps: [
            {
                id: 1, from: 0, to: 1, direction: 'forward',
                messageType: 'pacs.008.001.13', messageName: 'FI to FI Customer Credit Transfer',
                description: 'Emirates NBD initiates remittance',
                duration: '~5 min', fee: 25,
                nostroAction: 'Debit: ENBD debits sender AED account',
                xmlSnippet: `<CdtTrfTxInf>
  <PmtId><EndToEndId>E2E-AED-PHP-001</EndToEndId><UETR>${UETR}</UETR></PmtId>
  <IntrBkSttlmAmt Ccy="AED">4975.00</IntrBkSttlmAmt>
  <Purp><Cd>BEXP</Cd></Purp>
</CdtTrfTxInf>`,
                detail: 'Emirates NBD processes remittance (UAE→PH is a major OFW corridor — 2.1M Filipino workers in UAE). Purpose code BEXP (Business Expenses). AED 25 originator fee.',
            },
            {
                id: 2, from: 1, to: 2, direction: 'forward',
                messageType: 'pacs.008.001.13', messageName: 'FI to FI Customer Credit Transfer',
                description: 'StanChart Dubai routes to StanChart Manila',
                duration: '8-16 hrs', fee: 18,
                fxRate: 15.24, fxFrom: 'AED', fxTo: 'PHP',
                nostroAction: 'Debit: StanChart AED nostro → Credit: StanChart PHP nostro',
                xmlSnippet: `<CdtTrfTxInf>
  <PmtId><EndToEndId>E2E-AED-PHP-001</EndToEndId><UETR>${UETR}</UETR></PmtId>
  <IntrBkSttlmAmt Ccy="PHP">75518.52</IntrBkSttlmAmt>
  <InstdAmt Ccy="AED">4957.00</InstdAmt>
  <XchgRate>15.24</XchgRate>
</CdtTrfTxInf>`,
                detail: 'Intra-group StanChart routing. FX at 15.24 (mid: 15.56, spread 2.1%). AED 18 fee. Time zone overlap is good (Dubai GMT+4, Manila GMT+8) but BSP clearing hours apply.',
            },
            {
                id: 3, from: 2, to: 3, direction: 'forward',
                messageType: 'pacs.008.001.13', messageName: 'FI to FI Customer Credit Transfer',
                description: 'StanChart Manila credits BDO via PhilPaSS',
                duration: '2-4 hrs', fee: 10,
                nostroAction: 'Debit: StanChart PHP → Credit: BDO via PhilPaSS (RTGS)',
                xmlSnippet: `<CdtTrfTxInf>
  <PmtId><EndToEndId>E2E-AED-PHP-001</EndToEndId><UETR>${UETR}</UETR></PmtId>
  <IntrBkSttlmAmt Ccy="PHP">75008.52</IntrBkSttlmAmt>
</CdtTrfTxInf>`,
                detail: 'StanChart Manila settles with BDO via PhilPaSS (Philippine Payment and Settlement System — domestic RTGS). ₱510 fee (~$10). Domestic leg is fast.',
            },
            {
                id: 4, from: 3, to: 0, direction: 'backward',
                messageType: 'pacs.002.001.15', messageName: 'Payment Status Report',
                description: 'BDO confirms credit, relayed to Emirates NBD',
                duration: '~3 min',
                xmlSnippet: `<TxInfAndSts><OrgnlUETR>${UETR}</OrgnlUETR><TxSts>ACCC</TxSts></TxInfAndSts>`,
                detail: 'BDO credits beneficiary ₱75,008.52. OFW family receives funds. AED 5,000 sent → ₱75,008 received. Cost: 3.45%. Compared to GCash/Wise: ~1.0% and instant.',
            },
        ],
    },

    // ─── JPY → MXN (Japan → Mexico) ───────────────────────────
    {
        id: 'jpy-mxn',
        name: 'Japan → Mexico',
        senderCountry: 'Japan',
        senderFlag: '🇯🇵',
        receiverCountry: 'Mexico',
        receiverFlag: '🇲🇽',
        sourceCurrency: 'JPY',
        targetCurrency: 'MXN',
        defaultAmount: 1000000,
        fxRate: 0.1142,
        fxSpread: '2.8%',
        totalCostPct: '4.2%',
        settlementTime: '36-72 hrs',
        banks: [
            { name: 'MUFG Bank', bic: 'BOTKJPJT', country: 'Japan', countryCode: 'JP', role: 'originator' },
            { name: 'HSBC Tokyo', bic: 'HSBCJPJT', country: 'Japan', countryCode: 'JP', role: 'correspondent' },
            { name: 'HSBC New York', bic: 'MRMDUS33', country: 'United States', countryCode: 'US', role: 'intermediary' },
            { name: 'BBVA México', bic: 'BCMRMXMM', country: 'Mexico', countryCode: 'MX', role: 'beneficiary' },
        ],
        steps: [
            {
                id: 1, from: 0, to: 1, direction: 'forward',
                messageType: 'pacs.008.001.13', messageName: 'FI to FI Customer Credit Transfer',
                description: 'MUFG initiates ¥1,000,000 transfer',
                duration: '~5 min', fee: 5500,
                nostroAction: 'Debit: MUFG debits sender JPY account',
                xmlSnippet: `<CdtTrfTxInf>
  <PmtId><EndToEndId>E2E-JPY-MXN-001</EndToEndId><UETR>${UETR}</UETR></PmtId>
  <IntrBkSttlmAmt Ccy="JPY">994500.00</IntrBkSttlmAmt>
  <ChrgBr>SHAR</ChrgBr>
</CdtTrfTxInf>`,
                detail: 'MUFG (Japan\'s largest bank) initiates via BOJ-NET (RTGS). ¥5,500 originator fee. JPY→MXN is an exotic cross requiring USD intermediation (no direct JPY/MXN market).',
            },
            {
                id: 2, from: 1, to: 2, direction: 'forward',
                messageType: 'pacs.008.001.13', messageName: 'FI to FI Customer Credit Transfer',
                description: 'HSBC Tokyo converts JPY→USD, routes via NY',
                duration: '8-16 hrs', fee: 4000,
                fxRate: 0.006557, fxFrom: 'JPY', fxTo: 'USD',
                nostroAction: 'Debit: HSBC JPY nostro → Credit: HSBC NY USD nostro',
                xmlSnippet: `<CdtTrfTxInf>
  <PmtId><EndToEndId>E2E-JPY-MXN-001</EndToEndId><UETR>${UETR}</UETR></PmtId>
  <IntrBkSttlmAmt Ccy="USD">6492.14</IntrBkSttlmAmt>
  <InstdAmt Ccy="JPY">990500.00</InstdAmt>
  <XchgRate>0.006557</XchgRate>
</CdtTrfTxInf>`,
                detail: 'First FX hop: JPY→USD at 0.006557. Exotic pair requires two conversions (JPY→USD→MXN). Time zone gap: Tokyo closes at 15:00 JST, NY opens at 09:00 EST — potential overnight delay.',
            },
            {
                id: 3, from: 2, to: 3, direction: 'forward',
                messageType: 'pacs.008.001.13', messageName: 'FI to FI Customer Credit Transfer',
                description: 'HSBC NY converts USD→MXN, forwards to BBVA',
                duration: '12-24 hrs', fee: 2000,
                fxRate: 17.41, fxFrom: 'USD', fxTo: 'MXN',
                nostroAction: 'Debit: HSBC NY USD → Credit: BBVA via SPEI (Mexico RTGS)',
                xmlSnippet: `<CdtTrfTxInf>
  <PmtId><EndToEndId>E2E-JPY-MXN-001</EndToEndId><UETR>${UETR}</UETR></PmtId>
  <IntrBkSttlmAmt Ccy="MXN">112367.48</IntrBkSttlmAmt>
  <InstdAmt Ccy="USD">6452.14</InstdAmt>
  <XchgRate>17.41</XchgRate>
</CdtTrfTxInf>`,
                detail: 'Second FX hop: USD→MXN at 17.41. Settlement via SPEI (Mexico\'s RTGS — operates 07:00-17:30 CST). Combined FX spread: 2.8% across two conversions. $40 HSBC fee.',
            },
            {
                id: 4, from: 3, to: 0, direction: 'backward',
                messageType: 'pacs.002.001.15', messageName: 'Payment Status Report',
                description: 'BBVA confirms credit, relayed to MUFG',
                duration: '~5 min',
                xmlSnippet: `<TxInfAndSts><OrgnlUETR>${UETR}</OrgnlUETR><TxSts>ACCC</TxSts></TxInfAndSts>`,
                detail: 'BBVA credits MX$112,367.48. Journey: 36-72 hrs spanning 3 time zones (JST→EST→CST). ¥1,000,000 → MX$112,367. Cost: 4.2%. Two FX conversions doubled the spread.',
            },
        ],
    },
];

// Helper: calculate running totals for a corridor simulation
export function simulateCorridor(corridor: Corridor, amount: number) {
    let currentAmount = amount;
    const currency = corridor.sourceCurrency;
    const steps = corridor.steps.map(step => {
        let amountBefore = currentAmount;
        if (step.fee && step.direction === 'forward') {
            currentAmount -= step.fee;
        }
        let convertedAmount: number | undefined;
        if (step.fxRate && step.direction === 'forward') {
            convertedAmount = currentAmount * step.fxRate;
        }
        return {
            ...step,
            amountBefore,
            amountAfter: step.fxRate ? convertedAmount! : currentAmount,
            runningCurrency: step.fxTo || currency,
        };
    });
    return steps;
}
