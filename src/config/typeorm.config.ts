import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User } from '../modules/users/user.entity';

export const typeOrmConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: 'localhost',
  port: 5432,            // default PostgreSQL port
  username: 'your_pg_user', // replace with your Postgres username
  password: 'your_pg_password', // replace with your Postgres password
  database: 'smartfolio', // the database you created
  entities: [User],
  synchronize: true,      // auto create tables in dev (set false in prod)
};
