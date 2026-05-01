const SampleService = require('./services/SampleService');
const db = require('./database');

async function test() {
    try {
        console.log("Testing Sample Registration Pipeline...");
        const result = await SampleService.registerSample({
            testRequestId: 1,
            description: "Expert Integration Test Sample",
            conditionNotes: "Pristine, Sealed",
            receivedBy: 1, // Admin ID
            storageLocation: "ULT Freezer (-80°C) - Alpha",
            hazardFlags: "NONE",
            sourceCompany: "Sovereign Systems",
            sourceContact: "Director",
            testsRequested: "Full Suite",
            testSpecs: "ISO 17025",
            clientNotes: "Priority 1",
            samplingDate: "2026-04-29",
            samplingLocation: "Nairobi"
        });
        console.log("SUCCESS:", result);
    } catch (e) {
        console.error("FAILURE:", e);
    }
}
test();
