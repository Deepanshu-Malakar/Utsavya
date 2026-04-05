/**
 * --- FRONTEND INTEGRATION GUIDE: Booking Controllers ---
 * Base Path: /bookings
 * 
 * Note: A 'Booking' is the parent event. 
 * A 'Booking Item' is a specific vendor service request within that event.
 */
const { 
    createBooking, 
    getUserBookings, 
    requestServiceBooking, 
    getVendorBookingRequests, 
    updateBookingItemStatus, 
    selectVendorForService, 
    getBookingDetails, 
    completeBookingItem,
    updateBooking,
    updateBookingItemPrice
} = require("../services/booking.services");
const { cancelBookingItem } = require("../services/cancellation.services");
const asyncHandler = require("../utils/asyncHandler");

const createBookingController = asyncHandler(async (req, res) => {
// --- FRONTEND INTEGRATION GUIDE: Create Event ---
// POST /bookings | Body: { title, event_start, event_end }
// Required: Authorization: Bearer <accessToken>
    const customerId = req.user.userId;
    const booking = await createBooking(customerId, req.body);
    res.status(201).json(booking);
});

const getBookingsController = asyncHandler(async (req, res) => {
    const bookings = await getUserBookings(req.user.userId);
    res.status(200).json(bookings);
});

const updateBookingController = asyncHandler(async (req, res) => {
    const { booking, suggestions } = await updateBooking(
        req.user,
        req.params.id,
        req.body
    );
    res.status(200).json({
        success: true,
        message: "Booking updated successfully",
        data: booking,
        suggestions // NEW: Auto-recovery recommendations for date conflicts
    });
});

const updateBookingItemPriceController = asyncHandler(async (req, res) => {
    const { price_quote } = req.body;
    const updated = await updateBookingItemPrice(
        req.user,
        req.params.itemId,
        price_quote
    );
    res.status(200).json({
        success: true,
        message: "Price quote updated",
        data: updated
    });
});

const requestServiceBookingController = asyncHandler(async (req, res) => {
// --- FRONTEND INTEGRATION GUIDE: Request Vendor Service ---
// POST /bookings/items | Body: { service_id, booking_id, vendor_id }
    const result = await requestServiceBooking(
        req.user,
        req.body
    );
    res.status(201).json(result);
});

const getVendorBookingRequestsController = asyncHandler(async (req, res) => {
    const requests = await getVendorBookingRequests(req.user);
    res.status(200).json(requests);
});

const updateBookingItemStatusController = asyncHandler(async (req, res) => {
    const updated = await updateBookingItemStatus(
        req.user,
        req.params.id,
        req.body
    );
    res.status(200).json(updated);
});

const selectVendorController = asyncHandler(async (req, res) => {
    const result = await selectVendorForService(
        req.user,
        req.params.id
    );
    res.status(200).json(result);
});

const getBookingDetailsController = asyncHandler(async (req, res) => {
// --- FRONTEND INTEGRATION GUIDE: Get Full Event Details ---
// GET /bookings/:id
// Returns: Full event object + list of requested service items
    const result = await getBookingDetails(
        req.user,
        req.params.id
    );
    res.status(200).json(result);
});

const completeBookingController = asyncHandler(async (req, res) => {
// --- FRONTEND INTEGRATION GUIDE: Mark Service as Done ---
// PATCH /bookings/items/:id/complete
// Note: This moves the status to 'completed' and triggers payment logic.
    const result = await completeBookingItem(
        req.user,
        req.params.id
    );
    res.status(200).json(result);
});

const cancelBookingItemController = asyncHandler(async (req, res) => {
    const { reason } = req.body;
    const result = await cancelBookingItem(
        req.user,
        req.params.id,
        reason
    );
    res.status(200).json(result);
});

module.exports = {
    createBookingController,
    getBookingsController,
    updateBookingController,
    updateBookingItemPriceController,
    requestServiceBookingController,
    getVendorBookingRequestsController,
    updateBookingItemStatusController,
    selectVendorController,
    getBookingDetailsController,
    completeBookingController,
    cancelBookingItemController
};