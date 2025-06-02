import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { User } from '../model/format.type';
import { DataProcessingService } from './data-processing.service';


@Injectable({
  providedIn: 'root'
})
export class LoginService {
  http = inject(HttpClient); //enables the use of HTTP client calls for the application
  router = inject(Router); // enables navigation using the Router
  dataService = inject(DataProcessingService)

  login(username: string, password: string) {
      console.log('Login called with username:', username, 'and password:', password);
      const url = 'http://localhost:9090/login';  // URL of the backend login endpoint
      const body = {                              // Request body
        "user_name": username,
        "user_password": password
      };


      return this.http.post<User[]>(url, body).subscribe(response => {
        console.log('from service, userId:', response[0].user_id);
        if (response[0].user_id !=  '0') {
          this.dataService.storeUserInfo(response[0])
          this.router.navigate(['/home']);
        }});

      // Expecting the backend to return a plain number (user_id)
      // this.http.post<number>(url, body).subscribe(response => {
      //   if (response) {
      //     this.storeUserId(response);
      //     console.log('from service, userId:', response);
      //   }
      // });
      // if (this.userId !== 0) {
      //   return 1;
      // } else {
      //   return 0;
      // }
  }



  logOut() {
    localStorage.setItem('userId', '0');
    localStorage.setItem('userName', '');
    localStorage.setItem('userEmail', '');
    localStorage.setItem('userRole', '');
    this.router.navigate(['']);
  }
}
