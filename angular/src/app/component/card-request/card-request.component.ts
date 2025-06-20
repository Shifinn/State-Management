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
	@Input() reminder_tooltip!: StateThreshold[];
	@Output() refresh = new EventEmitter<void>();
	request_duration_string = signal<string>("");
	state_duration_string = signal<string>("");

	data_service = inject(DataProcessingService);
	dialog = inject(MatDialog);
	threshold!: number | undefined;
	intervalForRequest!: ReturnType<typeof setInterval>;
	intervalForState!: ReturnType<typeof setInterval>;
	test = signal<number>(8.99);

	ngOnInit() {
		if (this.reminder_tooltip) {
			this.threshold = this.reminder_tooltip?.find(
				(s) => s.state_name_id === 1,
			)?.state_threshold_hour;
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
		const dialogref = this.dialog.open(DialogMoreDetailComponent, {
			autoFocus: false,
			width: "90vw",
			height: "90vh",
			maxWidth: "90vw",
			panelClass: "custom-dialog-container",
			data: { request_id: this.request.request_id },
		});

		dialogref.afterClosed().subscribe((result) => {
			this.refresh.emit();
		});
	}

	durationForState() {
		console.log("warning check");
		if (this.threshold) {
			const date_ref = this.request.date_start;
			const hours = this.data_service.getTimeDifferenceInHour(date_ref);
			let hour_till_recall!: number;
			if (hours > this.threshold) {
				const duration =
					this.data_service.getTimeDifferenceInDayAndHour(date_ref);
				hour_till_recall = 1 - (duration.hour % 1);

				this.state_duration_string.set(
					`Has been ${duration.day} days ${Math.floor(duration.hour)} hours since ${this.request.state_name} started`,
				);
			} else {
				hour_till_recall = this.threshold - hours;
			}

			if (this.intervalForState) clearInterval(this.intervalForState);
			this.intervalForState = setInterval(() => {
				this.durationForState();
			}, hour_till_recall * 3600000);
		}
	}

	durationForRequest() {
		const date_ref = this.request.request_date;
		const duration = this.data_service.getTimeDifferenceInDayAndHour(date_ref);
		const hour_till_recall = 1 - (duration.hour % 1);

		this.request_duration_string.set(
			` ${duration.day} days ${Math.floor(duration.hour)} hours ago`,
		);
		if (this.intervalForRequest) clearInterval(this.intervalForRequest);
		this.intervalForRequest = setInterval(() => {
			this.durationForRequest();
		}, hour_till_recall * 3600000);
	}
}
