import { IsString, MaxLength, MinLength } from "class-validator";

export class AuthCredentialsDto {
  @IsString()
  @MinLength(3)
  @MaxLength(64)
  username!: string;

  @IsString()
  @MinLength(4)
  @MaxLength(128)
  password!: string;
}
