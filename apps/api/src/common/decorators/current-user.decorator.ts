import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { UserEntity } from "../../database/entities/user.entity";

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): UserEntity | undefined => {
    const request = context.switchToHttp().getRequest<{ currentUser?: UserEntity }>();
    return request.currentUser;
  },
);
