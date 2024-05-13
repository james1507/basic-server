const config = require("../../config.json");
const mongoose = require("mongoose");
const conenctionOptions = {
  useCreateIndex: true,
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
};
try {
  mongoose
    .connect(
      process.env.MONGODB_URI || config.connectionString,
      conenctionOptions
    )
    .then((res) => console.log(`MongoDB connected Successfully..!`));
} catch (error) {
  console.log(`MongoDB Error: `, error.message);
  process.exit(1);
}

mongoose.Promise = global.Promise;

module.exports = {
  User: require("../models/user"),
  SocialUser: require("../models/social_user"),
};
