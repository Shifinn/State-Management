import { Component, HostListener, inject, signal } from "@angular/core";
import type {
	AttachmentFilename,
	CompleteData,
	Question,
	UpdateState,
} from "../../model/format.type";

import {
	MAT_DIALOG_DATA,
	MatDialog,
	MatDialogClose,
	MatDialogRef,
} from "@angular/material/dialog";
import { DataProcessingService } from "../../service/data-processing.service";
import { CommonModule } from "@angular/common";
import { MatButtonModule } from "@angular/material/button";
import { Router } from "@angular/router";
import { DialogMoreDetailsConfirmationComponent } from "../dialog-more-details-confirmation/dialog-more-details-confirmation.component";
import { MatIconModule } from "@angular/material/icon";

@Component({
	selector: "app-dialog-more-detail",
	standalone: true,
	imports: [CommonModule, MatButtonModule, MatDialogClose, MatIconModule],
	templateUrl: "./dialog-more-detail.component.html",
	styleUrl: "./dialog-more-detail.component.css",
})
export class DialogMoreDetailComponent {
	data = signal<CompleteData>({
		requestId: 0,
		requestTitle: "",
		userId: -1,
		requesterName: "",
		analysisPurpose: "",
		requestedCompletedDate: new Date(""),
		picSubmitter: "",
		urgent: false,
		requestDate: new Date(""),
		userName: "",
		stateName: "",
		dataTypeName: "",
		remark: "",
		stateComment: null,
		questions: [],
		filenames: [],
	});

	stateUpdateData: UpdateState = {
		userId: 0,
		requestId: 0,
		comment: "",
	};

	inputData = inject(MAT_DIALOG_DATA);
	dataService = inject(DataProcessingService);
	router = inject(Router);
	dialog = inject(MatDialog);
	dialogRef = inject(MatDialogRef<DialogMoreDetailComponent>);
	innerWidth = signal<number>(window.innerWidth);

	@HostListener("window:resize", ["$event"])
	onResize(event: Event) {
		this.innerWidth.set(window.innerWidth);
	}

	ngOnInit() {
		this.dataService
			.getCompleteData(this.inputData.requestId)
			.subscribe((result) => {
				this.data.set(result);
			});
	}

	changeState(change: string) {
		const dialogRef2 = this.dialog.open(
			DialogMoreDetailsConfirmationComponent,
			{
				autoFocus: false,
				data: { type: change },
				width: "360px",
				maxWidth: "90vw",
				panelClass: "compact-dialog",
			},
		);
		dialogRef2.afterClosed().subscribe((result) => {
			if (result || result === "") {
				this.stateUpdateData.comment = result;
				this.stateUpdateData.requestId = this.inputData.requestId;
				this.stateUpdateData.userId = Number(this.dataService.getUserId());

				if (change === "degrade") {
					this.dataService.degradeState(this.stateUpdateData).subscribe();
				} else {
					this.dataService.upgradeState(this.stateUpdateData).subscribe();
				}
				this.dialogRef.close("1");
			}
		});
	}

	confirmDialog(type: number): boolean {
		return false;
	}

	checkPage() {
		return this.router.url.includes("/home/(home:todo)");
	}

	downloadAttachment(index: number) {
		this.dataService.getAttachmentFileDownload(
			this.data().requestId,
			this.data().filenames[index].attachmentFilename,
		);
	}

	isVisible(button: string): boolean {
		const tempStateName = this.data().stateName;

		switch (button) {
			case "cancel":
			case "reject":
			case "continue":
				if (!this.checkPage()) {
					return false;
				}
				if (this.dataService.getUserRole() === "2") {
					if (
						tempStateName === "VALIDATED" ||
						tempStateName === "IN PROGRESS"
					) {
						return true;
					}
					return false;
				}
				if (this.dataService.getUserRole() === "3") {
					if (
						tempStateName === "SUBMITTED" ||
						tempStateName === "WAITING FOR REVIEW"
					) {
						return true;
					}
					return false;
				}
				return false;

			case "ok":
				if (!this.checkPage()) {
					return true;
				}
				if (tempStateName === "DONE") {
					return true;
				}
				if (this.dataService.getUserRole() === "2") {
					if (tempStateName === "WAITING FOR REVIEW") {
						return true;
					}
					return false;
				}
				if (this.dataService.getUserRole() === "3") {
					if (
						tempStateName === "VALIDATED" ||
						tempStateName === "IN PROGRESS"
					) {
						return true;
					}
					return false;
				}
				return false;
		}
		return false;
	}
}
