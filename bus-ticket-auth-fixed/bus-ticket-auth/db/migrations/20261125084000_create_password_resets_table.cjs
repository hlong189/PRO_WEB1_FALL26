exports.up = async function (knex) {
    await knex.schema.createTable('password_resets', (table) => {
        table.increments('id').primary();

        table.integer('user_id')
            .unsigned()
            .notNullable()
            .references('id')
            .inTable('users')
            .onDelete('CASCADE');

        // Luu ma dat lai mat khau da bam hash
        table.string('token_hash', 255).notNullable();

        // Thoi gian het han cua ma
        table.timestamp('expires_at').notNullable();

        // Thoi gian ma duoc su dung
        table.timestamp('used_at').nullable();

        table.timestamps(true, true);

        table.index('user_id');
    });
};

exports.down = async function (knex) {
    await knex.schema.dropTableIfExists('password_resets');
};