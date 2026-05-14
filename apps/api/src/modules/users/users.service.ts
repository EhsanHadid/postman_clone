import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Like, Not, In } from "typeorm";
import { UserEntity } from "../../database/entities/user.entity";
import { WorkspaceMemberEntity } from "../../database/entities/workspace-member.entity";
import { hashPassword } from "./password.utils";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(WorkspaceMemberEntity)
    private readonly memberRepository: Repository<WorkspaceMemberEntity>,
  ) {}

  async findById(id: string): Promise<UserEntity> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException("User not found.");
    }

    return user;
  }

  async findByUsername(username: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({ where: { username } });
  }

  async createUser(username: string, password: string): Promise<UserEntity> {
    const existingUser = await this.findByUsername(username);

    if (existingUser) {
      throw new ConflictException("Username already exists.");
    }

    return this.userRepository.save(
      this.userRepository.create({
        username,
        password: hashPassword(password),
      }),
    );
  }

  async searchPublicUsers(
    currentUserId: string,
    query: string,
    excludeWorkspaceId?: string,
  ) {
    const normalizedQuery = query.trim();
    const excludedIds = new Set<string>([currentUserId]);

    if (excludeWorkspaceId) {
      const members = await this.memberRepository.find({
        where: { workspaceId: excludeWorkspaceId },
      });
      for (const member of members) {
        excludedIds.add(member.userId);
      }
    }

    const users = await this.userRepository.find({
      where: normalizedQuery
        ? {
            username: Like(`%${normalizedQuery}%`),
            id: Not(In([...excludedIds])),
          }
        : {
            id: Not(In([...excludedIds])),
          },
      take: 20,
      order: { username: "ASC" },
    });

    return users.map((user) => ({
      id: user.id,
      username: user.username,
    }));
  }
}
