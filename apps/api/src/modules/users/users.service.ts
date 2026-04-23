import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserEntity } from "../../database/entities/user.entity";
import { hashPassword } from "./password.utils";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
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
}
