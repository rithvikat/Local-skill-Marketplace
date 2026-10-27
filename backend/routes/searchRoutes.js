const express = require("express");
const Provider = require("../models/provider");

const router = express.Router();

// Search Providers
router.get("/providers", async (req, res) => {
    try {
        const { search } = req.query;

        let query = {};

        if (search) {
            query = {
                $or: [
                    { name: { $regex: search, $options: "i" } },
                    { services: { $regex: search, $options: "i" } },
                    { address: { $regex: search, $options: "i" } }
                ]
            };
        }

        const providers = await Provider.find(query).select("-passwordHash");

        res.json(providers);

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});

module.exports = router;
