const express = require("express");
const bcrypt = require("bcryptjs");
const Provider = require("../models/provider");

const router = express.Router();

// Provider Registration (Name + Password, no email required)
router.post("/register", async (req, res) => {
    try {
        const {
            ProviderId,
            name,
            mobile,
            email,
            address,
            services,
            skill,
            experience,
            availability,
            password
        } = req.body;

        if (!name || !name.trim() || !password) {
            return res.status(400).json({
                message: "Name and password are required"
            });
        }

        const trimmedName = name.trim();
        const escapedName = trimmedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const existingProvider = await Provider.findOne({
            name: { $regex: new RegExp("^" + escapedName + "$", "i") }
        });

        if (existingProvider) {
            return res.status(400).json({
                message: "A service provider with this name already exists"
            });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const finalProviderId = ProviderId || ("P" + Date.now().toString().slice(-4) + Math.floor(10 + Math.random() * 90));
        const finalServices = Array.isArray(services) && services.length > 0
            ? services
            : (services ? [services] : (skill ? [skill] : ["General"]));

        const finalEmail = (email && email.trim()) ? email.trim() : `${finalProviderId.toLowerCase()}@local.market`;

        const provider = new Provider({
            ProviderId: finalProviderId,
            name: trimmedName,
            mobile: (mobile && mobile.trim()) ? mobile.trim() : "N/A",
            email: finalEmail,
            address: (address && address.trim()) ? address.trim() : "N/A",
            services: finalServices,
            experience: Number(experience) || 1,
            availability: (availability && availability.trim()) ? availability.trim() : "9 AM - 6 PM",
            rating: 0,
            passwordHash
        });

        await provider.save();

        res.json({
            message: "Provider registered successfully",
            ProviderId: finalProviderId
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});


// Provider Login (Name/Email + Password)
router.post("/login", async (req, res) => {
    try {
        const { name, email, identifier, password } = req.body;
        const loginId = (name || identifier || email || "").trim();

        if (!loginId || !password) {
            return res.status(400).json({
                message: "Name and password are required"
            });
        }

        const escapedId = loginId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const provider = await Provider.findOne({
            $or: [
                { name: { $regex: new RegExp("^" + escapedId + "$", "i") } },
                { email: loginId }
            ]
        });

        if (!provider) {
            return res.status(400).json({
                message: "Provider account not found"
            });
        }

        const validPassword = await bcrypt.compare(
            password,
            provider.passwordHash
        );

        if (!validPassword) {
            return res.status(400).json({
                message: "Invalid password"
            });
        }

        res.json({
            message: "Login successful",
            provider: {
                ProviderId: provider.ProviderId,
                name: provider.name,
                email: provider.email,
                mobile: provider.mobile || "N/A",
                address: provider.address || "N/A",
                services: provider.services,
                experience: provider.experience,
                availability: provider.availability,
                rating: provider.rating,
                role: "provider"
            }
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});

// Provider Profile (Get)
router.get("/profile/:id", async (req, res) => {
    try {
        const provider = await Provider.findOne({ ProviderId: req.params.id }).select("-passwordHash");
        if (!provider) {
            return res.status(404).json({
                message: "Provider not found"
            });
        }
        res.json(provider);
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});

// Provider Profile (Update)
router.put("/profile/:id", async (req, res) => {
    try {
        const { name, mobile, address, services, skill, experience, availability } = req.body;
        const provider = await Provider.findOne({ ProviderId: req.params.id });

        if (!provider) {
            return res.status(404).json({
                message: "Provider not found"
            });
        }

        if (name && name.trim()) {
            const trimmedName = name.trim();
            if (trimmedName.toLowerCase() !== (provider.name || "").toLowerCase()) {
                const escapedName = trimmedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                const duplicate = await Provider.findOne({
                    name: { $regex: new RegExp("^" + escapedName + "$", "i") },
                    ProviderId: { $ne: provider.ProviderId }
                });
                if (duplicate) {
                    return res.status(400).json({
                        message: "Another provider with this name already exists"
                    });
                }
            }
            provider.name = trimmedName;
        }

        if (mobile !== undefined) provider.mobile = mobile.trim();
        if (address !== undefined) provider.address = address.trim();

        if (services) {
            provider.services = Array.isArray(services) ? services : [services];
        } else if (skill) {
            provider.services = [skill];
        }

        if (experience !== undefined && experience !== null && experience !== "") {
            provider.experience = Number(experience) || provider.experience;
        }

        if (availability !== undefined && availability.trim()) {
            provider.availability = availability.trim();
        }

        await provider.save();

        const updated = provider.toObject();
        delete updated.passwordHash;

        res.json({
            message: "Profile updated successfully",
            provider: updated
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});

module.exports = router;
