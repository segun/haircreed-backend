import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

// This is a placeholder for your User model from the database schema
export type User = {
    id: string;
    username: string;
    passwordHash: string;
    role: 'admin' | 'pos';
    fullName: string;
};

@Injectable()
export class UsersService {
    // --- MOCK DATABASE ---
    // In a real application, this data would come from your instantdb.
    // We're pre-hashing the password 'password' for our mock admin user.
    private readonly users: User[] = [
        {
            id: '1',
            username: 'admin',
            // The hashed version of "password". Never store plain text passwords.
            passwordHash: bcrypt.hashSync('password', 10),
            role: 'admin',
            fullName: 'Super Admin',
        },
    ];
    // --- END MOCK DATABASE ---

    async findOne(username: string): Promise<User | undefined> {
        // In a real app, this would be: db.collection('users').find({ where: { username } })
        return this.users.find((user) => user.username === username);
    }
}
