"use client";

import Link from "next/link";

import { Icon, SidebarItem, SidebarSection } from "@/ds";

import type { MessageKey } from "@/lib/i18n/messages/en";
import { useT } from "@/lib/i18n/provider";

import { STATES, STATE_ICON, statusKey, type State } from "./queueVocabulary";

import { RAIL_BUTTON, RAIL_DIVIDER, RailButton, RailFlyout, RailNav } from "@/features/common/Rail";

export type AdminSection = "signUps" | "operations";

const ADMIN_SECTIONS: { id: AdminSection; icon: string; key: MessageKey }[] = [
	{ id: "signUps", icon: "user-plus", key: "admin.signUps" },
	{ id: "operations", icon: "settings", key: "admin.operations" },
];

interface AdminRailProps {
	counts: Partial<Record<State, number>>;
	status: State;
	openSection: AdminSection | null;
	onOpenSection: (section: AdminSection | null) => void;
	onStatus: (status: State) => void;
	onExpand: () => void;
}

export function AdminRail(props: AdminRailProps) {
	const t = useT();
	const { openSection } = props;
	const close = () => props.onOpenSection(null);

	return (
		<RailNav>
			<RailButton icon="panel-left-open" label={t("sidebar.expand")} onClick={props.onExpand} />
			<span style={RAIL_DIVIDER} />

			{ADMIN_SECTIONS.map((section) => (
				<RailButton
					key={section.id}
					icon={section.icon}
					label={t(section.key)}
					selected={openSection === section.id}
					onClick={() => props.onOpenSection(openSection === section.id ? null : section.id)}
				/>
			))}

			<span style={{ flex: 1 }} />
			<span style={RAIL_DIVIDER} />
			<Link href="/" aria-label={t("admin.backToApp")} title={t("admin.backToApp")} className="ds-focusable" style={RAIL_BUTTON}>
				<Icon name="arrow-left" size={15} />
			</Link>

			{openSection ? (
				<RailFlyout onClose={close}>
						{openSection === "signUps" ? (
							<SidebarSection label={t("admin.signUps")}>
								{STATES.map((state) => (
									<SidebarItem
										key={state}
										icon={STATE_ICON[state]}
										label={t(statusKey(state))}
										trailing={props.counts[state] === undefined ? "—" : String(props.counts[state])}
										selected={props.status === state}
										onClick={() => { props.onStatus(state); close(); }}
									/>
								))}
							</SidebarSection>
						) : (
							<SidebarSection label={t("admin.operations")}>
								<SidebarItem icon="refresh-cw" label={t("admin.fxRateRuns")} />
								<SidebarItem icon="book-open" label={t("admin.ledgers")} />
								<SidebarItem icon="file-text" label={t("admin.auditLog")} />
							</SidebarSection>
						)}
				</RailFlyout>
			) : null}
		</RailNav>
	);
}
