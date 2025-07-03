import { Injectable, type Signal, signal } from "@angular/core";

@Injectable({
	providedIn: "root",
})
export class TickCounterService {
	// A private, writable signal to hold the current time
	private readonly _currentTime = signal(new Date());

	// A public, read-only signal that components can subscribe to
	public readonly currentTime: Signal<Date> = this._currentTime;

	private timerId: ReturnType<typeof setInterval>;

	constructor() {
		// Start a single timer that updates the signal every second (1000ms)
		this.timerId = setInterval(() => {
			this._currentTime.set(new Date());
		}, 1000);
	}

	ngOnDestroy(): void {
		// Clean up the interval when the service is destroyed
		clearInterval(this.timerId);
	}
}
