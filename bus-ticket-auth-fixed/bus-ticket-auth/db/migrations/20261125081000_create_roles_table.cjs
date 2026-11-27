exports.up = async function (knex) {
    await knex.schema.createTable('roles', (table) => {
        table.increments('id').primary();

        table.string('name', 50).notNullable().unique();
        table.string('description', 255);

        table.timestamps(true, true);
    });

    // Them cac vai tro mac dinh
    await knex('roles').insert([
        {
            name: 'customer',
            description: 'Khach hang'
        },
        {
            name: 'staff',
            description: 'Nhan vien'
        },
        {
            name: 'admin',
            description: 'Quan tri vien'
        }
    ]);
};

exports.down = async function (knex) {
    await knex.schema.dropTableIfExists('roles');
};