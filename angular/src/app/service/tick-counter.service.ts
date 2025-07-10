import { Injectable, type Signal, signal } from "@angular/core";

@Injectable({
	providedIn: "root",
})
export class TickCounterService {
	// A private, writable signal to hold the current time
	// private readonly _currentTime = signal(new Date());

	// A public, read-only signal that components can subscribe to
	public readonly currentTimeMs = signal(new Date());
	public readonly currentTimeHour = signal(new Date());

	private timerIdMs: ReturnType<typeof setInterval>;
	private timerIdHour: ReturnType<typeof setInterval>;

	constructor() {
		// Start a single timer that updates the signal every second (1000ms)
		this.timerIdMs = setInterval(() => {
			this.currentTimeMs.set(new Date());
		}, 1000);

		// Start a single timer that updates the signal every hour (60 * 60 * 1000ms)
		this.timerIdHour = setInterval(
			() => {
				this.currentTimeHour.set(new Date());
			},
			1000 * 60 * 60,
		);
	}

	ngOnDestroy(): void {
		// Clean up the interval when the service is destroyed
		clearInterval(this.timerIdMs);
		clearInterval(this.timerIdHour);
	}
}
