require('dotenv').config();
const { deleteAccount } = require("./src/services/profile.services");

const userId = "83896511-5816-4480-b690-7dc1381ee600";

(async () => {
    try {
        console.log("Attempting to delete user:", userId);
        const result = await deleteAccount(userId, "Testing account deletion and media cleanup");
        console.log("Deletion successful:", result);
    } catch (error) {
        console.error("Deletion failed!");
        console.error("Error Name:", error.name);
        console.error("Error Message:", error.message);
        console.error("Stack Trace:", error.stack);
    } finally {
        process.exit();
    }
})();
