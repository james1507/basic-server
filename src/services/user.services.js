const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const config = require("../../config.json");
const db = require("../helpers/db");
const User = db.User;

//this will authenticate the user credentials
async function login({ email, password }) {
  //find the user using email

  const user = await User.findOne({ email });
  console.log("user model", user);
  //if user is truthy then sign the token
  if (user && bcrypt.compareSync(password, user.password)) {
    const token = jwt.sign({ sub: user.id, role: user.role }, config.secret, {
      expiresIn: "15m",
    });

    const refreshToken = jwt.sign(
      { sub: user.id, role: user.role },
      config.refreshSecret,
      {
        expiresIn: "7d",
      }
    );
    // console.log("user.toJsoon", ...user.toJSON());
    return { ...user.toJSON(), token, refreshToken };
  }
}

//refresh token
async function refreshToken({ refreshToken }) {
  try {
    // Verify the refresh token
    const decoded = jwt.verify(refreshToken, config.refreshSecret);

    // Find the user by refresh token
    const user = await User.findOne({ _id: decoded.sub, refreshToken });

    if (!user) {
      return null; // Return null if user not found
    }

    // Generate a new access token
    const accessToken = jwt.sign(
      { sub: user.id, role: user.role },
      config.secret,
      { expiresIn: "15m" }
    );

    return { ...user.toJSON(), accessToken };
  } catch (error) {
    // Handle invalid token error
    return null;
  }
}

//retrieving all users
async function getAll() {
  return await User.find();
}
//retrieving user using id
async function getById(id) {
  console.log("finding id: ", id);
  return await User.findById(id);
}

//adding user to db
async function create(userParam) {
  // Check if user exists
  const user = await User.findOne({ email: userParam.email });
  // Validate
  if (user) throw `This email already exists: ${userParam.email}`;

  // Create user object
  const newUser = new User(userParam);
  if (userParam.password) {
    newUser.password = bcrypt.hashSync(userParam.password, 10);
  }

  // Save the user to the database
  await newUser.save();

  // Generate token
  const token = jwt.sign(
    { sub: newUser.id, role: newUser.role },
    config.secret,
    {
      expiresIn: "7d",
    }
  );

  // Return the newly created user object along with the token
  return { ...newUser.toObject(), token };
}

async function update(id, userParam) {
  console.log(id, userParam);
  const user = await User.findById(id);
  console.log(user.email, userParam.email);
  //validate the id and email
  if (!user) throw "User not found.";
  if (
    user.email !== userParam.email &&
    (await User.findOne({ email: userParam.email }))
  ) {
    throw `User with email ${userParam.email} already exist.`;
  }

  //convert the password ot hash
  if (userParam.password) {
    userParam.password = bcrypt.hashSync(userParam.password, 10);
  }

  //copy the user obj
  Object.assign(user, userParam);
  await user.save();
}

async function _delete(id) {
  await User.findByIdAndRemove(id);
}

module.exports = {
  login,
  refreshToken,
  getAll,
  getById,
  create,
  update,
  delete: _delete,
};
