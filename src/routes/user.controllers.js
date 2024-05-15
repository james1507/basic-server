const express = require("express");
const router = express.Router();
const userServices = require("../services/user.services");
const Role = require("../helpers/role");
const jwt = require("../helpers/jwt");
const User = require("../models/user");
//routes
router.post("/login", login);
router.post("/refresh-token", refreshToken);
router.post("/register", register);
router.post("/social-login", socialLogin);
router.get("/", jwt(Role.Admin), getAll);
router.get("/current", jwt(), getCurrent);
router.get("/:id", getById);
router.put("/:id", update);
router.delete("/:id", _delete);

module.exports = router;

//route functions
function login(req, res, next) {
  userServices
    .login(req.body)
    .then((user) => {
      console.log(user);
      user
        ? res.json({ user: user, message: "User logged in successfully" })
        : res
            .status(400)
            .json({ message: "Username or password is incorrect." });
    })
    .catch((error) => next(error));
}

async function socialLogin(req, res, next) {
  try {
    const { socialType, socialAuthId } = req.body;

    let userInfo;
    if (socialType === "google") {
      userInfo = await userServices.verifyGoogleToken(socialAuthId);
    } else if (socialType === "facebook") {
      userInfo = await userServices.verifyFacebookToken(socialAuthId);
    } else {
      return res.status(400).json({ message: "Unsupported social type" });
    }

    const { email, firstName, lastName, socialToken } = userInfo;

    // Check if email exists
    let user = await userServices.getByEmail(email);

    if (!user) {
      // If email does not exist, create a new user
      user = new User({
        email,
        firstName,
        lastName,
        socialType,
        socialAuthId,
        socialToken,
        role: "User",
      });
      await user.save();
    } else {
      // If user exists, update the social tokens and other info
      user.socialType = socialType;
      user.socialAuthId = socialAuthId;
      user.socialToken = socialToken;
      await user.save();
    }

    // Generate tokens
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

    return res.json({
      user: { ...user.toJSON(), token, refreshToken },
      message: "User logged in successfully",
    });
  } catch (error) {
    next(error);
  }
}

function refreshToken(req, res, next) {
  userServices.refreshToken(req.body).then((user) => {
    try {
      // if (!user) {
      //   return res.status(401).json({ message: "Invalid refresh token" });
      // }
      res.json({ accessToken: user.accessToken });
    } catch (error) {
      return res.status(401).json({ message: error });
    }
  });
}

function register(req, res, next) {
  userServices
    .create(req.body)
    .then((user) => {
      console.log(user);
      res.json({
        user: user,
        message: `User Registered successfully with email ${req.body.email}`,
      });
    })
    .catch((error) => next(error));
}

function getAll(req, res, next) {
  const currentUser = req.user;

  if (currentUser.role !== Role.Admin) {
    return res.status(401).json({ message: "Not Authorized!" });
  }
  userServices
    .getAll()
    .then((users) => res.json(users))
    .catch((err) => next(err));
}

function getCurrent(req, res, next) {
  console.log(req);
  userServices
    .getById(req.user.sub)
    .then((user) => (user ? res.json(user) : res.status(404)))
    .catch((error) => next(error));
}

function getById(req, res, next) {
  userServices
    .getById(req.params.id)
    .then((user) => {
      if (!user) {
        res.status(404).json({ message: "User Not Found!" });
        next();
      }
      return res.json(user);
    })
    .catch((error) => next(error));
}

function update(req, res, next) {
  userServices
    .update(req.params.id, req.body)
    .then(() =>
      res.json({
        message: `User with id: ${req.params.id} updated successfully.`,
      })
    )
    .catch((error) => next(error));
}

function _delete(req, res, next) {
  userServices
    .delete(req.params.id)
    .then(() =>
      res.json({
        message: `User with id: ${req.params.id} deleted successfully.`,
      })
    )
    .catch((error) => next(error));
}
