// This file defines the shape of the data we expect for a login request.
// It helps with validation and provides clear typing.

export class LoginDto {
  username!: string;
  password!: string;
}
