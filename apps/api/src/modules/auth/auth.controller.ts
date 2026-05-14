import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { Response, Request } from "express";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { SESSION_COOKIE_NAME } from "../../common/auth.constants";
import { UserEntity } from "../../database/entities/user.entity";
import { AuthService } from "./auth.service";
import { AuthCredentialsDto } from "./dto/auth-credentials.dto";

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: false,
  path: "/",
};

const sanitizeUser = (user: UserEntity) => ({
  id: user.id,
  username: user.username,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const authPayload = (result: { user: UserEntity; sessionToken: string }) => ({
  user: sanitizeUser(result.user),
  userId: result.user.id,
  sessionToken: result.sessionToken,
});

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  async register(
    @Body() credentials: AuthCredentialsDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.register(
      credentials.username,
      credentials.password,
    );

    response.cookie(SESSION_COOKIE_NAME, result.sessionToken, cookieOptions);

    return authPayload(result);
  }

  @HttpCode(200)
  @Post("login")
  async login(
    @Body() credentials: AuthCredentialsDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(
      credentials.username,
      credentials.password,
    );

    response.cookie(SESSION_COOKIE_NAME, result.sessionToken, cookieOptions);

    return authPayload(result);
  }

  @UseGuards(SessionAuthGuard)
  @Post("logout")
  @HttpCode(200)
  async logout(
    @Res({ passthrough: true }) response: Response,
    @Req() request: Request,
  ) {
    const sessionToken = request.cookies?.[SESSION_COOKIE_NAME];

    if (sessionToken) {
      await this.authService.logout(sessionToken);
    }

    response.clearCookie(SESSION_COOKIE_NAME, cookieOptions);
    return { success: true };
  }

  @UseGuards(SessionAuthGuard)
  @Get("me")
  getCurrentUser(@CurrentUser() user: UserEntity) {
    return {
      user: sanitizeUser(user),
      userId: user.id,
    };
  }
}
