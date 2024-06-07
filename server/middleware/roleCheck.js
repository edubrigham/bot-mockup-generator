// server/middleware/roleCheck.js
const roleCheck = (requiredRoles) => {
    return (req, res, next) => {
      if (requiredRoles.includes(req.user.role)) {
        next();
      } else {
        return res.status(403).send('Access denied: insufficient permissions');
      }
    };
  };
  
  module.exports = roleCheck;