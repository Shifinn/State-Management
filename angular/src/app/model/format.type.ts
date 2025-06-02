export type User = {
    user_id: string;
    user_name: string;
    email: string;
    user_role: string;
}

export type UserRequest = {
    request_id: number;
    request_title: string;
    request_date: Date;
    state_name: string;
}