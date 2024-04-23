const jwt = require("jsonwebtoken");

const generateToken = (id) => {
  return jwt.sign({ id },"sss", {
    expiresIn: "30d",
  });
};

module.exports = generateToken;
