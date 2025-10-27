import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import db from '../instant';
import { id } from '@instantdb/admin';
import { User } from "../types";
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

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
                    email: 'admin@haircreed.com'
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
        const hashedPassword = await bcrypt.hash(passwordHash, 10);
        const updatedUser = { ...user, ...rest, passwordHash: hashedPassword, updatedAt: Date.now() };
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
}
