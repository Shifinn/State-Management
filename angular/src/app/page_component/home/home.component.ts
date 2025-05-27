import { Component } from '@angular/core';
import { HeaderComponent } from '../../component/header/header.component';
import { RouterOutlet } from '@angular/router';
import { ProfilePageComponent } from '../profile-page/profile-page.component';

@Component({
  selector: 'app-home',
  imports: [HeaderComponent,RouterOutlet,ProfilePageComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {

}
