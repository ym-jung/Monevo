"use client";

import {useState} from "react";

import {
    Avatar, Badge, Button, Card, Checkbox, CurrencyChip, Dialog, EmptyState, Icon, IconButton,
    Input, ListRow, Money, Popover, ProgressBar, Radio, SegmentedControl, Select, SidebarItem,
    SidebarSection, Switch, Tag, Toolbar, Tooltip, TooltipBubble,
} from "@/ds";

function Row({label, children}: { label: string; children: React.ReactNode }) {
    return (
        <div style={{
            display: "grid",
            gridTemplateColumns: "var(--sidebar-width) 1fr",
            gap: "var(--space-8)",
            alignItems: "center",
            padding: "var(--space-6) 0",
            borderBottom: "var(--rule-row)"
        }}>
            <span style={{
                font: "var(--type-label)",
                letterSpacing: "var(--tracking-label)",
                textTransform: "uppercase",
                color: "var(--text-tertiary)"
            }}>{label}</span>
            <div style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "var(--space-8)",
                alignItems: "center"
            }}>{children}</div>
        </div>
    );
}

const CATEGORY_INKS = ["groceries", "rent", "transport", "dining", "utilities", "income", "transfer"] as const;

export default function DesignSystemGallery() {
    const [seg, setSeg] = useState("EXPENSE");
    const [currency, setCurrency] = useState("JPY");
    const [on, setOn] = useState(true);
    const [checked, setChecked] = useState(true);
    const [picked, setPicked] = useState("bank");

    return (
        <main style={{maxWidth: 980, margin: "0 auto", padding: "var(--space-16) var(--space-12)"}}>
            <h1 style={{
                font: "var(--type-slip-title)",
                letterSpacing: "var(--tracking-display)",
                textIndent: "var(--tracking-display)",
                textTransform: "uppercase",
                textAlign: "center",
                margin: "0 0 var(--space-16)"
            }}>
                Design system
            </h1>

            <Row label="Button">
                <Button variant="primary">Add transaction</Button>
                <Button>Cancel</Button>
                <Button variant="ghost" icon="filter">Filter</Button>
                <Button variant="danger">Delete</Button>
                <Button disabled>Disabled</Button>
                <Button active>Held open</Button>
            </Row>

            <Row label="Button sizes">
                <Button size="sm">Small</Button>
                <Button size="md">Medium</Button>
                <Button size="lg">Large</Button>
            </Row>

            <Row label="IconButton">
                <IconButton icon="plus" label="Add"/>
                <IconButton icon="pencil" label="Edit" size="sm"/>
                <IconButton icon="sidebar" label="Toggle sidebar" size="lg" active/>
                <IconButton icon="x" label="Close" disabled/>
            </Row>

            <Row label="Icon">
                {["wallet", "landmark", "credit-card", "arrow-left-right", "arrow-down-left", "arrow-up-right", "users", "tag", "calendar", "chart-pie", "refresh-cw", "archive", "link", "search"].map((n) => (
                    <Icon key={n} name={n} size={15}/>
                ))}
            </Row>

            <Row label="Input">
                <Input placeholder="Payee" style={{width: 200}}/>
                <Input icon="search" placeholder="Filter loaded rows" style={{width: 200}}/>
                <Input defaultValue="12800" align="right" suffix="JPY" style={{width: 140}}/>
                <Input defaultValue="bad" invalid style={{width: 120}}/>
                <Input defaultValue="locked" disabled style={{width: 120}}/>
            </Row>

            <Row label="Select">
                <div style={{width: 200}}>
                    <Select
                        value={currency}
                        onChange={setCurrency}
                        options={[
                            {value: "JPY", label: "JPY — 日本円"},
                            {value: "KRW", label: "KRW — 대한민국 원"},
                            {value: "USD", label: "USD — US Dollar"},
                        ]}
                    />
                </div>
            </Row>

            <Row label="SegmentedControl">
                <SegmentedControl
                    value={seg}
                    onChange={setSeg}
                    options={[
                        {value: "EXPENSE", label: "Expense", icon: "arrow-up-right"},
                        {value: "INCOME", label: "Income", icon: "arrow-down-left"},
                        {value: "TRANSFER", label: "Transfer", icon: "arrow-left-right"},
                    ]}
                />
            </Row>

            <Row label="Toggles">
                <Checkbox checked={checked} onChange={setChecked} label="Include archived"/>
                <Checkbox indeterminate label="Mixed"/>
                <Radio checked={picked === "bank"} onChange={() => setPicked("bank")} label="Bank"
                       description="A regular deposit account"/>
                <Radio checked={picked === "card"} onChange={() => setPicked("card")} label="Credit card"/>
                <Switch checked={on} onChange={setOn} label="Shared"/>
            </Row>

            <Row label="Money">
                <Money amountMinor={12800} currency="JPY" kind="expense"/>
                <Money amountMinor={412000} currency="JPY" kind="income"/>
                <Money amountMinor={180000} currency="USD" kind="expense" minorUnitExponent={2}/>
                <Money amountMinor={3807763} currency="KRW" kind="transfer"/>
                <Money amountMinor={0} currency="JPY" muted/>
            </Row>

            <Row label="Money sizes">
                <Money amountMinor={412000} currency="JPY" size="sm"/>
                <Money amountMinor={412000} currency="JPY" size="md"/>
                <Money amountMinor={412000} currency="JPY" size="lg"/>
                <Money amountMinor={412000} currency="JPY" size="hero"/>
            </Row>

            <Row label="CurrencyChip">
                <CurrencyChip code="JPY"/>
                <CurrencyChip code="USD" rate="147.32000000" asOf="2026-08-20" source="FX_SERVICE"/>
            </Row>

            <Row label="Tag">
                {CATEGORY_INKS.map((c) => (
                    <Tag key={c} color={c} label={c}/>
                ))}
                <Tag color="groceries" dotOnly/>
                <Tag color="rent" label="inked" inkLabel/>
            </Row>

            <Row label="Badge">
                {(["neutral", "info", "success", "warning", "danger", "pending"] as const).map((t) => (
                    <Badge key={t} tone={t}>{t}</Badge>
                ))}
            </Row>

            <Row label="Avatar">
                <Avatar name="Youngmin Jung"/>
                <Avatar name="Partner" size={28}/>
            </Row>

            <Row label="ProgressBar">
                <div style={{width: 220}}>
                    <ProgressBar value={62} color="var(--cat-groceries)"/>
                </div>
            </Row>

            <Row label="Tooltip">
                <Tooltip label="Refresh rates">
                    <IconButton icon="refresh-cw" label="Refresh rates"/>
                </Tooltip>
                <TooltipBubble label="Always visible bubble"/>
            </Row>

            <div style={{
                display: "grid",
                gridTemplateColumns: "var(--sidebar-width) 1fr",
                gap: "var(--space-12)",
                marginTop: "var(--space-16)"
            }}>
                <div style={{background: "var(--surface-sidebar)", padding: "var(--space-6) 0"}}>
                    <SidebarSection label="Ledgers">
                        <SidebarItem icon="users" label="Household" selected/>
                        <SidebarItem icon="user" label="Personal"/>
                    </SidebarSection>
                    <SidebarSection label="Accounts">
                        <SidebarItem icon="landmark" label="Mizuho"
                                     trailing={<Money amountMinor={412000} currency="JPY" size="sm"
                                                      showCode={false}/>}/>
                        <SidebarItem icon="credit-card" label="Rakuten Card" indent={1}/>
                    </SidebarSection>
                </div>

                <div style={{display: "grid", gap: "var(--space-10)"}}>
                    <Toolbar title="Household" subtitle="August 2026"
                             leading={<IconButton icon="sidebar" label="Toggle sidebar"/>}>
                        <Button icon="plus" variant="primary">Add</Button>
                    </Toolbar>

                    <Card title="Rows">
                        <ListRow>Ordinary row</ListRow>
                        <ListRow selected>Selected row (inverted)</ListRow>
                        <ListRow selected windowActive={false}>Selected, window inactive</ListRow>
                    </Card>

                    <Card title="Empty state">
                        <EmptyState icon="inbox" title="No transactions."
                                    action={<Button icon="plus">Add transaction</Button>}/>
                    </Card>

                    <Card title="Popover">
                        <Popover width={240}>
                            <div style={{padding: "var(--space-6)"}}>Filter contents live here.</div>
                        </Popover>
                    </Card>

                    <Card title="Dialog">
                        <Dialog
                            title="Delete account"
                            message="取引が登録されている口座です。削除ではなくアーカイブしてください。"
                            footer={<><Button>Cancel</Button><Button variant="danger">Delete</Button></>}
                        />
                    </Card>
                </div>
            </div>
        </main>
    );
}
