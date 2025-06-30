import {
	Component,
	EventEmitter,
	HostListener,
	inject,
	Input,
	Output,
	resource,
	signal,
} from "@angular/core";
import type {
	Duration,
	SimpleData,
	StateThreshold,
} from "../../model/format.type";
import { CommonModule } from "@angular/common";
import { CustomSquareButtonComponent } from "../custom-square-button/custom-square-button.component";
import { DataProcessingService } from "../../service/data-processing.service";
import { MatDialog } from "@angular/material/dialog";
import { DialogMoreDetailComponent } from "../dialog-more-detail/dialog-more-detail.component";
import { DateAdapter } from "@angular/material/core";
import { MatTooltipModule } from "@angular/material/tooltip";
import { delay } from "rxjs";
import { MatIconModule } from "@angular/material/icon";

@Component({
	selector: "app-card-request",
	imports: [
		CommonModule,
		CustomSquareButtonComponent,
		MatIconModule,
		MatTooltipModule,
	],
	templateUrl: "./card-request.component.html",
	styleUrl: "./card-request.component.css",
})
export class CardRequestComponent {
	@Input() request!: SimpleData;
	@Input() reminderTooltip!: StateThreshold[];
	@Output() refresh = new EventEmitter<void>();
	requestDurationString = signal<string>("");
	stateDurationString = signal<string>("");

	dataService = inject(DataProcessingService);
	dialog = inject(MatDialog);
	threshold!: number | undefined;
	intervalForRequest!: ReturnType<typeof setInterval>;
	intervalForState!: ReturnType<typeof setInterval>;
	test = signal<number>(8.99);

	ngOnInit() {
		if (this.reminderTooltip) {
			this.threshold = this.reminderTooltip?.find(
				(s) => s.stateNameId === 1,
			)?.stateThresholdHour;
		}
		this.durationForRequest();
		this.durationForState();
	}

	ngOnDestroy(): void {
		if (this.intervalForRequest) {
			clearInterval(this.intervalForRequest); // cleanup
		}

		if (this.intervalForState) {
			clearInterval(this.intervalForState); // cleanup
		}
	}

	moreDetails() {
		const dialogRef = this.dialog.open(DialogMoreDetailComponent, {
			autoFocus: false,
			width: "90vw",
			height: "90vh",
			maxWidth: "90vw",
			maxHeight: "fit-content",
			panelClass: "custom-dialog-container",
			data: { requestId: this.request.requestId },
		});

		dialogRef.afterClosed().subscribe((result) => {
			this.refresh.emit();
		});
	}

	durationForState() {
		if (this.threshold) {
			const dateRef = this.request.dateStart;
			const hours = this.dataService.getTimeDifferenceInHour(dateRef);
			let hourTillRecall!: number;
			if (hours > this.threshold) {
				const duration =
					this.dataService.getTimeDifferenceInDayAndHour(dateRef);
				hourTillRecall = 1 - (duration.hour % 1);

				this.stateDurationString.set(
					`Has been ${duration.day} days ${Math.floor(duration.hour)} hours since ${this.request.stateName} started`,
				);
			} else {
				hourTillRecall = this.threshold - hours;
			}

			if (this.intervalForState) clearInterval(this.intervalForState);
			this.intervalForState = setInterval(() => {
				this.durationForState();
			}, hourTillRecall * 3600000);
		}
	}

	durationForRequest() {
		const dateRef = this.request.requestDate;
		const duration = this.dataService.getTimeDifferenceInDayAndHour(dateRef);
		const hourTillRecall = 1 - (duration.hour % 1);

		this.requestDurationString.set(
			` ${duration.day} days ${Math.floor(duration.hour)} hours ago`,
		);
		if (this.intervalForRequest) clearInterval(this.intervalForRequest);
		this.intervalForRequest = setInterval(() => {
			this.durationForRequest();
		}, hourTillRecall * 3600000);
	}
}
