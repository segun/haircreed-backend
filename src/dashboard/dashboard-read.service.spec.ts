import { DatabaseReadRepository } from '../database/database-read.repository';
import { DashboardReadService } from './dashboard-read.service';

describe('DashboardReadService', () => {
  it('uses the requested timezone midnight for dashboard day buckets', () => {
    const service = new DashboardReadService(new DatabaseReadRepository());

    const start = (service as any).bucketStart('2024-03-10', 'America/New_York');

    expect(start).toBe(Date.parse('2024-03-10T05:00:00.000Z'));
  });
});