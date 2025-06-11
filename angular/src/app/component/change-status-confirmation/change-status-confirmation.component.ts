import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogClose } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule} from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { DIALOG_DATA } from '@angular/cdk/dialog';


@Component({
  selector: 'app-change-status-confirmation',
  imports: [MatDialogClose, MatButtonModule,MatFormFieldModule,FormsModule, MatInputModule],
  templateUrl: './change-status-confirmation.component.html',
  styleUrl: './change-status-confirmation.component.css'
})
export class ChangeStatusConfirmationComponent {
  data_input = inject(DIALOG_DATA);
  comment: string = "";
  require: boolean = false;

  ngOnInit() {
    if (this.data_input.type == "degrade") {
      this.require = true;
    }
  }
}
