import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';


@Injectable({
  providedIn: 'root'
})
export class LoginService {
  http = inject(HttpClient); //enables the use of HTTP client calls for the application
  private userId: number = 0; // Store user_id here
  
  login(username: string, password: string) {
      console.log('Login called with username:', username, 'and password:', password);
      const url = 'http://localhost:9090/login';  // URL of the backend login endpoint
      const body = {                              // Request body
        "user_name": username,
        "user_password": password
      };


      return this.http.post<number>(url, body);
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

  storeUserId(input: number) {
    this.userId = input;
    localStorage.setItem('userId', input.toString());
  }

  getUserId(): number {
    const stored = localStorage.getItem('userId');
    if (stored !== null) {
      this.userId = Number(stored);
    } else {
      this.userId = 0;
    }
    return this.userId;
  }

  clearUserId() {
    this.userId = 0;
    localStorage.setItem('userId', '0');
  }
}
