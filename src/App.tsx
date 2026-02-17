import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
    Box, Container, Tabs, Text, Paper, NumberInput, Group, Badge, Title,
    Stack, Code, Tooltip, ActionIcon,
} from '@mantine/core';
import {
    IconPlayerPlay, IconPlayerPause,
    IconRefresh, IconBuildingBank,
    IconBook, IconTable, IconActivity, IconCoins, IconMail, IconWorld,
    IconClock, IconTrendingDown, IconCircleCheck,
} from '@tabler/icons-react';
import { CORRIDORS, type Corridor, type Step } from './corridors';

// ─── Layout constants for flow SVG ───────────────────────────
const NODE_W = 150, NODE_H = 70, GAP_X = 60, PAD_X = 30, PAD_Y = 40;
const getNodeX = (i: number) => PAD_X + i * (NODE_W + GAP_X);
const getNodeCX = (i: number) => getNodeX(i) + NODE_W / 2;

// ─── Flow Visualization (SVG) ────────────────────────────────
function FlowVisualization({ corridor, currentStep }: { corridor: Corridor; currentStep: number }) {
    const banks = corridor.banks;
    const totalW = banks.length * NODE_W + (banks.length - 1) * GAP_X + PAD_X * 2;
    const totalH = NODE_H + PAD_Y * 2 + 30;

    const nodeY = PAD_Y;
    const nodeCY = nodeY + NODE_H / 2;

    // Which banks are active/completed
    const activeStep = corridor.steps[currentStep];
    const completedBanks = new Set<number>();
    const activeBanks = new Set<number>();
    for (let i = 0; i < currentStep; i++) {
        completedBanks.add(corridor.steps[i].from);
        completedBanks.add(corridor.steps[i].to);
    }
    if (activeStep) {
        activeBanks.add(activeStep.from);
        activeBanks.add(activeStep.to);
    }

    return (
        <svg viewBox={`0 0 ${totalW} ${totalH}`} className="flow-svg" preserveAspectRatio="xMidYMid meet">
            {/* Edges */}
            {corridor.steps.map((step, i) => {
                const fromX = getNodeCX(step.from);
                const toX = getNodeCX(step.to);
                const isForward = step.direction === 'forward';
                const isActive = i === currentStep;
                const isCompleted = i < currentStep;
                const y = isForward ? nodeCY - 8 : nodeCY + 8;
                const midX = (fromX + toX) / 2;

                // Curved path
                const curveY = isForward ? y - 25 : y + 25;

                if (!isActive && !isCompleted) return null;

                return (
                    <g key={`edge-${i}`}>
                        <path
                            d={`M ${fromX} ${y} Q ${midX} ${curveY} ${toX} ${y}`}
                            className={`flow-edge ${step.direction} ${isActive ? 'active' : ''}`}
                            style={{ opacity: isCompleted ? 0.4 : 1 }}
                        />
                        {/* Arrow */}
                        <polygon
                            points={`${toX},${y} ${toX + (isForward ? -10 : 10)},${y - 5} ${toX + (isForward ? -10 : 10)},${y + 5}`}
                            className={`flow-edge-arrow ${step.direction}`}
                            style={{ opacity: isCompleted ? 0.4 : 1 }}
                        />
                    </g>
                );
            })}

            {/* Bank Nodes */}
            {banks.map((bank, i) => {
                const x = getNodeX(i);
                const isActive = activeBanks.has(i);
                const isCompleted = completedBanks.has(i) && !isActive;
                const cls = `flow-bank-node ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`;

                return (
                    <g key={`node-${i}`} className={cls}>
                        <rect x={x} y={nodeY} width={NODE_W} height={NODE_H} />
                        <text x={x + NODE_W / 2} y={nodeY + 22} className="flow-bank-label">
                            {bank.name.length > 18 ? bank.name.slice(0, 16) + '…' : bank.name}
                        </text>
                        <text x={x + NODE_W / 2} y={nodeY + 40} className="flow-bank-bic">{bank.bic}</text>
                        <text x={x + NODE_W / 2} y={nodeY + 56} className="flow-bank-country">
                            {bank.countryCode} • {bank.role === 'originator' ? 'Sender' : bank.role === 'beneficiary' ? 'Receiver' : 'Intermediary'}
                        </text>
                    </g>
                );
            })}
        </svg>
    );
}

// ─── Step Detail Panel ───────────────────────────────────────
function StepDetail({ step, corridor }: { step: Step; corridor: Corridor }) {
    const fromBank = corridor.banks[step.from];
    const toBank = corridor.banks[step.to];

    return (
        <div className="animate-in">
            {/* Header badges */}
            <div className="message-detail">
                <div className="detail-header">
                    <Badge
                        className={`message-badge ${step.direction}`}
                        variant="outline"
                        size="lg"
                    >
                        {step.direction === 'forward' ? '→' : '←'} {step.messageType}
                    </Badge>
                    <Text size="sm" fw={600}>{step.messageName}</Text>
                </div>
            </div>

            {/* Info Grid */}
            <div className="info-grid">
                <div className="info-cell">
                    <div className="label">From</div>
                    <div className="value">{fromBank.name}</div>
                </div>
                <div className="info-cell">
                    <div className="label">To</div>
                    <div className="value">{toBank.name}</div>
                </div>
                <div className="info-cell">
                    <div className="label">Duration</div>
                    <div className="value mono blue">{step.duration}</div>
                </div>
                {step.fee && (
                    <div className="info-cell">
                        <div className="label">Fee Deducted</div>
                        <div className="value red">
                            {corridor.sourceCurrency === 'JPY' ? '¥' : corridor.sourceCurrency === 'INR' ? '₹' :
                                corridor.sourceCurrency === 'AED' ? 'AED ' : '$'}{step.fee.toLocaleString()}
                        </div>
                    </div>
                )}
                {step.fxRate && (
                    <>
                        <div className="info-cell">
                            <div className="label">FX Rate</div>
                            <div className="value mono amber">{step.fxFrom}→{step.fxTo}: {step.fxRate}</div>
                        </div>
                    </>
                )}
            </div>

            {/* Nostro action */}
            {step.nostroAction && (
                <div className="nostro-action">
                    <IconBuildingBank size={16} /> {step.nostroAction}
                </div>
            )}

            {/* Description */}
            <div className="step-description">{step.detail}</div>

            {/* XML Snippet */}
            <Text size="xs" fw={600} mb={6} mt={16} c="dimmed">ISO 20022 MESSAGE</Text>
            <pre className="xml-snippet">{step.xmlSnippet.trim()}</pre>
        </div>
    );
}

// ─── Stats Summary Panel ─────────────────────────────────────
function StatsSummary({ corridor, amount }: { corridor: Corridor; amount: number }) {
    const totalFees = corridor.steps
        .filter(s => s.fee && s.direction === 'forward')
        .reduce((sum, s) => sum + (s.fee || 0), 0);
    const received = (amount - totalFees) * corridor.fxRate;
    const sym = corridor.sourceCurrency === 'JPY' ? '¥' : corridor.sourceCurrency === 'INR' ? '₹'
        : corridor.sourceCurrency === 'AED' ? 'AED ' : '$';
    const tgtSym = corridor.targetCurrency === 'NGN' ? '₦' : corridor.targetCurrency === 'PHP' ? '₱'
        : corridor.targetCurrency === 'MXN' ? 'MX$' : corridor.targetCurrency === 'GBP' ? '£' : '$';

    return (
        <div className="stats-summary">
            <div className="stat-card">
                <div className="stat-value" style={{ color: 'var(--ink-primary)' }}>{sym}{amount.toLocaleString()}</div>
                <div className="stat-label">Amount Sent ({corridor.sourceCurrency})</div>
            </div>
            <div className="stat-card">
                <div className="stat-value" style={{ color: 'var(--accent-red)' }}>{sym}{totalFees.toLocaleString()}</div>
                <div className="stat-label">Total Fees</div>
            </div>
            <div className="stat-card">
                <div className="stat-value" style={{ color: 'var(--accent-amber)' }}>{corridor.fxSpread}</div>
                <div className="stat-label">FX Spread</div>
            </div>
            <div className="stat-card">
                <div className="stat-value" style={{ color: 'var(--accent-green)' }}>{tgtSym}{Math.round(received).toLocaleString()}</div>
                <div className="stat-label">Amount Received ({corridor.targetCurrency})</div>
            </div>
            <div className="stat-card">
                <div className="stat-value" style={{ color: 'var(--accent-red)' }}>{corridor.totalCostPct}</div>
                <div className="stat-label">Total Cost</div>
            </div>
            <div className="stat-card">
                <div className="stat-value" style={{ color: 'var(--accent-blue)' }}>{corridor.settlementTime}</div>
                <div className="stat-label">Settlement Time</div>
            </div>
        </div>
    );
}

// ─── Learn Panel ─────────────────────────────────────────────
function LearnPanel() {
    return (
        <Paper className="brut-card" p="lg">
            <div className="learn-section">
                <Title order={3} mb="sm">How Correspondent Banking Works</Title>
                <p>
                    When you send money across borders, your bank probably doesn't have a direct relationship with the
                    receiving bank. Instead, your payment hops through a chain of <strong>correspondent banks</strong> — intermediaries
                    that maintain accounts with each other called <strong>nostro</strong> (ours at theirs) and <strong>vostro</strong> (theirs at ours) accounts.
                </p>

                <h3><IconCoins size={18} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: 6 }} />The Scale of Trapped Liquidity</h3>
                <span className="highlight-stat">$794 Billion</span>
                <p>
                    That's the amount sitting in pre-funded nostro accounts globally. Banks must park capital at every
                    correspondent in the chain — money that could otherwise be deployed for lending or investment.
                </p>
                <p style={{ fontSize: '0.75rem', opacity: 0.7, fontStyle: 'italic' }}>
                    Source: Industry estimate based on BIS CPMI / FSB correspondent banking studies (2016 baseline data).
                    See <a href="https://www.bis.org/cpmi/publ/d147.htm" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--info)' }}>BIS CPMI Report on Correspondent Banking</a>.
                </p>

                <h3><IconMail size={18} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: 6 }} />ISO 20022: The New Standard</h3>
                <p>
                    As of November 2025, SWIFT has fully migrated from legacy MT messages (MT103) to ISO 20022 MX messages.
                    The key messages you'll see in this simulator:
                </p>
                <div className="table-scroll">
                    <table className="ref-table">
                        <thead>
                            <tr><th>Message</th><th>Name</th><th>Direction</th><th>Purpose</th></tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="mono">pacs.008</td>
                                <td>FI to FI Customer Credit Transfer</td>
                                <td><Badge color="blue" size="sm">→ Forward</Badge></td>
                                <td>Moves the payment instruction hop-by-hop through the chain</td>
                            </tr>
                            <tr>
                                <td className="mono">pacs.009</td>
                                <td>FI Credit Transfer (Cover)</td>
                                <td><Badge color="blue" size="sm">→ Forward</Badge></td>
                                <td>Settles funds via correspondent (cover method)</td>
                            </tr>
                            <tr>
                                <td className="mono">pacs.002</td>
                                <td>Payment Status Report</td>
                                <td><Badge color="green" size="sm">← Backward</Badge></td>
                                <td>Status feedback: ACSP (accepted), ACCC (completed), RJCT (rejected)</td>
                            </tr>
                            <tr>
                                <td className="mono">camt.054</td>
                                <td>Debit/Credit Notification</td>
                                <td><Badge color="green" size="sm">← Backward</Badge></td>
                                <td>Nostro account booking confirmation for reconciliation</td>
                            </tr>
                            <tr>
                                <td className="mono">camt.056</td>
                                <td>Cancellation Request</td>
                                <td><Badge color="red" size="sm">← Backward</Badge></td>
                                <td>Request to cancel a payment already in the chain</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <h3><IconWorld size={18} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: 6 }} />SWIFT gpi & UETR</h3>
                <p>
                    Every payment gets a <strong>UETR</strong> (Unique End-to-End Transaction Reference) — a UUID that tracks the
                    payment across every hop. The SWIFT gpi Tracker provides real-time visibility into where a payment is,
                    how much has been deducted in fees, and when it was credited. 50% of gpi payments are credited within 30 minutes.
                </p>

                <h3><IconClock size={18} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: 6 }} />Time Zones & Settlement Windows</h3>
                <p>
                    One of the biggest hidden costs is <strong>time zone mismatch</strong>. RTGS systems (Fedwire, CHAPS, BOJ-NET)
                    only operate during local business hours. A payment from Tokyo to New York hits an overnight gap where
                    no settlement is possible — potentially adding 12+ hours to the journey.
                </p>

                <h3><IconTrendingDown size={18} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: 6 }} />Why Costs Vary So Much</h3>
                <p>
                    Corridor costs range from 1.5% (major currency pairs like USD→EUR) to 8.78% (USA→Nigeria) due to:
                </p>
                <ul style={{ color: 'var(--ink-secondary)', lineHeight: 1.8, fontSize: '0.9rem' }}>
                    <li><strong>Chain length:</strong> More hops = more fees (each intermediary takes a cut)</li>
                    <li><strong>FX spread:</strong> Illiquid currency pairs have wider spreads</li>
                    <li><strong>Compliance costs:</strong> High-risk corridors require enhanced due diligence</li>
                    <li><strong>Trapped liquidity:</strong> Banks charge more for exotic nostro positions</li>
                </ul>
            </div>
        </Paper>
    );
}

// ─── Reference Panel ─────────────────────────────────────────
function ReferencePanel() {
    return (
        <Stack gap="lg">
            <Paper className="brut-card" p="lg">
                <Title order={4} mb="md">Settlement Stack Comparison</Title>
                <div className="table-scroll">
                    <table className="ref-table">
                        <thead>
                            <tr><th>Method</th><th>Speed</th><th>Cost</th><th>Finality</th><th>Coverage</th></tr>
                        </thead>
                        <tbody>
                            <tr><td><strong>Correspondent Banking</strong></td><td>1-5 days</td><td>2-9%</td><td>Settlement at each hop</td><td>Global (200+ countries)</td></tr>
                            <tr><td><strong>Card Networks</strong></td><td>2-3 days</td><td>1.5-3.5%</td><td>Auth instant, settlement deferred</td><td>Point of sale focused</td></tr>
                            <tr><td><strong>IPS (Instant Payments)</strong></td><td>&lt;10 seconds</td><td>0.1-0.5%</td><td>Irrevocable</td><td>Domestic (expanding cross-border)</td></tr>
                            <tr><td><strong>Stablecoins</strong></td><td>~15 seconds</td><td>~$0.01</td><td>Probabilistic (12 confirmations)</td><td>Unbanked-friendly</td></tr>
                            <tr><td><strong>Tokenized Deposits</strong></td><td>&lt;1 second</td><td>Near zero</td><td>Atomic (DvP)</td><td>Pilots only (MAS, SNB)</td></tr>
                        </tbody>
                    </table>
                </div>
            </Paper>

            <Paper className="brut-card" p="lg">
                <Title order={4} mb="md">Corridor Cost Comparison</Title>
                <div className="table-scroll">
                    <table className="ref-table">
                        <thead>
                            <tr><th>Corridor</th><th>Avg Cost</th><th>Time</th><th>Key Issue</th></tr>
                        </thead>
                        <tbody>
                            <tr><td>USA → UK</td><td className="mono">1.5%</td><td>1 day</td><td>Well-served, high competition</td></tr>
                            <tr><td>Singapore → UK</td><td className="mono">2.1%</td><td>1-2 days</td><td>Good corridor, HSBC bridge</td></tr>
                            <tr><td>UAE → Philippines</td><td className="mono">3.45%</td><td>1-2 days</td><td>OFW corridor, improving</td></tr>
                            <tr><td>Japan → Mexico</td><td className="mono">4.2%</td><td>2-3 days</td><td>Exotic cross: JPY→USD→MXN</td></tr>
                            <tr><td>India → USA</td><td className="mono">5.12%</td><td>1 day</td><td>RBI LRS compliance overhead</td></tr>
                            <tr><td>USA → Nigeria</td><td className="mono">8.78%</td><td>2-4 days</td><td>De-risking, compliance costs</td></tr>
                            <tr><td>Italy → Bangladesh</td><td className="mono">8.45%</td><td>2-4 days</td><td>Highest G20 remittance cost</td></tr>
                        </tbody>
                    </table>
                </div>
            </Paper>

            <Paper className="brut-card" p="lg">
                <Title order={4} mb="md">ISO 20022 Payment Message Families</Title>
                <div className="table-scroll">
                    <table className="ref-table">
                        <thead>
                            <tr><th>Family</th><th>Category</th><th>Key Messages</th><th>Replaces MT</th></tr>
                        </thead>
                        <tbody>
                            <tr><td className="mono">pacs</td><td>Payment Clearing & Settlement</td><td>pacs.008, pacs.009, pacs.002, pacs.004</td><td>MT103, MT202, MT199, MT196</td></tr>
                            <tr><td className="mono">camt</td><td>Cash Management</td><td>camt.053, camt.054, camt.056, camt.029</td><td>MT940, MT900/910, MT192, MT196</td></tr>
                            <tr><td className="mono">pain</td><td>Payment Initiation</td><td>pain.001, pain.002</td><td>MT101</td></tr>
                            <tr><td className="mono">acmt</td><td>Account Management</td><td>acmt.023, acmt.024</td><td>MT210</td></tr>
                            <tr><td className="mono">reda</td><td>Reference Data</td><td>reda.014, reda.015</td><td>MT564, MT565</td></tr>
                        </tbody>
                    </table>
                </div>
            </Paper>
        </Stack>
    );
}

// ─── Main App ────────────────────────────────────────────────
export default function App() {
    const [selectedCorridor, setSelectedCorridor] = useState<string>(CORRIDORS[0].id);
    const [amount, setAmount] = useState<number>(CORRIDORS[0].defaultAmount);
    const [currentStep, setCurrentStep] = useState<number>(-1);
    const [isPlaying, setIsPlaying] = useState(false);

    const corridor = useMemo(() =>
        CORRIDORS.find(c => c.id === selectedCorridor)!,
        [selectedCorridor]
    );

    const selectCorridor = useCallback((id: string) => {
        const c = CORRIDORS.find(x => x.id === id)!;
        setSelectedCorridor(id);
        setAmount(c.defaultAmount);
        setCurrentStep(-1);
        setIsPlaying(false);
    }, []);

    const nextStep = useCallback(() => {
        setCurrentStep(prev => {
            if (prev >= corridor.steps.length - 1) {
                setIsPlaying(false);
                return prev;
            }
            return prev + 1;
        });
    }, [corridor]);

    const prevStep = useCallback(() => {
        setCurrentStep(prev => Math.max(-1, prev - 1));
    }, []);

    const reset = useCallback(() => {
        setCurrentStep(-1);
        setIsPlaying(false);
    }, []);

    // Auto-play
    const togglePlay = useCallback(() => {
        if (currentStep >= corridor.steps.length - 1) {
            setCurrentStep(0);
            setIsPlaying(true);
        } else {
            setIsPlaying(prev => !prev);
            if (currentStep === -1) setCurrentStep(0);
        }
    }, [currentStep, corridor]);

    // Auto-advance timer — useEffect + ref to avoid stale closures
    const isPlayingRef = useRef(isPlaying);
    isPlayingRef.current = isPlaying;
    useEffect(() => {
        const interval = setInterval(() => {
            if (isPlayingRef.current) nextStep();
        }, 2500);
        return () => clearInterval(interval);
    }, [nextStep]);

    // Auto-scroll SVG container to active bank on mobile
    const flowContainerRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (currentStep < 0 || !flowContainerRef.current) return;
        const step = corridor.steps[currentStep];
        if (!step) return;
        // Scroll to center the "to" bank node
        const targetBankIdx = step.to;
        const el = flowContainerRef.current;
        // SVG coordinates → pixel ratio
        const svg = el.querySelector('svg');
        if (!svg) return;
        const svgRect = svg.getBoundingClientRect();
        const totalSvgW = corridor.banks.length * NODE_W + (corridor.banks.length - 1) * GAP_X + PAD_X * 2;
        const scale = svgRect.width / totalSvgW;
        const bankCenterPx = getNodeCX(targetBankIdx) * scale;
        const scrollTarget = bankCenterPx - el.clientWidth / 2;
        el.scrollTo({ left: Math.max(0, scrollTarget), behavior: 'smooth' });
    }, [currentStep, corridor]);

    const isComplete = currentStep >= corridor.steps.length - 1;
    const activeStep = currentStep >= 0 ? corridor.steps[currentStep] : null;

    return (
        <Box mih="100vh">
            <Container size="lg" py="md">
                {/* Header */}
                <header className="app-header">
                    <Title order={1}><IconBuildingBank size={28} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: 8 }} />Correspondent Banking Flow Simulator</Title>
                    <p className="subtitle">Watch money flow through the correspondent banking system — step by step</p>
                </header>

                <Tabs defaultValue="simulator" variant="outline" radius="md">
                    <Tabs.List mb="lg">
                        <Tabs.Tab value="simulator" leftSection={<IconActivity size={16} />}>Simulator</Tabs.Tab>
                        <Tabs.Tab value="learn" leftSection={<IconBook size={16} />}>Learn</Tabs.Tab>
                        <Tabs.Tab value="reference" leftSection={<IconTable size={16} />}>Reference</Tabs.Tab>
                    </Tabs.List>

                    {/* ─── SIMULATOR TAB ────────────────────────── */}
                    <Tabs.Panel value="simulator">
                        {/* Corridor Selector */}
                        <Paper className="brut-card" p="lg" mb="lg">
                            <Text size="sm" fw={700} mb="sm" tt="uppercase" c="dimmed" style={{ letterSpacing: '0.08em' }}>
                                Select Corridor
                            </Text>
                            <div className="corridor-selector">
                                {CORRIDORS.map(c => (
                                    <button
                                        key={c.id}
                                        className={`corridor-btn ${c.id === selectedCorridor ? 'active' : ''}`}
                                        onClick={() => selectCorridor(c.id)}
                                    >
                                        <span className="flags">{c.senderFlag} → {c.receiverFlag}</span>
                                        <span className="route">{c.sourceCurrency} → {c.targetCurrency}</span>
                                        <span className="meta">{c.totalCostPct} cost · {c.settlementTime}</span>
                                    </button>
                                ))}
                            </div>

                            {/* Amount Input */}
                            <Group gap="md" mt="md" align="flex-end">
                                <NumberInput
                                    label={`Amount (${corridor.sourceCurrency})`}
                                    value={amount}
                                    onChange={(v) => setAmount(typeof v === 'number' ? v : corridor.defaultAmount)}
                                    min={100}
                                    step={1000}
                                    thousandSeparator=","
                                    styles={{ input: { fontFamily: 'var(--font-mono)', fontWeight: 600 } }}
                                    w={200}
                                />
                                <Text size="sm" c="dimmed" pb={8}>
                                    FX Rate: <Code>{corridor.fxRate}</Code> · Spread: {corridor.fxSpread}
                                </Text>
                            </Group>
                        </Paper>

                        {/* Flow Visualization */}
                        <Paper className="brut-card" p="lg" mb="lg">
                            <Text size="sm" fw={700} mb="xs" tt="uppercase" c="dimmed" style={{ letterSpacing: '0.08em' }}>
                                Payment Flow — {corridor.name}
                            </Text>
                            <div className="flow-container" ref={flowContainerRef}>
                                <FlowVisualization corridor={corridor} currentStep={currentStep} />
                            </div>

                            {/* Step Timeline */}
                            <div className="step-timeline">
                                {corridor.steps.map((step, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <Tooltip label={`${step.messageType}: ${step.description}`} withArrow position="top">
                                            <div
                                                className={`step-dot ${step.direction} ${i === currentStep ? 'active' : ''} ${i < currentStep ? 'completed' : ''}`}
                                                onClick={() => { setCurrentStep(i); setIsPlaying(false); }}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                {i < currentStep ? <IconCircleCheck size={14} /> : i + 1}
                                            </div>
                                        </Tooltip>
                                        {i < corridor.steps.length - 1 && (
                                            <div className={`step-connector ${i < currentStep ? 'completed' : ''}`} />
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Controls */}
                            <div className="step-controls">
                                <ActionIcon variant="default" size="lg" onClick={reset} disabled={currentStep === -1}>
                                    <IconRefresh size={18} />
                                </ActionIcon>
                                <button className="step-control-btn" onClick={prevStep} disabled={currentStep <= -1}>
                                    ← Prev
                                </button>
                                <button className={`step-control-btn primary`} onClick={togglePlay}>
                                    {isPlaying ? <><IconPlayerPause size={14} /> Pause</> : <><IconPlayerPlay size={14} /> {currentStep === -1 ? 'Start' : isComplete ? 'Replay' : 'Play'}</>}
                                </button>
                                <button className="step-control-btn" onClick={nextStep} disabled={isComplete}>
                                    Next →
                                </button>
                                <span className="step-progress">
                                    Step {Math.max(0, currentStep + 1)} / {corridor.steps.length}
                                </span>
                            </div>
                        </Paper>

                        {/* Active Step Detail */}
                        {activeStep && (
                            <Paper className="brut-card" p="lg" mb="lg">
                                <Group gap="xs" mb="md">
                                    <Badge
                                        color={activeStep.direction === 'forward' ? 'blue' : 'green'}
                                        variant="filled"
                                        size="lg"
                                    >
                                        Step {currentStep + 1}: {activeStep.direction === 'forward' ? '→ Forward' : '← Backward'}
                                    </Badge>
                                    <Text fw={600} size="sm">{activeStep.description}</Text>
                                </Group>
                                <StepDetail step={activeStep} corridor={corridor} />
                            </Paper>
                        )}

                        {/* Summary Stats (shown when complete) */}
                        {isComplete && (
                            <Paper className="brut-card" p="lg" mb="lg">
                                <Text size="sm" fw={700} mb="md" tt="uppercase" c="dimmed" style={{ letterSpacing: '0.08em' }}>
                                    <IconCircleCheck size={16} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: 4 }} /> Transfer Complete — Summary
                                </Text>
                                <StatsSummary corridor={corridor} amount={amount} />
                            </Paper>
                        )}
                    </Tabs.Panel>

                    {/* ─── LEARN TAB ────────────────────────────── */}
                    <Tabs.Panel value="learn">
                        <LearnPanel />
                    </Tabs.Panel>

                    {/* ─── REFERENCE TAB ────────────────────────── */}
                    <Tabs.Panel value="reference">
                        <ReferencePanel />
                    </Tabs.Panel>
                </Tabs>
            </Container>

            {/* Footer */}
            <footer className="app-footer">
                <Text size="sm" fw={600} mb={4}>Correspondent Banking Flow Simulator</Text>
                <Text size="xs" c="dimmed">
                    Built by <a href="https://linkedin.com/in/sivasub987" target="_blank" rel="noopener">Siva</a> • Product Owner at the intersection of Payments & AI
                </Text>
                <Text size="xs" c="dimmed" mt={4}>
                    Pairs with the Correspondent Banking Carousel & PDF Cheat Sheet on LinkedIn
                </Text>
            </footer>
        </Box>
    );
}
