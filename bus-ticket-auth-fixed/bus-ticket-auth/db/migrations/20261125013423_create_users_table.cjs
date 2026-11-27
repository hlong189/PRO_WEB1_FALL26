exports.up = async function (knex) {
    await knex.schema.createTable('users', (table) => {
        table.increments('id').primary();

        table.string('full_name', 150).notNullable();
        table.string('email', 255).notNullable().unique();
        table.string('phone', 20).notNullable();

        table.string('password_hash', 255).notNullable();

        table.boolean('is_verified').notNullable().defaultTo(false);
        table.boolean('is_active').notNullable().defaultTo(true);

        table.timestamps(true, true);
    });
};

exports.down = async function (knex) {
    await knex.schema.dropTableIfExists('users');
};