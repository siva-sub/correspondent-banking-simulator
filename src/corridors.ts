// ─── Corridor Data: 5 Pre-configured Cross-Border Payment Corridors ──────
// Each corridor models a realistic correspondent banking chain with
// bidirectional ISO 20022 messages (forward + backward status reports)
//
// XSD Compliance Notes (pacs.008.001.13 / pacs.002.001.15 / camt.054.001.13):
// - CdtTrfTxInf follows strict xs:sequence from CreditTransferTransaction70
//   Order: PmtId → IntrBkSttlmAmt → InstdAmt → XchgRate → ChrgBr → ChrgsInf → InstgAgt → InstdAgt → Dbtr → DbtrAcct → DbtrAgt → CdtrAgt → Cdtr → CdtrAcct → Purp → RmtInf → RgltryRptg
// - ChrgBr is MANDATORY in pacs.008 (ChargeBearerType1Code: DEBT|CRED|SHAR|SLEV)
// - FIToFIPmtStsRpt requires mandatory GrpHdr with MsgId + CreDtTm
// - TxInfAndSts (PaymentTransaction164) order: OrgnlEndToEndId → OrgnlUETR → TxSts → StsRsnInf → ChrgsInf → AccptncDtTm
// - Charges16 = Amt + Agt (+ optional Tp). NOT TtlChrgsAndTaxAmt.
// - camt.054 ReportEntry15 requires mandatory BkTxCd element

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
  xmlSnippet: string;  // ISO 20022 XML snippet (XSD-compliant element ordering)
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
  serialSteps: Step[];
  coverSteps: Step[];
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
    serialSteps: [
      {
        id: 1, from: 0, to: 1, direction: 'forward',
        messageType: 'pacs.008.001.13', messageName: 'FI to FI Customer Credit Transfer',
        description: 'DBS forwards pacs.008 to HSBC Singapore',
        duration: '~2 min', fee: 35,
        nostroAction: 'Debit: DBS debits customer SGD account',
        xmlSnippet: `<CdtTrfTxInf>
  <PmtId>
    <InstrId>DBS-INS-0001</InstrId>
    <EndToEndId>E2E-SGD-GBP-001</EndToEndId>
    <UETR>${UETR}</UETR>
  </PmtId>
  <IntrBkSttlmAmt Ccy="SGD">50000.00</IntrBkSttlmAmt>
  <ChrgBr>SHAR</ChrgBr>
  <ChrgsInf>
    <Amt Ccy="SGD">35.00</Amt>
    <Agt><FinInstnId><BICFI>DBSSSGSG</BICFI></FinInstnId></Agt>
  </ChrgsInf>
  <InstgAgt><FinInstnId><BICFI>DBSSSGSG</BICFI></FinInstnId></InstgAgt>
  <InstdAgt><FinInstnId><BICFI>HSBCSGSG</BICFI></FinInstnId></InstdAgt>
  <Dbtr>
    <Nm>Acme Trading Pte Ltd</Nm>
    <PstlAdr><Ctry>SG</Ctry></PstlAdr>
  </Dbtr>
  <DbtrAgt><FinInstnId><BICFI>DBSSSGSG</BICFI></FinInstnId></DbtrAgt>
  <CdtrAgt><FinInstnId><BICFI>BARCGB22</BICFI></FinInstnId></CdtrAgt>
  <Cdtr>
    <Nm>Crown and Co Solicitors</Nm>
    <PstlAdr><Ctry>GB</Ctry></PstlAdr>
  </Cdtr>
</CdtTrfTxInf>`,
        detail: 'Serial method: DBS validates KYC/AML, debits sender, deducts SGD 35 origination fee. pacs.008 forwarded hop-by-hop to HSBC SG (SttlmMtd=INDA). CdtrAgt identifies Barclays as final destination.',
      },
      {
        id: 2, from: 1, to: 2, direction: 'forward',
        messageType: 'pacs.008.001.13', messageName: 'FI to FI Customer Credit Transfer',
        description: 'HSBC SG converts SGD→GBP, forwards to HSBC London',
        duration: '4-8 hrs', fee: 25,
        fxRate: 0.5812, fxFrom: 'SGD', fxTo: 'GBP',
        nostroAction: 'Debit: HSBC SG nostro (SGD) → Credit: HSBC London nostro (GBP)',
        xmlSnippet: `<CdtTrfTxInf>
  <PmtId>
    <InstrId>HSBC-SG-0001</InstrId>
    <EndToEndId>E2E-SGD-GBP-001</EndToEndId>
    <UETR>${UETR}</UETR>
  </PmtId>
  <IntrBkSttlmAmt Ccy="GBP">28985.00</IntrBkSttlmAmt>
  <InstdAmt Ccy="SGD">49965.00</InstdAmt>
  <XchgRate>0.5812</XchgRate>
  <ChrgBr>SHAR</ChrgBr>
  <ChrgsInf>
    <Amt Ccy="SGD">25.00</Amt>
    <Agt><FinInstnId><BICFI>HSBCSGSG</BICFI></FinInstnId></Agt>
  </ChrgsInf>
  <InstgAgt><FinInstnId><BICFI>HSBCSGSG</BICFI></FinInstnId></InstgAgt>
  <InstdAgt><FinInstnId><BICFI>HSBCGB2L</BICFI></FinInstnId></InstdAgt>
  <Dbtr>
    <Nm>Acme Trading Pte Ltd</Nm>
    <PstlAdr><Ctry>SG</Ctry></PstlAdr>
  </Dbtr>
  <DbtrAgt><FinInstnId><BICFI>DBSSSGSG</BICFI></FinInstnId></DbtrAgt>
  <CdtrAgt><FinInstnId><BICFI>BARCGB22</BICFI></FinInstnId></CdtrAgt>
  <Cdtr>
    <Nm>Crown and Co Solicitors</Nm>
    <PstlAdr><Ctry>GB</Ctry></PstlAdr>
  </Cdtr>
</CdtTrfTxInf>`,
        detail: 'Serial method: HSBC SG converts SGD→GBP at 0.5812 (mid: 0.5832, spread 0.35%). Deducts SGD 25 bank processing fee. Forwards the same pacs.008 (with updated amounts) to HSBC London via intra-group network.',
      },
      {
        id: 3, from: 2, to: 3, direction: 'forward',
        messageType: 'pacs.008.001.13', messageName: 'FI to FI Customer Credit Transfer',
        description: 'HSBC London settles with Barclays via CHAPS',
        duration: '2-4 hrs', fee: 15,
        nostroAction: 'Debit: HSBC London nostro → Credit: Barclays settlement via CHAPS',
        xmlSnippet: `<CdtTrfTxInf>
  <PmtId>
    <InstrId>HSBC-LON-0001</InstrId>
    <EndToEndId>E2E-SGD-GBP-001</EndToEndId>
    <UETR>${UETR}</UETR>
  </PmtId>
  <IntrBkSttlmAmt Ccy="GBP">28970.00</IntrBkSttlmAmt>
  <ChrgBr>SHAR</ChrgBr>
  <ChrgsInf>
    <Amt Ccy="GBP">15.00</Amt>
    <Agt><FinInstnId><BICFI>HSBCGB2L</BICFI></FinInstnId></Agt>
  </ChrgsInf>
  <InstgAgt><FinInstnId><BICFI>HSBCGB2L</BICFI></FinInstnId></InstgAgt>
  <InstdAgt><FinInstnId><BICFI>BARCGB22</BICFI></FinInstnId></InstdAgt>
  <Dbtr>
    <Nm>Acme Trading Pte Ltd</Nm>
    <PstlAdr><Ctry>SG</Ctry></PstlAdr>
  </Dbtr>
  <DbtrAgt><FinInstnId><BICFI>DBSSSGSG</BICFI></FinInstnId></DbtrAgt>
  <CdtrAgt><FinInstnId><BICFI>BARCGB22</BICFI></FinInstnId></CdtrAgt>
  <Cdtr>
    <Nm>Crown and Co Solicitors</Nm>
    <PstlAdr><Ctry>GB</Ctry></PstlAdr>
  </Cdtr>
  <RmtInf><Ustrd>Payment for services - INV-2026-0042</Ustrd></RmtInf>
</CdtTrfTxInf>`,
        detail: 'Serial method: HSBC London deducts £15 bank handling fee, settles with Barclays via CHAPS (UK RTGS). Remittance info preserved. Final hop in the serial chain.',
      },
      {
        id: 4, from: 3, to: 2, direction: 'backward',
        messageType: 'pacs.002.001.15', messageName: 'Payment Status Report',
        description: 'Barclays confirms credit to beneficiary',
        duration: '~1 min',
        xmlSnippet: `<FIToFIPmtStsRpt>
  <GrpHdr>
    <MsgId>BARC-STS-0001</MsgId>
    <CreDtTm>2026-02-18T17:42:00+00:00</CreDtTm>
  </GrpHdr>
  <TxInfAndSts>
    <OrgnlEndToEndId>E2E-SGD-GBP-001</OrgnlEndToEndId>
    <OrgnlUETR>${UETR}</OrgnlUETR>
    <TxSts>ACCC</TxSts>
    <AccptncDtTm>2026-02-18T17:42:00+00:00</AccptncDtTm>
  </TxInfAndSts>
</FIToFIPmtStsRpt>`,
        detail: 'Barclays sends ACCC (Accepted Settlement Completed) — beneficiary credited £28,970. Status relayed back through the chain.',
      },
      {
        id: 5, from: 2, to: 1, direction: 'backward',
        messageType: 'pacs.002.001.15', messageName: 'Payment Status Report',
        description: 'HSBC London relays confirmation to HSBC SG',
        duration: '~30 sec',
        xmlSnippet: `<FIToFIPmtStsRpt>
  <GrpHdr>
    <MsgId>HSBC-STS-0002</MsgId>
    <CreDtTm>2026-02-18T17:43:00+00:00</CreDtTm>
  </GrpHdr>
  <TxInfAndSts>
    <OrgnlEndToEndId>E2E-SGD-GBP-001</OrgnlEndToEndId>
    <OrgnlUETR>${UETR}</OrgnlUETR>
    <TxSts>ACSP</TxSts>
    <StsRsnInf><Rsn><Cd>G000</Cd></Rsn></StsRsnInf>
  </TxInfAndSts>
</FIToFIPmtStsRpt>`,
        detail: 'HSBC London relays ACSP (Accepted Settlement in Process) back to HSBC Singapore. Hop-by-hop: each bank confirms to its upstream counterpart.',
      },
      {
        id: 6, from: 1, to: 0, direction: 'backward',
        messageType: 'pacs.002.001.15', messageName: 'Payment Status Report (End-to-End)',
        description: 'HSBC SG sends final ACCC to DBS',
        duration: '~30 sec',
        xmlSnippet: `<FIToFIPmtStsRpt>
  <GrpHdr>
    <MsgId>HSBC-STS-0003</MsgId>
    <CreDtTm>2026-02-18T17:44:00+00:00</CreDtTm>
  </GrpHdr>
  <TxInfAndSts>
    <OrgnlEndToEndId>E2E-SGD-GBP-001</OrgnlEndToEndId>
    <OrgnlUETR>${UETR}</OrgnlUETR>
    <TxSts>ACCC</TxSts>
    <ChrgsInf>
      <Amt Ccy="SGD">75.00</Amt>
      <Agt><FinInstnId><BICFI>HSBCSGSG</BICFI></FinInstnId></Agt>
    </ChrgsInf>
  </TxInfAndSts>
</FIToFIPmtStsRpt>`,
        detail: 'DBS receives final ACCC confirmation. Customer notified. Total journey: ~24 hrs. Total fees: SGD 75 + FX spread. Amount received: £28,970.',
      },
    ],
    coverSteps: [
      {
        id: 1, from: 0, to: 3, direction: 'forward',
        messageType: 'pacs.008.001.13', messageName: 'FI to FI Customer Credit Transfer',
        description: 'DBS sends pacs.008 DIRECT to Barclays (instruction)',
        duration: '~2 min', fee: 35,
        nostroAction: 'Debit: DBS debits customer SGD account',
        // XSD: FIToFICstmrCdtTrf > GrpHdr + CdtTrfTxInf
        // CdtTrfTxInf sequence: PmtId > IntrBkSttlmAmt > ChrgBr > ChrgsInf > InstgAgt > InstdAgt > Dbtr > DbtrAgt > CdtrAgt > Cdtr
        xmlSnippet: `<FIToFICstmrCdtTrf>
  <GrpHdr>
    <MsgId>DBS-2026021800001</MsgId>
    <CreDtTm>2026-02-18T09:15:00+08:00</CreDtTm>
    <NbOfTxs>1</NbOfTxs>
    <SttlmInf><SttlmMtd>COVE</SttlmMtd></SttlmInf>
    <InstgAgt><FinInstnId><BICFI>DBSSSGSG</BICFI></FinInstnId></InstgAgt>
    <InstdAgt><FinInstnId><BICFI>BARCGB22</BICFI></FinInstnId></InstdAgt>
  </GrpHdr>
  <CdtTrfTxInf>
    <PmtId>
      <InstrId>DBS-INS-0001</InstrId>
      <EndToEndId>E2E-SGD-GBP-001</EndToEndId>
      <UETR>${UETR}</UETR>
    </PmtId>
    <IntrBkSttlmAmt Ccy="SGD">50000.00</IntrBkSttlmAmt>
    <ChrgBr>SHAR</ChrgBr>
    <ChrgsInf>
      <Amt Ccy="SGD">35.00</Amt>
      <Agt><FinInstnId><BICFI>DBSSSGSG</BICFI></FinInstnId></Agt>
    </ChrgsInf>
    <InstgAgt><FinInstnId><BICFI>DBSSSGSG</BICFI></FinInstnId></InstgAgt>
    <InstdAgt><FinInstnId><BICFI>BARCGB22</BICFI></FinInstnId></InstdAgt>
    <Dbtr>
      <Nm>Acme Trading Pte Ltd</Nm>
      <PstlAdr><Ctry>SG</Ctry></PstlAdr>
    </Dbtr>
    <DbtrAgt><FinInstnId><BICFI>DBSSSGSG</BICFI></FinInstnId></DbtrAgt>
    <CdtrAgt><FinInstnId><BICFI>BARCGB22</BICFI></FinInstnId></CdtrAgt>
    <Cdtr>
      <Nm>Crown and Co Solicitors</Nm>
      <PstlAdr><Ctry>GB</Ctry></PstlAdr>
    </Cdtr>
  </CdtTrfTxInf>
</FIToFICstmrCdtTrf>`,
        detail: 'DBS validates KYC/AML, debits sender account, generates UETR, sends pacs.008 DIRECT to Barclays (cover method — instruction leg). Settlement method COVE triggers parallel pacs.009 COV cover payment.',
      },
      {
        id: 2, from: 0, to: 1, direction: 'forward',
        messageType: 'pacs.009.001.13', messageName: 'FI Credit Transfer (Cover)',
        description: 'DBS initiates cover payment to HSBC SG (parallel)',
        duration: '~30 sec',
        nostroAction: 'Debit: DBS SGD nostro → Credit: HSBC SG SGD account',
        // XSD: FICdtTrf > CdtTrfTxInf with UndrlygCstmrCdtTrf — same UETR links to pacs.008
        xmlSnippet: `<FICdtTrf>
  <GrpHdr>
    <MsgId>DBS-GRP-0001</MsgId>
    <CreDtTm>2026-02-18T09:15:00+08:00</CreDtTm>
    <NbOfTxs>1</NbOfTxs>
    <SttlmInf><SttlmMtd>INDA</SttlmMtd></SttlmInf>
  </GrpHdr>
  <CdtTrfTxInf>
    <PmtId>
      <InstrId>DBS-COV-0001</InstrId>
      <EndToEndId>E2E-SGD-GBP-001</EndToEndId>
      <UETR>${UETR}</UETR>
    </PmtId>
    <IntrBkSttlmAmt Ccy="SGD">49965.00</IntrBkSttlmAmt>
    <InstgAgt><FinInstnId><BICFI>DBSSSGSG</BICFI></FinInstnId></InstgAgt>
    <InstdAgt><FinInstnId><BICFI>HSBCSGSG</BICFI></FinInstnId></InstdAgt>
    <Dbtr><FinInstnId><BICFI>DBSSSGSG</BICFI></FinInstnId></Dbtr>
    <DbtrAgt><FinInstnId><BICFI>DBSSSGSG</BICFI></FinInstnId></DbtrAgt>
    <CdtrAgt><FinInstnId><BICFI>BARCGB22</BICFI></FinInstnId></CdtrAgt>
    <Cdtr><FinInstnId><BICFI>BARCGB22</BICFI></FinInstnId></Cdtr>
    <UndrlygCstmrCdtTrf>
      <Dbtr>
        <Nm>Acme Trading Pte Ltd</Nm>
        <PstlAdr><Ctry>SG</Ctry></PstlAdr>
      </Dbtr>
      <DbtrAgt><FinInstnId><BICFI>DBSSSGSG</BICFI></FinInstnId></DbtrAgt>
      <CdtrAgt><FinInstnId><BICFI>BARCGB22</BICFI></FinInstnId></CdtrAgt>
      <Cdtr>
        <Nm>Crown and Co Solicitors</Nm>
        <PstlAdr><Ctry>GB</Ctry></PstlAdr>
      </Cdtr>
    </UndrlygCstmrCdtTrf>
  </CdtTrfTxInf>
</FICdtTrf>`,
        detail: 'Cover payment leg (parallel to step 1): DBS sends pacs.009 COV to HSBC Singapore to initiate settlement. Same UETR interlinks with the direct pacs.008. UndrlygCstmrCdtTrf element carries the original customer payment details.',
      },
      {
        id: 3, from: 1, to: 0, direction: 'backward',
        messageType: 'pacs.002.001.15', messageName: 'Payment Status Report',
        description: 'HSBC SG acknowledges cover receipt to DBS',
        duration: '~30 sec',
        xmlSnippet: `<FIToFIPmtStsRpt>
  <GrpHdr>
    <MsgId>HSBC-STS-COV-0001</MsgId>
    <CreDtTm>2026-02-18T09:16:00+08:00</CreDtTm>
  </GrpHdr>
  <TxInfAndSts>
    <OrgnlUETR>${UETR}</OrgnlUETR>
    <TxSts>ACSP</TxSts>
    <StsRsnInf><Rsn><Cd>G000</Cd></Rsn></StsRsnInf>
  </TxInfAndSts>
</FIToFIPmtStsRpt>`,
        detail: 'HSBC SG sends ACSP (Accepted Settlement in Process) back to DBS confirming receipt of the pacs.009 COV cover payment. Same UETR links all messages.',
      },
      {
        id: 4, from: 1, to: 2, direction: 'forward',
        messageType: 'pacs.009.001.13', messageName: 'FI Credit Transfer (Cover)',
        description: 'HSBC SG forwards cover to HSBC London',
        duration: '4-8 hrs', fee: 25,
        fxRate: 0.5812, fxFrom: 'SGD', fxTo: 'GBP',
        nostroAction: 'Debit: HSBC SG nostro (SGD) → Credit: HSBC London nostro (GBP)',
        // XSD: FICdtTrf > GrpHdr + CdtTrfTxInf (cover method settlement leg)
        xmlSnippet: `<FICdtTrf>
  <GrpHdr>
    <MsgId>HSBC-GRP-0001</MsgId>
    <CreDtTm>2026-02-18T09:15:00+08:00</CreDtTm>
    <NbOfTxs>1</NbOfTxs>
    <SttlmInf><SttlmMtd>INDA</SttlmMtd></SttlmInf>
  </GrpHdr>
  <CdtTrfTxInf>
    <PmtId>
      <InstrId>HSBC-COV-0001</InstrId>
      <EndToEndId>E2E-SGD-GBP-001</EndToEndId>
      <UETR>${UETR}</UETR>
    </PmtId>
    <IntrBkSttlmAmt Ccy="GBP">28985.00</IntrBkSttlmAmt>
    <InstgAgt><FinInstnId><BICFI>HSBCSGSG</BICFI></FinInstnId></InstgAgt>
    <InstdAgt><FinInstnId><BICFI>HSBCGB2L</BICFI></FinInstnId></InstdAgt>
    <Dbtr><FinInstnId><BICFI>DBSSSGSG</BICFI></FinInstnId></Dbtr>
    <DbtrAgt><FinInstnId><BICFI>DBSSSGSG</BICFI></FinInstnId></DbtrAgt>
    <CdtrAgt><FinInstnId><BICFI>BARCGB22</BICFI></FinInstnId></CdtrAgt>
    <Cdtr><FinInstnId><BICFI>BARCGB22</BICFI></FinInstnId></Cdtr>
    <UndrlygCstmrCdtTrf>
      <Dbtr>
        <Nm>Acme Trading Pte Ltd</Nm>
        <PstlAdr><Ctry>SG</Ctry></PstlAdr>
      </Dbtr>
      <DbtrAgt><FinInstnId><BICFI>DBSSSGSG</BICFI></FinInstnId></DbtrAgt>
      <CdtrAgt><FinInstnId><BICFI>BARCGB22</BICFI></FinInstnId></CdtrAgt>
      <Cdtr>
        <Nm>Crown and Co Solicitors</Nm>
        <PstlAdr><Ctry>GB</Ctry></PstlAdr>
      </Cdtr>
      <InstdAmt Ccy="SGD">49965.00</InstdAmt>
    </UndrlygCstmrCdtTrf>
  </CdtTrfTxInf>
</FICdtTrf>`,
        detail: 'Cover method settlement leg: HSBC Singapore converts SGD→GBP at 0.5812 (mid: 0.5832, spread 0.35%). Deducts SGD 25 bank processing fee (not the SWIFT message cost — that\'s pennies). Forwards via intra-group network to London.',
      },
      {
        id: 5, from: 2, to: 1, direction: 'backward',
        messageType: 'camt.054.001.13', messageName: 'Bank to Customer Debit/Credit Notification',
        description: 'HSBC London confirms nostro credit',
        duration: '~1 min',
        // XSD: BkToCstmrDbtCdtNtfctn > Ntfctn > Ntry (ReportEntry15)
        // ReportEntry15 sequence: Amt > CdtDbtInd > Sts > BkTxCd (mandatory!) > NtryDtls
        xmlSnippet: `<BkToCstmrDbtCdtNtfctn>
  <GrpHdr>
    <MsgId>HSBC-NTF-GRP-0001</MsgId>
    <CreDtTm>2026-02-18T17:30:00+00:00</CreDtTm>
  </GrpHdr>
  <Ntfctn>
    <Id>HSBC-NTF-0001</Id>
    <Acct><Id><IBAN>GB29HSBC40120712345678</IBAN></Id></Acct>
    <Ntry>
      <Amt Ccy="GBP">28985.00</Amt>
      <CdtDbtInd>CRDT</CdtDbtInd>
      <Sts><Cd>BOOK</Cd></Sts>
      <BkTxCd>
        <Domn><Cd>PMNT</Cd><Fmly><Cd>RCDT</Cd><SubFmlyCd>ESCT</SubFmlyCd></Fmly></Domn>
      </BkTxCd>
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
        id: 6, from: 2, to: 3, direction: 'forward',
        messageType: 'pacs.009.001.13', messageName: 'FI Credit Transfer (Cover)',
        description: 'HSBC London settles with Barclays via CHAPS',
        duration: '2-4 hrs', fee: 15,
        nostroAction: 'Debit: HSBC London nostro → Credit: Barclays settlement via CHAPS',
        // XSD: FICdtTrf cover leg — final settlement to beneficiary bank
        xmlSnippet: `<FICdtTrf>
  <GrpHdr>
    <MsgId>HSBC-GRP-0002</MsgId>
    <CreDtTm>2026-02-18T09:15:00+00:00</CreDtTm>
    <NbOfTxs>1</NbOfTxs>
    <SttlmInf><SttlmMtd>INDA</SttlmMtd></SttlmInf>
  </GrpHdr>
  <CdtTrfTxInf>
    <PmtId>
      <InstrId>HSBC-COV-0002</InstrId>
      <EndToEndId>E2E-SGD-GBP-001</EndToEndId>
      <UETR>${UETR}</UETR>
    </PmtId>
    <IntrBkSttlmAmt Ccy="GBP">28970.00</IntrBkSttlmAmt>
    <InstgAgt><FinInstnId><BICFI>HSBCGB2L</BICFI></FinInstnId></InstgAgt>
    <InstdAgt><FinInstnId><BICFI>BARCGB22</BICFI></FinInstnId></InstdAgt>
    <Dbtr><FinInstnId><BICFI>DBSSSGSG</BICFI></FinInstnId></Dbtr>
    <CdtrAgt><FinInstnId><BICFI>BARCGB22</BICFI></FinInstnId></CdtrAgt>
    <Cdtr><FinInstnId><BICFI>BARCGB22</BICFI></FinInstnId></Cdtr>
    <RmtInf><Ustrd>Payment for services - INV-2026-0042</Ustrd></RmtInf>
    <UndrlygCstmrCdtTrf>
      <Dbtr>
        <Nm>Acme Trading Pte Ltd</Nm>
        <PstlAdr><Ctry>SG</Ctry></PstlAdr>
      </Dbtr>
      <DbtrAgt><FinInstnId><BICFI>DBSSSGSG</BICFI></FinInstnId></DbtrAgt>
      <CdtrAgt><FinInstnId><BICFI>BARCGB22</BICFI></FinInstnId></CdtrAgt>
      <Cdtr>
        <Nm>Crown and Co Solicitors</Nm>
        <PstlAdr><Ctry>GB</Ctry></PstlAdr>
      </Cdtr>
    </UndrlygCstmrCdtTrf>
  </CdtTrfTxInf>
</FICdtTrf>`,
        detail: 'HSBC London deducts £15 bank handling fee, settles with Barclays via CHAPS (UK RTGS — immediate finality). Remittance info preserved end-to-end.',
      },
      {
        id: 7, from: 3, to: 2, direction: 'backward',
        messageType: 'pacs.002.001.15', messageName: 'Payment Status Report',
        description: 'Barclays confirms credit to beneficiary',
        duration: '~1 min',
        // XSD: GrpHdr mandatory, TxInfAndSts order: OrgnlEndToEndId > OrgnlUETR > TxSts > AccptncDtTm
        xmlSnippet: `<FIToFIPmtStsRpt>
  <GrpHdr>
    <MsgId>BARC-STS-0001</MsgId>
    <CreDtTm>2026-02-18T17:42:00+00:00</CreDtTm>
  </GrpHdr>
  <TxInfAndSts>
    <OrgnlEndToEndId>E2E-SGD-GBP-001</OrgnlEndToEndId>
    <OrgnlUETR>${UETR}</OrgnlUETR>
    <TxSts>ACCC</TxSts>
    <AccptncDtTm>2026-02-18T17:42:00+00:00</AccptncDtTm>
  </TxInfAndSts>
</FIToFIPmtStsRpt>`,
        detail: 'Barclays sends ACCC (Accepted Credit Completed) — beneficiary account credited with £28,970. SWIFT gpi Tracker updated. Total bank fees: SGD 35 + SGD 25 + £15.',
      },
      {
        id: 8, from: 3, to: 0, direction: 'backward',
        messageType: 'pacs.002.001.15', messageName: 'Payment Status Report (End-to-End)',
        description: 'Final ACCC confirmation relayed to DBS',
        duration: '~2 min',
        // XSD: GrpHdr mandatory, ChrgsInf uses Charges16 (Amt + Agt)
        xmlSnippet: `<FIToFIPmtStsRpt>
  <GrpHdr>
    <MsgId>HSBC-STS-0002</MsgId>
    <CreDtTm>2026-02-18T17:44:00+00:00</CreDtTm>
  </GrpHdr>
  <TxInfAndSts>
    <OrgnlEndToEndId>E2E-SGD-GBP-001</OrgnlEndToEndId>
    <OrgnlUETR>${UETR}</OrgnlUETR>
    <TxSts>ACCC</TxSts>
    <ChrgsInf>
      <Amt Ccy="SGD">75.00</Amt>
      <Agt><FinInstnId><BICFI>HSBCSGSG</BICFI></FinInstnId></Agt>
    </ChrgsInf>
  </TxInfAndSts>
</FIToFIPmtStsRpt>`,
        detail: 'DBS receives final ACCC confirmation via gpi Tracker. Customer notified. Total journey: ~24 hrs. Total bank fees: SGD 75 + FX spread. Amount received: £28,970.',
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
    serialSteps: [
      {
        id: 1, from: 0, to: 1, direction: 'forward',
        messageType: 'pacs.008.001.13', messageName: 'FI to FI Customer Credit Transfer',
        description: 'JPMorgan forwards pacs.008 to Citibank',
        duration: '~5 min', fee: 45,
        nostroAction: 'Debit: JPM debits sender USD account',
        xmlSnippet: `<CdtTrfTxInf>
  <PmtId>
    <InstrId>JPM-INS-0001</InstrId>
    <EndToEndId>E2E-USD-NGN-001</EndToEndId>
    <UETR>${UETR}</UETR>
  </PmtId>
  <IntrBkSttlmAmt Ccy="USD">955.00</IntrBkSttlmAmt>
  <ChrgBr>SHAR</ChrgBr>
  <ChrgsInf>
    <Amt Ccy="USD">45.00</Amt>
    <Agt><FinInstnId><BICFI>CHASUS33</BICFI></FinInstnId></Agt>
  </ChrgsInf>
  <InstgAgt><FinInstnId><BICFI>CHASUS33</BICFI></FinInstnId></InstgAgt>
  <InstdAgt><FinInstnId><BICFI>CITIUS33</BICFI></FinInstnId></InstdAgt>
  <Dbtr>
    <Nm>GlobalCorp Inc</Nm>
    <PstlAdr><Ctry>US</Ctry></PstlAdr>
  </Dbtr>
  <DbtrAgt><FinInstnId><BICFI>CHASUS33</BICFI></FinInstnId></DbtrAgt>
  <CdtrAgt><FinInstnId><BICFI>GTBINGLA</BICFI></FinInstnId></CdtrAgt>
  <Cdtr>
    <Nm>Lagos Import Co Ltd</Nm>
    <PstlAdr><Ctry>NG</Ctry></PstlAdr>
  </Cdtr>
</CdtTrfTxInf>`,
        detail: 'Serial method: JPMorgan validates enhanced KYC (Nigeria = high-risk corridor), debits $1,000, deducts $45 origination fee. pacs.008 forwarded hop-by-hop to Citibank (SttlmMtd=INDA).',
      },
      {
        id: 2, from: 1, to: 2, direction: 'forward',
        messageType: 'pacs.008.001.13', messageName: 'FI to FI Customer Credit Transfer',
        description: 'Citibank routes via Standard Chartered (London)',
        duration: '8-24 hrs', fee: 35,
        nostroAction: 'Debit: Citi USD nostro → Credit: StanChart USD nostro',
        xmlSnippet: `<CdtTrfTxInf>
  <PmtId>
    <InstrId>CITI-SER-0001</InstrId>
    <EndToEndId>E2E-USD-NGN-001</EndToEndId>
    <UETR>${UETR}</UETR>
  </PmtId>
  <IntrBkSttlmAmt Ccy="USD">920.00</IntrBkSttlmAmt>
  <ChrgBr>SHAR</ChrgBr>
  <ChrgsInf>
    <Amt Ccy="USD">35.00</Amt>
    <Agt><FinInstnId><BICFI>CITIUS33</BICFI></FinInstnId></Agt>
  </ChrgsInf>
  <InstgAgt><FinInstnId><BICFI>CITIUS33</BICFI></FinInstnId></InstgAgt>
  <InstdAgt><FinInstnId><BICFI>SCBLGB2L</BICFI></FinInstnId></InstdAgt>
  <Dbtr>
    <Nm>GlobalCorp Inc</Nm>
    <PstlAdr><Ctry>US</Ctry></PstlAdr>
  </Dbtr>
  <DbtrAgt><FinInstnId><BICFI>CHASUS33</BICFI></FinInstnId></DbtrAgt>
  <CdtrAgt><FinInstnId><BICFI>GTBINGLA</BICFI></FinInstnId></CdtrAgt>
  <Cdtr>
    <Nm>Lagos Import Co Ltd</Nm>
    <PstlAdr><Ctry>NG</Ctry></PstlAdr>
  </Cdtr>
</CdtTrfTxInf>`,
        detail: 'Serial method: Citi deducts $35 bank processing fee. Routes via London (StanChart) as intermediary. Settlement via Fedwire for USD leg.',
      },
      {
        id: 3, from: 2, to: 3, direction: 'forward',
        messageType: 'pacs.008.001.13', messageName: 'FI to FI Customer Credit Transfer',
        description: 'StanChart converts USD→NGN, settles with GTBank',
        duration: '12-48 hrs', fee: 25,
        fxRate: 1580.50, fxFrom: 'USD', fxTo: 'NGN',
        nostroAction: 'Debit: StanChart USD → Credit: GTBank NGN nostro',
        xmlSnippet: `<CdtTrfTxInf>
  <PmtId>
    <InstrId>SCBL-SER-0001</InstrId>
    <EndToEndId>E2E-USD-NGN-001</EndToEndId>
    <UETR>${UETR}</UETR>
  </PmtId>
  <IntrBkSttlmAmt Ccy="NGN">1414047.50</IntrBkSttlmAmt>
  <InstdAmt Ccy="USD">895.00</InstdAmt>
  <XchgRate>1580.50</XchgRate>
  <ChrgBr>SHAR</ChrgBr>
  <ChrgsInf>
    <Amt Ccy="USD">25.00</Amt>
    <Agt><FinInstnId><BICFI>SCBLGB2L</BICFI></FinInstnId></Agt>
  </ChrgsInf>
  <InstgAgt><FinInstnId><BICFI>SCBLGB2L</BICFI></FinInstnId></InstgAgt>
  <InstdAgt><FinInstnId><BICFI>GTBINGLA</BICFI></FinInstnId></InstdAgt>
  <Dbtr>
    <Nm>GlobalCorp Inc</Nm>
    <PstlAdr><Ctry>US</Ctry></PstlAdr>
  </Dbtr>
  <DbtrAgt><FinInstnId><BICFI>CHASUS33</BICFI></FinInstnId></DbtrAgt>
  <CdtrAgt><FinInstnId><BICFI>GTBINGLA</BICFI></FinInstnId></CdtrAgt>
  <Cdtr>
    <Nm>Lagos Import Co Ltd</Nm>
    <PstlAdr><Ctry>NG</Ctry></PstlAdr>
  </Cdtr>
</CdtTrfTxInf>`,
        detail: 'Serial method: StanChart converts at 1,580.50 (mid: 1,649.20, spread 4.2%). $25 fee. NGN settlement depends on CBN clearing hours.',
      },
      {
        id: 4, from: 3, to: 2, direction: 'backward',
        messageType: 'pacs.002.001.15', messageName: 'Payment Status Report',
        description: 'GTBank confirms credit to StanChart',
        duration: '~1 min',
        xmlSnippet: `<FIToFIPmtStsRpt>
  <GrpHdr>
    <MsgId>GTB-STS-0001</MsgId>
    <CreDtTm>2026-02-20T14:30:00+01:00</CreDtTm>
  </GrpHdr>
  <TxInfAndSts>
    <OrgnlUETR>${UETR}</OrgnlUETR>
    <TxSts>ACCC</TxSts>
    <AccptncDtTm>2026-02-20T14:30:00+01:00</AccptncDtTm>
  </TxInfAndSts>
</FIToFIPmtStsRpt>`,
        detail: 'GTBank credits beneficiary ₦1,414,047.50. Sends ACCC (Accepted Credit Completed) back to Standard Chartered.',
      },
      {
        id: 5, from: 2, to: 1, direction: 'backward',
        messageType: 'pacs.002.001.15', messageName: 'Payment Status Report',
        description: 'StanChart relays confirmation to Citibank',
        duration: '~30 sec',
        xmlSnippet: `<FIToFIPmtStsRpt>
  <GrpHdr>
    <MsgId>SCBL-STS-0001</MsgId>
    <CreDtTm>2026-02-20T14:31:00+01:00</CreDtTm>
  </GrpHdr>
  <TxInfAndSts>
    <OrgnlUETR>${UETR}</OrgnlUETR>
    <TxSts>ACSP</TxSts>
    <StsRsnInf><Rsn><Cd>G000</Cd></Rsn></StsRsnInf>
  </TxInfAndSts>
</FIToFIPmtStsRpt>`,
        detail: 'Standard Chartered relays ACSP status back to Citibank. Hop-by-hop confirmation through the serial chain.',
      },
      {
        id: 6, from: 1, to: 0, direction: 'backward',
        messageType: 'pacs.002.001.15', messageName: 'Payment Status Report (End-to-End)',
        description: 'Citibank sends final ACCC to JPMorgan',
        duration: '~30 sec',
        xmlSnippet: `<FIToFIPmtStsRpt>
  <GrpHdr>
    <MsgId>CITI-STS-0001</MsgId>
    <CreDtTm>2026-02-20T14:32:00+01:00</CreDtTm>
  </GrpHdr>
  <TxInfAndSts>
    <OrgnlUETR>${UETR}</OrgnlUETR>
    <TxSts>ACCC</TxSts>
    <AccptncDtTm>2026-02-20T14:32:00+01:00</AccptncDtTm>
  </TxInfAndSts>
</FIToFIPmtStsRpt>`,
        detail: 'JPMorgan receives final ACCC. Customer notified. Total: $1,000 → ₦1,414,047.50. Cost: 8.78%.',
      },
    ],
    coverSteps: [
      {
        id: 1, from: 0, to: 3, direction: 'forward',
        messageType: 'pacs.008.001.13', messageName: 'FI to FI Customer Credit Transfer',
        description: 'JPMorgan sends pacs.008 DIRECT to GTBank (instruction)',
        duration: '~5 min', fee: 45,
        nostroAction: 'Debit: JPM debits sender USD account',
        // XSD: FIToFICstmrCdtTrf > CdtTrfTxInf — cover method: SttlmMtd=COVE, direct A→D
        xmlSnippet: `<CdtTrfTxInf>
  <PmtId>
    <EndToEndId>E2E-USD-NGN-001</EndToEndId>
    <UETR>${UETR}</UETR>
  </PmtId>
  <IntrBkSttlmAmt Ccy="USD">955.00</IntrBkSttlmAmt>
  <ChrgBr>SHAR</ChrgBr>
  <ChrgsInf>
    <Amt Ccy="USD">45.00</Amt>
    <Agt><FinInstnId><BICFI>CHASUS33</BICFI></FinInstnId></Agt>
  </ChrgsInf>
  <InstgAgt><FinInstnId><BICFI>CHASUS33</BICFI></FinInstnId></InstgAgt>
  <InstdAgt><FinInstnId><BICFI>GTBINGLA</BICFI></FinInstnId></InstdAgt>
  <Dbtr>
    <Nm>GlobalCorp Inc</Nm>
    <PstlAdr><Ctry>US</Ctry></PstlAdr>
  </Dbtr>
  <DbtrAgt><FinInstnId><BICFI>CHASUS33</BICFI></FinInstnId></DbtrAgt>
  <CdtrAgt><FinInstnId><BICFI>GTBINGLA</BICFI></FinInstnId></CdtrAgt>
  <Cdtr>
    <Nm>Lagos Import Co Ltd</Nm>
    <PstlAdr><Ctry>NG</Ctry></PstlAdr>
  </Cdtr>
</CdtTrfTxInf>`,
        detail: 'Cover method instruction leg: JPMorgan validates enhanced KYC (Nigeria = high-risk corridor), debits $1,000, deducts $45 origination fee. pacs.008 goes DIRECT to GTBank — settlement follows separately via pacs.009 COV through correspondents.',
      },
      {
        id: 2, from: 0, to: 1, direction: 'forward',
        messageType: 'pacs.009.001.13', messageName: 'FI Credit Transfer (Cover)',
        description: 'JPMorgan initiates cover payment to Citibank',
        duration: '~30 min',
        nostroAction: 'Debit: JPM USD nostro → Credit: Citi USD account',
        // XSD: FICdtTrf > CdtTrfTxInf with UndrlygCstmrCdtTrf — same UETR links to pacs.008
        xmlSnippet: `<FICdtTrf>
  <GrpHdr>
    <MsgId>JPM-GRP-0001</MsgId>
    <CreDtTm>2026-02-18T09:15:00-05:00</CreDtTm>
    <NbOfTxs>1</NbOfTxs>
    <SttlmInf><SttlmMtd>INDA</SttlmMtd></SttlmInf>
  </GrpHdr>
  <CdtTrfTxInf>
    <PmtId>
      <InstrId>JPM-COV-0001</InstrId>
      <EndToEndId>E2E-USD-NGN-001</EndToEndId>
      <UETR>${UETR}</UETR>
    </PmtId>
    <IntrBkSttlmAmt Ccy="USD">955.00</IntrBkSttlmAmt>
    <InstgAgt><FinInstnId><BICFI>CHASUS33</BICFI></FinInstnId></InstgAgt>
    <InstdAgt><FinInstnId><BICFI>CITIUS33</BICFI></FinInstnId></InstdAgt>
    <Dbtr><FinInstnId><BICFI>CHASUS33</BICFI></FinInstnId></Dbtr>
    <DbtrAgt><FinInstnId><BICFI>CHASUS33</BICFI></FinInstnId></DbtrAgt>
    <CdtrAgt><FinInstnId><BICFI>GTBINGLA</BICFI></FinInstnId></CdtrAgt>
    <Cdtr><FinInstnId><BICFI>GTBINGLA</BICFI></FinInstnId></Cdtr>
    <UndrlygCstmrCdtTrf>
      <Dbtr>
        <Nm>GlobalCorp Inc</Nm>
        <PstlAdr><Ctry>US</Ctry></PstlAdr>
      </Dbtr>
      <DbtrAgt><FinInstnId><BICFI>CHASUS33</BICFI></FinInstnId></DbtrAgt>
      <CdtrAgt><FinInstnId><BICFI>GTBINGLA</BICFI></FinInstnId></CdtrAgt>
      <Cdtr>
        <Nm>Lagos Import Co Ltd</Nm>
        <PstlAdr><Ctry>NG</Ctry></PstlAdr>
      </Cdtr>
    </UndrlygCstmrCdtTrf>
  </CdtTrfTxInf>
</FICdtTrf>`,
        detail: 'Cover payment leg (parallel to step 1): JPMorgan sends pacs.009 COV to Citibank to initiate settlement. Same UETR interlinks with the direct pacs.008. UndrlygCstmrCdtTrf element carries the original customer payment details.',
      },
      {
        id: 3, from: 1, to: 0, direction: 'backward',
        messageType: 'pacs.002.001.15', messageName: 'Payment Status Report',
        description: 'Citibank acknowledges cover receipt to JPMorgan',
        duration: '~30 sec',
        xmlSnippet: `<FIToFIPmtStsRpt>
  <GrpHdr>
    <MsgId>CITI-STS-COV-0001</MsgId>
    <CreDtTm>2026-02-20T10:01:00-05:00</CreDtTm>
  </GrpHdr>
  <TxInfAndSts>
    <OrgnlUETR>${UETR}</OrgnlUETR>
    <TxSts>ACSP</TxSts>
    <StsRsnInf><Rsn><Cd>G000</Cd></Rsn></StsRsnInf>
  </TxInfAndSts>
</FIToFIPmtStsRpt>`,
        detail: 'Citibank sends ACSP (Accepted Settlement in Process) back to JPMorgan confirming receipt of the pacs.009 COV cover payment. Same UETR links all messages.',
      },
      {
        id: 4, from: 1, to: 2, direction: 'forward',
        messageType: 'pacs.009.001.13', messageName: 'FI Credit Transfer (Cover)',
        description: 'Citi routes cover via Standard Chartered (London)',
        duration: '8-24 hrs', fee: 35,
        nostroAction: 'Debit: Citi USD nostro → Credit: StanChart USD nostro',
        // XSD: FICdtTrf cover leg
        xmlSnippet: `<FICdtTrf>
  <GrpHdr>
    <MsgId>CITI-GRP-0001</MsgId>
    <CreDtTm>2026-02-18T09:15:00-05:00</CreDtTm>
    <NbOfTxs>1</NbOfTxs>
    <SttlmInf><SttlmMtd>INDA</SttlmMtd></SttlmInf>
  </GrpHdr>
  <CdtTrfTxInf>
    <PmtId>
      <InstrId>CITI-COV-0001</InstrId>
      <EndToEndId>E2E-USD-NGN-001</EndToEndId>
      <UETR>${UETR}</UETR>
    </PmtId>
    <IntrBkSttlmAmt Ccy="USD">920.00</IntrBkSttlmAmt>
    <InstgAgt><FinInstnId><BICFI>CITIUS33</BICFI></FinInstnId></InstgAgt>
    <InstdAgt><FinInstnId><BICFI>SCBLGB2L</BICFI></FinInstnId></InstdAgt>
    <Dbtr><FinInstnId><BICFI>CHASUS33</BICFI></FinInstnId></Dbtr>
    <DbtrAgt><FinInstnId><BICFI>CHASUS33</BICFI></FinInstnId></DbtrAgt>
    <CdtrAgt><FinInstnId><BICFI>GTBINGLA</BICFI></FinInstnId></CdtrAgt>
    <Cdtr><FinInstnId><BICFI>GTBINGLA</BICFI></FinInstnId></Cdtr>
    <UndrlygCstmrCdtTrf>
      <Dbtr>
        <Nm>GlobalCorp Inc</Nm>
        <PstlAdr><Ctry>US</Ctry></PstlAdr>
      </Dbtr>
      <DbtrAgt><FinInstnId><BICFI>CHASUS33</BICFI></FinInstnId></DbtrAgt>
      <CdtrAgt><FinInstnId><BICFI>GTBINGLA</BICFI></FinInstnId></CdtrAgt>
      <Cdtr>
        <Nm>Lagos Import Co Ltd</Nm>
        <PstlAdr><Ctry>NG</Ctry></PstlAdr>
      </Cdtr>
    </UndrlygCstmrCdtTrf>
  </CdtTrfTxInf>
</FICdtTrf>`,
        detail: 'Citi deducts $35 bank processing fee. Routes via London (StanChart) because no direct Citi→GTBank relationship exists. Settlement via Fedwire for USD leg. Time zone delay: NY→London.',
      },
      {
        id: 5, from: 2, to: 1, direction: 'backward',
        messageType: 'camt.054.001.13', messageName: 'Bank to Customer Debit/Credit Notification',
        description: 'StanChart confirms nostro credit to Citibank',
        duration: '~1 min',
        xmlSnippet: `<BkToCstmrDbtCdtNtfctn>
  <GrpHdr>
    <MsgId>SCBL-NTF-GRP-0001</MsgId>
    <CreDtTm>2026-02-20T12:30:00+00:00</CreDtTm>
  </GrpHdr>
  <Ntfctn>
    <Id>SCBL-NTF-0001</Id>
    <Acct><Id><Othr><Id>CITI-USD-NOSTRO-001</Id></Othr></Id></Acct>
    <Ntry>
      <Amt Ccy="USD">920.00</Amt>
      <CdtDbtInd>CRDT</CdtDbtInd>
      <Sts><Cd>BOOK</Cd></Sts>
      <BkTxCd>
        <Domn><Cd>PMNT</Cd><Fmly><Cd>RCDT</Cd><SubFmlyCd>ESCT</SubFmlyCd></Fmly></Domn>
      </BkTxCd>
      <NtryDtls><TxDtls><Refs>
        <EndToEndId>E2E-USD-NGN-001</EndToEndId>
        <UETR>${UETR}</UETR>
      </Refs></TxDtls></NtryDtls>
    </Ntry>
  </Ntfctn>
</BkToCstmrDbtCdtNtfctn>`,
        detail: 'Standard Chartered sends camt.054 credit notification confirming USD funds booked to the nostro account. Enables Citibank to reconcile the cover payment.',
      },
      {
        id: 6, from: 2, to: 3, direction: 'forward',
        messageType: 'pacs.009.001.13', messageName: 'FI Credit Transfer (Cover)',
        description: 'StanChart converts USD→NGN, settles with GTBank',
        duration: '12-48 hrs', fee: 25,
        fxRate: 1580.50, fxFrom: 'USD', fxTo: 'NGN',
        nostroAction: 'Debit: StanChart USD → Credit: GTBank NGN nostro',
        // XSD: FICdtTrf cover leg with FX
        xmlSnippet: `<FICdtTrf>
  <GrpHdr>
    <MsgId>SCBL-GRP-0001</MsgId>
    <CreDtTm>2026-02-18T09:15:00+00:00</CreDtTm>
    <NbOfTxs>1</NbOfTxs>
    <SttlmInf><SttlmMtd>INDA</SttlmMtd></SttlmInf>
  </GrpHdr>
  <CdtTrfTxInf>
    <PmtId>
      <InstrId>SCBL-COV-0001</InstrId>
      <EndToEndId>E2E-USD-NGN-001</EndToEndId>
      <UETR>${UETR}</UETR>
    </PmtId>
    <IntrBkSttlmAmt Ccy="NGN">1414047.50</IntrBkSttlmAmt>
    <Dbtr><FinInstnId><BICFI>CHASUS33</BICFI></FinInstnId></Dbtr>
    <DbtrAgt><FinInstnId><BICFI>CHASUS33</BICFI></FinInstnId></DbtrAgt>
    <CdtrAgt><FinInstnId><BICFI>GTBINGLA</BICFI></FinInstnId></CdtrAgt>
    <Cdtr><FinInstnId><BICFI>GTBINGLA</BICFI></FinInstnId></Cdtr>
    <UndrlygCstmrCdtTrf>
      <Dbtr>
        <Nm>GlobalCorp Inc</Nm>
        <PstlAdr><Ctry>US</Ctry></PstlAdr>
      </Dbtr>
      <DbtrAgt><FinInstnId><BICFI>CHASUS33</BICFI></FinInstnId></DbtrAgt>
      <CdtrAgt><FinInstnId><BICFI>GTBINGLA</BICFI></FinInstnId></CdtrAgt>
      <Cdtr>
        <Nm>Lagos Import Co Ltd</Nm>
        <PstlAdr><Ctry>NG</Ctry></PstlAdr>
      </Cdtr>
      <InstdAmt Ccy="USD">895.00</InstdAmt>
    </UndrlygCstmrCdtTrf>
  </CdtTrfTxInf>
</FICdtTrf>`,
        detail: 'StanChart converts at 1,580.50 (mid-market: 1,649.20 — spread 4.2%). $25 bank processing fee deducted. NGN settlement depends on CBN clearing hours (Lagos business day). Longest delay in chain.',
      },
      {
        id: 7, from: 3, to: 2, direction: 'backward',
        messageType: 'pacs.002.001.15', messageName: 'Payment Status Report',
        description: 'GTBank confirms credit to StanChart',
        duration: '~1 min',
        xmlSnippet: `<FIToFIPmtStsRpt>
  <GrpHdr>
    <MsgId>GTB-STS-COV-0001</MsgId>
    <CreDtTm>2026-02-20T14:29:00+01:00</CreDtTm>
  </GrpHdr>
  <TxInfAndSts>
    <OrgnlUETR>${UETR}</OrgnlUETR>
    <TxSts>ACCC</TxSts>
    <AccptncDtTm>2026-02-20T14:29:00+01:00</AccptncDtTm>
  </TxInfAndSts>
</FIToFIPmtStsRpt>`,
        detail: 'GTBank sends ACCC (Accepted Credit Completed) back to Standard Chartered confirming beneficiary ₦1,414,047.50 credited.',
      },
      {
        id: 8, from: 3, to: 0, direction: 'backward',
        messageType: 'pacs.002.001.15', messageName: 'Payment Status Report (End-to-End)',
        description: 'GTBank confirms credit — final ACCC to JPMorgan',
        duration: '~5 min',
        // XSD: GrpHdr mandatory, order: OrgnlUETR > TxSts > AccptncDtTm
        xmlSnippet: `<FIToFIPmtStsRpt>
  <GrpHdr>
    <MsgId>GTB-STS-0001</MsgId>
    <CreDtTm>2026-02-20T14:30:00+01:00</CreDtTm>
  </GrpHdr>
  <TxInfAndSts>
    <OrgnlUETR>${UETR}</OrgnlUETR>
    <TxSts>ACCC</TxSts>
    <AccptncDtTm>2026-02-20T14:30:00+01:00</AccptncDtTm>
  </TxInfAndSts>
</FIToFIPmtStsRpt>`,
        detail: 'GTBank credits beneficiary with ₦1,414,047.50. ACCC (Accepted Settlement Completed) sent DIRECT back to JPMorgan. Total: $1,000 → ₦1,414,047. Effective cost: 8.78% ($45+$35+$25 fees + 4.2% FX spread).',
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
    serialSteps: [
      {
        id: 1, from: 0, to: 1, direction: 'forward',
        messageType: 'pacs.008.001.13', messageName: 'FI to FI Customer Credit Transfer',
        description: 'SBI forwards pacs.008 to Deutsche Bank Mumbai',
        duration: '~10 min', fee: 2500,
        nostroAction: 'Debit: SBI debits sender INR account',
        xmlSnippet: `<CdtTrfTxInf>
  <PmtId>
    <InstrId>SBI-INS-0001</InstrId>
    <EndToEndId>E2E-INR-USD-001</EndToEndId>
    <UETR>${UETR}</UETR>
  </PmtId>
  <IntrBkSttlmAmt Ccy="INR">497500.00</IntrBkSttlmAmt>
  <ChrgBr>SHAR</ChrgBr>
  <ChrgsInf>
    <Amt Ccy="INR">2500.00</Amt>
    <Agt><FinInstnId><BICFI>SBININBB</BICFI></FinInstnId></Agt>
  </ChrgsInf>
  <InstgAgt><FinInstnId><BICFI>SBININBB</BICFI></FinInstnId></InstgAgt>
  <InstdAgt><FinInstnId><BICFI>DEUTINBB</BICFI></FinInstnId></InstdAgt>
  <Dbtr>
    <Nm>Tata Industries Ltd</Nm>
    <PstlAdr><Ctry>IN</Ctry></PstlAdr>
  </Dbtr>
  <DbtrAgt><FinInstnId><BICFI>SBININBB</BICFI></FinInstnId></DbtrAgt>
  <CdtrAgt><FinInstnId><BICFI>WFBIUS6S</BICFI></FinInstnId></CdtrAgt>
  <Cdtr>
    <Nm>TechStart Inc</Nm>
    <PstlAdr><Ctry>US</Ctry></PstlAdr>
  </Cdtr>
  <RgltryRptg>
    <DbtCdtRptgInd>DEBT</DbtCdtRptgInd>
    <Authrty><Nm>Reserve Bank of India</Nm></Authrty>
  </RgltryRptg>
</CdtTrfTxInf>`,
        detail: 'Serial method: SBI validates LRS ($250K/year limit), files Form A2 with RBI, debits ₹5,00,000 and deducts ₹2,500 fee. pacs.008 forwarded hop-by-hop to Deutsche Mumbai (SttlmMtd=INDA).',
      },
      {
        id: 2, from: 1, to: 2, direction: 'forward',
        messageType: 'pacs.008.001.13', messageName: 'FI to FI Customer Credit Transfer',
        description: 'Deutsche Mumbai converts INR→USD, routes to DB NY',
        duration: '4-8 hrs', fee: 1500,
        fxRate: 0.01195, fxFrom: 'INR', fxTo: 'USD',
        nostroAction: 'Debit: DB Mumbai INR → Credit: DB NY USD nostro',
        xmlSnippet: `<CdtTrfTxInf>
  <PmtId>
    <InstrId>DEUT-MUM-0001</InstrId>
    <EndToEndId>E2E-INR-USD-001</EndToEndId>
    <UETR>${UETR}</UETR>
  </PmtId>
  <IntrBkSttlmAmt Ccy="USD">5927.13</IntrBkSttlmAmt>
  <InstdAmt Ccy="INR">496000.00</InstdAmt>
  <XchgRate>0.01195</XchgRate>
  <ChrgBr>SHAR</ChrgBr>
  <ChrgsInf>
    <Amt Ccy="INR">1500.00</Amt>
    <Agt><FinInstnId><BICFI>DEUTINBB</BICFI></FinInstnId></Agt>
  </ChrgsInf>
  <InstgAgt><FinInstnId><BICFI>DEUTINBB</BICFI></FinInstnId></InstgAgt>
  <InstdAgt><FinInstnId><BICFI>DEUTUS33</BICFI></FinInstnId></InstdAgt>
  <Dbtr>
    <Nm>Tata Industries Ltd</Nm>
    <PstlAdr><Ctry>IN</Ctry></PstlAdr>
  </Dbtr>
  <DbtrAgt><FinInstnId><BICFI>SBININBB</BICFI></FinInstnId></DbtrAgt>
  <CdtrAgt><FinInstnId><BICFI>WFBIUS6S</BICFI></FinInstnId></CdtrAgt>
  <Cdtr>
    <Nm>TechStart Inc</Nm>
    <PstlAdr><Ctry>US</Ctry></PstlAdr>
  </Cdtr>
</CdtTrfTxInf>`,
        detail: 'Serial method: DB Mumbai converts at 0.01195 INR/USD (mid: 0.01217, spread 1.8%). ₹1,500 fee. Intra-group transfer to DB New York.',
      },
      {
        id: 3, from: 2, to: 3, direction: 'forward',
        messageType: 'pacs.008.001.13', messageName: 'FI to FI Customer Credit Transfer',
        description: 'Deutsche NY settles with Wells Fargo via Fedwire',
        duration: '2-4 hrs', fee: 12,
        nostroAction: 'Debit: DB NY USD → Credit: Wells Fargo via Fedwire',
        xmlSnippet: `<CdtTrfTxInf>
  <PmtId>
    <InstrId>DEUT-NY-0001</InstrId>
    <EndToEndId>E2E-INR-USD-001</EndToEndId>
    <UETR>${UETR}</UETR>
  </PmtId>
  <IntrBkSttlmAmt Ccy="USD">5915.13</IntrBkSttlmAmt>
  <ChrgBr>SHAR</ChrgBr>
  <ChrgsInf>
    <Amt Ccy="USD">12.00</Amt>
    <Agt><FinInstnId><BICFI>DEUTUS33</BICFI></FinInstnId></Agt>
  </ChrgsInf>
  <InstgAgt><FinInstnId><BICFI>DEUTUS33</BICFI></FinInstnId></InstgAgt>
  <InstdAgt><FinInstnId><BICFI>WFBIUS6S</BICFI></FinInstnId></InstdAgt>
  <Dbtr>
    <Nm>Tata Industries Ltd</Nm>
    <PstlAdr><Ctry>IN</Ctry></PstlAdr>
  </Dbtr>
  <DbtrAgt><FinInstnId><BICFI>SBININBB</BICFI></FinInstnId></DbtrAgt>
  <CdtrAgt><FinInstnId><BICFI>WFBIUS6S</BICFI></FinInstnId></CdtrAgt>
  <Cdtr>
    <Nm>TechStart Inc</Nm>
    <PstlAdr><Ctry>US</Ctry></PstlAdr>
  </Cdtr>
</CdtTrfTxInf>`,
        detail: 'Serial method: DB NY settles with Wells Fargo via Fedwire (immediate finality). $12 fee. Final hop.',
      },
      {
        id: 4, from: 3, to: 2, direction: 'backward',
        messageType: 'pacs.002.001.15', messageName: 'Payment Status Report',
        description: 'Wells Fargo confirms credit to Deutsche NY',
        duration: '~1 min',
        xmlSnippet: `<FIToFIPmtStsRpt>
  <GrpHdr>
    <MsgId>WFBI-STS-0001</MsgId>
    <CreDtTm>2026-02-18T18:15:00-05:00</CreDtTm>
  </GrpHdr>
  <TxInfAndSts>
    <OrgnlUETR>${UETR}</OrgnlUETR>
    <TxSts>ACCC</TxSts>
    <AccptncDtTm>2026-02-18T18:15:00-05:00</AccptncDtTm>
  </TxInfAndSts>
</FIToFIPmtStsRpt>`,
        detail: 'Wells Fargo credits $5,915.13. Sends ACCC back to Deutsche Bank New York.',
      },
      {
        id: 5, from: 2, to: 1, direction: 'backward',
        messageType: 'pacs.002.001.15', messageName: 'Payment Status Report',
        description: 'Deutsche NY relays confirmation to Deutsche Mumbai',
        duration: '~30 sec',
        xmlSnippet: `<FIToFIPmtStsRpt>
  <GrpHdr>
    <MsgId>DEUT-STS-0001</MsgId>
    <CreDtTm>2026-02-18T18:16:00-05:00</CreDtTm>
  </GrpHdr>
  <TxInfAndSts>
    <OrgnlUETR>${UETR}</OrgnlUETR>
    <TxSts>ACSP</TxSts>
    <StsRsnInf><Rsn><Cd>G000</Cd></Rsn></StsRsnInf>
  </TxInfAndSts>
</FIToFIPmtStsRpt>`,
        detail: 'Deutsche Bank NY relays ACSP status back to Deutsche Bank Mumbai via intra-group network.',
      },
      {
        id: 6, from: 1, to: 0, direction: 'backward',
        messageType: 'pacs.002.001.15', messageName: 'Payment Status Report (End-to-End)',
        description: 'Deutsche Mumbai sends final ACCC to SBI',
        duration: '~30 sec',
        xmlSnippet: `<FIToFIPmtStsRpt>
  <GrpHdr>
    <MsgId>DEUT-STS-0002</MsgId>
    <CreDtTm>2026-02-18T18:17:00-05:00</CreDtTm>
  </GrpHdr>
  <TxInfAndSts>
    <OrgnlUETR>${UETR}</OrgnlUETR>
    <TxSts>ACCC</TxSts>
    <AccptncDtTm>2026-02-18T18:17:00-05:00</AccptncDtTm>
  </TxInfAndSts>
</FIToFIPmtStsRpt>`,
        detail: 'SBI receives final ACCC. Customer notified. Total: ₹5,00,000 → $5,915.13 (5.12% cost).',
      },
    ],
    coverSteps: [
      {
        id: 1, from: 0, to: 3, direction: 'forward',
        messageType: 'pacs.008.001.13', messageName: 'FI to FI Customer Credit Transfer',
        description: 'SBI sends pacs.008 DIRECT to Wells Fargo (instruction)',
        duration: '~10 min', fee: 2500,
        nostroAction: 'Debit: SBI debits sender INR account',
        // XSD: FIToFICstmrCdtTrf > CdtTrfTxInf — cover method: SttlmMtd=COVE, direct A→D
        xmlSnippet: `<CdtTrfTxInf>
  <PmtId>
    <EndToEndId>E2E-INR-USD-001</EndToEndId>
    <UETR>${UETR}</UETR>
  </PmtId>
  <IntrBkSttlmAmt Ccy="INR">497500.00</IntrBkSttlmAmt>
  <ChrgBr>SHAR</ChrgBr>
  <ChrgsInf>
    <Amt Ccy="INR">2500.00</Amt>
    <Agt><FinInstnId><BICFI>SBININBB</BICFI></FinInstnId></Agt>
  </ChrgsInf>
  <InstgAgt><FinInstnId><BICFI>SBININBB</BICFI></FinInstnId></InstgAgt>
  <InstdAgt><FinInstnId><BICFI>WFBIUS6S</BICFI></FinInstnId></InstdAgt>
  <Dbtr>
    <Nm>Tata Industries Ltd</Nm>
    <PstlAdr><Ctry>IN</Ctry></PstlAdr>
  </Dbtr>
  <DbtrAgt><FinInstnId><BICFI>SBININBB</BICFI></FinInstnId></DbtrAgt>
  <CdtrAgt><FinInstnId><BICFI>WFBIUS6S</BICFI></FinInstnId></CdtrAgt>
  <Cdtr>
    <Nm>TechStart Inc</Nm>
    <PstlAdr><Ctry>US</Ctry></PstlAdr>
  </Cdtr>
  <RgltryRptg>
    <DbtCdtRptgInd>DEBT</DbtCdtRptgInd>
    <Authrty><Nm>Reserve Bank of India</Nm></Authrty>
  </RgltryRptg>
</CdtTrfTxInf>`,
        detail: 'Cover method instruction leg: SBI validates LRS ($250K/year limit), files Form A2 with RBI, debits ₹5,00,000 and deducts ₹2,500 fee. pacs.008 goes DIRECT to Wells Fargo — settlement follows via pacs.009 COV through Deutsche Bank.',
      },
      {
        id: 2, from: 0, to: 1, direction: 'forward',
        messageType: 'pacs.009.001.13', messageName: 'FI Credit Transfer (Cover)',
        description: 'SBI initiates cover payment to Deutsche Bank Mumbai',
        duration: '~30 min',
        nostroAction: 'Debit: SBI INR nostro → Credit: DB Mumbai INR account',
        // XSD: FICdtTrf > CdtTrfTxInf with UndrlygCstmrCdtTrf — same UETR
        xmlSnippet: `<FICdtTrf>
  <GrpHdr>
    <MsgId>SBI-GRP-0001</MsgId>
    <CreDtTm>2026-02-18T09:15:00+05:30</CreDtTm>
    <NbOfTxs>1</NbOfTxs>
    <SttlmInf><SttlmMtd>INDA</SttlmMtd></SttlmInf>
  </GrpHdr>
  <CdtTrfTxInf>
    <PmtId>
      <InstrId>SBI-COV-0001</InstrId>
      <EndToEndId>E2E-INR-USD-001</EndToEndId>
      <UETR>${UETR}</UETR>
    </PmtId>
    <IntrBkSttlmAmt Ccy="INR">497500.00</IntrBkSttlmAmt>
    <InstgAgt><FinInstnId><BICFI>SBININBB</BICFI></FinInstnId></InstgAgt>
    <InstdAgt><FinInstnId><BICFI>DEUTINBB</BICFI></FinInstnId></InstdAgt>
    <Dbtr><FinInstnId><BICFI>SBININBB</BICFI></FinInstnId></Dbtr>
    <DbtrAgt><FinInstnId><BICFI>SBININBB</BICFI></FinInstnId></DbtrAgt>
    <CdtrAgt><FinInstnId><BICFI>WFBIUS6S</BICFI></FinInstnId></CdtrAgt>
    <Cdtr><FinInstnId><BICFI>WFBIUS6S</BICFI></FinInstnId></Cdtr>
    <UndrlygCstmrCdtTrf>
      <Dbtr>
        <Nm>Tata Industries Ltd</Nm>
        <PstlAdr><Ctry>IN</Ctry></PstlAdr>
      </Dbtr>
      <DbtrAgt><FinInstnId><BICFI>SBININBB</BICFI></FinInstnId></DbtrAgt>
      <CdtrAgt><FinInstnId><BICFI>WFBIUS6S</BICFI></FinInstnId></CdtrAgt>
      <Cdtr>
        <Nm>TechStart Inc</Nm>
        <PstlAdr><Ctry>US</Ctry></PstlAdr>
      </Cdtr>
    </UndrlygCstmrCdtTrf>
  </CdtTrfTxInf>
</FICdtTrf>`,
        detail: 'Cover payment leg (parallel to step 1): SBI sends pacs.009 COV to Deutsche Bank Mumbai. Same UETR interlinks with the direct pacs.008. Party role shift: SBI is now Debtor (was Debtor Agent in pacs.008).',
      },
      {
        id: 3, from: 1, to: 0, direction: 'backward',
        messageType: 'pacs.002.001.15', messageName: 'Payment Status Report',
        description: 'Deutsche Mumbai acknowledges cover receipt to SBI',
        duration: '~30 sec',
        xmlSnippet: `<FIToFIPmtStsRpt>
  <GrpHdr>
    <MsgId>DEUT-STS-COV-0001</MsgId>
    <CreDtTm>2026-02-18T10:01:00+05:30</CreDtTm>
  </GrpHdr>
  <TxInfAndSts>
    <OrgnlUETR>${UETR}</OrgnlUETR>
    <TxSts>ACSP</TxSts>
    <StsRsnInf><Rsn><Cd>G000</Cd></Rsn></StsRsnInf>
  </TxInfAndSts>
</FIToFIPmtStsRpt>`,
        detail: 'Deutsche Mumbai sends ACSP (Accepted Settlement in Process) back to SBI confirming receipt of the pacs.009 COV cover payment. Same UETR links all messages.',
      },
      {
        id: 4, from: 1, to: 2, direction: 'forward',
        messageType: 'pacs.009.001.13', messageName: 'FI Credit Transfer (Cover)',
        description: 'Deutsche Mumbai converts INR→USD, routes cover to NY',
        duration: '4-8 hrs', fee: 1500,
        fxRate: 0.01195, fxFrom: 'INR', fxTo: 'USD',
        nostroAction: 'Debit: DB Mumbai INR → Credit: DB NY USD nostro',
        // XSD: FICdtTrf cover leg with FX
        xmlSnippet: `<FICdtTrf>
  <GrpHdr>
    <MsgId>DEUT-GRP-0001</MsgId>
    <CreDtTm>2026-02-18T09:15:00+00:00</CreDtTm>
    <NbOfTxs>1</NbOfTxs>
    <SttlmInf><SttlmMtd>INDA</SttlmMtd></SttlmInf>
  </GrpHdr>
  <CdtTrfTxInf>
    <PmtId>
      <InstrId>DEUT-COV-0001</InstrId>
      <EndToEndId>E2E-INR-USD-001</EndToEndId>
      <UETR>${UETR}</UETR>
    </PmtId>
    <IntrBkSttlmAmt Ccy="USD">5927.13</IntrBkSttlmAmt>
    <Dbtr><FinInstnId><BICFI>SBININBB</BICFI></FinInstnId></Dbtr>
    <DbtrAgt><FinInstnId><BICFI>SBININBB</BICFI></FinInstnId></DbtrAgt>
    <CdtrAgt><FinInstnId><BICFI>WFBIUS6S</BICFI></FinInstnId></CdtrAgt>
    <Cdtr><FinInstnId><BICFI>WFBIUS6S</BICFI></FinInstnId></Cdtr>
    <UndrlygCstmrCdtTrf>
      <Dbtr>
        <Nm>Tata Industries Ltd</Nm>
        <PstlAdr><Ctry>IN</Ctry></PstlAdr>
      </Dbtr>
      <DbtrAgt><FinInstnId><BICFI>SBININBB</BICFI></FinInstnId></DbtrAgt>
      <CdtrAgt><FinInstnId><BICFI>WFBIUS6S</BICFI></FinInstnId></CdtrAgt>
      <Cdtr>
        <Nm>TechStart Inc</Nm>
        <PstlAdr><Ctry>US</Ctry></PstlAdr>
      </Cdtr>
      <InstdAmt Ccy="INR">496000.00</InstdAmt>
    </UndrlygCstmrCdtTrf>
  </CdtTrfTxInf>
</FICdtTrf>`,
        detail: 'Cover settlement leg: DB Mumbai converts at 0.01195 INR/USD (mid-market: 0.01217, spread 1.8%). ₹1,500 bank processing fee. Intra-group transfer to DB New York. Settles through RTGS (India) for INR leg.',
      },
      {
        id: 5, from: 2, to: 1, direction: 'backward',
        messageType: 'camt.054.001.13', messageName: 'Bank to Customer Debit/Credit Notification',
        description: 'Deutsche NY confirms nostro credit to Deutsche Mumbai',
        duration: '~1 min',
        xmlSnippet: `<BkToCstmrDbtCdtNtfctn>
  <GrpHdr>
    <MsgId>DEUT-NTF-GRP-0001</MsgId>
    <CreDtTm>2026-02-18T16:00:00-05:00</CreDtTm>
  </GrpHdr>
  <Ntfctn>
    <Id>DEUT-NTF-0001</Id>
    <Acct><Id><Othr><Id>DEUT-MUM-USD-NOSTRO-001</Id></Othr></Id></Acct>
    <Ntry>
      <Amt Ccy="USD">5927.13</Amt>
      <CdtDbtInd>CRDT</CdtDbtInd>
      <Sts><Cd>BOOK</Cd></Sts>
      <BkTxCd>
        <Domn><Cd>PMNT</Cd><Fmly><Cd>RCDT</Cd><SubFmlyCd>ESCT</SubFmlyCd></Fmly></Domn>
      </BkTxCd>
      <NtryDtls><TxDtls><Refs>
        <EndToEndId>E2E-INR-USD-001</EndToEndId>
        <UETR>${UETR}</UETR>
      </Refs></TxDtls></NtryDtls>
    </Ntry>
  </Ntfctn>
</BkToCstmrDbtCdtNtfctn>`,
        detail: 'Deutsche Bank NY sends camt.054 credit notification confirming USD funds booked to the nostro account. Enables DB Mumbai to reconcile the cover payment.',
      },
      {
        id: 6, from: 2, to: 3, direction: 'forward',
        messageType: 'pacs.009.001.13', messageName: 'FI Credit Transfer (Cover)',
        description: 'Deutsche NY settles with Wells Fargo via Fedwire',
        duration: '2-4 hrs', fee: 12,
        nostroAction: 'Debit: DB NY USD → Credit: Wells Fargo via Fedwire',
        // XSD: FICdtTrf cover leg
        xmlSnippet: `<FICdtTrf>
  <GrpHdr>
    <MsgId>DEUT-NY-GRP-0001</MsgId>
    <CreDtTm>2026-02-18T09:15:00+00:00</CreDtTm>
    <NbOfTxs>1</NbOfTxs>
    <SttlmInf><SttlmMtd>INDA</SttlmMtd></SttlmInf>
  </GrpHdr>
  <CdtTrfTxInf>
    <PmtId>
      <InstrId>DEUT-NY-COV-0001</InstrId>
      <EndToEndId>E2E-INR-USD-001</EndToEndId>
      <UETR>${UETR}</UETR>
    </PmtId>
    <IntrBkSttlmAmt Ccy="USD">5915.13</IntrBkSttlmAmt>
    <Dbtr><FinInstnId><BICFI>SBININBB</BICFI></FinInstnId></Dbtr>
    <DbtrAgt><FinInstnId><BICFI>SBININBB</BICFI></FinInstnId></DbtrAgt>
    <CdtrAgt><FinInstnId><BICFI>WFBIUS6S</BICFI></FinInstnId></CdtrAgt>
    <Cdtr><FinInstnId><BICFI>WFBIUS6S</BICFI></FinInstnId></Cdtr>
    <UndrlygCstmrCdtTrf>
      <Dbtr>
        <Nm>Tata Industries Ltd</Nm>
        <PstlAdr><Ctry>IN</Ctry></PstlAdr>
      </Dbtr>
      <DbtrAgt><FinInstnId><BICFI>SBININBB</BICFI></FinInstnId></DbtrAgt>
      <CdtrAgt><FinInstnId><BICFI>WFBIUS6S</BICFI></FinInstnId></CdtrAgt>
      <Cdtr>
        <Nm>TechStart Inc</Nm>
        <PstlAdr><Ctry>US</Ctry></PstlAdr>
      </Cdtr>
    </UndrlygCstmrCdtTrf>
  </CdtTrfTxInf>
</FICdtTrf>`,
        detail: 'DB New York settles with Wells Fargo via Fedwire ($2T/day RTGS — immediate finality). $12 bank handling fee. Domestic USD settlement is fast.',
      },
      {
        id: 7, from: 3, to: 2, direction: 'backward',
        messageType: 'pacs.002.001.15', messageName: 'Payment Status Report',
        description: 'Wells Fargo confirms credit to Deutsche NY',
        duration: '~1 min',
        xmlSnippet: `<FIToFIPmtStsRpt>
  <GrpHdr>
    <MsgId>WFBI-STS-COV-0001</MsgId>
    <CreDtTm>2026-02-18T18:14:00-05:00</CreDtTm>
  </GrpHdr>
  <TxInfAndSts>
    <OrgnlUETR>${UETR}</OrgnlUETR>
    <TxSts>ACCC</TxSts>
    <AccptncDtTm>2026-02-18T18:14:00-05:00</AccptncDtTm>
  </TxInfAndSts>
</FIToFIPmtStsRpt>`,
        detail: 'Wells Fargo sends ACCC (Accepted Credit Completed) back to Deutsche Bank NY confirming beneficiary $5,915.13 credited.',
      },
      {
        id: 8, from: 3, to: 0, direction: 'backward',
        messageType: 'pacs.002.001.15', messageName: 'Payment Status Report (End-to-End)',
        description: 'Wells Fargo confirms credit, relayed to SBI',
        duration: '~3 min',
        // XSD: GrpHdr mandatory, order: OrgnlUETR > TxSts > AccptncDtTm
        xmlSnippet: `<FIToFIPmtStsRpt>
  <GrpHdr>
    <MsgId>WFBI-STS-0001</MsgId>
    <CreDtTm>2026-02-18T18:15:00-05:00</CreDtTm>
  </GrpHdr>
  <TxInfAndSts>
    <OrgnlUETR>${UETR}</OrgnlUETR>
    <TxSts>ACCC</TxSts>
    <AccptncDtTm>2026-02-18T18:15:00-05:00</AccptncDtTm>
  </TxInfAndSts>
</FIToFIPmtStsRpt>`,
        detail: 'Wells Fargo credits beneficiary with $5,915.13. ACCC sent DIRECT back to SBI. Total: ₹5,00,000 sent → $5,915.13 received (5.12% cost including FX spread + fees).',
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
    serialSteps: [
      {
        id: 1, from: 0, to: 1, direction: 'forward',
        messageType: 'pacs.008.001.13', messageName: 'FI to FI Customer Credit Transfer',
        description: 'Emirates NBD forwards pacs.008 to StanChart Dubai',
        duration: '~5 min', fee: 25,
        nostroAction: 'Debit: ENBD debits sender AED account',
        xmlSnippet: `<CdtTrfTxInf>
  <PmtId>
    <InstrId>ENBD-INS-0001</InstrId>
    <EndToEndId>E2E-AED-PHP-001</EndToEndId>
    <UETR>${UETR}</UETR>
  </PmtId>
  <IntrBkSttlmAmt Ccy="AED">4975.00</IntrBkSttlmAmt>
  <ChrgBr>SHAR</ChrgBr>
  <ChrgsInf>
    <Amt Ccy="AED">25.00</Amt>
    <Agt><FinInstnId><BICFI>ABORAEADXXX</BICFI></FinInstnId></Agt>
  </ChrgsInf>
  <InstgAgt><FinInstnId><BICFI>ABORAEADXXX</BICFI></FinInstnId></InstgAgt>
  <InstdAgt><FinInstnId><BICFI>SCBLAEAD</BICFI></FinInstnId></InstdAgt>
  <Dbtr>
    <Nm>Al Rasheed Trading LLC</Nm>
    <PstlAdr><Ctry>AE</Ctry></PstlAdr>
  </Dbtr>
  <DbtrAgt><FinInstnId><BICFI>ABORAEADXXX</BICFI></FinInstnId></DbtrAgt>
  <CdtrAgt><FinInstnId><BICFI>ABORPHMM</BICFI></FinInstnId></CdtrAgt>
  <Cdtr>
    <Nm>Maria Dela Cruz</Nm>
    <PstlAdr><Ctry>PH</Ctry></PstlAdr>
  </Cdtr>
  <Purp><Cd>BEXP</Cd></Purp>
</CdtTrfTxInf>`,
        detail: 'Serial method: ENBD processes OFW remittance (UAE→PH major corridor). Purpose code BEXP. pacs.008 forwarded hop-by-hop to StanChart Dubai (SttlmMtd=INDA).',
      },
      {
        id: 2, from: 1, to: 2, direction: 'forward',
        messageType: 'pacs.008.001.13', messageName: 'FI to FI Customer Credit Transfer',
        description: 'StanChart Dubai converts AED→PHP, routes to Manila',
        duration: '8-16 hrs', fee: 18,
        fxRate: 15.24, fxFrom: 'AED', fxTo: 'PHP',
        nostroAction: 'Debit: StanChart AED nostro → Credit: StanChart PHP nostro',
        xmlSnippet: `<CdtTrfTxInf>
  <PmtId>
    <InstrId>SCBL-DXB-0001</InstrId>
    <EndToEndId>E2E-AED-PHP-001</EndToEndId>
    <UETR>${UETR}</UETR>
  </PmtId>
  <IntrBkSttlmAmt Ccy="PHP">75518.52</IntrBkSttlmAmt>
  <InstdAmt Ccy="AED">4957.00</InstdAmt>
  <XchgRate>15.24</XchgRate>
  <ChrgBr>SHAR</ChrgBr>
  <ChrgsInf>
    <Amt Ccy="AED">18.00</Amt>
    <Agt><FinInstnId><BICFI>SCBLAEAD</BICFI></FinInstnId></Agt>
  </ChrgsInf>
  <InstgAgt><FinInstnId><BICFI>SCBLAEAD</BICFI></FinInstnId></InstgAgt>
  <InstdAgt><FinInstnId><BICFI>SCBLPHMM</BICFI></FinInstnId></InstdAgt>
  <Dbtr>
    <Nm>Al Rasheed Trading LLC</Nm>
    <PstlAdr><Ctry>AE</Ctry></PstlAdr>
  </Dbtr>
  <DbtrAgt><FinInstnId><BICFI>ABORAEADXXX</BICFI></FinInstnId></DbtrAgt>
  <CdtrAgt><FinInstnId><BICFI>ABORPHMM</BICFI></FinInstnId></CdtrAgt>
  <Cdtr>
    <Nm>Maria Dela Cruz</Nm>
    <PstlAdr><Ctry>PH</Ctry></PstlAdr>
  </Cdtr>
</CdtTrfTxInf>`,
        detail: 'Serial method: StanChart Dubai FX at 15.24 (mid: 15.56, spread 2.1%). AED 18 fee. Intra-group transfer to Manila. Good time zone overlap (GMT+4 → GMT+8).',
      },
      {
        id: 3, from: 2, to: 3, direction: 'forward',
        messageType: 'pacs.008.001.13', messageName: 'FI to FI Customer Credit Transfer',
        description: 'StanChart Manila settles with BDO via PhilPaSS',
        duration: '2-4 hrs', fee: 10,
        nostroAction: 'Debit: StanChart PHP → Credit: BDO via PhilPaSS (RTGS)',
        xmlSnippet: `<CdtTrfTxInf>
  <PmtId>
    <InstrId>SCBL-MNL-0001</InstrId>
    <EndToEndId>E2E-AED-PHP-001</EndToEndId>
    <UETR>${UETR}</UETR>
  </PmtId>
  <IntrBkSttlmAmt Ccy="PHP">75008.52</IntrBkSttlmAmt>
  <ChrgBr>SHAR</ChrgBr>
  <ChrgsInf>
    <Amt Ccy="PHP">510.00</Amt>
    <Agt><FinInstnId><BICFI>SCBLPHMM</BICFI></FinInstnId></Agt>
  </ChrgsInf>
  <InstgAgt><FinInstnId><BICFI>SCBLPHMM</BICFI></FinInstnId></InstgAgt>
  <InstdAgt><FinInstnId><BICFI>ABORPHMM</BICFI></FinInstnId></InstdAgt>
  <Dbtr>
    <Nm>Al Rasheed Trading LLC</Nm>
    <PstlAdr><Ctry>AE</Ctry></PstlAdr>
  </Dbtr>
  <DbtrAgt><FinInstnId><BICFI>ABORAEADXXX</BICFI></FinInstnId></DbtrAgt>
  <CdtrAgt><FinInstnId><BICFI>ABORPHMM</BICFI></FinInstnId></CdtrAgt>
  <Cdtr>
    <Nm>Maria Dela Cruz</Nm>
    <PstlAdr><Ctry>PH</Ctry></PstlAdr>
  </Cdtr>
</CdtTrfTxInf>`,
        detail: 'Serial method: StanChart Manila settles with BDO via PhilPaSS (RTGS). ₱510 fee (~$10). Final hop.',
      },
      {
        id: 4, from: 3, to: 2, direction: 'backward',
        messageType: 'pacs.002.001.15', messageName: 'Payment Status Report',
        description: 'BDO confirms credit to StanChart Manila',
        duration: '~1 min',
        xmlSnippet: `<FIToFIPmtStsRpt>
  <GrpHdr>
    <MsgId>BDO-STS-0001</MsgId>
    <CreDtTm>2026-02-19T16:30:00+08:00</CreDtTm>
  </GrpHdr>
  <TxInfAndSts>
    <OrgnlUETR>${UETR}</OrgnlUETR>
    <TxSts>ACCC</TxSts>
    <AccptncDtTm>2026-02-19T16:30:00+08:00</AccptncDtTm>
  </TxInfAndSts>
</FIToFIPmtStsRpt>`,
        detail: 'BDO credits ₱75,008.52. Sends ACCC back to Standard Chartered Manila.',
      },
      {
        id: 5, from: 2, to: 1, direction: 'backward',
        messageType: 'pacs.002.001.15', messageName: 'Payment Status Report',
        description: 'StanChart Manila relays to StanChart Dubai',
        duration: '~30 sec',
        xmlSnippet: `<FIToFIPmtStsRpt>
  <GrpHdr>
    <MsgId>SCBL-STS-0001</MsgId>
    <CreDtTm>2026-02-19T16:31:00+08:00</CreDtTm>
  </GrpHdr>
  <TxInfAndSts>
    <OrgnlUETR>${UETR}</OrgnlUETR>
    <TxSts>ACSP</TxSts>
    <StsRsnInf><Rsn><Cd>G000</Cd></Rsn></StsRsnInf>
  </TxInfAndSts>
</FIToFIPmtStsRpt>`,
        detail: 'Standard Chartered Manila relays ACSP back to Standard Chartered Dubai via intra-group network.',
      },
      {
        id: 6, from: 1, to: 0, direction: 'backward',
        messageType: 'pacs.002.001.15', messageName: 'Payment Status Report (End-to-End)',
        description: 'StanChart Dubai sends final ACCC to Emirates NBD',
        duration: '~30 sec',
        xmlSnippet: `<FIToFIPmtStsRpt>
  <GrpHdr>
    <MsgId>SCBL-STS-0002</MsgId>
    <CreDtTm>2026-02-19T16:32:00+08:00</CreDtTm>
  </GrpHdr>
  <TxInfAndSts>
    <OrgnlUETR>${UETR}</OrgnlUETR>
    <TxSts>ACCC</TxSts>
    <AccptncDtTm>2026-02-19T16:32:00+08:00</AccptncDtTm>
  </TxInfAndSts>
</FIToFIPmtStsRpt>`,
        detail: 'Emirates NBD receives final ACCC. OFW family receives ₱75,008.52. AED 5,000 → ₱75,008. Cost: 3.45%.',
      },
    ],
    coverSteps: [
      {
        id: 1, from: 0, to: 3, direction: 'forward',
        messageType: 'pacs.008.001.13', messageName: 'FI to FI Customer Credit Transfer',
        description: 'Emirates NBD sends pacs.008 DIRECT to BDO (instruction)',
        duration: '~5 min', fee: 25,
        nostroAction: 'Debit: ENBD debits sender AED account',
        // XSD: FIToFICstmrCdtTrf > CdtTrfTxInf — cover method: SttlmMtd=COVE, direct A→D
        xmlSnippet: `<CdtTrfTxInf>
  <PmtId>
    <EndToEndId>E2E-AED-PHP-001</EndToEndId>
    <UETR>${UETR}</UETR>
  </PmtId>
  <IntrBkSttlmAmt Ccy="AED">4975.00</IntrBkSttlmAmt>
  <ChrgBr>SHAR</ChrgBr>
  <ChrgsInf>
    <Amt Ccy="AED">25.00</Amt>
    <Agt><FinInstnId><BICFI>ABORAEADXXX</BICFI></FinInstnId></Agt>
  </ChrgsInf>
  <InstgAgt><FinInstnId><BICFI>ABORAEADXXX</BICFI></FinInstnId></InstgAgt>
  <InstdAgt><FinInstnId><BICFI>ABORPHMM</BICFI></FinInstnId></InstdAgt>
  <Dbtr>
    <Nm>Al Rasheed Trading LLC</Nm>
    <PstlAdr><Ctry>AE</Ctry></PstlAdr>
  </Dbtr>
  <DbtrAgt><FinInstnId><BICFI>ABORAEADXXX</BICFI></FinInstnId></DbtrAgt>
  <CdtrAgt><FinInstnId><BICFI>ABORPHMM</BICFI></FinInstnId></CdtrAgt>
  <Cdtr>
    <Nm>Maria Dela Cruz</Nm>
    <PstlAdr><Ctry>PH</Ctry></PstlAdr>
  </Cdtr>
  <Purp><Cd>BEXP</Cd></Purp>
</CdtTrfTxInf>`,
        detail: 'Cover method instruction leg: ENBD processes remittance (UAE→PH is a major OFW corridor — 2.1M Filipino workers). Purpose code BEXP. pacs.008 goes DIRECT to BDO — settlement follows via pacs.009 COV through StanChart.',
      },
      {
        id: 2, from: 0, to: 1, direction: 'forward',
        messageType: 'pacs.009.001.13', messageName: 'FI Credit Transfer (Cover)',
        description: 'ENBD initiates cover payment to StanChart Dubai',
        duration: '~15 min',
        nostroAction: 'Debit: ENBD AED nostro → Credit: StanChart Dubai AED account',
        // XSD: FICdtTrf > CdtTrfTxInf with UndrlygCstmrCdtTrf — same UETR
        xmlSnippet: `<FICdtTrf>
  <GrpHdr>
    <MsgId>ENBD-GRP-0001</MsgId>
    <CreDtTm>2026-02-18T09:15:00+04:00</CreDtTm>
    <NbOfTxs>1</NbOfTxs>
    <SttlmInf><SttlmMtd>INDA</SttlmMtd></SttlmInf>
  </GrpHdr>
  <CdtTrfTxInf>
    <PmtId>
      <InstrId>ENBD-COV-0001</InstrId>
      <EndToEndId>E2E-AED-PHP-001</EndToEndId>
      <UETR>${UETR}</UETR>
    </PmtId>
    <IntrBkSttlmAmt Ccy="AED">4975.00</IntrBkSttlmAmt>
    <InstgAgt><FinInstnId><BICFI>ABORAEADXXX</BICFI></FinInstnId></InstgAgt>
    <InstdAgt><FinInstnId><BICFI>SCBLAEAD</BICFI></FinInstnId></InstdAgt>
    <Dbtr><FinInstnId><BICFI>ABORAEADXXX</BICFI></FinInstnId></Dbtr>
    <DbtrAgt><FinInstnId><BICFI>ABORAEADXXX</BICFI></FinInstnId></DbtrAgt>
    <CdtrAgt><FinInstnId><BICFI>ABORPHMM</BICFI></FinInstnId></CdtrAgt>
    <Cdtr><FinInstnId><BICFI>ABORPHMM</BICFI></FinInstnId></Cdtr>
    <UndrlygCstmrCdtTrf>
      <Dbtr>
        <Nm>Al Rasheed Trading LLC</Nm>
        <PstlAdr><Ctry>AE</Ctry></PstlAdr>
      </Dbtr>
      <DbtrAgt><FinInstnId><BICFI>ABORAEADXXX</BICFI></FinInstnId></DbtrAgt>
      <CdtrAgt><FinInstnId><BICFI>ABORPHMM</BICFI></FinInstnId></CdtrAgt>
      <Cdtr>
        <Nm>Maria Dela Cruz</Nm>
        <PstlAdr><Ctry>PH</Ctry></PstlAdr>
      </Cdtr>
    </UndrlygCstmrCdtTrf>
  </CdtTrfTxInf>
</FICdtTrf>`,
        detail: 'Cover payment leg (parallel to step 1): ENBD sends pacs.009 COV to StanChart Dubai. Same UETR interlinks with the direct pacs.008. Party role shift: ENBD is now Debtor (was Debtor Agent in pacs.008).',
      },
      {
        id: 3, from: 1, to: 0, direction: 'backward',
        messageType: 'pacs.002.001.15', messageName: 'Payment Status Report',
        description: 'StanChart Dubai acknowledges cover receipt to Emirates NBD',
        duration: '~30 sec',
        xmlSnippet: `<FIToFIPmtStsRpt>
  <GrpHdr>
    <MsgId>SCBL-STS-COV-0001</MsgId>
    <CreDtTm>2026-02-19T09:01:00+04:00</CreDtTm>
  </GrpHdr>
  <TxInfAndSts>
    <OrgnlUETR>${UETR}</OrgnlUETR>
    <TxSts>ACSP</TxSts>
    <StsRsnInf><Rsn><Cd>G000</Cd></Rsn></StsRsnInf>
  </TxInfAndSts>
</FIToFIPmtStsRpt>`,
        detail: 'StanChart Dubai sends ACSP (Accepted Settlement in Process) back to Emirates NBD confirming receipt of the pacs.009 COV cover payment. Same UETR links all messages.',
      },
      {
        id: 4, from: 1, to: 2, direction: 'forward',
        messageType: 'pacs.009.001.13', messageName: 'FI Credit Transfer (Cover)',
        description: 'StanChart Dubai converts AED→PHP, routes to Manila',
        duration: '8-16 hrs', fee: 18,
        fxRate: 15.24, fxFrom: 'AED', fxTo: 'PHP',
        nostroAction: 'Debit: StanChart AED nostro → Credit: StanChart PHP nostro',
        // XSD: FICdtTrf cover leg with FX
        xmlSnippet: `<FICdtTrf>
  <GrpHdr>
    <MsgId>SCBL-DXB-GRP-0001</MsgId>
    <CreDtTm>2026-02-18T09:15:00+00:00</CreDtTm>
    <NbOfTxs>1</NbOfTxs>
    <SttlmInf><SttlmMtd>INDA</SttlmMtd></SttlmInf>
  </GrpHdr>
  <CdtTrfTxInf>
    <PmtId>
      <InstrId>SCBL-DXB-COV-0001</InstrId>
      <EndToEndId>E2E-AED-PHP-001</EndToEndId>
      <UETR>${UETR}</UETR>
    </PmtId>
    <IntrBkSttlmAmt Ccy="PHP">75518.52</IntrBkSttlmAmt>
    <Dbtr><FinInstnId><BICFI>ABORAEADXXX</BICFI></FinInstnId></Dbtr>
    <DbtrAgt><FinInstnId><BICFI>ABORAEADXXX</BICFI></FinInstnId></DbtrAgt>
    <CdtrAgt><FinInstnId><BICFI>ABORPHMM</BICFI></FinInstnId></CdtrAgt>
    <Cdtr><FinInstnId><BICFI>ABORPHMM</BICFI></FinInstnId></Cdtr>
    <UndrlygCstmrCdtTrf>
      <Dbtr>
        <Nm>Al Rasheed Trading LLC</Nm>
        <PstlAdr><Ctry>AE</Ctry></PstlAdr>
      </Dbtr>
      <DbtrAgt><FinInstnId><BICFI>ABORAEADXXX</BICFI></FinInstnId></DbtrAgt>
      <CdtrAgt><FinInstnId><BICFI>ABORPHMM</BICFI></FinInstnId></CdtrAgt>
      <Cdtr>
        <Nm>Maria Dela Cruz</Nm>
        <PstlAdr><Ctry>PH</Ctry></PstlAdr>
      </Cdtr>
      <InstdAmt Ccy="AED">4957.00</InstdAmt>
    </UndrlygCstmrCdtTrf>
  </CdtTrfTxInf>
</FICdtTrf>`,
        detail: 'Intra-group StanChart cover leg. FX at 15.24 (mid: 15.56, spread 2.1%). AED 18 bank processing fee. Time zone overlap is good (Dubai GMT+4, Manila GMT+8) but BSP clearing hours apply.',
      },
      {
        id: 5, from: 2, to: 1, direction: 'backward',
        messageType: 'camt.054.001.13', messageName: 'Bank to Customer Debit/Credit Notification',
        description: 'StanChart Manila confirms nostro credit to StanChart Dubai',
        duration: '~1 min',
        xmlSnippet: `<BkToCstmrDbtCdtNtfctn>
  <GrpHdr>
    <MsgId>SCBL-MNL-NTF-GRP-0001</MsgId>
    <CreDtTm>2026-02-19T14:30:00+08:00</CreDtTm>
  </GrpHdr>
  <Ntfctn>
    <Id>SCBL-MNL-NTF-0001</Id>
    <Acct><Id><Othr><Id>SCBL-DXB-PHP-NOSTRO-001</Id></Othr></Id></Acct>
    <Ntry>
      <Amt Ccy="PHP">75518.52</Amt>
      <CdtDbtInd>CRDT</CdtDbtInd>
      <Sts><Cd>BOOK</Cd></Sts>
      <BkTxCd>
        <Domn><Cd>PMNT</Cd><Fmly><Cd>RCDT</Cd><SubFmlyCd>ESCT</SubFmlyCd></Fmly></Domn>
      </BkTxCd>
      <NtryDtls><TxDtls><Refs>
        <EndToEndId>E2E-AED-PHP-001</EndToEndId>
        <UETR>${UETR}</UETR>
      </Refs></TxDtls></NtryDtls>
    </Ntry>
  </Ntfctn>
</BkToCstmrDbtCdtNtfctn>`,
        detail: 'StanChart Manila sends camt.054 credit notification confirming PHP funds booked to the nostro account. Enables StanChart Dubai to reconcile the cover payment.',
      },
      {
        id: 6, from: 2, to: 3, direction: 'forward',
        messageType: 'pacs.009.001.13', messageName: 'FI Credit Transfer (Cover)',
        description: 'StanChart Manila settles with BDO via PhilPaSS',
        duration: '2-4 hrs', fee: 10,
        nostroAction: 'Debit: StanChart PHP → Credit: BDO via PhilPaSS (RTGS)',
        // XSD: FICdtTrf cover leg
        xmlSnippet: `<FICdtTrf>
  <GrpHdr>
    <MsgId>SCBL-MNL-GRP-0001</MsgId>
    <CreDtTm>2026-02-18T09:15:00+00:00</CreDtTm>
    <NbOfTxs>1</NbOfTxs>
    <SttlmInf><SttlmMtd>INDA</SttlmMtd></SttlmInf>
  </GrpHdr>
  <CdtTrfTxInf>
    <PmtId>
      <InstrId>SCBL-MNL-COV-0001</InstrId>
      <EndToEndId>E2E-AED-PHP-001</EndToEndId>
      <UETR>${UETR}</UETR>
    </PmtId>
    <IntrBkSttlmAmt Ccy="PHP">75008.52</IntrBkSttlmAmt>
    <Dbtr><FinInstnId><BICFI>ABORAEADXXX</BICFI></FinInstnId></Dbtr>
    <DbtrAgt><FinInstnId><BICFI>ABORAEADXXX</BICFI></FinInstnId></DbtrAgt>
    <CdtrAgt><FinInstnId><BICFI>ABORPHMM</BICFI></FinInstnId></CdtrAgt>
    <Cdtr><FinInstnId><BICFI>ABORPHMM</BICFI></FinInstnId></Cdtr>
    <UndrlygCstmrCdtTrf>
      <Dbtr>
        <Nm>Al Rasheed Trading LLC</Nm>
        <PstlAdr><Ctry>AE</Ctry></PstlAdr>
      </Dbtr>
      <DbtrAgt><FinInstnId><BICFI>ABORAEADXXX</BICFI></FinInstnId></DbtrAgt>
      <CdtrAgt><FinInstnId><BICFI>ABORPHMM</BICFI></FinInstnId></CdtrAgt>
      <Cdtr>
        <Nm>Maria Dela Cruz</Nm>
        <PstlAdr><Ctry>PH</Ctry></PstlAdr>
      </Cdtr>
    </UndrlygCstmrCdtTrf>
  </CdtTrfTxInf>
</FICdtTrf>`,
        detail: 'StanChart Manila settles with BDO via PhilPaSS (Philippine Payment and Settlement System — domestic RTGS). ₱510 bank handling fee (~$10). Domestic leg is fast.',
      },
      {
        id: 7, from: 3, to: 2, direction: 'backward',
        messageType: 'pacs.002.001.15', messageName: 'Payment Status Report',
        description: 'BDO confirms credit to StanChart Manila',
        duration: '~1 min',
        xmlSnippet: `<FIToFIPmtStsRpt>
  <GrpHdr>
    <MsgId>BDO-STS-COV-0001</MsgId>
    <CreDtTm>2026-02-19T16:29:00+08:00</CreDtTm>
  </GrpHdr>
  <TxInfAndSts>
    <OrgnlUETR>${UETR}</OrgnlUETR>
    <TxSts>ACCC</TxSts>
    <AccptncDtTm>2026-02-19T16:29:00+08:00</AccptncDtTm>
  </TxInfAndSts>
</FIToFIPmtStsRpt>`,
        detail: 'BDO sends ACCC (Accepted Credit Completed) back to StanChart Manila confirming beneficiary ₱75,008.52 credited.',
      },
      {
        id: 8, from: 3, to: 0, direction: 'backward',
        messageType: 'pacs.002.001.15', messageName: 'Payment Status Report (End-to-End)',
        description: 'BDO confirms credit, relayed to Emirates NBD',
        duration: '~3 min',
        // XSD: GrpHdr mandatory, order: OrgnlUETR > TxSts > AccptncDtTm
        xmlSnippet: `<FIToFIPmtStsRpt>
  <GrpHdr>
    <MsgId>BDO-STS-0001</MsgId>
    <CreDtTm>2026-02-19T16:30:00+08:00</CreDtTm>
  </GrpHdr>
  <TxInfAndSts>
    <OrgnlUETR>${UETR}</OrgnlUETR>
    <TxSts>ACCC</TxSts>
    <AccptncDtTm>2026-02-19T16:30:00+08:00</AccptncDtTm>
  </TxInfAndSts>
</FIToFIPmtStsRpt>`,
        detail: 'BDO credits beneficiary ₱75,008.52. ACCC sent DIRECT back to ENBD. OFW family receives funds. AED 5,000 sent → ₱75,008 received. Cost: 3.45%.',
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
    serialSteps: [
      {
        id: 1, from: 0, to: 1, direction: 'forward',
        messageType: 'pacs.008.001.13', messageName: 'FI to FI Customer Credit Transfer',
        description: 'MUFG forwards pacs.008 to HSBC Tokyo',
        duration: '~5 min', fee: 5500,
        nostroAction: 'Debit: MUFG debits sender JPY account',
        xmlSnippet: `<CdtTrfTxInf>
  <PmtId>
    <InstrId>MUFG-INS-0001</InstrId>
    <EndToEndId>E2E-JPY-MXN-001</EndToEndId>
    <UETR>${UETR}</UETR>
  </PmtId>
  <IntrBkSttlmAmt Ccy="JPY">994500.00</IntrBkSttlmAmt>
  <ChrgBr>SHAR</ChrgBr>
  <ChrgsInf>
    <Amt Ccy="JPY">5500.00</Amt>
    <Agt><FinInstnId><BICFI>BOTKJPJT</BICFI></FinInstnId></Agt>
  </ChrgsInf>
  <InstgAgt><FinInstnId><BICFI>BOTKJPJT</BICFI></FinInstnId></InstgAgt>
  <InstdAgt><FinInstnId><BICFI>HSBCJPJT</BICFI></FinInstnId></InstdAgt>
  <Dbtr>
    <Nm>Yamato Corp</Nm>
    <PstlAdr><Ctry>JP</Ctry></PstlAdr>
  </Dbtr>
  <DbtrAgt><FinInstnId><BICFI>BOTKJPJT</BICFI></FinInstnId></DbtrAgt>
  <CdtrAgt><FinInstnId><BICFI>BCMRMXMM</BICFI></FinInstnId></CdtrAgt>
  <Cdtr>
    <Nm>Ciudad Automotive SA de CV</Nm>
    <PstlAdr><Ctry>MX</Ctry></PstlAdr>
  </Cdtr>
</CdtTrfTxInf>`,
        detail: 'Serial method: MUFG debits ¥1,000,000, deducts ¥5,500 fee. pacs.008 forwarded to HSBC Tokyo (SttlmMtd=INDA). Exotic pair requires double FX (JPY→USD→MXN).',
      },
      {
        id: 2, from: 1, to: 2, direction: 'forward',
        messageType: 'pacs.008.001.13', messageName: 'FI to FI Customer Credit Transfer',
        description: 'HSBC Tokyo converts JPY→USD, routes to HSBC NY',
        duration: '8-16 hrs', fee: 4000,
        fxRate: 0.006557, fxFrom: 'JPY', fxTo: 'USD',
        nostroAction: 'Debit: HSBC JPY nostro → Credit: HSBC NY USD nostro',
        xmlSnippet: `<CdtTrfTxInf>
  <PmtId>
    <InstrId>HSBC-TKY-0001</InstrId>
    <EndToEndId>E2E-JPY-MXN-001</EndToEndId>
    <UETR>${UETR}</UETR>
  </PmtId>
  <IntrBkSttlmAmt Ccy="USD">6492.14</IntrBkSttlmAmt>
  <InstdAmt Ccy="JPY">990500.00</InstdAmt>
  <XchgRate>0.006557</XchgRate>
  <ChrgBr>SHAR</ChrgBr>
  <ChrgsInf>
    <Amt Ccy="JPY">4000.00</Amt>
    <Agt><FinInstnId><BICFI>HSBCJPJT</BICFI></FinInstnId></Agt>
  </ChrgsInf>
  <InstgAgt><FinInstnId><BICFI>HSBCJPJT</BICFI></FinInstnId></InstgAgt>
  <InstdAgt><FinInstnId><BICFI>MRMDUS33</BICFI></FinInstnId></InstdAgt>
  <Dbtr>
    <Nm>Yamato Corp</Nm>
    <PstlAdr><Ctry>JP</Ctry></PstlAdr>
  </Dbtr>
  <DbtrAgt><FinInstnId><BICFI>BOTKJPJT</BICFI></FinInstnId></DbtrAgt>
  <CdtrAgt><FinInstnId><BICFI>BCMRMXMM</BICFI></FinInstnId></CdtrAgt>
  <Cdtr>
    <Nm>Ciudad Automotive SA de CV</Nm>
    <PstlAdr><Ctry>MX</Ctry></PstlAdr>
  </Cdtr>
</CdtTrfTxInf>`,
        detail: 'Serial method: First FX hop JPY→USD at 0.006557. ¥4,000 fee. Time zone gap: Tokyo closes at 15:00 JST, NY opens at 09:00 EST — potential overnight delay.',
      },
      {
        id: 3, from: 2, to: 3, direction: 'forward',
        messageType: 'pacs.008.001.13', messageName: 'FI to FI Customer Credit Transfer',
        description: 'HSBC NY converts USD→MXN, settles with BBVA via SPEI',
        duration: '12-24 hrs', fee: 2000,
        fxRate: 17.41, fxFrom: 'USD', fxTo: 'MXN',
        nostroAction: 'Debit: HSBC NY USD → Credit: BBVA via SPEI (Mexico RTGS)',
        xmlSnippet: `<CdtTrfTxInf>
  <PmtId>
    <InstrId>HSBC-NY-0001</InstrId>
    <EndToEndId>E2E-JPY-MXN-001</EndToEndId>
    <UETR>${UETR}</UETR>
  </PmtId>
  <IntrBkSttlmAmt Ccy="MXN">112367.48</IntrBkSttlmAmt>
  <InstdAmt Ccy="USD">6452.14</InstdAmt>
  <XchgRate>17.41</XchgRate>
  <ChrgBr>SHAR</ChrgBr>
  <ChrgsInf>
    <Amt Ccy="USD">40.00</Amt>
    <Agt><FinInstnId><BICFI>MRMDUS33</BICFI></FinInstnId></Agt>
  </ChrgsInf>
  <InstgAgt><FinInstnId><BICFI>MRMDUS33</BICFI></FinInstnId></InstgAgt>
  <InstdAgt><FinInstnId><BICFI>BCMRMXMM</BICFI></FinInstnId></InstdAgt>
  <Dbtr>
    <Nm>Yamato Corp</Nm>
    <PstlAdr><Ctry>JP</Ctry></PstlAdr>
  </Dbtr>
  <DbtrAgt><FinInstnId><BICFI>BOTKJPJT</BICFI></FinInstnId></DbtrAgt>
  <CdtrAgt><FinInstnId><BICFI>BCMRMXMM</BICFI></FinInstnId></CdtrAgt>
  <Cdtr>
    <Nm>Ciudad Automotive SA de CV</Nm>
    <PstlAdr><Ctry>MX</Ctry></PstlAdr>
  </Cdtr>
</CdtTrfTxInf>`,
        detail: 'Serial method: Second FX hop USD→MXN at 17.41. $40 fee. Settlement via SPEI (07:00-17:30 CST). Combined FX spread: 2.8%.',
      },
      {
        id: 4, from: 3, to: 2, direction: 'backward',
        messageType: 'pacs.002.001.15', messageName: 'Payment Status Report',
        description: 'BBVA confirms credit to HSBC NY',
        duration: '~1 min',
        xmlSnippet: `<FIToFIPmtStsRpt>
  <GrpHdr>
    <MsgId>BBVA-STS-0001</MsgId>
    <CreDtTm>2026-02-20T11:30:00-06:00</CreDtTm>
  </GrpHdr>
  <TxInfAndSts>
    <OrgnlUETR>${UETR}</OrgnlUETR>
    <TxSts>ACCC</TxSts>
    <AccptncDtTm>2026-02-20T11:30:00-06:00</AccptncDtTm>
  </TxInfAndSts>
</FIToFIPmtStsRpt>`,
        detail: 'BBVA credits MX$112,367.48. Sends ACCC back to HSBC New York.',
      },
      {
        id: 5, from: 2, to: 1, direction: 'backward',
        messageType: 'pacs.002.001.15', messageName: 'Payment Status Report',
        description: 'HSBC NY relays confirmation to HSBC Tokyo',
        duration: '~30 sec',
        xmlSnippet: `<FIToFIPmtStsRpt>
  <GrpHdr>
    <MsgId>HSBC-STS-0001</MsgId>
    <CreDtTm>2026-02-20T11:31:00-06:00</CreDtTm>
  </GrpHdr>
  <TxInfAndSts>
    <OrgnlUETR>${UETR}</OrgnlUETR>
    <TxSts>ACSP</TxSts>
    <StsRsnInf><Rsn><Cd>G000</Cd></Rsn></StsRsnInf>
  </TxInfAndSts>
</FIToFIPmtStsRpt>`,
        detail: 'HSBC New York relays ACSP back to HSBC Tokyo via intra-group network.',
      },
      {
        id: 6, from: 1, to: 0, direction: 'backward',
        messageType: 'pacs.002.001.15', messageName: 'Payment Status Report (End-to-End)',
        description: 'HSBC Tokyo sends final ACCC to MUFG',
        duration: '~30 sec',
        xmlSnippet: `<FIToFIPmtStsRpt>
  <GrpHdr>
    <MsgId>HSBC-STS-0002</MsgId>
    <CreDtTm>2026-02-20T11:32:00-06:00</CreDtTm>
  </GrpHdr>
  <TxInfAndSts>
    <OrgnlUETR>${UETR}</OrgnlUETR>
    <TxSts>ACCC</TxSts>
    <AccptncDtTm>2026-02-20T11:32:00-06:00</AccptncDtTm>
  </TxInfAndSts>
</FIToFIPmtStsRpt>`,
        detail: 'MUFG receives final ACCC. Customer notified. ¥1,000,000 → MX$112,367.48. Cost: 4.2%. 36-72 hrs across 3 time zones.',
      },
    ],
    coverSteps: [
      {
        id: 1, from: 0, to: 3, direction: 'forward',
        messageType: 'pacs.008.001.13', messageName: 'FI to FI Customer Credit Transfer',
        description: 'MUFG sends pacs.008 DIRECT to BBVA (instruction)',
        duration: '~5 min', fee: 5500,
        nostroAction: 'Debit: MUFG debits sender JPY account',
        // XSD: FIToFICstmrCdtTrf > CdtTrfTxInf — cover method: SttlmMtd=COVE, direct A→D
        xmlSnippet: `<CdtTrfTxInf>
  <PmtId>
    <EndToEndId>E2E-JPY-MXN-001</EndToEndId>
    <UETR>${UETR}</UETR>
  </PmtId>
  <IntrBkSttlmAmt Ccy="JPY">994500.00</IntrBkSttlmAmt>
  <ChrgBr>SHAR</ChrgBr>
  <ChrgsInf>
    <Amt Ccy="JPY">5500.00</Amt>
    <Agt><FinInstnId><BICFI>BOTKJPJT</BICFI></FinInstnId></Agt>
  </ChrgsInf>
  <InstgAgt><FinInstnId><BICFI>BOTKJPJT</BICFI></FinInstnId></InstgAgt>
  <InstdAgt><FinInstnId><BICFI>BCMRMXMM</BICFI></FinInstnId></InstdAgt>
  <Dbtr>
    <Nm>Yamato Corp</Nm>
    <PstlAdr><Ctry>JP</Ctry></PstlAdr>
  </Dbtr>
  <DbtrAgt><FinInstnId><BICFI>BOTKJPJT</BICFI></FinInstnId></DbtrAgt>
  <CdtrAgt><FinInstnId><BICFI>BCMRMXMM</BICFI></FinInstnId></CdtrAgt>
  <Cdtr>
    <Nm>Ciudad Automotive SA de CV</Nm>
    <PstlAdr><Ctry>MX</Ctry></PstlAdr>
  </Cdtr>
</CdtTrfTxInf>`,
        detail: 'Cover method instruction leg: MUFG (Japan\'s largest bank) debits ¥1,000,000. pacs.008 goes DIRECT to BBVA México — settlement follows via pacs.009 COV. JPY→MXN is exotic (no direct JPY/MXN market, requires USD intermediation).',
      },
      {
        id: 2, from: 0, to: 1, direction: 'forward',
        messageType: 'pacs.009.001.13', messageName: 'FI Credit Transfer (Cover)',
        description: 'MUFG initiates cover payment to HSBC Tokyo',
        duration: '~20 min',
        nostroAction: 'Debit: MUFG JPY nostro → Credit: HSBC Tokyo JPY account',
        // XSD: FICdtTrf > CdtTrfTxInf with UndrlygCstmrCdtTrf — same UETR
        xmlSnippet: `<FICdtTrf>
  <GrpHdr>
    <MsgId>MUFG-GRP-0001</MsgId>
    <CreDtTm>2026-02-18T09:15:00+00:00</CreDtTm>
    <NbOfTxs>1</NbOfTxs>
    <SttlmInf><SttlmMtd>INDA</SttlmMtd></SttlmInf>
  </GrpHdr>
  <CdtTrfTxInf>
    <PmtId>
      <InstrId>MUFG-COV-0001</InstrId>
      <EndToEndId>E2E-JPY-MXN-001</EndToEndId>
      <UETR>${UETR}</UETR>
    </PmtId>
    <IntrBkSttlmAmt Ccy="JPY">994500.00</IntrBkSttlmAmt>
    <InstgAgt><FinInstnId><BICFI>BOTKJPJT</BICFI></FinInstnId></InstgAgt>
    <InstdAgt><FinInstnId><BICFI>HSBCJPJT</BICFI></FinInstnId></InstdAgt>
    <Dbtr><FinInstnId><BICFI>BOTKJPJT</BICFI></FinInstnId></Dbtr>
    <DbtrAgt><FinInstnId><BICFI>BOTKJPJT</BICFI></FinInstnId></DbtrAgt>
    <CdtrAgt><FinInstnId><BICFI>BCMRMXMM</BICFI></FinInstnId></CdtrAgt>
    <Cdtr><FinInstnId><BICFI>BCMRMXMM</BICFI></FinInstnId></Cdtr>
    <UndrlygCstmrCdtTrf>
      <Dbtr>
        <Nm>Yamato Corp</Nm>
        <PstlAdr><Ctry>JP</Ctry></PstlAdr>
      </Dbtr>
      <DbtrAgt><FinInstnId><BICFI>BOTKJPJT</BICFI></FinInstnId></DbtrAgt>
      <CdtrAgt><FinInstnId><BICFI>BCMRMXMM</BICFI></FinInstnId></CdtrAgt>
      <Cdtr>
        <Nm>Ciudad Automotive SA de CV</Nm>
        <PstlAdr><Ctry>MX</Ctry></PstlAdr>
      </Cdtr>
    </UndrlygCstmrCdtTrf>
  </CdtTrfTxInf>
</FICdtTrf>`,
        detail: 'Cover payment leg (parallel to step 1): MUFG sends pacs.009 COV to HSBC Tokyo. Same UETR interlinks with the direct pacs.008. Settlement via BOJ-NET (Bank of Japan RTGS).',
      },
      {
        id: 3, from: 1, to: 0, direction: 'backward',
        messageType: 'pacs.002.001.15', messageName: 'Payment Status Report',
        description: 'HSBC Tokyo acknowledges cover receipt to MUFG',
        duration: '~30 sec',
        xmlSnippet: `<FIToFIPmtStsRpt>
  <GrpHdr>
    <MsgId>HSBC-STS-COV-0001</MsgId>
    <CreDtTm>2026-02-20T09:01:00+09:00</CreDtTm>
  </GrpHdr>
  <TxInfAndSts>
    <OrgnlUETR>${UETR}</OrgnlUETR>
    <TxSts>ACSP</TxSts>
    <StsRsnInf><Rsn><Cd>G000</Cd></Rsn></StsRsnInf>
  </TxInfAndSts>
</FIToFIPmtStsRpt>`,
        detail: 'HSBC Tokyo sends ACSP (Accepted Settlement in Process) back to MUFG confirming receipt of the pacs.009 COV cover payment. Same UETR links all messages.',
      },
      {
        id: 4, from: 1, to: 2, direction: 'forward',
        messageType: 'pacs.009.001.13', messageName: 'FI Credit Transfer (Cover)',
        description: 'HSBC Tokyo converts JPY→USD, routes cover via NY',
        duration: '8-16 hrs', fee: 4000,
        fxRate: 0.006557, fxFrom: 'JPY', fxTo: 'USD',
        nostroAction: 'Debit: HSBC JPY nostro → Credit: HSBC NY USD nostro',
        // XSD: FICdtTrf cover leg with FX
        xmlSnippet: `<FICdtTrf>
  <GrpHdr>
    <MsgId>HSBC-TKY-GRP-0001</MsgId>
    <CreDtTm>2026-02-18T09:15:00+00:00</CreDtTm>
    <NbOfTxs>1</NbOfTxs>
    <SttlmInf><SttlmMtd>INDA</SttlmMtd></SttlmInf>
  </GrpHdr>
  <CdtTrfTxInf>
    <PmtId>
      <InstrId>HSBC-TKY-COV-0001</InstrId>
      <EndToEndId>E2E-JPY-MXN-001</EndToEndId>
      <UETR>${UETR}</UETR>
    </PmtId>
    <IntrBkSttlmAmt Ccy="USD">6492.14</IntrBkSttlmAmt>
    <Dbtr><FinInstnId><BICFI>BOTKJPJT</BICFI></FinInstnId></Dbtr>
    <DbtrAgt><FinInstnId><BICFI>BOTKJPJT</BICFI></FinInstnId></DbtrAgt>
    <CdtrAgt><FinInstnId><BICFI>BCMRMXMM</BICFI></FinInstnId></CdtrAgt>
    <Cdtr><FinInstnId><BICFI>BCMRMXMM</BICFI></FinInstnId></Cdtr>
    <UndrlygCstmrCdtTrf>
      <Dbtr>
        <Nm>Yamato Corp</Nm>
        <PstlAdr><Ctry>JP</Ctry></PstlAdr>
      </Dbtr>
      <DbtrAgt><FinInstnId><BICFI>BOTKJPJT</BICFI></FinInstnId></DbtrAgt>
      <CdtrAgt><FinInstnId><BICFI>BCMRMXMM</BICFI></FinInstnId></CdtrAgt>
      <Cdtr>
        <Nm>Ciudad Automotive SA de CV</Nm>
        <PstlAdr><Ctry>MX</Ctry></PstlAdr>
      </Cdtr>
      <InstdAmt Ccy="JPY">990500.00</InstdAmt>
    </UndrlygCstmrCdtTrf>
  </CdtTrfTxInf>
</FICdtTrf>`,
        detail: 'First FX hop (cover leg): JPY→USD at 0.006557. Exotic pair requires two conversions (JPY→USD→MXN). ¥4,000 bank processing fee. Time zone gap: Tokyo closes at 15:00 JST, NY opens at 09:00 EST — potential overnight delay.',
      },
      {
        id: 5, from: 2, to: 1, direction: 'backward',
        messageType: 'camt.054.001.13', messageName: 'Bank to Customer Debit/Credit Notification',
        description: 'HSBC NY confirms nostro credit to HSBC Tokyo',
        duration: '~1 min',
        xmlSnippet: `<BkToCstmrDbtCdtNtfctn>
  <GrpHdr>
    <MsgId>HSBC-NY-NTF-GRP-0001</MsgId>
    <CreDtTm>2026-02-20T09:30:00-05:00</CreDtTm>
  </GrpHdr>
  <Ntfctn>
    <Id>HSBC-NY-NTF-0001</Id>
    <Acct><Id><Othr><Id>HSBC-TKY-USD-NOSTRO-001</Id></Othr></Id></Acct>
    <Ntry>
      <Amt Ccy="USD">6492.14</Amt>
      <CdtDbtInd>CRDT</CdtDbtInd>
      <Sts><Cd>BOOK</Cd></Sts>
      <BkTxCd>
        <Domn><Cd>PMNT</Cd><Fmly><Cd>RCDT</Cd><SubFmlyCd>ESCT</SubFmlyCd></Fmly></Domn>
      </BkTxCd>
      <NtryDtls><TxDtls><Refs>
        <EndToEndId>E2E-JPY-MXN-001</EndToEndId>
        <UETR>${UETR}</UETR>
      </Refs></TxDtls></NtryDtls>
    </Ntry>
  </Ntfctn>
</BkToCstmrDbtCdtNtfctn>`,
        detail: 'HSBC New York sends camt.054 credit notification confirming USD funds booked to the nostro account. Enables HSBC Tokyo to reconcile the cover payment.',
      },
      {
        id: 6, from: 2, to: 3, direction: 'forward',
        messageType: 'pacs.009.001.13', messageName: 'FI Credit Transfer (Cover)',
        description: 'HSBC NY converts USD→MXN, settles with BBVA',
        duration: '12-24 hrs', fee: 2000,
        fxRate: 17.41, fxFrom: 'USD', fxTo: 'MXN',
        nostroAction: 'Debit: HSBC NY USD → Credit: BBVA via SPEI (Mexico RTGS)',
        // XSD: FICdtTrf cover leg with second FX
        xmlSnippet: `<FICdtTrf>
  <GrpHdr>
    <MsgId>HSBC-NY-GRP-0001</MsgId>
    <CreDtTm>2026-02-18T09:15:00+00:00</CreDtTm>
    <NbOfTxs>1</NbOfTxs>
    <SttlmInf><SttlmMtd>INDA</SttlmMtd></SttlmInf>
  </GrpHdr>
  <CdtTrfTxInf>
    <PmtId>
      <InstrId>HSBC-NY-COV-0001</InstrId>
      <EndToEndId>E2E-JPY-MXN-001</EndToEndId>
      <UETR>${UETR}</UETR>
    </PmtId>
    <IntrBkSttlmAmt Ccy="MXN">112367.48</IntrBkSttlmAmt>
    <Dbtr><FinInstnId><BICFI>BOTKJPJT</BICFI></FinInstnId></Dbtr>
    <DbtrAgt><FinInstnId><BICFI>BOTKJPJT</BICFI></FinInstnId></DbtrAgt>
    <CdtrAgt><FinInstnId><BICFI>BCMRMXMM</BICFI></FinInstnId></CdtrAgt>
    <Cdtr><FinInstnId><BICFI>BCMRMXMM</BICFI></FinInstnId></Cdtr>
    <UndrlygCstmrCdtTrf>
      <Dbtr>
        <Nm>Yamato Corp</Nm>
        <PstlAdr><Ctry>JP</Ctry></PstlAdr>
      </Dbtr>
      <DbtrAgt><FinInstnId><BICFI>BOTKJPJT</BICFI></FinInstnId></DbtrAgt>
      <CdtrAgt><FinInstnId><BICFI>BCMRMXMM</BICFI></FinInstnId></CdtrAgt>
      <Cdtr>
        <Nm>Ciudad Automotive SA de CV</Nm>
        <PstlAdr><Ctry>MX</Ctry></PstlAdr>
      </Cdtr>
      <InstdAmt Ccy="USD">6452.14</InstdAmt>
    </UndrlygCstmrCdtTrf>
  </CdtTrfTxInf>
</FICdtTrf>`,
        detail: 'Second FX hop (cover leg): USD→MXN at 17.41. Settlement via SPEI (Mexico\'s RTGS — operates 07:00-17:30 CST). Combined FX spread: 2.8% across two conversions. $40 HSBC bank processing fee.',
      },
      {
        id: 7, from: 3, to: 2, direction: 'backward',
        messageType: 'pacs.002.001.15', messageName: 'Payment Status Report',
        description: 'BBVA confirms credit to HSBC NY',
        duration: '~1 min',
        xmlSnippet: `<FIToFIPmtStsRpt>
  <GrpHdr>
    <MsgId>BBVA-STS-COV-0001</MsgId>
    <CreDtTm>2026-02-20T11:29:00-06:00</CreDtTm>
  </GrpHdr>
  <TxInfAndSts>
    <OrgnlUETR>${UETR}</OrgnlUETR>
    <TxSts>ACCC</TxSts>
    <AccptncDtTm>2026-02-20T11:29:00-06:00</AccptncDtTm>
  </TxInfAndSts>
</FIToFIPmtStsRpt>`,
        detail: 'BBVA sends ACCC (Accepted Credit Completed) back to HSBC New York confirming beneficiary MX$112,367.48 credited.',
      },
      {
        id: 8, from: 3, to: 0, direction: 'backward',
        messageType: 'pacs.002.001.15', messageName: 'Payment Status Report (End-to-End)',
        description: 'BBVA confirms credit, relayed to MUFG',
        duration: '~5 min',
        // XSD: GrpHdr mandatory, order: OrgnlUETR > TxSts > AccptncDtTm
        xmlSnippet: `<FIToFIPmtStsRpt>
  <GrpHdr>
    <MsgId>BBVA-STS-0001</MsgId>
    <CreDtTm>2026-02-20T11:30:00-06:00</CreDtTm>
  </GrpHdr>
  <TxInfAndSts>
    <OrgnlUETR>${UETR}</OrgnlUETR>
    <TxSts>ACCC</TxSts>
    <AccptncDtTm>2026-02-20T11:30:00-06:00</AccptncDtTm>
  </TxInfAndSts>
</FIToFIPmtStsRpt>`,
        detail: 'BBVA credits MX$112,367.48. ACCC sent DIRECT back to MUFG. Journey: 36-72 hrs spanning 3 time zones (JST→EST→CST). ¥1,000,000 → MX$112,367. Cost: 4.2%. Two FX conversions doubled the spread.',
      },
    ],
  },
];

// Helper: calculate running totals for a corridor simulation
export function simulateCorridor(corridor: Corridor, steps: Step[], amount: number) {
  let currentAmount = amount;
  const currency = corridor.sourceCurrency;
  const result = steps.map(step => {
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
  return result;
}
