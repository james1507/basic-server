const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const config = require("../../config.json");
const db = require("../helpers/db");
const fetch = require("node-fetch");
const User = db.User;
const admin = require("../../firebase");

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

async function verifyGoogleToken(idToken) {
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return {
      email: decodedToken.email,
      firstName: decodedToken.name,
      lastName: decodedToken.name.split(" ").slice(1).join(" "),
      socialType: "google",
      socialAuthId: decodedToken.uid,
      socialToken: idToken,
    };
  } catch (error) {
    console.log("erorr: ", error);

    throw new Error("Invalid Google ID token ", error);
  }
}

async function verifyFacebookToken(accessToken) {
  const appId = config.facebookAppId;
  const appSecret = config.facebookAppSecret;

  const debugTokenUrl = `https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${appId}|${appSecret}`;
  const response = await fetch(debugTokenUrl);
  const data = await response.json();

  if (!data.data || data.data.error || !data.data.is_valid) {
    throw new Error("Invalid Facebook access token");
  }

  const userId = data.data.user_id;
  const userUrl = `https://graph.facebook.com/${userId}?fields=id,name,email&access_token=${accessToken}`;
  const userResponse = await fetch(userUrl);
  const userData = await userResponse.json();

  if (!userData || userData.error) {
    throw new Error("Unable to fetch user data from Facebook");
  }

  return {
    email: userData.email,
    firstName: userData.name.split(" ")[0],
    lastName: userData.name.split(" ").slice(1).join(" "),
    socialType: "facebook",
    socialAuthId: userData.id,
    socialToken: accessToken,
  };
}

async function getByEmail(email) {
  return await User.findOne({ email });
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

  await newUser.save();

  // Generate token
  const token = jwt.sign(
    { sub: newUser.id, role: newUser.role },
    config.secret,
    {
      expiresIn: "15m",
    }
  );

  const refreshToken = jwt.sign(
    { sub: newUser.id, role: newUser.role },
    config.refreshSecret,
    {
      expiresIn: "7d",
    }
  );

  // Return the newly created user object along with the token
  return { ...newUser.toJSON(), token, refreshToken };
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
  verifyGoogleToken,
  verifyFacebookToken,
  getByEmail,
};
