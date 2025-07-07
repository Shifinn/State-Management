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
import { delay } from "rxjs";

@Component({
	selector: "app-dialog-more-detail",
	standalone: true,
	imports: [CommonModule, MatButtonModule, MatDialogClose, MatIconModule],
	templateUrl: "./dialog-more-detail.component.html",
	styleUrl: "./dialog-more-detail.component.css",
})
export class DialogMoreDetailComponent {
	// Complete data that will be displayed within the more details dialog
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
	// Data needed to update the state (upgrade or drop)
	stateUpdateData: UpdateState = {
		userId: 0,
		requestId: 0,
		comment: "",
	};

	// Injects the data passed to the dialog (in this case, the `requestId`).
	inputData = inject(MAT_DIALOG_DATA);
	// Injects necessary services.
	dataService = inject(DataProcessingService);
	// Angular's router service, used to check the current URL.
	router = inject(Router);
	// The main dialog service, used here to open a *nested* confirmation dialog.
	dialog = inject(MatDialog);
	// A reference to this dialog instance, used to close it programmatically.
	dialogRef = inject(MatDialogRef<DialogMoreDetailComponent>);
	// Width of window
	innerWidth = signal<number>(window.innerWidth);

	// This listens for the browser's 'resize' event on the window object and updates accordingly
	onResize(event: Event) {
		this.innerWidth.set(window.innerWidth);
	}

	ngOnInit() {
		// Fetch the complete data for the request using the ID passed into the dialog.
		this.dataService
			.getCompleteData(this.inputData.requestId)
			.subscribe((result) => {
				// Update the `data` signal, which will cause the
				// component's template to reactively render the information.
				this.data.set(result);
			});
	}

	// Handles actions that change the state of the request (e.g., 'drop', 'upgrade').
	// It opens a confirmation dialog before proceeding with the action.
	changeState(change: string) {
		// Open a secondary confirmation dialog to get a comment from the user.
		const dialogRef2 = this.dialog.open(
			DialogMoreDetailsConfirmationComponent,
			{
				autoFocus: false,
				data: { type: change }, // Pass the action type (e.g., 'drop') to the confirmation dialog.
				width: "360px",
				maxWidth: "90vw",
				panelClass: "compact-dialog",
			},
		);

		// Subscribe to the result of the confirmation dialog.
		dialogRef2.afterClosed().subscribe((result) => {
			// Proceed only if the user confirmed (result is not null/undefined).
			// An empty string is a valid result for actions that don't require a comment.
			if (result || result === "") {
				// Update thr state update payload with the necessary data.
				this.stateUpdateData.comment = result;
				this.stateUpdateData.requestId = this.inputData.requestId;
				this.stateUpdateData.userId = Number(this.dataService.getUserId());

				// Call the appropriate service method based on the action.
				if (change === "drop") {
					this.dataService.dropRequest(this.stateUpdateData).subscribe();
				} else {
					this.dataService.upgradeState(this.stateUpdateData).subscribe();
				}
				// A small delay to ensure the backend has time to process the state update before closing.
				// The close dialog is not within the subscribe because along with the update
				// the api request also send a reminder email that needs time,
				// So, to make sure there is no major delay for the UI, a delay is set to ensure the updated request
				// state will be shown and then isntantly close before email sending is completed
				delay(10);
				// Close this main dialog and pass back a result ('1') to signal that an action was taken.
				this.dialogRef.close("1");
			}
		});
	}

	// Checks if the current page is the todo page.
	// This is used to determine which buttons should be displayed.
	checkPage() {
		return this.router.url.includes("/home/(home:todo)");
	}

	// Triggers the download of a specific file attached to the request.
	downloadAttachment(index: number) {
		// Calls the service method, which handles the logic of getting the file URL and initiating the download.
		this.dataService.getAttachmentFileDownload(
			this.data().requestId,
			this.data().filenames[index].attachmentFilename,
		);
	}

	// Determines the visibility of the buttons based on the current user's role and the request's state.
	isVisible(button: string): boolean {
		const tempStateName = this.data().stateName;

		switch (button) {
			case "cancel":
			case "reject":
			case "continue":
				// Action buttons are only shown on the todo page.
				if (!this.checkPage()) {
					return false;
				}
				// Logic for a user with role "2" (worker).
				if (this.dataService.getUserRole() === "2") {
					if (
						tempStateName === "VALIDATED" ||
						tempStateName === "IN PROGRESS"
					) {
						return true;
					}
					return false;
				}
				// Logic for a user with role "3" (validator).
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
				// The "OK" button is shown on other pages (like the user's dashboard or the progress page).
				if (!this.checkPage()) {
					return true;
				}
				// It's also shown if the request is already done.
				if (tempStateName === "DONE") {
					return true;
				}
				// Logic for a user with role "2" (worker).
				if (this.dataService.getUserRole() === "2") {
					if (tempStateName === "WAITING FOR REVIEW") {
						return true;
					}
					return false;
				}
				// Logic for a user with role "3" (validator).
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
