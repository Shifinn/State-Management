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

import { MatIconModule } from "@angular/material/icon";

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
    MatIconModule
],
	templateUrl: "./dialog-new-request-questionnaire.component.html",
	styleUrl: "./dialog-new-request-questionnaire.component.css",
	providers: [
		{ provide: DateAdapter, useClass: NativeDateAdapter },
		{ provide: MAT_DATE_FORMATS, useValue: MAT_NATIVE_DATE_FORMATS },
	],
})
export class DialogNewRequestQuestionnaireComponent {
	data_service = inject(DataProcessingService);
	questions = signal<Array<Question>>([]);
	dialogRef = inject(MatDialogRef<DialogNewRequestQuestionnaireComponent>);
	@ViewChild("requestForm") requestForm!: NgForm; // Get reference to the form

	today = new Date();
	data: NewRequest = {
		request_title: "",
		user_id: 0,
		requester_name: "",
		analysis_purpose: "",
		requested_finish_date: null,
		pic_request: "",
		urgent: null,
		requirement_type: null,
		remark: "",
		answers: [],
		docx_attachment: null,
		docx_filename: null,
		excel_attachment: null,
		excel_filename: null,
	};
	inner_width = signal<number>(9999);

	@HostListener("window:resize", ["$event"])
	onResize(event: Event) {
		this.inner_width.set(window.innerWidth);
	}

	ngOnInit() {
		this.inner_width.set(window.innerWidth);
	}
	submitRequest() {
		this.requestForm.form.markAllAsTouched();
		if (this.allRequirementsAnswered()) {
			this.data.request_title = this.data.request_title
				.toLowerCase()
				.replace(/\b\w/g, (char) => char.toUpperCase());
			this.data.pic_request = this.data.pic_request.toLowerCase();
			this.data.user_id = Number(this.data_service.getUserId());
			this.data.requester_name = this.data_service.getUserName();
			this.data.answers = this.questions().map((q) => q.answer);

			this.data_service.postNewRequest(this.data).subscribe(() => {
				this.dialogRef.close("1");
			});
		}
	}

	getQuestion() {
		if (this.data.requirement_type != null) {
			this.data_service
				.getRequirementQuestion(this.data.requirement_type)
				.subscribe((input) => {
					this.questions.set(input);
				});
		}
	}
	allRequirementsAnswered(): boolean {
		if (this.requestForm.valid == null || this.requestForm.valid === false) {
			return false;
		}

		return true;
	}

	submitFile(event: Event, type: "EXCEL" | "DOCX") {
		console.log("submit file trigger");
		const input = event.target as HTMLInputElement;
		if (input.files && input.files.length > 0) {
			const file = input.files[0];
			if (type === "EXCEL") {
				this.data.excel_attachment = file;
				this.data.excel_filename = file.name;
			} else {
				this.data.docx_attachment = file;
				this.data.docx_filename = file.name;
			}
		}
	}
}
