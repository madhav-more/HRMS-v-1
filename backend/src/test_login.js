import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { query, pool } from './config/db.js';

async function test() {
  try {
    const { rows } = await query('SELECT id, employee_code, name, password FROM employees WHERE employee_code = $1', ['IA00091']);
    const employee = rows[0];

    if (!employee) {
      console.log("Employee IA00091 NOT FOUND");
    } else {
      console.log("Employee found:", employee.employee_code, employee.name);
      console.log("Password hash:", employee.password);
      const isValid = await bcrypt.compare("123456", employee.password);
      console.log("comparePassword('123456') =>", isValid);
    }
  } catch (err) {
    console.error("Test failed:", err);
  } finally {
    await pool.end();
    process.exit(0);
  }
}
test();
