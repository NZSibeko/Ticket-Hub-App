```typescript
import * as mysql from 'mysql2/promise';
import { User } from '../models/User';

const pool = await mysql.createPool({
  host: 'localhost',
  user: 'root',
  database: 'your_database_name',
});

export const createUser = async (user: User): Promise<void> => {
  await pool.query('INSERT INTO users (email, password, role) VALUES (?, ?, ?)', [user.email, user.password, user.role]);
};
```

```typescript
// FILE: src/utils/dbUtils.tsx ---
import * as mysql from 'mysql2/promise';
import { User } from '../models/User';

const pool = await mysql.createPool({
  host: 'localhost',
  user: 'root',
  database: 'your_database_name',
});

export const getAllUsers = async (): Promise<User[]> => {
  const [result] = await pool.query('SELECT * FROM users');
  return result.map((row) => new User(row));
};
```

```typescript
// FILE: src/utils/dbUtils.tsx ---
import * as mysql from 'mysql2/promise';
import { User } from '../models/User';

const pool = await mysql.createPool({
  host: 'localhost',
  user: 'root',
  database: 'your_database_name',
});

export const getUserById = async (id: number): Promise<User | null> => {
  const [result] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
  if (result.length === 0) return null;
  return new User(result[0]);
};
```

```typescript
// FILE: src/utils/dbUtils.tsx ---
import * as mysql from 'mysql2/promise';
import { User } from '../models/User';

const pool = await mysql.createPool({
  host: 'localhost',
  user: 'root',
  database: 'your_database_name',
});

export const updateUser = async (user: User): Promise<void> => {
  await pool.query('UPDATE users SET email = ?, password = ?, role = ? WHERE id = ?', [user.email, user.password, user.role, user.id]);
};
```

```typescript
// FILE: src/utils/dbUtils.tsx ---
import * as mysql from 'mysql2/promise';
import { User } from '../models/User';

const pool = await mysql.createPool({
  host: 'localhost',
  user: 'root',
  database: 'your_database_name',
});

export const deleteUser = async (id: number): Promise<void> => {
  await pool.query('DELETE FROM users WHERE id = ?', [id]);
};
```