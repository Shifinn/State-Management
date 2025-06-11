import { Component, EventEmitter, Input, Output } from '@angular/core';

import {MatButtonModule} from '@angular/material/button';



@Component({
  selector: 'app-custom-square-button',
  imports: [MatButtonModule],
  templateUrl: './custom-square-button.component.html',
  styleUrl: './custom-square-button.component.css'
})
export class CustomSquareButtonComponent {
  @Input() button_label !: string 
  @Output() buttonClick = new EventEmitter<void>();

  onClick() {
    this.buttonClick.emit();
  }
}
