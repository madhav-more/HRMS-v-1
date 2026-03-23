import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { query, pool } from './config/db.js';
import { logger } from './utils/logger.js';

const seedHR = async () => {
  try {
    logger.info('Starting PostgreSQL seeding...');

    // Check if user exists
    const { rows: existingRows } = await query(
      'SELECT id FROM employees WHERE employee_code = $1',
      ['IA00091']
    );

    const hashedPassword = await bcrypt.hash('123456', 12);

    if (existingRows.length > 0) {
      logger.info('User IA00091 already exists. Updating details...');
      await query(
        `UPDATE employees SET 
          password = $1, 
          role = 'HR', 
          department = 'HR', 
          status = 'Active',
          updated_at = CURRENT_TIMESTAMP
         WHERE employee_code = 'IA00091'`,
        [hashedPassword]
      );
      logger.info('User updated successfully.');
    } else {
      logger.info('Creating new HR user IA00091...');
      await query(
        `INSERT INTO employees (
          employee_code, name, email, mobile_number, password, role, department, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          'IA00091',
          'Super HR',
          'hr@infinity.com',
          '9999999999',
          hashedPassword,
          'HR',
          'HR',
          'Active'
        ]
      );
      logger.info('HR User IA00091 created successfully.');
    }

    // Seed SuperUsers as requested if not present
    const superUsers = [
      { code: 'IA00001', name: 'SuperAdmin 1', email: 'admin1@infinity.com' },
      { code: 'IA00002', name: 'SuperAdmin 2', email: 'admin2@infinity.com' }
    ];

    for (const admin of superUsers) {
      const { rows: adminExist } = await query('SELECT id FROM employees WHERE employee_code = $1', [admin.code]);
      if (adminExist.length === 0) {
        logger.info(`Creating SuperUser ${admin.code}...`);
        await query(
          `INSERT INTO employees (employee_code, name, email, mobile_number, password, role, status)
           VALUES ($1, $2, $3, $4, $5, 'SuperUser', 'Active')`,
          [admin.code, admin.name, admin.email, '0000000000', hashedPassword]
        );
      }
    }

    logger.info('Seeding completed successfully.');
    await pool.end();
    process.exit(0);
  } catch (err) {
    logger.error('Seeding failed:', err);
    process.exit(1);
  }
};

seedHR();
