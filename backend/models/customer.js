const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema({
    CustomerID: {
        type: String,
        unique: true
    },
    name: String,
    mobile: String,
    email: {
        type: String,
        sparse: true
    },
    address: String,
    passwordHash: String
});

module.exports = mongoose.model("Customer", customerSchema);
