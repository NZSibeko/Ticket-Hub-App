```typescript
import axios from 'axios';

const apiUrl = 'http://localhost:3002';

class AuthService {
  login(username: string, password: string): Promise<{ success: boolean }> {
    return axios.post(`${apiUrl}/login`, { username, password });
  }
}

export default new AuthService();
```