import {
	Component,
	HostListener,
	inject,
	signal,
	ViewChild,
} from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import {
	DateAdapter,
	MAT_DATE_FORMATS,
	MAT_NATIVE_DATE_FORMATS,
	MatNativeDateModule,
	MatOption,
	NativeDateAdapter,
} from "@angular/material/core";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { MatDialogClose, MatDialogRef } from "@angular/material/dialog";
import { MatSelectModule } from "@angular/material/select";
import { MatError, MatInputModule } from "@angular/material/input";
import { MatFormFieldModule } from "@angular/material/form-field";
import { FormsModule, type NgForm } from "@angular/forms";
import type { NewRequest, Question } from "../../model/format.type";
import { DataProcessingService } from "../../service/data-processing.service";
import { NgIf } from "@angular/common";
import { MatIconModule } from "@angular/material/icon";
import { HttpEventType } from "@angular/common/http";

@Component({
	selector: "app-dialog-new-request-questionnaire",
	imports: [
		MatInputModule,
		MatDatepickerModule,
		MatFormFieldModule,
		MatDialogClose,
		MatSelectModule,
		MatNativeDateModule,
		MatButtonModule,
		FormsModule,
		MatError,
		MatIconModule,
		NgIf,
	],
	templateUrl: "./dialog-new-request-questionnaire.component.html",
	styleUrl: "./dialog-new-request-questionnaire.component.css",
	providers: [
		{ provide: DateAdapter, useClass: NativeDateAdapter },
		{ provide: MAT_DATE_FORMATS, useValue: MAT_NATIVE_DATE_FORMATS },
	],
})
export class DialogNewRequestQuestionnaireComponent {
	// Inject necessary services
	dataService = inject(DataProcessingService);
	dialogRef = inject(MatDialogRef<DialogNewRequestQuestionnaireComponent>);

	// A reference to the form in the html, used to check its validity.
	@ViewChild("requestForm") requestForm!: NgForm;
	// A signal to hold the list of requrement questions fetched from the service.
	questions = signal<Array<Question>>([]);
	// Data object to submit a new request that is updated as the request form is filled
	data: NewRequest = {
		requestTitle: "",
		userId: 0,
		requesterName: "",
		analysisPurpose: "",
		requestedFinishDate: null,
		picRequest: "",
		urgent: null,
		requirementType: null,
		remark: "",
		answers: [],
		docxAttachment: null,
		docxFilename: null,
		excelAttachment: null,
		excelFilename: null,
	};

	// Signals to change the UI state for the file upload when a new request is uploaded.
	isUploading = signal(false);
	uploadProgress = signal(0);
	// Signals for displaying file size validation warnings.
	docxUploadSizewarning = signal<string | null>(null);
	excelUploadSizewarning = signal<string | null>(null);
	// Signal for
	today = signal<Date>(new Date());

	// Width of the window.
	innerWidth = signal<number>(window.innerWidth);

	// This listens for the browser's 'resize' event on the window object and updates accordingly.
	@HostListener("window:resize", ["$event"])
	onResize(event: Event) {
		this.innerWidth.set(window.innerWidth);
	}

	// Submits the new request form to the backend.
	submitRequest() {
		// Mark all form fields as touched to trigger the display of any validation errors.
		this.requestForm.form.markAllAsTouched();
		// Proceed only if the form is valid (all required fields are filled).
		if (this.allRequirementsAnswered()) {
			// Standardize capitalization for consistency.
			this.data.requestTitle = this.data.requestTitle
				.toLowerCase()
				.replace(/\b\w/g, (char) => char.toUpperCase());
			this.data.picRequest = this.data.picRequest.toLowerCase();
			// Populate user-specific data from the service.
			this.data.userId = Number(this.dataService.getUserId());
			this.data.requesterName = this.dataService.getUserName();
			// Collect all answers of the requirement questions.
			this.data.answers = this.questions().map((q) => q.answer);

			// Set UI state to show the upload progress indicator.
			this.isUploading.set(true);
			this.uploadProgress.set(0);
			this.resizeForUploadProgress();

			// Call the service to post the new request. The service returns an observable
			// that emits progress events.
			this.dataService.postNewRequest(this.data).subscribe({
				next: (event) => {
					// Check the type of the HTTP event.
					if (event.type === HttpEventType.UploadProgress) {
						// If it's a progress event, calculate the percentage complete.
						if (event.total) {
							const progress = Math.round(100 * (event.loaded / event.total));
							this.uploadProgress.set(progress); // Update the progress signal.
						}
					} else if (event.type === HttpEventType.Response) {
						// If it's a response event, the upload is complete.
						// Close the dialog on success.
						this.dialogRef.close("1");
					}
				},
				error: (err) => {
					// If an error occurs, reset the UI state back to form.
					this.isUploading.set(false);
					this.uploadProgress.set(0);
					this.resizeForUploadProgress();
				},
			});
		}
	}

	// Adjusts the dialog size to provide a better user experience during upload.
	resizeForUploadProgress() {
		if (this.isUploading()) {
			// Shrink the dialog to focus on the progress bar.
			this.dialogRef.updateSize("");
		} else {
			// Restore the dialog to its original size.
			this.dialogRef.updateSize("90vw");
		}
	}

	// Fetches the requirement questions based on the selected requirement type.
	getQuestion() {
		// Only fetch questions if a requirement type has been selected.
		if (this.data.requirementType != null) {
			this.dataService
				.getRequirementQuestion(this.data.requirementType)
				.subscribe((input) => {
					// Update the questions signal with the fetched data, causing the UI to render them.
					this.questions.set(input);
				});
		}
	}

	// Checks if the main form is valid.
	allRequirementsAnswered(): boolean {
		// Returns true only if the form reference exists and its valid status is true.
		if (this.requestForm.valid == null || this.requestForm.valid === false) {
			return false;
		}
		return true;
	}

	// Handles the file input change event for attachments.
	submitFile(event: Event, type: "EXCEL" | "DOCX") {
		// Cast the event target to an HTMLInputElement to access its `files` property.
		const input = event.target as HTMLInputElement;

		// Proceed only if a valid file has been selected.
		if (input.files && input.files.length > 0) {
			const file = input.files[0];
			// Validate the file size to ensure it does not exceed the 2MB limit.
			if (file.size > 2 * 1024 * 1024) {
				// Display a warning message and clear the file data if the size is too large.
				if (type === "EXCEL") {
					this.excelUploadSizewarning.set("Excel file must be less than 2MB");
					this.data.excelAttachment = null;
					this.data.excelFilename = null;
				} else {
					this.docxUploadSizewarning.set("File must be less than 2MB");
					this.data.docxAttachment = null;
					this.data.docxFilename = null;
				}
				return; // Stop further processing.
			}
			// If the file is valid, clear any existing warnings and store the file data.
			if (type === "EXCEL") {
				this.excelUploadSizewarning.set(null);
				this.data.excelAttachment = file;
				this.data.excelFilename = file.name;
			} else {
				this.docxUploadSizewarning.set(null);
				this.data.docxAttachment = file;
				this.data.docxFilename = file.name;
			}
		}
	}
}
