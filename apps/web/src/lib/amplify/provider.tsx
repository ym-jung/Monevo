"use client";

import { Amplify } from "aws-amplify";

import type { PublicConfig } from "@/lib/env";

import { amplifyConfig } from "./config";

let configured = false;

export function AmplifyProvider({ config, children }: { config: PublicConfig; children: React.ReactNode }) {
	if (!configured) {
		Amplify.configure(amplifyConfig(config), { ssr: true });
		configured = true;
	}
	return children;
}
