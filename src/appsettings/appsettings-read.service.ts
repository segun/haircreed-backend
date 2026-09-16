import { Injectable } from '@nestjs/common';
import { DatabaseReadRepository } from '../database/database-read.repository';
import { Query, validateKeys } from '../database-reads/read-query';

@Injectable()
export class AppSettingsReadService {
  constructor(private readonly repository: DatabaseReadRepository) {}

  async currentSettings(query: Query) {
    validateKeys(query, []);
    const settings = (await this.repository.rows('AppSettings'))[0];
    if (!settings) {
      throw this.repository.notFound('SETTINGS_NOT_FOUND', 'Application settings not found');
    }
    return { data: { id: settings.id, settings: this.repository.parseJson(settings.settings) } };
  }
}