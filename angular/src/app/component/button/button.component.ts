import { Component, Input, input } from '@angular/core';

import {MatButtonModule} from '@angular/material/button';



@Component({
  selector: 'app-button',
  imports: [MatButtonModule],
  templateUrl: './button.component.html',
  styleUrl: './button.component.css'
})
export class ButtonComponent {
  @Input() button_label !: string 
}
