import { pool } from './pool.js';

const CREATE_STATEMENTS = `
CREATE TABLE IF NOT EXISTS teachers (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(120) NULL,
  email_verified_at DATETIME NULL,
  verification_token_hash VARCHAR(64) NULL,
  verification_expires_at DATETIME NULL,
  reset_token_hash VARCHAR(64) NULL,
  reset_expires_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS classrooms (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  teacher_id INT UNSIGNED NOT NULL,
  room_code VARCHAR(32) NOT NULL UNIQUE,
  title VARCHAR(200) NOT NULL,
  scenario_id VARCHAR(64) NULL,
  expires_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_classrooms_teacher FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS memberships (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  classroom_id INT UNSIGNED NOT NULL,
  alias VARCHAR(80) NOT NULL,
  session_token VARCHAR(64) NOT NULL UNIQUE,
  pin_hash VARCHAR(255) NULL,
  last_seen_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_memberships_classroom FOREIGN KEY (classroom_id) REFERENCES classrooms(id) ON DELETE CASCADE,
  UNIQUE KEY uq_classroom_alias (classroom_id, alias)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS game_runs (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  membership_id INT UNSIGNED NOT NULL UNIQUE,
  game_state LONGTEXT NULL,
  current_age INT NOT NULL DEFAULT 16,
  is_game_over TINYINT(1) NOT NULL DEFAULT 0,
  overall_score INT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_runs_membership FOREIGN KEY (membership_id) REFERENCES memberships(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS evaluations (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  game_run_id INT UNSIGNED NOT NULL UNIQUE,
  overall_score INT NOT NULL,
  grade VARCHAR(4) NOT NULL,
  dimensions_json LONGTEXT NOT NULL,
  certificate_json LONGTEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_eval_run FOREIGN KEY (game_run_id) REFERENCES game_runs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

/** Safe ALTERs for existing Plesk DBs created before email-auth columns. */
const ALTERS = [
  'ALTER TABLE teachers ADD COLUMN email_verified_at DATETIME NULL',
  'ALTER TABLE teachers ADD COLUMN verification_token_hash VARCHAR(64) NULL',
  'ALTER TABLE teachers ADD COLUMN verification_expires_at DATETIME NULL',
  'ALTER TABLE teachers ADD COLUMN reset_token_hash VARCHAR(64) NULL',
  'ALTER TABLE teachers ADD COLUMN reset_expires_at DATETIME NULL',
  'ALTER TABLE memberships ADD COLUMN pin_hash VARCHAR(255) NULL',
  'ALTER TABLE memberships ADD COLUMN last_seen_at DATETIME NULL',
];

async function migrate() {
  const conn = await pool.getConnection();
  try {
    for (const statement of CREATE_STATEMENTS.split(';')
      .map((s) => s.trim())
      .filter(Boolean)) {
      await conn.query(statement);
    }

    for (const alter of ALTERS) {
      try {
        await conn.query(alter);
      } catch (err) {
        // Duplicate column = already migrated
        if (err && (err.errno === 1060 || err.code === 'ER_DUP_FIELDNAME')) {
          continue;
        }
        throw err;
      }
    }

    console.log('MariaDB schema ready (incl. teacher email-auth and student resume columns).');
  } finally {
    conn.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
