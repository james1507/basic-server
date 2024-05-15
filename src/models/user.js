const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const schema = new Schema({
  email: { type: String, unique: true, required: true },
  firstName: { type: String },
  lastName: { type: String },
  password: { type: String },
  role: { type: String, required: true },
  createdDate: { type: Date, default: Date.now },
  socialType: { type: String },
  socialAuthId: { type: String },
  socialToken: { type: String },
});

schema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete ret._id, delete ret.password;
  },
});

module.exports = mongoose.model("User", schema);
