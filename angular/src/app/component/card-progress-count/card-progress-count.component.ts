import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProgressCardOutput, SimpleData, StateInfoData, StatusInfo} from '../../model/format.type';
@Component({
  selector: 'app-card-progress-count',
  imports: [CommonModule],
  templateUrl: './card-progress-count.component.html',
  styleUrl: './card-progress-count.component.css'
})
export class CardProgressCountComponent {
  @Input() progress_info !: StatusInfo;
  @Input() isShrunk = false;
  @Output() buttonClick = new EventEmitter<ProgressCardOutput>();

  onClick(input: string) {
    var output: ProgressCardOutput = {type: '', state_id: this.progress_info.state_id}
    switch (input) {
      case 'total':
        if (this.progress_info.todo > 0 || this.progress_info.done > 0) {
          output.type = input
        }
        break;
      case 'todo':
        if (this.progress_info.todo > 0) {
          output.type = input
        }
        break;
      case 'done':
        if (this.progress_info.done > 0) {
          output.type = input
        }
        break;
    }
    this.buttonClick.emit(output);
  }  

}
