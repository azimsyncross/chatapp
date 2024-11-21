const ROLES = {
  USER: 'user',
  MODERATOR: 'moderator',
  ADMIN: 'admin'
};

const ROLES_HIERARCHY = {
  [ROLES.ADMIN]: 3,
  [ROLES.MODERATOR]: 2,
  [ROLES.USER]: 1
};

module.exports = {
  ROLES,
  ROLES_HIERARCHY
}; 