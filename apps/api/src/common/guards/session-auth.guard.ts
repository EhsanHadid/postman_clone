import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Request } from "express";
import { SESSION_COOKIE_NAME, SESSION_HEADER_NAME } from "../auth.constants";
import { AuthService } from "../../modules/auth/auth.service";

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { currentUser?: unknown }>();
    const headerToken = request.header(SESSION_HEADER_NAME);
    const token = request.cookies?.[SESSION_COOKIE_NAME] ?? headerToken;

    if (!token) {
      throw new UnauthorizedException("Missing session.");
    }

    const user = await this.authService.validateSession(token);

    if (!user) {
      throw new UnauthorizedException("Invalid session.");
    }

    request.currentUser = user;
    return true;
  }
}
