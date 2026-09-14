export function monthOf(date = new Date()): string {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function shiftMonth(month: string, by: number): string {
	const [year, mm] = month.split("-").map(Number);
	const date = new Date(year, mm - 1 + by, 1);
	return monthOf(date);
}

export function monthRange(month: string): { from: string; to: string } {
	const [year, mm] = month.split("-").map(Number);
	const last = new Date(year, mm, 0).getDate();
	return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, "0")}` };
}

export function monthLabel(month: string, locale = "en"): string {
	const [year, mm] = month.split("-").map(Number);
	return new Intl.DateTimeFormat(locale, { year: "numeric", month: "long" }).format(new Date(year, mm - 1, 1));
}
