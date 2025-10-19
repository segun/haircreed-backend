import { Injectable, NotFoundException } from '@nestjs/common';
import { id } from '@instantdb/admin';
import db from '../instant';
import { AppSettings, UpdateAppSettingsDto } from './dto/appsettings.dto';

@Injectable()
export class AppSettingsService {
  async findOne(id: string): Promise<AppSettings> {
    const findOneResponse = await db.query({
      AppSettings: { $: { where: { id } } },
    });

    if (findOneResponse.AppSettings.length === 0) {
      throw new NotFoundException(`AppSettings with ID "${id}" not found`);
    }
    return findOneResponse.AppSettings[0];
  }

  async create(createAppSettingsDto: UpdateAppSettingsDto): Promise<AppSettings> {
    const newId = id();
    await db.transact(
      db.tx.AppSettings[newId].create({
        settings: createAppSettingsDto.settings,
      }),
    );
    return this.findOne(newId);
  }

  async update(
    id: string,
    updateAppSettingsDto: UpdateAppSettingsDto,
  ): Promise<AppSettings> {
    // Ensure the record exists before attempting an update.
    await this.findOne(id);

    await db.transact(
      db.tx.AppSettings[id].update({
        settings: updateAppSettingsDto.settings,
      }),
    );

    return this.findOne(id);
  }
}