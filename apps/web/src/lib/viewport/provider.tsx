"use client";

import { createContext, useContext, useEffect, useState } from "react";

import { PHONE_QUERY } from "./breakpoints";

const PhoneContext = createContext(false);

export function ViewportProvider({ initialPhone, children }: { initialPhone: boolean; children: React.ReactNode }) {
	const [phone, setPhone] = useState(initialPhone);

	useEffect(() => {
		const mq = window.matchMedia(PHONE_QUERY);
		const sync = () => setPhone(mq.matches);
		sync();
		mq.addEventListener("change", sync);
		return () => mq.removeEventListener("change", sync);
	}, []);

	return <PhoneContext.Provider value={phone}>{children}</PhoneContext.Provider>;
}

export function usePhone(): boolean {
	return useContext(PhoneContext);
}
