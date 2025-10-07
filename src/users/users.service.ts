import { Injectable, OnModuleInit } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import db from '../instant';
import { id } from '@instantdb/admin';

// This is a placeholder for your User model from the database schema
export type User = {
    id: string;
    username: string;
    passwordHash: string;
    role: 'ADMIN' | 'POS_OPERATOR' | 'SUPER_ADMIN';
    fullName: string;
    createdAt: number;
    updatedAt: number;
};

@Injectable()
export class UsersService implements OnModuleInit {
    async onModuleInit() {
        const admin = await this.findOne('admin');
        if (!admin) {
            const passwordHash = await bcrypt.hash('@B50lut3', 10);
            await db.transact([
                db.tx.Users[id()].update({
                    fullName: 'Super Admin',
                    username: 'admin',
                    passwordHash,
                    role: 'SUPER_ADMIN',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    requiresPasswordReset: false,
                }),
            ]);
        }
    }

    async findOne(username: string): Promise<User | undefined> {
        const usersResponse = await db.query({ Users: { $: { where: { username } } } });
        // map the response to User type
        if (usersResponse.Users.length === 0) {
            return undefined;
        } else {
            return { ...usersResponse.Users[0], role: usersResponse.Users[0].role as 'ADMIN' | 'POS_OPERATOR' | 'SUPER_ADMIN' };
        }
    }
}
