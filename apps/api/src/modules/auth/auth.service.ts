import {
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { randomUUID } from "node:crypto";
import { Repository } from "typeorm";
import { SessionEntity } from "../../database/entities/session.entity";
import { UserEntity } from "../../database/entities/user.entity";
import { UsersService } from "../users/users.service";
import { verifyPassword } from "../users/password.utils";
import { EnvironmentsService } from "../environments/environments.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly environmentsService: EnvironmentsService,
    @InjectRepository(SessionEntity)
    private readonly sessionRepository: Repository<SessionEntity>,
  ) {}

  async register(username: string, password: string): Promise<{
    user: UserEntity;
    sessionToken: string;
  }> {
    const user = await this.usersService.createUser(username, password);
    await this.environmentsService.ensureGlobalEnvironment(user.id);
    const session = await this.createSession(user.id);

    return {
      user,
      sessionToken: session.sessionToken,
    };
  }

  async login(username: string, password: string): Promise<{
    user: UserEntity;
    sessionToken: string;
  }> {
    const user = await this.usersService.findByUsername(username);

    if (!user || !verifyPassword(password, user.password)) {
      throw new UnauthorizedException("Invalid username or password.");
    }

    const session = await this.createSession(user.id);

    return {
      user,
      sessionToken: session.sessionToken,
    };
  }

  async logout(sessionToken: string): Promise<void> {
    await this.sessionRepository.delete({ sessionToken });
  }

  async validateSession(sessionToken: string): Promise<UserEntity | null> {
    const session = await this.sessionRepository.findOne({
      where: { sessionToken },
      relations: {
        user: true,
      },
    });

    return session?.user ?? null;
  }

  private async createSession(userId: string): Promise<SessionEntity> {
    return this.sessionRepository.save(
      this.sessionRepository.create({
        userId,
        sessionToken: randomUUID(),
      }),
    );
  }
}
