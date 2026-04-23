import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { HistoryEntryEntity } from "../../database/entities/history-entry.entity";

@Injectable()
export class HistoryService {
  constructor(
    @InjectRepository(HistoryEntryEntity)
    private readonly historyRepository: Repository<HistoryEntryEntity>,
  ) {}

  async createEntry(
    input: Partial<HistoryEntryEntity> & Pick<HistoryEntryEntity, "userId" | "protocolType" | "method" | "url">,
  ): Promise<HistoryEntryEntity> {
    return this.historyRepository.save(this.historyRepository.create(input));
  }

  list(userId: string) {
    return this.historyRepository.find({
      where: { userId },
      order: { createdAt: "DESC" },
      take: 100,
    });
  }

  async getOne(userId: string, historyId: string): Promise<HistoryEntryEntity> {
    const entry = await this.historyRepository.findOne({
      where: { id: historyId, userId },
    });

    if (!entry) {
      throw new NotFoundException("History entry not found.");
    }

    return entry;
  }

  async delete(userId: string, historyId: string): Promise<void> {
    const entry = await this.getOne(userId, historyId);
    await this.historyRepository.remove(entry);
  }
}
