const allRoles = {
  user: ['selectPlan', 'sellerRegistration', 'connectRegistration', 'manageBilling'],
  admin: ['getUsers', 'manageUsers'],
};

const roles = Object.keys(allRoles);
const roleRights = new Map(Object.entries(allRoles));

module.exports = {
  roles,
  roleRights,
};
