import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Request } from "express";
import { SESSION_COOKIE_NAME } from "../auth.constants";
import { AuthService } from "../../modules/auth/auth.service";

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { currentUser?: unknown }>();
    const token = request.cookies?.[SESSION_COOKIE_NAME];

    if (!token) {
      throw new UnauthorizedException("Missing session cookie.");
    }

    const user = await this.authService.validateSession(token);

    if (!user) {
      throw new UnauthorizedException("Invalid session.");
    }

    request.currentUser = user;
    return true;
  }
}
