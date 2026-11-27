exports.up = async function (knex) {
    await knex.schema.createTable('user_roles', (table) => {
        table.integer('user_id')
            .unsigned()
            .notNullable()
            .references('id')
            .inTable('users')
            .onDelete('CASCADE');

        table.integer('role_id')
            .unsigned()
            .notNullable()
            .references('id')
            .inTable('roles')
            .onDelete('CASCADE');

        // Moi tai khoan khong gan trung mot vai tro
        table.primary(['user_id', 'role_id']);

        table.timestamps(true, true);
    });
};

exports.down = async function (knex) {
    await knex.schema.dropTableIfExists('user_roles');
};