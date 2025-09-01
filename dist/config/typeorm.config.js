"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.typeOrmConfig = void 0;
const user_entity_1 = require("../modules/users/user.entity");
exports.typeOrmConfig = {
    type: 'postgres',
    host: 'localhost',
    port: 5432, // default PostgreSQL port
    username: 'your_pg_user', // replace with your Postgres username
    password: 'your_pg_password', // replace with your Postgres password
    database: 'smartfolio', // the database you created
    entities: [user_entity_1.User],
    synchronize: true, // auto create tables in dev (set false in prod)
};
