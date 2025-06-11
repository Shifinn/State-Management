import { Component, inject, signal, ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { DateAdapter, MAT_DATE_FORMATS, MAT_NATIVE_DATE_FORMATS, MatNativeDateModule, MatOption, NativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule, MatDatepickerToggle } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogClose, MatDialogRef} from '@angular/material/dialog';
import {MatSelectModule } from '@angular/material/select';
import {MatError, MatInputModule} from '@angular/material/input';
import {MatFormFieldModule} from '@angular/material/form-field';
import { FormsModule, NgForm } from '@angular/forms';
import { NewRequest } from '../../model/format.type';
import { DataProcessingService } from '../../service/data-processing.service';
import { Question } from '../../model/format.type';
import { NgIf } from '@angular/common';


@Component({
  selector: 'app-questionnaire',
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
    NgIf
  ],
  templateUrl: './questionnaire.component.html',
  styleUrl: './questionnaire.component.css',
  providers: [ {provide: DateAdapter, useClass: NativeDateAdapter}, {provide: MAT_DATE_FORMATS, useValue: MAT_NATIVE_DATE_FORMATS}, ]
})
export class QuestionnaireComponent {
  data_service = inject(DataProcessingService);
  questions = signal<Array<Question>>([]);
  dialogRef = inject(MatDialogRef<QuestionnaireComponent>);

  @ViewChild('requestForm') requestForm!: NgForm; // Get reference to the form


  data: NewRequest = {
    request_title: '',
    user_id: 0,
    requester_name: '',
    analysis_purpose: '',
    requested_finish_date: null,
    pic_request: '',
    urgent: null,
    requirement_type: null,
    remark: '',
    answers: []
  };

  submit() {
    this.requestForm.form.markAllAsTouched()
    if (this.allRequirementsAnswered()) {
      this.data.request_title = this.data.request_title.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
      this.data.pic_request = this.data.pic_request.toLowerCase();
      this.data.user_id = Number(this.data_service.getUserId());
      this.data.requester_name = this.data_service.getUserName();
      this.data.answers = this.questions().map(q => q.answer);
      this.data_service.postNewRequest(this.data).subscribe( () => {
        console.log("this is the precursor to exit from dialog of question"),
        this.dialogRef.close('1')
      })

    }
  }

  getQuestion() {
    if (this.data.requirement_type != null) {
      this.data_service.getRequirementQuestion(this.data.requirement_type).subscribe( input => {
        this.questions.set(input)
      })
    }
  }
  allRequirementsAnswered(): boolean {
    if (this.requestForm.valid == null || this.requestForm.valid == false) {
      return false
    } else return true
}
}
