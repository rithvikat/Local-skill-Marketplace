const mongoose = require("mongoose");

const providerSchema = new mongoose.Schema({
    ProviderId: {
        type: String,
        unique: true
    },
    name: String,
    mobile: String,
    passwordHash: String,
    email: {
        type: String,
        sparse: true
    },
    address: String,
    services: [String],
    experience: Number,
    availability: String,
    rating: {
        type: Number,
        default: 0
    }
});

module.exports = mongoose.model("Provider", providerSchema);
