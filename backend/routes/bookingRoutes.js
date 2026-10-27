const express = require("express");
const Booking = require("../models/booking");
const Customer = require("../models/customer");
const Provider = require("../models/provider");

const router = express.Router();

// Get Bookings (All, or filtered by customerId or providerId with full names and contact info)
router.get("/", async (req, res) => {
    try {
        const { customerId, providerId } = req.query;

        let query = {};
        if (customerId) query.customerId = customerId;
        if (providerId) query.providerId = providerId;

        if (!customerId && !providerId) {
            return res.status(400).json({
                message: "customerId or providerId query parameter is required"
            });
        }

        const bookings = await Booking.find(query).sort({ _id: -1 }).lean();

        // Collect unique IDs to enrich with real provider and customer details
        const customerIds = [...new Set(bookings.map(b => b.customerId).filter(Boolean))];
        const providerIds = [...new Set(bookings.map(b => b.providerId).filter(Boolean))];

        const [customers, providers] = await Promise.all([
            Customer.find({ CustomerID: { $in: customerIds } }).select("CustomerID name mobile address"),
            Provider.find({ ProviderId: { $in: providerIds } }).select("ProviderId name mobile address services")
        ]);

        const customerMap = {};
        customers.forEach(c => { customerMap[c.CustomerID] = c; });

        const providerMap = {};
        providers.forEach(p => { providerMap[p.ProviderId] = p; });

        const enrichedBookings = bookings.map(b => {
            const cust = customerMap[b.customerId];
            const prov = providerMap[b.providerId];

            return {
                ...b,
                providerName: b.providerName || prov?.name || ("Provider " + b.providerId),
                providerMobile: prov?.mobile || "N/A",
                customerName: b.customerName || cust?.name || ("Customer " + b.customerId),
                customerMobile: b.customerMobile || cust?.mobile || "N/A",
                customerAddress: b.customerAddress || cust?.address || "N/A"
            };
        });

        res.json(enrichedBookings);

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});

// Create Booking - Customer
router.post("/create", async (req, res) => {
    try {
        const {
            BookingID,
            customerId,
            providerId,
            service,
            date,
            time
        } = req.body;

        if (!customerId || !providerId || !service || !date || !time) {
            return res.status(400).json({
                message: "customerId, providerId, service, date, and time are required"
            });
        }

        // Verify that customer exists and is not a provider
        const [customer, provider] = await Promise.all([
            Customer.findOne({ CustomerID: customerId }).select("CustomerID name mobile address"),
            Provider.findOne({ ProviderId: providerId }).select("ProviderId name mobile address")
        ]);

        if (!customer) {
            return res.status(400).json({
                message: "Invalid customer ID. Only customers can make bookings."
            });
        }

        if (!provider) {
            return res.status(400).json({
                message: "Provider not found"
            });
        }

        const finalBookingID = BookingID || ("B" + Date.now().toString().slice(-4) + Math.floor(10 + Math.random() * 90));

        const booking = new Booking({
            BookingID: finalBookingID,
            customerId,
            providerId,
            service,
            date,
            time,
            status: "Pending",
            customerName: customer.name || "Customer",
            customerMobile: customer.mobile || "N/A",
            customerAddress: customer.address || "N/A",
            providerName: provider.name || "Provider"
        });

        await booking.save();

        res.json({
            message: "Booking created successfully",
            booking: {
                ...booking.toObject(),
                customerName: customer.name,
                providerName: provider.name,
                customerMobile: customer.mobile,
                customerAddress: customer.address
            }
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});

// Accept Booking - Provider
router.put("/accept/:id", async (req, res) => {
    try {
        const { providerId } = req.body || {};
        const query = { BookingID: req.params.id };
        if (providerId) query.providerId = providerId;

        const booking = await Booking.findOneAndUpdate(
            query,
            { status: "Accepted" },
            { new: true }
        );

        if (!booking) {
            return res.status(404).json({
                message: "Booking not found or unauthorized"
            });
        }

        res.json({
            message: "Booking accepted",
            booking
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});

// Complete Booking - Provider
router.put("/complete/:id", async (req, res) => {
    try {
        const { providerId } = req.body || {};
        const query = { BookingID: req.params.id };
        if (providerId) query.providerId = providerId;

        const booking = await Booking.findOneAndUpdate(
            query,
            { status: "Completed" },
            { new: true }
        );

        if (!booking) {
            return res.status(404).json({
                message: "Booking not found or unauthorized"
            });
        }

        res.json({
            message: "Booking completed",
            booking
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});

// Cancel Booking - Customer or Provider
router.put("/cancel/:id", async (req, res) => {
    try {
        const { customerId, providerId } = req.body || {};

        const booking = await Booking.findOne({
            BookingID: req.params.id
        });

        if (!booking) {
            return res.status(404).json({
                message: "Booking not found"
            });
        }

        const isCustomer = customerId && booking.customerId === customerId;
        const isProvider = providerId && booking.providerId === providerId;

        if (!isCustomer && !isProvider) {
            return res.status(403).json({
                message: "Only the customer who created or provider assigned to this booking can cancel it"
            });
        }

        booking.status = "Cancelled";

        await booking.save();

        res.json({
            message: "Booking cancelled",
            booking
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});

module.exports = router;
