const axios = require('axios');

const API_BASE = 'http://localhost:3000';

async function onboardSovereignLab() {
    console.log("==================================================================");
    console.log("   QUALICORE SOVEREIGN ISO-17025 LABORATORY REGISTRATION PROTOCOL");
    console.log("==================================================================\n");

    const emailTag = Date.now();
    const labEmail = `accreditations.${emailTag}@sovereignlabs.com`;
    const labPassword = 'Password_17025_Compliance';

    try {
        // Step 1: Register Laboratory User Account
        console.log(`[STEP 1] Transmitting registration request for: ${labEmail}...`);
        const registerRes = await axios.post(`${API_BASE}/api/register`, {
            email: labEmail,
            password: labPassword,
            role: 'lab'
        });
        
        const userId = registerRes.data.data.id;
        console.log(`✅ Laboratory User Account created successfully (ID: ${userId})`);

        // Step 2: Login to acquire Secure JWT Authentication Token
        console.log("\n[STEP 2] Authenticating new user to retrieve JWT Session Token...");
        const loginRes = await axios.post(`${API_BASE}/api/login`, {
            email: labEmail,
            password: labPassword
        });
        
        const jwtToken = loginRes.data.data.token;
        console.log(`✅ JWT Session Token acquired. Length: ${jwtToken.length} characters.`);

        // Step 3: Compile and submit the fully detailed ISO/IEC 17025 Laboratory Dossier
        console.log("\n[STEP 3] Preparing ISO/IEC 17025 Laboratory Dossier...");
        const profileDossier = {
            name: "Sovereign Quality Testing Labs (SQTL)",
            organization_type: "private",
            country: "Kenya",
            city: "Nairobi",
            address: "Science Complex, Block C, Suite 101, Industrial Area",
            contact_person: "Dr. Beatrice Namwamba (Quality Assurance Director)",
            contact_email: "intake@sovereignlabs.com",
            contact_phone: "+254 711 082345",
            accreditation_status: "ISO/IEC 17025",
            accreditation_body: "KENAS (Kenya National Accreditation Service)",
            accreditation_number: "KENAS-EXP-17025-2026",
            accreditation_expiry: "2029-12-31",
            authorized_signatory: "Dr. Beatrice Namwamba, PhD (Lead Quality Chemist)",
            scope_description: "Quantitative microbiological assay, mycotoxin/aflatoxin HPLC testing, and heavy metal detection on food/beverage matrices.",
            equipment_summary: "High-Performance Liquid Chromatography (HPLC-FLD), Gas Chromatography-Mass Spectrometry (GC-MS), biosafety cabinets Class II, autoclave systems.",
            turnaround_time: "3-5 Business Days",
            operating_hours: "Mon-Fri: 08:00 - 17:00, Sat: 08:00 - 13:00",
            sample_pickup: true,
            emergency_service: true
        };

        console.log("Submitting dossier to /api/labs...");
        const profileRes = await axios.post(`${API_BASE}/api/labs`, profileDossier, {
            headers: {
                Authorization: `Bearer ${jwtToken}`
            }
        });

        const labProfileId = profileRes.data.data.id;
        const verificationStatus = profileRes.data.data.verification_status;
        console.log(`✅ Dossier submitted successfully!`);
        console.log(`   Laboratory Profile ID: ${labProfileId}`);
        console.log(`   Initial Verification Status: ${verificationStatus}`);
        
        console.log("\n==================================================================");
        console.log("   LABORATORY ACCOUNT CREATED & DOSSIER SUBMITTED FOR REVIEW!");
        console.log("==================================================================");

    } catch (err) {
        console.error("\n❌ ONBOARDING REGISTRATION ENCOUNTERED EXCEPTION:");
        if (err.response) {
            console.error("   API Error Status:", err.response.status);
            console.error("   API Error Payload:", JSON.stringify(err.response.data));
        } else {
            console.error("   Error Message:", err.message);
        }
    }
}

onboardSovereignLab();
