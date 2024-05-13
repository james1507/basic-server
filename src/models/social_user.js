const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const schema = new Schema({
  email: { type: String, unique: true, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  socialType: { type: String, required: true },
  socialAuthId: { type: String, required: true },
  socialToken: { type: String, required: true },
  role: { type: String, default: "User" },
  createdDate: { type: Date, default: Date.now },
});

schema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete ret._id, delete ret.password;
  },
});

module.exports = mongoose.model("SocialUser", schema);
