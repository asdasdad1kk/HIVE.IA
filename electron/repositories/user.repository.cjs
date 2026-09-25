const { execSync } = require('child_process');
const fs = require('fs');

const ADMIN_FILE =
  'G:\\Share\\PANIAGUA DANIEL\\checklist\\admins.txt';

function isAdmin(employeeNumber) {
  try {
    if (!fs.existsSync(ADMIN_FILE)) {
      return false;
    }

    const admins = fs
      .readFileSync(ADMIN_FILE, 'utf8')
      .split(/\r?\n/)
      .map(x => x.trim())
      .filter(Boolean);

    return admins.includes(employeeNumber);
  } catch {
    return false;
  }
}

function getCredentials() {
  try {
    const output = execSync(
      'powershell -Command "(whoami /upn)"',
      { encoding: 'utf8' }
    );

    const email = output.trim().split('\n').pop().trim();

    const displayName = email
      .split('@')[0]
      .replace(/[0-9]+$/, '')
      .split('.')
      .map(
        p =>
          p.charAt(0).toUpperCase() +
          p.slice(1)
      )
      .join(' ');

    const username = process.env.USERNAME || '';

    // Extrae solo números del usuario
    

    const role = isAdmin(username)
      ? 'admin'
      : 'user';

    return {
      email,
      name: displayName,
      username,
      computer: process.env.COMPUTERNAME,
      role
    };
  } catch {
    return null;
  }
}

module.exports = {
  getCredentials
};