import { Component, Input } from '@angular/core';
import { UserRequest } from '../../model/format.type';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-node',
  imports: [CommonModule],
  templateUrl: './node.component.html',
  styleUrl: './node.component.css'
})
export class NodeComponent {
  @Input() request !: UserRequest;

  viewDetails() {
    console.log(`More details`);
  }
}