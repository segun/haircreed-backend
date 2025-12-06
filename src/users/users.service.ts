import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import db from '../instant';
import { id } from '@instantdb/admin';
import { User } from "../types";
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserSettingsDto } from "./dto/update-user-settings.dto";

@Injectable()
export class UsersService implements OnModuleInit {
    async onModuleInit() {
        const admin = await this.findOne('admin');
        const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD;
        if (!superAdminPassword) {
            throw new Error('SUPER_ADMIN_PASSWORD environment variable is required');
        }

        if (!admin) {
            const passwordHash = await bcrypt.hash(superAdminPassword, 10);
            await db.transact([
                db.tx.Users[id()].update({
                    fullName: 'Super Admin',
                    username: 'admin',
                    passwordHash,
                    role: 'SUPER_ADMIN',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    requiresPasswordReset: false,
                    email: 'admin@haircreed.com'
                }),
            ]);
        } else {
            const passwordHash = await bcrypt.hash(superAdminPassword, 10);
            await db.transact([
                db.tx.Users[admin.id].update({
                    passwordHash,
                    updatedAt: Date.now(),
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

    async create(createUserDto: CreateUserDto): Promise<User> {
        const { passwordHash, ...rest } = createUserDto;
        const hashedPassword = await bcrypt.hash(passwordHash, 10);
        const newId = id();
        const newUser = {
            ...rest,
            id: newId,
            passwordHash: hashedPassword,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        await db.transact([
            db.tx.Users[newId].update(newUser)
        ]);
        return newUser as User;
    }

    async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
        const user = await this.findOneById(id);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        const { passwordHash, ...rest } = updateUserDto;

        const updatedData: Partial<User> = { ...rest, updatedAt: Date.now() };

        if (passwordHash) {
            updatedData.passwordHash = await bcrypt.hash(passwordHash, 10);
        }

        const updatedUser = { ...user, ...updatedData };

        await db.transact([
            db.tx.Users[id].update(updatedUser)
        ]);
        return updatedUser as User;
    }

    async remove(id: string): Promise<void> {
        await db.transact([
            db.tx.Users[id].delete()
        ]);
    }

    async findOneById(id: string): Promise<User | undefined> {
        const usersResponse = await db.query({ Users: { $: { where: { id } } } });
        if (usersResponse.Users.length === 0) {
            return undefined;
        } else {
            return { ...usersResponse.Users[0], role: usersResponse.Users[0].role as 'ADMIN' | 'POS_OPERATOR' | 'SUPER_ADMIN' };
        }
    }

    async updateSettings(id: string, updateUserSettingsDto: UpdateUserSettingsDto): Promise<User> {
        const user = await this.findOneById(id);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        const { fullName, username, newPassword, currentPassword } = updateUserSettingsDto;

        if (newPassword) {
            if (!currentPassword) {
                throw new Error('Current password is required to set a new password');
            }
            const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
            if (!isMatch) {
                throw new Error('Invalid current password');
            }
            user.passwordHash = await bcrypt.hash(newPassword, 10);
        }

        if (fullName) {
            user.fullName = fullName;
        }

        if (username) {
            user.username = username;
        }

        user.updatedAt = Date.now();

        await db.transact([
            db.tx.Users[id].update(user)
        ]);

        return user;
    }
}
